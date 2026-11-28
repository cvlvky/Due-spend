/* ===== Version 35.1: Payment review checks for new payments by itself, and says plainly why Waiting is empty ===== */

/* more bank, exchange and money apps are read */
const PAYPK2=/(^|[._])qib([._]|$)|masrafalrayan|lulu|transferwise|revolut|alansari|alfardan|alzaman|cityexchange|gulfexchange|arabianexchange/i;
{const _prd=payRead;payRead=function(pkg,...a){if(_prd.call(this,pkg,...a))return true;pkg=String(pkg||"");return !!pkg&&!chatLike(pkg)&&!(S.cfg.ignAdd||[]).includes(pkg)&&PAYPK2.test(pkg)}}

/* opening Payment review looks for new payments first (SMS and app alerts on this phone; email with Check now) */
let prChecked=0,prBusy=false;
async function prQuick(){if(!isApp()||prBusy||Date.now()-prChecked<90e3)return false;prBusy=true;prChecked=Date.now();const w0=(S.cfg.smsq||[]).length,l0=(S.cfg.payLog||[]).length;
  try{if(S.cfg.smsAuto)await smsScan();await payNow()}catch(e){console.warn("payment check",e)}finally{prBusy=false}
  const w1=(S.cfg.smsq||[]).length,ch=w1!=w0||(S.cfg.payLog||[]).length!=l0;if(ch){save();render()}return ch?(w1>w0?"wait":"same"):false}
{const _pr2=payReview;payReview=function(tab,...a){const r=_pr2.call(this,tab,...a);prQuick().then(ch=>{if(!ch)return;const h=$("#over h2");if(!h||h.textContent!="Payment review")return;
  const on=$("#over .prtabs button.on"),k=ch=="wait"?"wait":on?on.dataset.id:"";_pr2.call(this,k=="wait"&&!(S.cfg.smsq||[]).length?"ok":k||tab||"");if(ch=="wait")toast("New payments to review")}).catch(()=>{});return r}}

/* when Waiting is empty: what is on, a Turn on button for what is off, and apps that showed an amount but aren't read */
async function prWhy(){const box=$("#over .prsrc");if(!box||!isApp()||box.dataset.why)return;box.dataset.why="1";const st=await readStat(false);let sk=[];try{sk=((await NP("DueNative","appsSkipped")).items||[]).filter(x=>x&&x.pkg&&!payRead(x.pkg))}catch(e){}
  const rows=[...box.querySelectorAll(".trow")];const btn=(i,act,lab)=>{const r=rows[i];if(r&&!r.querySelector("button"))r.insertAdjacentHTML("beforeend",`<button class="btn sm" data-act="${act}">${lab}</button>`)};
  if(!S.cfg.smsAuto)btn(0,"prOnSms","Turn on");else if(st.sms===false)btn(0,"prOnSms","Allow");
  if(!S.cfg.ntfAuto)btn(1,"prOnNtf","Turn on");else if(!st.on){btn(1,"notifOpen","Fix");const s=rows[1]&&rows[1].querySelector("small");if(s)s.textContent="Notification access is off in Android settings"}
  if(!gmOn()&&!msOn())btn(2,"trackHub","Connect");
  if(sk.length)box.insertAdjacentHTML("afterend",`<div class="card prsk"><b>Apps that showed an amount but aren’t read</b><p class="note" style="margin:4px 0 6px">If one is your bank’s app, tap Read it and its payments will come to Waiting.</p>${sk.slice(0,6).map(x=>`<div class="trow"><span class="tdot na" aria-hidden="true"></span><div class="tmain"><b>${esc(x.app||x.pkg)}</b><small>Seen ${tAgo(+x.t)}</small></div><button class="btn sm ghost" data-act="appRead" data-id="${esc(x.pkg)}" data-name="${esc(x.app||"")}">Read it</button></div>`).join("")}</div>`)}
{const _sr5=smsReview;smsReview=function(...a){const r=_sr5.apply(this,a);try{if($("#over .prsrc"))prWhy()}catch(e){}return r}}
Object.assign(ACT,{
  async prOnSms(){if(!S.cfg.smsAuto)await ACT.smsAuto();else await smsScan(true);payReview("wait")},
  async prOnNtf(){await ACT.notifAuto();payPopSync();if(!/Read payment alerts/.test(($("#over")||{}).innerHTML||""))payReview("wait")}
});
/* Read it from Waiting comes back to Waiting */
{const _ar=ACT.appRead;ACT.appRead=async function(pkg,el,...a){const fromWait=!!$("#over .prsk");const r=await _ar.call(this,pkg,el,...a);if(fromWait){prChecked=0;payReview("wait")}return r}}
