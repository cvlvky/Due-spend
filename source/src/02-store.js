/* ===== storage: phone database (IndexedDB) with a browser-storage fallback, optional PIN encryption ===== */
const DBN="due-and-spend-db",FDBN="due-and-spend-files";
let _db=null,_fdb=null,KEY=null,META={v:2,ts:0,enc:null},useLS=false,lastJSON={},storeErr="";
const te=new TextEncoder(),td=new TextDecoder();

function openDB(name,stores){return new Promise((res,rej)=>{let r;const to=setTimeout(()=>rej(new Error("timeout")),5000);
  try{r=indexedDB.open(name,1)}catch(e){clearTimeout(to);return rej(e)}
  r.onupgradeneeded=()=>stores.forEach(s=>{if(!r.result.objectStoreNames.contains(s))r.result.createObjectStore(s)});
  r.onsuccess=()=>{clearTimeout(to);res(r.result)};r.onerror=()=>{clearTimeout(to);rej(r.error||new Error("database"))};r.onblocked=()=>{clearTimeout(to);rej(new Error("blocked"))}})}
const mainDB=()=>_db||(_db=openDB(DBN,["kv","snaps"]));
const fileDB=()=>_fdb||(_fdb=openDB(FDBN,["f"]));
/* run one transaction; fn returns a request, an array of requests, or nothing */
function run(dbp,store,mode,fn){return dbp.then(d=>new Promise((res,rej)=>{const t=d.transaction(store,mode);let q;try{q=fn(t.objectStore(store))}catch(e){rej(e);return}
  t.oncomplete=()=>res(Array.isArray(q)?q.map(x=>x.result):q&&typeof q=="object"&&"result" in q?q.result:undefined);
  t.onerror=()=>rej(t.error||new Error("transaction"));t.onabort=()=>rej(t.error||new Error("aborted"))}))}

/* encryption: PBKDF2 → AES-GCM */
async function deriveKey(pin,salt,iter){const b=await crypto.subtle.importKey("raw",te.encode(pin),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:iter,hash:"SHA-256"},b,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function sealBuf(key,buf){const iv=crypto.getRandomValues(new Uint8Array(12));return {iv,ct:await crypto.subtle.encrypt({name:"AES-GCM",iv},key,buf)}}
const openBuf=(key,o)=>crypto.subtle.decrypt({name:"AES-GCM",iv:o.iv},key,o.ct);
const seal=(key,str)=>sealBuf(key,te.encode(str));
const unseal=async(key,o)=>td.decode(await openBuf(key,o));
async function sha(s){const b=await crypto.subtle.digest("SHA-256",te.encode("ds:"+s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}

/* save: a mirror in browser storage first (when not encrypted), then only the changed tables in the database */
let saveQ=Promise.resolve();
function persist(force){saveQ=saveQ.then(()=>persistNow(force)).then(()=>{storeErr=""},e=>{storeErr=String(e&&e.message||e);console.warn("save failed",e)});return saveQ}
async function persistNow(force){META.ts=Date.now();
  if(!KEY)try{localStorage.setItem(K,JSON.stringify({...S,_ts:META.ts}))}catch(e){}
  if(useLS)return;
  const ch=[];for(const c of [...COLLS,...LOCAL]){const j=JSON.stringify(S[c]);if(force||lastJSON[c]!==j)ch.push([c,j])}
  const vals=[];for(const [c,j] of ch)vals.push(["c:"+c,KEY?await seal(KEY,j):j]);
  const meta={...META};
  await run(mainDB(),"kv","readwrite",s=>{vals.forEach(([k,val])=>s.put(val,k));s.put(meta,"meta")});
  ch.forEach(([c,j])=>lastJSON[c]=j)}
function save(){try{snapNW()}catch(e){}try{prefsTouch()}catch(e){}persist();try{nativeNotifyLater()}catch(e){}try{syncMark()}catch(e){}try{cloudMark()}catch(e){}}

function adopt(o){const b=blank();for(const c of [...COLLS,...LOCAL])if(o[c]!=null)b[c]=o[c];if(Array.isArray(o.tr))b.tr=o.tr;b.cfg={...blank().cfg,...(b.cfg||{})};S=b}
async function readAll(){const cs=[...COLLS,...LOCAL],vs=await run(mainDB(),"kv","readonly",s=>cs.map(c=>s.get("c:"+c))),o={};
  for(let i=0;i<cs.length;i++){let val=vs[i];if(val==null)continue;if(typeof val!="string")val=await unseal(KEY,val);o[cs[i]]=JSON.parse(val);lastJSON[cs[i]]=val}
  adopt(o)}
/* returns "ready" or "locked" */
async function loadAll(){let ls=null,meta=null;try{ls=JSON.parse(localStorage.getItem(K)||"null")}catch(e){}
  try{meta=await run(mainDB(),"kv","readonly",s=>s.get("meta"))||null}catch(e){useLS=true}
  if(!meta){META={v:2,ts:0,enc:null};if(ls)adopt(ls);mig();if(!useLS)try{await persistNow(true)}catch(e){useLS=true}return "ready"}
  META=meta;if(META.enc)return "locked";
  await readAll();if(ls&&(ls._ts||0)>META.ts)adopt(ls);mig();return "ready"}
const storeLabel=()=>useLS?"browser storage":META.enc?"encrypted phone database":"phone database";

/* PIN lock */
async function tryPin(pin){try{const k=await deriveKey(pin,META.enc.salt,META.enc.iter);if(await unseal(k,META.enc.check)==="ok")return k}catch(e){}return null}
async function lockOn(pin){if(useLS)throw new Error("App lock needs the phone database, which isn’t available here");
  const salt=crypto.getRandomValues(new Uint8Array(16)),iter=250000,key=await deriveKey(pin,salt,iter),oldKey=KEY,oldEnc=META.enc;
  META.enc={salt,iter,check:await seal(key,"ok")};KEY=key;const legacy=S.cfg.pin;delete S.cfg.pin;
  try{await persistNow(true)}catch(e){KEY=oldKey;META.enc=oldEnc;if(legacy)S.cfg.pin=legacy;throw e}
  try{localStorage.removeItem(K)}catch(e){}
  await convertFiles(true).catch(()=>{});await resealSnaps(false).catch(()=>{})}
async function lockOff(){await convertFiles(false);await resealSnaps(true).catch(()=>{});KEY=null;META.enc=null;delete S.cfg.cred;await persistNow(true)}

/* attachments (encrypted too while the lock is on) */
async function fput(id,blob){let val=blob;if(KEY)val={...(await sealBuf(KEY,await blob.arrayBuffer())),type:blob.type||""};return run(fileDB(),"f","readwrite",s=>{s.put(val,id)})}
async function fget(id){const val=await run(fileDB(),"f","readonly",s=>s.get(id));if(val&&val.iv)return new Blob([await openBuf(KEY,val)],{type:val.type||""});return val}
const fdel=id=>run(fileDB(),"f","readwrite",s=>{s.delete(id)}).catch(()=>{});
async function convertFiles(toEnc){const keys=await run(fileDB(),"f","readonly",s=>s.getAllKeys());
  for(const id of keys){const val=await run(fileDB(),"f","readonly",s=>s.get(id));if(!val)continue;
    if(toEnc&&!val.iv&&val.arrayBuffer){const o={...(await sealBuf(KEY,await val.arrayBuffer())),type:val.type||""};await run(fileDB(),"f","readwrite",s=>{s.put(o,id)})}
    if(!toEnc&&val.iv){const b=new Blob([await openBuf(KEY,val)],{type:val.type||""});await run(fileDB(),"f","readwrite",s=>{s.put(b,id)})}}}

/* automatic daily copies (last 7 days the app was opened) */
async function snapPut(k){const j=bk(),val=KEY?await seal(KEY,j):j;await run(mainDB(),"snaps","readwrite",s=>{s.put({k,ts:Date.now(),v:val},k)})}
const hasData=()=>S.tx.length>0||S.dates.length>0||S.inv.length>0||S.loans.length>0||S.goals.length>0||S.acc.length>1;
async function snapDaily(){if(useLS||!hasData())return;try{const ks=await run(mainDB(),"snaps","readonly",s=>s.getAllKeys()),d=today();if(ks.includes(d))return;await snapPut(d);
  const old=ks.filter(k=>/^\d{4}-\d\d-\d\d$/.test(k)).sort().slice(0,-6);if(old.length)await run(mainDB(),"snaps","readwrite",s=>{old.forEach(k=>s.delete(k))})}catch(e){}}
const snapList=()=>run(mainDB(),"snaps","readonly",s=>s.getAll()).then(a=>a.sort((x,y)=>y.ts-x.ts));
async function snapRead(k){const o=await run(mainDB(),"snaps","readonly",s=>s.get(k));if(!o)throw new Error("That copy is no longer there");return typeof o.v=="string"?o.v:unseal(KEY,o.v)}
async function resealSnaps(toPlain){const all=await run(mainDB(),"snaps","readonly",s=>s.getAll()),out=[];
  for(const o of all){try{const j=typeof o.v=="string"?o.v:await unseal(KEY,o.v);out.push({...o,v:toPlain?j:await seal(KEY,j)})}catch(e){}}
  await run(mainDB(),"snaps","readwrite",s=>{s.clear();out.forEach(o=>s.put(o,o.k))})}

/* backup and restore */
const bkObj=()=>({app:"due-and-spend",v:2,at:Date.now(),...Object.fromEntries(COLLS.map(c=>[c,S[c]])),nw:S.nw,cfg:{rate:S.cfg.rate,view:S.cfg.view,fixedCats:S.cfg.fixedCats,theme:S.cfg.theme,...Object.fromEntries(PREFX.map(k=>[k,S.cfg[k]??null]))}});
const bk=()=>JSON.stringify(bkObj());
const allAtt=()=>[...S.dates,...S.inv,...S.docs,...S.subs].flatMap(x=>x.att||[]);
async function b64(blob){const u=new Uint8Array(await blob.arrayBuffer());let s="";for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)}
function unb64(s){const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
async function bkFull(){const o=bkObj();o.files={};for(const a of allAtt()){try{const b=await fget(a.id);if(b)o.files[a.id]={type:b.type||a.type||"",data:await b64(b)}}catch(e){}}return JSON.stringify(o)}
async function restoreFrom(text){let o;try{o=JSON.parse(text)}catch(e){throw new Error("That isn’t a valid backup")}
  if(!o||!Array.isArray(o.dates)||!Array.isArray(o.tx))throw new Error("That isn’t a valid backup");
  if(!useLS&&hasData())await snapPut("before-restore").catch(()=>{});
  const keep={cred:S.cfg.cred,last:S.cfg.lastBk,hide:S.cfg.hide},bin=S.bin;adopt(o);S.bin=bin;delete S.cfg.pin;delete S.cfg.cred;if(keep.cred)S.cfg.cred=keep.cred;if(keep.last)S.cfg.lastBk=keep.last;if(keep.hide)S.cfg.hide=keep.hide;mig();
  /* a restore replaces everything, on every synced device too */
  try{if(CLS.on){CLS.force=true;clv()}if(SY.on){SY.force=true;syv()}}catch(e){}
  if(o.files)for(const id in o.files){try{await fput(id,new Blob([unb64(o.files[id].data)],{type:o.files[id].type||""}))}catch(e){}}
  save()}

/* recycle bin: deleted records are kept for 30 days */
function trash(c,id){const i=S[c].findIndex(x=>x.id==id);if(i<0)return null;const r=S[c].splice(i,1)[0],at=Date.now();S.bin.push({c,r,at});S.del.push({id:r.id,at});return r}
function untrash(id){const i=S.bin.findIndex(b=>b.r.id==id);if(i<0)return null;const b=S.bin.splice(i,1)[0];S.del=S.del.filter(t=>t.id!=b.r.id);b.r.ut=Date.now();if(!S[b.c].some(x=>x.id==b.r.id))S[b.c].push(b.r);if(b.c=="tx")linkApply(b.r,1);return b}
function purgeBin(all){const lim=all?Infinity:Date.now()-30*864e5,n=S.bin.length;S.bin=S.bin.filter(b=>{if(b.at>=lim)return true;(b.r.att||[]).forEach(a=>fdel(a.id));return false});return n!=S.bin.length}
