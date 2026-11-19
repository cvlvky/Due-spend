/* ===== start ===== */
let pq=null,pshare="";try{const U=new URLSearchParams(location.search);pq=U.get("add");pshare=[U.get("title"),U.get("text")].filter(Boolean).join(" ")}catch(e){}
const openPending=()=>{if(pshare&&readSetup(pshare)){const t=pshare;pshare="";syncForm();const f=$("#f_scode");if(f)f.value=t.trim()}else if(pshare){const t=pshare;pshare="";if(!smsOpen(t))qForm()}else if(pq){qForm(pq=="in"?"in":"out");pq=null}};
function start(){mon=today().slice(0,7);prefsJ=JSON.stringify(prefsObj());let ch=false;try{ch=purgeBin()}catch(e){}try{ch=applyRec()||ch}catch(e){console.warn(e)}if(ch)save();
  render();snapDaily();openPending();
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{})}catch(e){}
  if(SY.on&&!inClaude())syncStart();
  cloudProbe();smartProbe();nativeStart();onOpen();setTimeout(()=>refreshMarket(false),1500)}
async function boot(){mon=today().slice(0,7);let st="ready";
  try{st=await loadAll()}catch(e){console.warn(e);useLS=true;try{const ls=JSON.parse(localStorage.getItem(K)||"null");if(ls)adopt(ls)}catch(x){}mig()}
  if(st=="locked")return showLock("cold");
  if(S.cfg.pin)return showLock("legacy");
  start()}
let hidAt=0;
document.addEventListener("visibilitychange",()=>{if(document.hidden)hidAt=Date.now();else if(META.enc&&KEY&&!lockMode&&hidAt&&Date.now()-hidAt>30000)showLock("resume")});
boot();
