/* ===== sync ===== */
/* Records merge by id: the newer edit wins. Deleted ids are remembered (S.del), so a delete on one device
   is not undone by another device's copy; a record edited or restored after the delete wins over it. */
const tombMap=a=>{const m=new Map();(a||[]).forEach(t=>{if(t&&t.id&&(!m.has(t.id)||m.get(t.id)<t.at))m.set(t.id,+t.at||0)});return m};
const dead=(x,tm)=>tm.has(x.id)&&tm.get(x.id)>=(x.ut||0);
function mergeColl(L,R,tm,preferLocal){const m=new Map();(R||[]).forEach(r=>m.set(r.id,r));
  (L||[]).forEach(l=>{const r=m.get(l.id);if(!r)m.set(l.id,l);else{const a=l.ut||0,b=r.ut||0;m.set(l.id,a>b?l:b>a?r:preferLocal?l:r)}});
  return [...m.values()].filter(x=>!dead(x,tm))}
/* older versions kept transfers in their own list */
function normR(R){R=R||{};if(Array.isArray(R.tr)&&R.tr.length){const have=new Set((R.tx||[]).map(x=>x.id));R.tx=[...(R.tx||[]),...R.tr.filter(t=>!have.has(t.id)).map(t=>({id:t.id,kind:"tr",acc:t.from,to:t.to,amt:+t.amt||0,got:+t.got||0,fee:+t.fee||0,date:t.date,note:t.note||""}))]}delete R.tr;return R}
/* the merged state of this device and a remote copy; a list missing from R is left as it is here */
function mergeCalc(R,preferLocal){R=normR(R);const tm=tombMap([...(S.del||[]),...(R.del||[])]),o={},live=new Map(),lim=Date.now()-180*864e5;
  COLLS.forEach(c=>{o[c]=Array.isArray(R[c])?mergeColl(S[c],R[c],tm,preferLocal):(S[c]||[]).filter(x=>!dead(x,tm));o[c].forEach(x=>live.set(x.id,x.ut||0))});
  o.prefs=R.prefs&&(R.prefs.pu||0)>(S.cfg.pu||0)?R.prefs:prefsOut();
  o.del=[...tm].filter(([id,at])=>at>lim&&!(live.has(id)&&live.get(id)>at)).map(([id,at])=>({id,at}));return o}
function mergeInto(R,preferLocal){const o=mergeCalc(R,preferLocal);COLLS.forEach(c=>S[c]=o[c]);S.del=o.del;prefsIn(o.prefs);mig()}
const hhmm=()=>new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
/* a device with nothing on it yet should take the shared data as it is, without adding its empty starter account */
const dropStarter=()=>{if(!hasData()&&S.acc.length==1&&!S.acc[0].ut&&!+S.acc[0].open)S.acc=[]};

/* ----- Google (Firebase) sync: installed app only ----- */
const SK="ds-sync";let SY={};try{SY=JSON.parse(localStorage.getItem(SK)||"{}")||{}}catch(e){}
const syv=()=>{try{localStorage.setItem(SK,JSON.stringify(SY))}catch(e){}};
let fdb=null,unsub=null,pushT=null,me=null,started=false;
const sset=t=>{if(/^Synced/.test(t)){SY.lastOk=Date.now();syv()}sstat=t;try{const e=$("#sstat");if(e)e.textContent=t}catch(x){}};
function syncMark(){if(SY.on&&!SY.applying){SY.dirty=true;syv();clearTimeout(pushT);pushT=setTimeout(pushNow,1500)}}
function loadFB(){return new Promise((res,rej)=>{if(window.firebase)return res();const u=["app","auth","firestore"].map(n=>`https://www.gstatic.com/firebasejs/10.12.2/firebase-${n}-compat.js`);let i=0;(function nx(){if(i>=u.length)return res();const s=document.createElement("script");s.src=u[i++];s.onload=nx;s.onerror=()=>rej(new Error("load"));document.head.appendChild(s)})()})}
async function syncStart(){if(started||!SY.cfg||!SY.space)return;
  try{await loadFB();if(!firebase.apps.length)firebase.initializeApp(SY.cfg);fdb=firebase.firestore();started=true;
    firebase.auth().onAuthStateChanged(u=>{me=u;if(!u)return sset("Not signed in");if(!u.emailVerified)return sset("Signed in as "+u.email+", but the email isn’t confirmed yet. Open the link in the email from Firebase, then tap I’ve confirmed.");sset("Signed in as "+u.email);listen()})}
  catch(e){sset("Sync unavailable here")}}
function takeRemote(R,gen,known,dirty){/* a higher generation means someone restored a backup: take their copy whole */
  if(known!=null&&(gen||0)>known){R=normR(R);COLLS.forEach(c=>{if(Array.isArray(R[c]))S[c]=R[c]});S.del=R.del||[];if(R.prefs){S.cfg.pu=0;prefsIn(R.prefs)}mig()}
  else{if(known==null)dropStarter();mergeInto(R,dirty)}}
/* the cloud copy: plain JSON while small; gzip, then split into pieces of the same "spaces" collection when large (Firestore allows 1 MB per document) */
let SYLIM=700000,snapSeq=0;
async function gz(s){const b=new Uint8Array(await new Response(new Blob([s]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());let t="";for(let i=0;i<b.length;i+=8192)t+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return btoa(t)}
async function gunz(z){const bin=atob(z),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip"))).text()}
async function packData(o){const j=JSON.stringify(o);if(j.length<=SYLIM||typeof CompressionStream=="undefined")return {data:j,z:"",n:0,parts:[],size:j.length};
  const z=await gz(j);if(z.length<=SYLIM)return {data:"",z,n:0,parts:[],size:z.length};const parts=[];for(let i=0;i<z.length;i+=SYLIM)parts.push(z.slice(i,i+SYLIM));return {data:"",z:"",n:parts.length,parts,size:z.length}}
async function unpackDoc(d,getPart){if(+d.n>0){let z="";for(let i=0;i<d.n;i++){const p=await getPart(i);if(!p||p.h!=d.h)throw new Error("parts not ready");z+=p.s}return JSON.parse(await gunz(z))}
  if(d.z)return JSON.parse(await gunz(d.z));return JSON.parse(d.data||"{}")}
const partRef=i=>fdb.collection("spaces").doc(SY.space+"__p"+i);
async function partGet(i){const x=await partRef(i).get();return x.exists?x.data():null}
function listen(){if(unsub)unsub();const ref=fdb.collection("spaces").doc(SY.space);
  unsub=ref.onSnapshot(sn=>{if(!sn.exists){SY.owner=true;syv();pushNow();return}if(sn.metadata.hasPendingWrites)return;const d=sn.data(),my=++snapSeq;SY.members=d.members||SY.members;
    (async()=>{let R;try{R=await unpackDoc(d,partGet)}catch(e){console.warn("sync read",e);setTimeout(async()=>{if(my!=snapSeq)return;try{const x=await ref.get();if(x.exists&&my==snapSeq){const R2=await unpackDoc(x.data(),partGet);applySnap(x.data(),R2)}}catch(er){sset("Sync is waiting for the rest of the data")}},2500);return}
      if(my==snapSeq)applySnap(d,R)})()},err=>sset("Sync error: "+(err.code||"check your rules")))}
function applySnap(d,R){SY.applying=true;try{if(!SY.force){takeRemote(R,d.gen,SY.gen,!!SY.dirty);SY.gen=d.gen||0}SY.size=(d.data||"").length+(d.z||"").length+(+d.n||0)*SYLIM;syv();persist();render()}catch(e){console.warn(e)}SY.applying=false;
  sset("Synced "+hhmm()+(d.by&&me&&d.by!==me.email?" · last edit by "+d.by:""));if(SY.dirty||SY.force)pushNow()}
async function pushNow(){if(!fdb||!me||!me.emailVerified||!SY.space)return;
  try{const ref=fdb.collection("spaces").doc(SY.space),force=!!SY.force;let merged,gen,adopt=false;
    await fdb.runTransaction(async t=>{const sn=await t.get(ref),d=sn.exists?sn.data():null;adopt=false;
      /* someone restored a backup since this phone last synced: take their copy instead of merging old records back in */
      if(d&&!force&&SY.gen!=null&&(d.gen||0)>(SY.gen||0)){merged=normR(await unpackDoc(d,async i=>{const x=await t.get(partRef(i));return x.exists?x.data():null}));gen=d.gen||0;adopt=true;return}
      gen=Math.max(d&&d.gen||0,SY.gen||0)+(force?1:0);
      const R=d&&!force?await unpackDoc(d,async i=>{const x=await t.get(partRef(i));return x.exists?x.data():null}):{};
      merged=force||!d?{...Object.fromEntries(COLLS.map(c=>[c,S[c]])),del:S.del,prefs:prefsOut()}:mergeCalc(R,true);
      const P=await packData(merged),mem=d?(d.members||[]):[me.email,...(SY.members||[])],h=uid(),ts=Date.now();SY.size=P.size;
      P.parts.forEach((x,i)=>t.set(partRef(i),{members:mem,h,s:x,i,ts}));for(let i=P.n;i<(+(d&&d.n)||0);i++)t.delete(partRef(i));
      t.set(ref,{data:P.data,z:P.z,n:P.n,h,members:mem,by:me.email,ts,gen})});
    if(adopt){SY.applying=true;COLLS.forEach(c=>{if(Array.isArray(merged[c]))S[c]=merged[c]});S.del=merged.del||[];if(merged.prefs){S.cfg.pu=0;prefsIn(merged.prefs)}mig();SY.gen=gen;SY.dirty=false;syv();persist();SY.applying=false;sset("Synced "+hhmm()+" · took the restored copy");render();return}
    /* a restore that started while this upload was running still needs its own upload */
    const later=!force&&SY.force;SY.applying=true;if(!later){COLLS.forEach(c=>S[c]=merged[c]);S.del=merged.del;prefsIn(merged.prefs);mig()}SY.gen=gen;if(force)SY.force=false;SY.dirty=later;syv();persist();SY.applying=false;sset("Synced "+hhmm());render();if(later)pushNow()}
  catch(e){SY.applying=false;sset("Sync error: "+(e.code||e.message))}}
function syncForm(){sheet(`<h2>Google sync</h2><p class="sub">Shares your data live with people you invite. It works in the installed app. See SETUP-SYNC.txt for the one-time setup.</p>${F("f_scode","Have a setup code? Paste it here","","text",'placeholder="DS1.…" autocomplete="off"')}<div class="acts"><button class="btn ghost" data-act="useCode">Use setup code</button></div><p class="note" style="text-align:center">or enter the details yourself</p><label for="f_cfg">Firebase config (paste the lines with apiKey, projectId and so on)</label><textarea id="f_cfg" rows="4" placeholder='apiKey: "...", authDomain: "...", projectId: "..."'>${esc(SY.cfg?Object.entries(SY.cfg).map(([k,x])=>k+': "'+x+'"').join(",\n"):"")}</textarea>${F("f_sp","Space ID (same on every phone)",SY.space||"home-"+uid().slice(0,5))}<div class="acts"><button class="btn" data-act="syncSave">Save settings</button></div><p class="note" id="sstat">${esc(sstat)}</p>`+
  (SY.on?`<h3>Sign in</h3>${F("f_se","Email",me&&me.email||SY.email||"","email",'autocomplete="username"')}${F("f_sp2","Password (8 or more characters)","","password",'autocomplete="current-password"')}<div class="acts"><button class="btn" data-act="syncEmailIn">Sign in</button><button class="btn ghost" data-act="syncEmailNew">Create account</button></div><div class="acts"><button class="btn ghost sm" data-act="syncVerified">I’ve confirmed my email</button><button class="btn ghost sm" data-act="syncReset">Forgot password</button></div>${isApp()?"":`<div class="acts"><button class="btn ghost" data-act="syncIn">Sign in with Google</button></div>`}<div class="acts"><button class="btn ghost" data-act="syncNow">Sync now</button></div>${F("f_em","Invite someone (their Google email)","","email",'placeholder="name@gmail.com"')}<div class="acts"><button class="btn ghost" data-act="addMember">Add person</button><button class="btn del" data-act="syncOff">Turn off</button></div><p class="note">${(SY.members||[]).map(esc).join(", ")}</p><p class="note">Attached files and the recycle bin are not synced. The QAR rate, fixed-cost categories and savings challenge are. Update the app on every phone before syncing.</p>${setupCard()}`:""))}

const authMsg=e=>({"auth/invalid-email":"That email address isn’t valid","auth/email-already-in-use":"That email already has an account. Tap Sign in","auth/weak-password":"Use a longer password","auth/wrong-password":"Wrong email or password","auth/invalid-credential":"Wrong email or password","auth/user-not-found":"No account with that email. Tap Create account","auth/network-request-failed":"No internet connection","auth/too-many-requests":"Too many tries. Wait a few minutes","auth/operation-not-allowed":"Turn on Email/Password sign-in in your Firebase project first"})[e&&e.code]||"Sign-in failed: "+(e&&(e.code||e.message)||e);
async function fbAuth(){await loadFB();if(!firebase.apps.length)firebase.initializeApp(SY.cfg);await syncStart();return firebase.auth()}
Object.assign(ACT,{
  async syncEmailIn(){const em=v("f_se").trim(),pw=v("f_sp2");if(!em||!pw)return toast("Enter your email and password");
    try{const a=await fbAuth();await a.signInWithEmailAndPassword(em,pw);SY.email=em;syv();syncForm();toast(a.currentUser&&a.currentUser.emailVerified?"Signed in":"Now confirm your email")}catch(e){toast(e&&e.message=="load"?"Sync needs an internet connection":authMsg(e))}},
  async syncEmailNew(){const em=v("f_se").trim(),pw=v("f_sp2");if(!em||pw.length<8)return toast("Enter your email and a password of 8 or more characters");
    try{const a=await fbAuth();await a.createUserWithEmailAndPassword(em,pw);SY.email=em;syv();try{await a.currentUser.sendEmailVerification()}catch(e){}syncForm();toast("Account created. Open the link in the email we sent you")}catch(e){toast(e&&e.message=="load"?"Sync needs an internet connection":authMsg(e))}},
  async syncVerified(){try{const a=await fbAuth(),u=a.currentUser;if(!u)return toast("Sign in first");await u.reload();if(!a.currentUser.emailVerified){try{await a.currentUser.sendEmailVerification()}catch(e){}return toast("Not confirmed yet. We sent the email again")}
    await a.currentUser.getIdToken(true);me=a.currentUser;sset("Signed in as "+me.email);listen();syncForm();toast("Email confirmed. Sync is starting")}catch(e){toast(authMsg(e))}},
  async syncReset(){const em=v("f_se").trim();if(!em)return toast("Enter your email first");try{const a=await fbAuth();await a.sendPasswordResetEmail(em);toast("Password reset email sent")}catch(e){toast(authMsg(e))}}
});
/* ----- copy in the viewer's Claude account: Claude link only, opt-in ----- */
const inClaude=()=>{try{return !!(window.claude&&typeof window.claude.use=="function")}catch(e){return false}};
const CLK="ds-cloud";let CLS={};try{CLS=JSON.parse(localStorage.getItem(CLK)||"{}")||{}}catch(e){}
const clv=()=>{try{localStorage.setItem(CLK,JSON.stringify(CLS))}catch(e){}};
const DEV=(()=>{try{let d=localStorage.getItem("ds-dev");if(!d){d=uid();localStorage.setItem("ds-dev",d)}return d}catch(e){return uid()}})();
const CLPARTS=[...COLLS,"del","nw","prefs"],CHUNK=60000;
let CL=null,clDb=null,clUid="",clMsg="",clT=null,clQ=Promise.resolve(),clSent={},clUnsub=null,clDirty=false,clApplying=false;
/* private to the viewer by default; the "family" list is shared with everyone invited to the page */
const clCol=()=>CLS.shared?clDb.collection("family"):clDb.collection("data/users/"+clUid);
async function cloudShare(on){if(!clDb)return;await clQ.catch(()=>{});if(clUnsub){try{clUnsub()}catch(e){}clUnsub=null}
  CLS.shared=!!on;CLS.on=true;delete CLS.seen;delete CLS.gen;CLS.force=false;clSent={};clv();CL=clCol();clDirty=true;clNote("Checking…");cloudBegin();await clQ;render();cloudForm();toast(on?"Sharing is on":"Back to a private copy")}
const clPart=c=>c=="prefs"?{rate:S.cfg.rate,view:S.cfg.view,fixedCats:S.cfg.fixedCats,rateAt:S.cfg.rateAt||""}:S[c];
const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=(h*33^s.charCodeAt(i))>>>0;return h+":"+s.length};
const clNote=t=>{clMsg=t;const e=$("#clmsg");if(e)e.textContent=t};
async function cloudProbe(n){n=n||0;if(!inClaude()){if(n<5)setTimeout(()=>cloudProbe(n+1),1200);return}
  try{const [db,user]=await Promise.all([claude.use("db"),claude.use("user")]);if(!db||!user)return;const id=await user.id();if(!id)return;clDb=db;clUid=id;CL=clCol();
    if(CLS.on)cloudBegin();else if(tab=="home"&&!$("#over").innerHTML&&!$("#lock").innerHTML)render()}catch(e){}}
const cloudCard=()=>CL&&!CLS.on&&!CLS.later?`<div class="card" style="margin:0 0 12px"><b>Keep a safe copy in your Claude account</b><p class="note" style="margin:6px 0">Right now your data is only in this browser. A copy stored with this page in your Claude account is private to you, survives clearing browser data, and appears on your other devices when you open this page signed in.</p><div class="acts"><button class="btn" data-act="cloudOn">Turn on</button><button class="btn ghost" data-act="cloudLater">Not now</button></div></div>`:"";
function cloudMark(){if(CL&&CLS.on&&!clApplying){clDirty=true;clearTimeout(clT);clT=setTimeout(()=>cloudCycle(),4000)}}
function cloudCycle(){clQ=clQ.then(cycle).catch(e=>{clNote("Couldn’t reach your Claude account ("+(e&&(e.code||e.message)||e)+"). It will try again.");clearTimeout(clT);clT=setTimeout(()=>cloudCycle(),30000)});return clQ}
async function clRead(m,c){const n=(m.n&&m.n[c])||0;if(!n)return null;let s="";for(let i=0;i<n;i++){const d=await CL.doc(c+"-"+i).get();if(!d.exists)throw new Error("copy incomplete");s+=d.data().s}return s}
/* one round, one device at a time: take in what changed in the account copy, then write back whatever differs */
async function cycle(){if(!CL||!CLS.on)return;const lock=CL.doc("lock");let held=true;
  try{held=(await lock.acquire({holder:DEV,ttlMs:25000})).acquired}catch(e){}
  if(!held){clearTimeout(clT);clT=setTimeout(()=>cloudCycle(),3000+Math.random()*3000);return}
  const ms=await CL.doc("meta").get(),m=ms.exists?ms.data():null,first=CLS.seen==null;let gen=Math.max(m&&m.gen||0,CLS.gen||0);
  if(CLS.force){gen++;clSent={}}
  else if(m&&m.ts!=CLS.seen){const whole=!first&&(m.gen||0)>(CLS.gen||0),R={};
    for(const c of CLPARTS){if(!whole&&clSent[c]!=null&&m.h&&m.h[c]==hash(clSent[c]))continue;const s=await clRead(m,c);if(s==null)continue;R[c]=JSON.parse(s);clSent[c]=s}
    if((first||whole)&&hasData()&&!useLS)await snapPut("before-account-copy").catch(()=>{});
    clApplying=true;
    try{if(whole){COLLS.forEach(c=>{if(Array.isArray(R[c]))S[c]=R[c]});S.del=R.del||[];mig()}else{if(first)dropStarter();mergeInto(R,clDirty)}
      if(R.nw)S.nw={...R.nw,...S.nw};if(R.prefs&&(whole||!clDirty))for(const k in R.prefs)if(R.prefs[k]!==""&&R.prefs[k]!=null)S.cfg[k]=R.prefs[k];
      try{snapNW()}catch(e){}persist();render()}finally{clApplying=false}}
  let wrote=false;const n={...(m&&m.n||{})},h={...(m&&m.h||{})};
  for(const c of CLPARTS){const j=JSON.stringify(clPart(c));if(j===clSent[c])continue;const k=Math.max(1,Math.ceil(j.length/CHUNK));
    for(let i=0;i<k;i++)await CL.doc(c+"-"+i).set({s:j.slice(i*CHUNK,(i+1)*CHUNK)});
    for(let i=k;i<(n[c]||0);i++)await CL.doc(c+"-"+i).delete();
    n[c]=k;h[c]=hash(j);clSent[c]=j;wrote=true}
  if(wrote||!m||gen!=(m.gen||0)){const ts=Date.now();await CL.doc("meta").set({ts,dev:DEV,n,h,gen,v:2});CLS.seen=ts}else CLS.seen=m.ts;
  CLS.gen=gen;CLS.force=false;clDirty=false;clv();clNote("Copy updated at "+hhmm());
  try{await lock.acquire({holder:DEV,ttlMs:1000})}catch(e){}}
function cloudBegin(){cloudCycle();if(clUnsub)return;
  try{clUnsub=CL.doc("meta").onSnapshot(sn=>{if(!sn.exists||(sn.metadata&&sn.metadata.hasPendingWrites))return;const d=sn.data();if(d&&d.dev!=DEV&&d.ts!=CLS.seen)cloudCycle()},()=>{clUnsub=null})}catch(e){}}
async function cloudEnable(){if(!CL)return toast("Your Claude account isn’t reachable from here");CLS.on=true;CLS.later=false;clv();clMsg="Checking your Claude account…";render();cloudBegin();await clQ;render();if($("#over").innerHTML)cloudForm();toast(clMsg)}
function cloudDisable(){CLS.on=false;clv();clearTimeout(clT);if(clUnsub){try{clUnsub()}catch(e){}clUnsub=null}}
async function cloudDelete(){if(!CL)return;const ms=await CL.doc("meta").get(),m=ms.exists?ms.data():null;cloudDisable();await clQ.catch(()=>{});
  if(m){for(const c of CLPARTS)for(let i=0;i<((m.n&&m.n[c])||0);i++)await CL.doc(c+"-"+i).delete();await CL.doc("meta").delete()}
  try{await CL.doc("lock").delete()}catch(e){}
  CLS={later:true};clSent={};clv()}
function cloudForm(){sheet(`<h2>Claude account copy</h2><p class="sub">Keeps a copy of your records with this page in your Claude account. It is private to you, survives clearing browser data, and keeps your devices in step when you open this page signed in. Attached files and the recycle bin stay on each device. The copy is not encrypted with your app-lock PIN.</p>`+
  (!CL?`<p class="note">Your Claude account isn’t reachable from this view right now.</p>`:CLS.on?`<p class="note" id="clmsg">${esc(clMsg||"On")}</p><div class="acts"><button class="btn" data-act="cloudNow">Update now</button><button class="btn ghost" data-act="cloudOff">Turn off</button></div><div class="acts"><button class="btn del" data-act="cloudWipe">Turn off and delete ${CLS.shared?"the shared copy":"the copy"}</button></div>
  <h3>Family sharing</h3><p class="note">${CLS.shared?"Sharing is on. Everyone you invite to this page reads the same records, and people invited as Contributor can add and change them. Each person opens this page, then turns on Claude account copy and Family sharing.":"Share all your records with people you invite to this page from its Share menu. Invite them as Contributor so they can add entries. Everyone who can open the page will be able to read the shared records."}</p><div class="acts"><button class="btn ${CLS.shared?"ghost":""}" data-act="${CLS.shared?"cloudShareOff":"cloudShareOn"}">${CLS.shared?"Stop sharing on this device":"Share with invited people"}</button></div>`
  :`<div class="acts"><button class="btn" data-act="cloudOn">Turn on, private to me</button><button class="btn ghost" data-act="cloudShareOn">Join family sharing</button></div><p class="note">Family sharing uses one set of records for everyone invited to this page.</p>`))}
