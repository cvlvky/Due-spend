/* ===== Family sync is built in: the Firebase project and space are already filled in ===== */
const SYNC_DEF={cfg:{apiKey:"AIzaSyBxGRtRGdv23Krs_5wO-640-iLXMnfbgO4",authDomain:"due-and-spend-2fa3f.firebaseapp.com",projectId:"due-and-spend-2fa3f"},space:"Home-expenses"};
if(!SY.noDef&&!navigator.webdriver&&(!SY.cfg||!SY.cfg.apiKey)){SY={...SY,cfg:SYNC_DEF.cfg,space:SY.space||SYNC_DEF.space,on:true,members:SY.members||[],builtin:1};syv()}
/* Drive backups carry the sync settings (never the password), so a restore on a new phone reconnects too */
function bkSync(){return JSON.stringify({...bkObj(),__sync:{cfg:SY.cfg||null,space:SY.space||"",email:SY.email||""}})}
function syncFromBackup(txt){try{const o=JSON.parse(txt),s=o&&o.__sync;if(s&&s.cfg&&s.cfg.apiKey&&(SY.builtin||!SY.cfg||!SY.cfg.apiKey)){SY={...SY,cfg:s.cfg,space:s.space||SY.space,email:SY.email||s.email,on:true,builtin:0};syv()}}catch(e){}}
{const _sf=syncForm;syncForm=function(...a){const r=_sf(...a);try{if(SY.on&&SY.cfg&&SY.cfg.apiKey){const det=document.createElement("details"),box=$("#f_scode")&&$("#f_scode").closest(".fld,div");
  const els=[...$$("#over .sheet > *")],i0=els.findIndex(e=>e.contains($("#f_scode"))),i1=els.findIndex(e=>e.contains($('#over [data-act="syncSave"]')));
  if(i0>=0&&i1>=i0){det.innerHTML=`<summary>Change the sync project (not needed)</summary>`;els[i0].before(det);for(let i=i0;i<=i1;i++)det.appendChild(els[i]);
    det.insertAdjacentHTML("beforebegin",`<p class="note" style="margin:6px 0 10px">Sync is set up in the app: ${esc(SY.space)}. Just sign in below with your email and password. You stay signed in after updates.</p>`)}}}catch(e){console.warn(e)}return r}}
{const _so=ACT.syncOff;ACT.syncOff=function(...a){const r=_so.apply(this,a);SY.noDef=1;syv();return r}}
