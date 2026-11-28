/* ===== setup code, settings sync, data safety, payment notifications ===== */
/* one code that carries the sync settings to another phone */
function setupCode(){if(!SY.cfg||!SY.space)return "";const o={k:SY.cfg.apiKey,d:SY.cfg.authDomain||"",p:SY.cfg.projectId,a:SY.cfg.appId||"",s:SY.space};
  return "DS1."+btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function readSetup(t){const m=String(t||"").match(/DS1\.([A-Za-z0-9_-]{20,})/);if(!m)return null;
  try{let b=m[1].replace(/-/g,"+").replace(/_/g,"/");while(b.length%4)b+="=";const o=JSON.parse(decodeURIComponent(escape(atob(b))));if(!o||!o.k||!o.p||!o.s)return null;
    const cfg={apiKey:String(o.k),authDomain:String(o.d||o.p+".firebaseapp.com"),projectId:String(o.p)};if(o.a)cfg.appId=String(o.a);return {cfg,space:String(o.s).replace(/[^\w-]/g,"")}}catch(e){return null}}
function qrSvg(text){try{const q=qrcode(0,"M");q.addData(text);q.make();return q.createSvgTag({cellSize:4,margin:4,scalable:true})}catch(e){return ""}}
async function useSetup(t){const r=readSetup(t);if(!r){toast("That isn’t a valid setup code");return false}
  SY={...SY,cfg:r.cfg,space:r.space,on:true,members:SY.members||[]};syv();started=false;await syncStart();syncForm();toast("Setup code added. Now sign in.");return true}
const setupCard=()=>{const c=setupCode();return c?`<h3>Set up another phone</h3><div class="qrbox">${qrSvg(c)}</div><p class="note">On the other phone, open Google sync and paste this code, or point its camera at the square and copy the text it shows. It holds the connection details and Space ID, not your password.</p><textarea id="f_code" rows="3" readonly aria-label="Setup code">${esc(c)}</textarea><div class="acts"><button class="btn ghost" data-act="copyCode">Copy setup code</button></div>`:""};

/* settings that follow you to every synced phone */
let prefsJ="";
const PREFX=[];
const prefsObj=()=>({rate:S.cfg.rate,rateAt:S.cfg.rateAt||"",fixedCats:S.cfg.fixedCats,chal:S.cfg.chal||0,...Object.fromEntries(PREFX.map(k=>[k,S.cfg[k]??null]))});
function prefsTouch(){try{const j=JSON.stringify(prefsObj());if(prefsJ&&j!==prefsJ&&!SY.applying&&!clApplying)S.cfg.pu=Date.now();prefsJ=j}catch(e){}}
const prefsOut=()=>({...prefsObj(),pu:S.cfg.pu||0});
function prefsIn(P){if(!P||!((P.pu||0)>(S.cfg.pu||0)))return false;for(const k of ["rate","rateAt","fixedCats","chal",...PREFX])if(P[k]!==undefined)S.cfg[k]=P[k];S.cfg.pu=P.pu;prefsJ=JSON.stringify(prefsObj());return true}

/* how safe is the data */
function safety(){const now=Date.now(),syncOk=SY.on&&SY.lastOk&&now-SY.lastOk<3*864e5,bkOk=S.cfg.lastBk&&dl(S.cfg.lastBk)>=-14,att=allAtt(),attOk=!att.length||(S.cfg.lastFullBk&&dl(S.cfg.lastFullBk)>=-31);
  return {syncOk,bkOk,att,attOk,level:(syncOk||bkOk)&&attOk?"good":(syncOk||bkOk||S.cfg.lastBk)?"warn":"bad"}}
async function safetySheet(){const s=safety(),ago=ts=>{const d=Math.round((Date.now()-ts)/864e5);return d<1?"today":d==1?"yesterday":d+" days ago"};let snaps=0;try{snaps=(await snapList()).length}catch(e){}
  const row=(l,txt,lev)=>`<div class="hrow"><span class="dot ${lev}"></span><div><b>${l}</b><small>${txt}</small></div></div>`,att=s.att,size=att.reduce((a,x)=>a+(+x.size||0),0);
  sheet(`<h2>Data safety</h2><div class="card" style="margin-bottom:10px"><div class="hrow" style="border:0"><span class="dot ${s.level}"></span><div><b>${s.level=="good"?"Your data is backed up":s.level=="warn"?"Your backup is out of date":"Nothing is backed up yet"}</b><small>${s.level=="good"?"You can get it back if you lose or reset this phone.":"If you uninstall the app or lose this phone, recent changes can’t be recovered."}</small></div></div></div>
  <div class="card">${row("Sync between phones",SY.on?(SY.lastOk?"Last synced "+ago(SY.lastOk)+(me&&me.email?" as "+esc(me.email):""):"Set up but not synced yet"):"Off",SY.on?(s.syncOk?"good":"warn"):"")}
  ${inClaude()?row("Claude account copy",CLS.on?"On":"Off",CLS.on?"good":""):""}
  ${row("Backup file",S.cfg.lastBk?"Last exported "+fmt(S.cfg.lastBk):"Never exported",s.bkOk?"good":S.cfg.lastBk?"warn":"bad")}
  ${isApp()?row("Weekly file in Downloads",S.cfg.autoBk?"Last saved "+fmt(S.cfg.autoBk)+(META.enc?". Paused while app lock is on.":""):META.enc?"Paused while app lock is on":"Not saved yet",S.cfg.autoBk&&!META.enc?"good":"warn"):""}
  ${row("Attached files",att.length?`${att.length} ${att.length==1?"file":"files"}, about ${Math.max(1,Math.round(size/1048576))} MB. ${S.cfg.lastFullBk?"Last in a backup "+fmt(S.cfg.lastFullBk):"Not in any backup yet"}`:"None",s.attOk?"good":"warn")}
  ${row("Copies inside this app",snaps+" daily "+(snaps==1?"copy":"copies")+". These are deleted if you uninstall.","")}</div>
  <h3>After reinstalling or on a new phone</h3><p class="note">With sync: install the app, open Google sync, paste your setup code (or the config lines and Space ID) and sign in with the same email and password. Your records and settings come back. Attached files don’t.<br>Without sync: restore your latest backup file. Use “Backup with files” to include attached photos and PDFs.</p>
  <div class="acts"><button class="btn" data-act="shareBk">Backup now</button><button class="btn ghost" data-act="fullBk">Backup with files</button></div>${SY.on&&SY.cfg?`<div class="acts"><button class="btn ghost" data-act="syncOpen">Show setup code</button></div>`:""}`)}

/* payment notifications from Gmail, Outlook, bank apps and others (phone app) */
async function notifStatus(){try{return !!(await NP("DueNative","notifStatus")).enabled}catch(e){return false}}
function notifHelp(){sheet(`<h2>Read payment alerts</h2><p class="sub">The app can read notifications from Gmail, Outlook, your bank apps and SMS, and keep only the ones that mention a payment. They wait on Home for you to Add or Skip. Nothing is sent anywhere, and your email password is never needed.</p>
  <ol class="steps"><li>Tap <b>Open notification access</b> below.</li><li>Find <b>Personal Diary</b> and turn it on.</li><li>If Android says the setting is restricted: open phone Settings → Apps → Personal Diary → ⋮ → <b>Allow restricted settings</b>, then try again.</li><li>Come back to the app.</li></ol>
  <div class="acts"><button class="btn" data-act="notifOpen">Open notification access</button></div><p class="note">Only notifications that arrive after this is on can be read, and only while they are shown. Email alerts need Gmail or Outlook notifications turned on for that inbox.</p>`)}
async function notifScan(){if(!isApp()||!S.cfg.ntfAuto)return;
  try{const r=await NP("DueNative","readNotifs"),L=(r&&r.items)||[];if(!L.length)return;const q=S.cfg.smsq=S.cfg.smsq||[],seen=new Set(S.cfg.ntfSeen||[]);let add=0;
    L.forEach(m=>{if(seen.has(m.id))return;seen.add(m.id);const body=typeof walletNorm=="function"?walletNorm(m):String(m.body||"");if(/\botp\b|one.time password|verification code/i.test(body))return;const p=parseSms(body);if(!p){noAmt(m);return}
      const at=+m.time||Date.now();if(!p.date||Math.abs(dl(p.date))>3)p.date=iso(new Date(at));
      if(q.some(x=>x.p.amt==p.amt&&x.p.kind==p.kind&&x.p.date==p.date))return;q.push({id:m.id,from:m.app||m.pkg||"",body:body.slice(0,300),p,src:"n"});add++});
    S.cfg.ntfSeen=[...seen].slice(-300);S.cfg.smsq=q.slice(-40);S.cfg.ntfLast=Date.now();dedupeQ();save();if(add&&tab=="home")render()}catch(e){console.warn("alerts",e)}}

/* a full backup with attachments, saved monthly by the phone app */
async function nativeFullBackup(){if(!isApp()||META.enc||!allAtt().length||(S.cfg.autoFullBk&&dl(S.cfg.autoFullBk)>-30))return;
  try{await NP("DueNative","saveDownload",{name:"personal-diary-full-backup-"+today()+".json",text:await bkFull(),mime:"application/json"});S.cfg.autoFullBk=today();S.cfg.lastFullBk=today();save()}catch(e){}}

{const oldFull=ACT.fullBk,oldSync=ACT.syncSave;
Object.assign(ACT,{
  safety(){return safetySheet()},
  copyCode(){const t=$("#f_code");if(!t)return;t.select();return (navigator.clipboard?navigator.clipboard.writeText(t.value):Promise.reject()).then(()=>toast("Setup code copied"),()=>{try{document.execCommand("copy");toast("Setup code copied")}catch(e){toast("Select the code and copy it")}})},
  useCode(){return useSetup(v("f_scode"))},
  async fullBk(){const before=S.cfg.lastBk;await oldFull();if(S.cfg.lastBk&&(S.cfg.lastBk!==before||S.cfg.lastBk==today())){S.cfg.lastFullBk=today();save()}},
  async notifAuto(){if(S.cfg.ntfAuto){S.cfg.ntfAuto=false;save();settings();return toast("Payment alerts are off")}
    if(await notifStatus()){S.cfg.ntfAuto=true;save();settings();toast("Payment alerts will wait on Home");return notifScan()}notifHelp()},
  async notifOpen(){try{await NP("DueNative","openNotifSettings")}catch(e){toast("Open phone Settings → Notifications → Notification access")}}
})}
document.addEventListener("visibilitychange",async()=>{if(document.hidden||!isApp())return;
  if(!S.cfg.ntfAuto&&$("#over").innerHTML.includes("Read payment alerts")&&await notifStatus()){S.cfg.ntfAuto=true;save();sheet("");render();toast("Payment alerts are on")}
  notifScan()});
