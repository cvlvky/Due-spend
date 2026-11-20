/* ===== Google Drive backup (Android app): daily automatic, last 15 kept, restore from any ===== */
const GD={tok:"",at:0,busy:false,api:"https://www.googleapis.com/drive/v3",up:"https://www.googleapis.com/upload/drive/v3",dir:"Personal Diary backups",keep:15};
const gdLS=(k,v2)=>{try{if(v2===undefined)return localStorage.getItem("ds-gd-"+k)||"";if(v2===null)localStorage.removeItem("ds-gd-"+k);else localStorage.setItem("ds-gd-"+k,v2)}catch(e){return ""}};
const gdOn=()=>gdLS("on")=="1";
async function gdToken(ask){if(GD.tok&&Date.now()-GD.at<45*60e3)return GD.tok;if(!isApp())throw new Error("Google Drive backup works in the Android app");
  const r=await NP("DueNative","driveToken",{interactive:!!ask,account:gdLS("acct")});if(!r||!r.token)throw new Error("No access to Google Drive");GD.tok=r.token;GD.at=Date.now();gdLS("need",null);return GD.tok}
async function gdFetch(url,opt,ask){opt=opt||{};for(let i=0;i<2;i++){const t=await gdToken(ask);const r=await fetch(url,{...opt,headers:{...(opt.headers||{}),Authorization:"Bearer "+t}});
  if(r.status==401&&i==0){GD.tok="";continue}if(!r.ok){let m="";try{m=(await r.json()).error.message}catch(e){}throw new Error("Google Drive: "+(m||r.status))}return r}}
async function gdFolder(ask){let id=gdLS("dir");if(id){try{const r=await gdFetch(GD.api+"/files/"+id+"?fields=id,trashed",{},ask);const j=await r.json();if(!j.trashed)return id}catch(e){}}
  const q=encodeURIComponent(`name='${GD.dir}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);const f=(await (await gdFetch(GD.api+"/files?q="+q+"&fields=files(id)",{},ask)).json()).files||[];
  if(f.length)id=f[0].id;else id=(await (await gdFetch(GD.api+"/files?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:GD.dir,mimeType:"application/vnd.google-apps.folder"})},ask)).json()).id;
  gdLS("dir",id);return id}
const b64u8=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
const u8b64x=u=>{let t="";for(let i=0;i<u.length;i+=8192)t+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(t)};
async function gdList(ask){const dir=await gdFolder(ask),q=encodeURIComponent(`'${dir}' in parents and trashed=false`);
  return (await (await gdFetch(GD.api+"/files?q="+q+"&orderBy=createdTime desc&pageSize=100&fields=files(id,name,size,createdTime)",{},ask)).json()).files||[]}
async function gdBackup(ask,why){if(GD.busy)return false;GD.busy=true;try{
  const dir=await gdFolder(ask),z=b64u8(await gz(bkSync())),d=new Date(),p=n=>String(n).padStart(2,"0"),name=`personal-diary-${today()}-${p(d.getHours())}${p(d.getMinutes())}.json.gz`,B="pdb"+Date.now();
  const meta={name,parents:[dir],mimeType:"application/gzip",description:"Personal Diary backup, version "+VER+(why?" ("+why+")":"")};
  const body=new Blob([`--${B}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${B}\r\nContent-Type: application/gzip\r\n\r\n`,z,`\r\n--${B}--`]);
  await gdFetch(GD.up+"/files?uploadType=multipart&fields=id",{method:"POST",headers:{"Content-Type":"multipart/related; boundary="+B},body},ask);
  gdLS("last",new Date().toISOString());gdLS("err",null);
  try{const L=await gdList(false);for(const f of L.slice(GD.keep))await gdFetch(GD.api+"/files/"+f.id,{method:"DELETE"},false)}catch(e){}
  return true}catch(e){const m=String(e&&e.message||e);gdLS("err",m);if(/needs-consent|cancel/i.test(m))gdLS("need","1");throw e}finally{GD.busy=false}}
async function gdAuto(){if(!gdOn()||!isApp()||GD.busy)return;const last=gdLS("last");if(last&&Date.now()-Date.parse(last)<20*3600e3)return;
  try{await gdBackup(false,"automatic");if(tab=="home")render()}catch(e){console.warn("drive backup",e)}}
function gdStatus(){const last=gdLS("last");if(!gdOn())return "Off";if(gdLS("need"))return "Needs you to sign in again";return last?"Last backup "+fmt(last.slice(0,10))+", "+new Date(last).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"No backup yet"}
function gdSheet(){if(!isApp())return sheet(`<h2>Google Drive backup</h2><p class="sub">This works in the Android app. In the browser, use Settings → Backup now to save a backup file.</p>`);
  sheet(`<h2>Google Drive backup</h2><p class="sub">Backs up once a day to a “${GD.dir}” folder in your own Google Drive and keeps the last ${GD.keep}. The app can only see files it made there, nothing else in your Drive.</p>
  <div class="card"><div class="hbl"><span>Status</span><b>${esc(gdStatus())}</b></div>${gdLS("err")&&gdOn()?`<p class="note" style="color:var(--late);margin:6px 0 0">Last try failed: ${esc(gdLS("err"))}</p>`:""}</div>
  ${F("f_gda","Google account to back up to",gdLS("acct"),"email",'placeholder="name@gmail.com (leave empty to choose)" autocomplete="off"')}
  <div class="acts">${gdOn()?`<button class="btn" data-act="gdNow">Back up now</button><button class="btn ghost" data-act="gdRestore">Restore from Drive</button><button class="btn ghost" data-act="gdOff">Turn off</button>`:`<button class="btn" data-act="gdStart">Connect Google Drive</button><button class="btn ghost" data-act="gdRestore">Restore from Drive</button>`}</div>
  <p class="note">Your wife can turn it on in her phone too; each phone backs up to its own Drive.</p>`)}
async function gdRestoreSheet(){sheet(`<h2>Restore from Drive</h2><div class="empty">Loading backups…</div>`);let L;try{L=await gdList(true)}catch(e){return sheet(`<h2>Restore from Drive</h2><div class="empty">${esc(e.message||e)}</div>`)}
  sheet(`<h2>Restore from Drive</h2><p class="sub">Restoring replaces what’s on this phone with the backup. A copy of the current data is kept first.</p>${L.length?L.slice(0,GD.keep).map(f=>`<div class="row" data-act="gdPick" data-id="${f.id}"><div><b>${fmt(f.createdTime.slice(0,10))}, ${new Date(f.createdTime).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</b><small>${Math.max(1,Math.round((+f.size||0)/1024))} KB</small></div><b>Restore</b></div>`).join(""):`<div class="empty">No backups in your Drive yet.</div>`}`)}
{const _ti=todoItems;todoItems=function(){const L=_ti();if(gdOn()){const last=gdLS("last"),old=!last||Date.now()-Date.parse(last)>3*864e5;
  if(gdLS("need")||old)L.push({k:-900,ic:"☁️",tx:gdLS("need")?"Google Drive backup needs you to sign in":"No Drive backup for "+(last?Math.floor((Date.now()-Date.parse(last))/864e5)+" days":"a while"),sub:"Tap to back up now",act:"gdNow",tone:"soon"})}return L.sort((a,b)=>a.k-b.k)}}
{const _st=settings;settings=function(...a){const r=_st(...a);try{const box=$("#set_more");if(box&&!$("#set_gd")){box.insertAdjacentHTML("afterbegin",`<button id="set_gd" data-act="gdSheet">☁️ Drive backup: ${esc(gdOn()?(gdLS("need")?"sign in":"on"):"off")}</button>`);if(taOn())taNode(box)}}catch(e){}return r}}
{const _s=start;start=function(...a){const r=_s(...a);setTimeout(()=>gdAuto(),12000);return r}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState=="hidden")setTimeout(()=>gdAuto(),500)});
Object.assign(TA,{"Google Drive backup":"Google Drive காப்புப்பிரதி","Connect Google Drive":"Google Drive-ஐ இணை","Restore from Drive":"Drive-இலிருந்து மீட்டெடு","Turn off":"நிறுத்து"});
NEW27.unshift("Automatic daily backup to your Google Drive (Settings → ☁️ Drive backup)");
Object.assign(ACT,{
  gdSheet(){gdSheet()},
  async gdStart(){const em=($("#f_gda")?v("f_gda"):"").trim().toLowerCase();if(em!=gdLS("acct")){if(em)gdLS("acct",em);else gdLS("acct",null);GD.tok="";gdLS("dir",null)}toast("Opening Google sign-in…");const was=gdOn();try{gdLS("on","1");await gdBackup(true,"first");toast("Google Drive backup is on");gdSheet()}catch(e){if(!was)gdLS("on",null);const m=String(e.message||e);toast(/cancel|needs-consent/i.test(m)?"Google sign-in was cancelled":m);gdSheet()}},
  async gdNow(){if(!isApp())return gdSheet();toast("Backing up to Google Drive…");try{await gdBackup(true,"manual");toast("Backed up to Google Drive");if($("#over").innerHTML)gdSheet();render()}catch(e){toast(String(e.message||e))}},
  gdOff(){gdLS("on",null);gdLS("need",null);GD.tok="";sheet("");toast("Drive backup turned off. Backups already in Drive stay there.")},
  gdRestore(){gdRestoreSheet()},
  async gdPick(id){if(!confirm("Replace the data on this phone with this backup?"))return;toast("Downloading backup…");
    try{const r=await gdFetch(GD.api+"/files/"+id+"?alt=media",{},true),u=new Uint8Array(await r.arrayBuffer()),txt=u[0]==0x1f&&u[1]==0x8b?await gunz(u8b64x(u)):new TextDecoder().decode(u);
      syncFromBackup(txt);await restoreFrom(txt);sheet("");render();toast("Restored from Google Drive")}catch(e){toast(String(e.message||e))}}
});

/* ---------- attached files (documents, ID cards, receipts) in Drive too ---------- */
const attEvery=()=>{const L=[...allAtt(),...S.tx.flatMap(x=>x.att||[]),...(S.loans||[]).flatMap(x=>x.att||[]),...(S.goals||[]).flatMap(x=>x.att||[])],seen=new Set();return L.filter(a=>a&&a.id&&!seen.has(a.id)&&seen.add(a.id))};
/* "Backup with files" now includes receipts too */
bkFull=async function(){const o=bkObj();o.files={};for(const a of attEvery()){try{const b=await fget(a.id);if(b)o.files[a.id]={type:b.type||a.type||"",data:await b64(b)}}catch(e){}}return JSON.stringify(o)};
const gdMap=()=>{try{return JSON.parse(gdLS("fmap")||"{}")||{}}catch(e){return {}}};
async function gdSub(ask){let id=gdLS("fdir");const dir=await gdFolder(ask);if(id){try{const j=await (await gdFetch(GD.api+"/files/"+id+"?fields=id,trashed",{},ask)).json();if(!j.trashed)return id}catch(e){}}
  const q=encodeURIComponent(`name='Files' and '${dir}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`),f=(await (await gdFetch(GD.api+"/files?q="+q+"&fields=files(id)",{},ask)).json()).files||[];
  id=f.length?f[0].id:(await (await gdFetch(GD.api+"/files?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"Files",parents:[dir],mimeType:"application/vnd.google-apps.folder"})},ask)).json()).id;gdLS("fdir",id);return id}
async function gdFilesUp(ask){const L=attEvery();if(!L.length)return 0;const M=gdMap();let todo=L.filter(a=>!M[a.id]);if(!todo.length)return 0;const sub=await gdSub(ask);let n=0;
  for(const a of todo.slice(0,40)){try{const b=await fget(a.id);if(!b)continue;const B="pdf"+Date.now()+n,meta={name:String(a.name||"file").replace(/[\\/]/g,"-").slice(0,80),parents:[sub],mimeType:b.type||a.type||"application/octet-stream",appProperties:{att:a.id}};
    const body=new Blob([`--${B}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${B}\r\nContent-Type: ${meta.mimeType}\r\n\r\n`,b,`\r\n--${B}--`]);
    const j=await (await gdFetch(GD.up+"/files?uploadType=multipart&fields=id",{method:"POST",headers:{"Content-Type":"multipart/related; boundary="+B},body},ask)).json();M[a.id]=j.id;n++;gdLS("fmap",JSON.stringify(M))}catch(e){console.warn("drive file",e)}}
  return n}
async function gdFileGet(attId,ask){let fid=gdMap()[attId];if(!fid){const sub=await gdSub(ask),q=encodeURIComponent(`'${sub}' in parents and appProperties has { key='att' and value='${attId}' } and trashed=false`);const f=(await (await gdFetch(GD.api+"/files?q="+q+"&fields=files(id)",{},ask)).json()).files||[];if(!f.length)return null;fid=f[0].id}
  const r=await gdFetch(GD.api+"/files/"+fid+"?alt=media",{},ask),b=await r.blob();await fput(attId,b);const M=gdMap();M[attId]=fid;gdLS("fmap",JSON.stringify(M));return b}
async function gdFilesDown(ask){let n=0;for(const a of attEvery()){try{if(await fget(a.id))continue;if(await gdFileGet(a.id,ask))n++}catch(e){}}return n}
/* daily backup also sends new files */
{const _gb=gdBackup;gdBackup=async function(ask,why){const r=await _gb(ask,why);if(r){try{const n=await gdFilesUp(ask);if(n)gdLS("fn",String(Object.keys(gdMap()).length))}catch(e){console.warn("drive files",e)}}return r}}
/* restoring from Drive brings the files back */
{const _gp=ACT.gdPick;ACT.gdPick=async function(id){await _gp.call(this,id);try{const n=await gdFilesDown(true);if(n){toast(n+(n==1?" file":" files")+" restored from Drive");render()}}catch(e){console.warn(e)}}}
/* opening a file that isn't on this phone fetches it from Drive */
{const _va=viewAtt;viewAtt=async function(id){let have=null;try{have=await fget(id)}catch(e){}if(!have&&gdOn()&&isApp()){try{toast("Getting the file from Google Drive…");await gdFileGet(id,true)}catch(e){}}return _va(id)}}
/* the old "files aren't backed up" reminder is answered by Drive */
{const _ti2=todoItems;todoItems=function(){let L=_ti2();if(gdOn()){const M=gdMap(),miss=attEvery().filter(a=>!M[a.id]).length;L=L.filter(x=>!/attached files? (isn’t|aren’t) in a backup/.test(x.tx))}return L}}
{const _gs=gdSheet;gdSheet=function(){_gs();try{const n=attEvery().length,up=Object.keys(gdMap()).filter(k=>attEvery().some(a=>a.id==k)).length,c=$("#over .card");if(c&&isApp())c.insertAdjacentHTML("beforeend",`<div class="hbl" style="margin-top:6px"><span>Documents and photos</span><b>${n?up+" of "+n+" in Drive":"none attached"}</b></div>`)}catch(e){}}}
