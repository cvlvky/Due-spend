/* ===== save and sync on open, and a confirmation when leaving ===== */
const tstr=ts=>{if(!ts)return "";const d=iso(new Date(ts)),t=new Date(ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});return d==today()?"today at "+t:dl(d)==-1?"yesterday at "+t:fmt(d)+" at "+t};
const withTimeout=(p,ms)=>Promise.race([Promise.resolve(p).catch(()=>{}),new Promise(r=>setTimeout(r,ms))]);
/* daily backup file (phone app), keeping the latest 14 */
nativeBackup=async function(){if(!isApp()||META.enc||!hasData()||S.cfg.autoBk==today())return;
  try{await NP("DueNative","saveDownload",{name:"personal-diary-backup-"+today()+".json",text:bk(),mime:"application/json"});S.cfg.autoBk=today();S.cfg.autoBkAt=Date.now();S.cfg.lastBk=today();save();
    NP("DueNative","pruneBackups",{keep:14,prefix:"personal-diary-backup-"}).catch(()=>{})}catch(e){}};
{const _full=nativeFullBackup;nativeFullBackup=async function(){await _full();if(isApp())NP("DueNative","pruneBackups",{keep:3,prefix:"personal-diary-full-backup-"}).catch(()=>{})}}
let openedAt=0;
async function onOpen(){openedAt=Date.now();try{await persist()}catch(e){}
  if(!useLS)snapPut("latest").catch(()=>{});
  if(SY.on){SY.dirty=true;syv();if(me&&me.emailVerified)pushNow()}
  if(isApp())nativeBackup().then(nativeFullBackup)}
let hiddenAt=0;
document.addEventListener("visibilitychange",()=>{if(document.hidden){hiddenAt=Date.now();exitOk=false;persist();if(SY.on&&SY.dirty&&me&&me.emailVerified)pushNow()}
  else if(hiddenAt&&Date.now()-hiddenAt>30*60000&&!lockMode)onOpen()});
/* leaving with the back button */
let exitOk=false,exiting=false;
async function saveAll(){await withTimeout(persist(),3000);let synced=null;
  if(SY.on&&me&&me.emailVerified){const before=SY.lastOk||0;SY.dirty=true;await withTimeout(pushNow(),7000);synced=(SY.lastOk||0)>before}
  if(isApp())await withTimeout(nativeBackup(),5000);if(!useLS)await withTimeout(snapPut("latest"),3000);return synced}
async function exitDialog(){if(exiting)return;exiting=true;sheet(`<h2>Saving…</h2><p class="sub">Saving your data${SY.on?" and syncing":""} before you leave.</p>`);
  let synced=null;try{synced=await saveAll()}catch(e){}exiting=false;
  const row=(ok,l,t)=>`<div class="hrow"><span class="dot ${ok}"></span><div><b>${l}</b><small>${t}</small></div></div>`;
  sheet(`<h2>All saved</h2><div class="card">${row("good","Saved on this phone",tstr(Date.now()))}
  ${SY.on?row(synced===false?"warn":SY.lastOk?"good":"warn","Last synced",SY.lastOk?tstr(SY.lastOk)+(me&&me.email?" as "+esc(me.email):"")+(synced===false?". This time it couldn’t sync, probably no internet. It will sync next time.":""):"Not synced yet"):row("","Sync between phones","Off")}
  ${isApp()?row(META.enc?"warn":S.cfg.autoBkAt?"good":"warn","Backup file in Downloads",META.enc?"Paused while app lock is on":S.cfg.autoBkAt?tstr(S.cfg.autoBkAt):"Not saved yet"):row(S.cfg.lastBk?"good":"warn","Backup file",S.cfg.lastBk?"Last exported "+fmt(S.cfg.lastBk):"Never exported")}</div>
  <div class="acts"><button class="btn" data-act="exitNow">Close app</button><button class="btn ghost" data-act="closeX">Stay</button></div>`)}
{const _back=window.__dsBack;window.__dsBack=()=>{const r=_back();if(r)return true;if($("#lock").innerHTML)return false;if(exitOk)return false;exitDialog();return true}}
ACT.exitNow=async()=>{exitOk=true;sheet("");try{await NP("DueNative","exitApp")}catch(e){toast("Press back again to close")}};
