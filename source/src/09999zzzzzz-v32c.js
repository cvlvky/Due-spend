/* ===== Version 32.3: cards match the bank by themselves, from the latest "Available Limit" alert (SMS, Gmail, Outlook) ===== */
const cardL4=k=>String(k&&(k.l4||k.no)||"").replace(/\D/g,"").slice(-4);
/* which card an alert is about: its last 4 digits, or the only card when the alert has none */
function cardFor(text){const s=String(text||""),C=S.acc.filter(k=>k.type=="card"&&cardLim(k));if(!C.length)return null;
  const hit=C.filter(k=>{const d=cardL4(k);return d&&new RegExp("(?:^|\\D)"+d+"(?!\\d)").test(s)});if(hit.length==1)return hit[0];
  if(!hit.length&&C.length==1&&!cardL4(C[0])&&/\bcard\b/i.test(s))return C[0];return null}
/* payments still waiting in "Payments to review" are already in the bank's figure */
const cardPendSum=(k,upto)=>(S.cfg.smsq||[]).filter(m=>m&&m.p&&m.p.acc==k.id&&(!upto||(m.p.date||"")<=upto)&&quickOk(m)).reduce((s,m)=>s+(m.p.kind=="out"?-1:1)*(+m.p.amt||0),0);
const cardBalAt=(k,d)=>Math.round((balAt(k.id,d)+cardPendSum(k,d))*100)/100;
const cardAvAt=(k,d)=>Math.round((cardLim(k)+cardBalAt(k,d))*100)/100;
const cardH=s=>{let h=0;const x=String(s||"").replace(/\s+/g," ").trim().slice(0,300);for(let i=0;i<x.length;i++)h=(h*31+x.charCodeAt(i))|0;return "h"+h};
function cardAH(text,t){const M=S.cfg.cardAH=S.cfg.cardAH||{};M[cardH(text)]=t;const K=Object.keys(M);if(K.length>80)K.slice(0,K.length-80).forEach(x=>delete M[x])}
function cardSeen(k,a){const B=S.cfg.cardBank=S.cfg.cardBank||{},o=B[k.id];if(o&&o.t>=a.t)return false;B[k.id]={avl:a.avl,t:a.t,src:a.src||""};return true}
function cardRecon(k){const b=(S.cfg.cardBank||{})[k.id];if(!b||!cardLim(k))return null;const d=iso(new Date(b.t)),app=cardAvAt(k,d),diff=Math.round((b.avl-app)*100)/100,W={...(S.cfg.balWarn||{})};
  if(Math.abs(diff)>=1)W[k.id]={bank:Math.round((b.avl-cardLim(k))*100)/100,app:Math.round((app-cardLim(k))*100)/100,avl:b.avl,at:d,t:Date.now(),src:b.src};else delete W[k.id];S.cfg.balWarn=W;return diff}
const cardReconAll=()=>S.acc.filter(k=>k.type=="card"&&cardLim(k)).forEach(cardRecon);
/* make the card's balance on date d equal T (what the bank shows); the first time it goes into the opening balance */
function cardMatchBal(k,T,d){d=d||today();const diff=Math.round((T-cardBalAt(k,d))*100)/100,W={...(S.cfg.balWarn||{})},first=!k.bankAt&&!S.tx.some(x=>x.acc==k.id&&x.kind=="adj");delete W[k.id];S.cfg.balWarn=W;
  if(Math.abs(diff)>=0.005){
    if(first)put("acc",stamp({...k,open:Math.round(((+k.open||0)+diff)*100)/100,bankAt:d},k));
    else{addTx({kind:"adj",acc:k.id,amt:diff,cur:k.cur,date:d,cat:"Balance correction",note:"Matched to the bank"});const K=ac(k.id);put("acc",stamp({...K,bankAt:d},K))}}
  else{const K=ac(k.id);put("acc",stamp({...K,bankAt:d},K))}
  const K=ac(k.id);K.rcd=today();save();return {diff,first}}

/* look back through SMS, Gmail and Outlook for the newest alert with "Available Limit" for this card */
async function cardBankFind(k){const best={t:0},take=(text,t,src)=>{const c=cardFor(text);if(!c||c.id!=k.id)return false;const a=cardAvl(text);if(a==null||!isFinite(a))return false;if(t>best.t){best.t=t;best.avl=a;best.src=src}return true};
  (S.cfg.smsq||[]).forEach(m=>m&&take(m.body,+m.time||(m.p&&m.p.date?D(m.p.date).getTime():0),"Payments to review"));
  (S.cfg.smsLog||[]).forEach(m=>m&&take(m.body,+m.t,"SMS"));
  if(isApp()){try{const r=await NP("DueNative","readSms",{since:String(Date.now()-30*864e5),max:400});((r&&r.messages)||[]).forEach(m=>take(m.body,+m.date,"SMS"))}catch(e){}}
  if(gmOn()){try{const L=(await gmGet("/messages?maxResults=8&q="+encodeURIComponent('("available limit" OR "avl lmt" OR "available credit") newer_than:30d'),false)).messages||[];
    for(const m of L){const d=await gmGet("/messages/"+m.id+"?format=full",false),H={};(d.payload&&d.payload.headers||[]).forEach(h=>H[h.name.toLowerCase()]=h.value);if(take((H.subject||"")+". "+gmBody(d.payload),+d.internalDate||0,"Gmail"))break}}catch(e){console.warn("card gmail",e)}}
  if(msOn()){try{const L=(await msGet("/messages?"+new URLSearchParams({"$search":'"available limit"',"$top":"10","$select":"subject,receivedDateTime,body,bodyPreview"}).toString())).value||[];
    L.forEach(m=>take((m.subject||"")+". "+String((m.body||{}).content||m.bodyPreview||""),Date.parse(m.receivedDateTime)||0,"Outlook"))}catch(e){console.warn("card outlook",e)}}
  return best.t?best:null}
async function cardLook(k,quiet){const b=await cardBankFind(k);const L=S.cfg.cardLook=S.cfg.cardLook||{};L[k.id]=Date.now();if(b){const had=!!(S.cfg.balWarn||{})[k.id];cardSeen(k,b);const diff=cardRecon(k);save();render();
  if((!quiet||!had)&&diff!=null&&Math.abs(diff)>=1)toast(`${k.name}: the bank’s latest alert says ${fmx(b.avl,k.cur)} available. Tap it in Needs attention to match.`)}else save();return b}
/* every day, and right after a limit is set */
{const _s=start;start=function(...a){const r=_s(...a);setTimeout(async()=>{try{const L=S.cfg.cardLook||{};for(const k of S.acc.filter(k=>k.type=="card"&&cardLim(k)))if(!L[k.id]||Date.now()-L[k.id]>12*36e5)await cardLook(k,true)}catch(e){console.warn("card look",e)}},12000);return r}}
{const _sa=ACT.saveAcc;ACT.saveAcc=function(id,...a){const before=new Map(S.acc.map(k=>[k.id,+k.lim||0]));const r=_sa.call(this,id,...a);try{S.acc.filter(k=>k.type=="card"&&cardLim(k)&&before.get(k.id)!==cardLim(k)).forEach(k=>cardLook(k,false).catch(()=>{}))}catch(e){}return r}}
/* new alerts from Gmail, Outlook and SMS */
{const _mt=mailTake;mailTake=async function(ref,d,...a){const seen0=new Set(S.cfg.mailSeen||[]),L=(Array.isArray(d&&d.items)?d.items:[]).filter(m=>m&&m.id&&!seen0.has(m.id));const r=await _mt(ref,d,...a);
  try{let n=0;L.forEach(m=>{const text=(m.subject?m.subject+". ":"")+(m.body||""),k=cardFor(text),av=k?cardAvl(text):null;if(!k||av==null)return;const t=+m.time||Date.now();try{cardAH(normMsg(text).slice(0,300),t)}catch(e){}
      if(cardSeen(k,{avl:av,t,src:/^o/.test(m.id)?"Outlook":/^g/.test(m.id)?"Gmail":"Email"}))n++});
    if(n){cardReconAll();save();render()}}catch(e){console.warn("card alert",e)}return r}}
let cardSmsN=0;
{const _sl=smsLog;smsLog=function(m,...a){try{const text=String(m&&m.body||""),k=cardFor(text),av=k?cardAvl(text):null;if(k&&av!=null){const t=+m.date||Date.now();cardAH(text.slice(0,300),t);if(cardSeen(k,{avl:av,t,src:"SMS"}))cardSmsN++}}catch(e){}return _sl(m,...a)}}
{const _ss=smsScan;smsScan=async function(...a){cardSmsN=0;const r=await _ss(...a);try{if(cardSmsN){cardReconAll();save();render()}}catch(e){}return r}}
/* a payment saved from an alert: check against the newest alert, counting what is still waiting */
{const _cc=cardCheck;cardCheck=function(acc,text){const k=ac(acc);if(k&&k.type=="card"&&cardLim(k)){const av=cardAvl(text),c=cardFor(text);if(av!=null&&c&&c.id==k.id){const t=(S.cfg.cardAH||{})[cardH(text)];cardSeen(k,{avl:av,t:t||Date.now(),src:"Alert"});cardRecon(k);return}}return _cc(acc,text)}}

/* card page: the latest bank figure and a check button */
{const _am=accMenu;accMenu=function(id){_am(id);try{const k=ac(id);if(!k||k.type!="card"||!cardLim(k))return;const g=$("#over .cgrid");if(!g)return;const b=(S.cfg.cardBank||{})[id],w=(S.cfg.balWarn||{})[id];
  const tm=b?fmt(iso(new Date(b.t)))+" "+new Date(b.t).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"";
  g.insertAdjacentHTML("afterend",`<div class="card" style="margin:0 0 12px">${b?`<div class="hbl"><span>Bank’s latest alert <small style="display:block;color:var(--mute)">${esc(b.src)} · ${esc(tm)}</small></span><b>${fmx(b.avl,k.cur)}</b></div>${w&&w.avl!=null?`<p class="note" style="color:var(--late);margin:6px 0 0">The app differs by ${fmx(Math.abs(cardAvAt(k,w.at)-w.avl),k.cur)}.</p>`:`<p class="note" style="margin:6px 0 0">✓ The app matches it.</p>`}`:`<b>Check with the bank</b><p class="note" style="margin:4px 0 0">The app reads “Available Limit” in your card alerts (SMS, Gmail, Outlook) to keep this right.</p>`}
    <div class="acts"><button class="btn sm${w?"":" ghost"}" data-act="cardChkNow" data-id="${id}">${w?"Match the bank":"Check with the bank"}</button></div></div>`);if(taOn())taNode($("#over"))}catch(e){console.warn(e)}}}
function cardResult(id,b){const k=ac(id);if(!k)return;const d=b?iso(new Date(b.t)):today(),app=cardAvAt(k,d),diff=b?Math.round((b.avl-app)*100)/100:null,first=!k.bankAt&&!S.tx.some(x=>x.acc==k.id&&x.kind=="adj");
  const where=["SMS",gmOn()?"Gmail":"",msOn()?"Outlook":""].filter(Boolean).join(", ");
  sheet(`<h2>${esc(k.name)}</h2>${b?(Math.abs(diff)<1?`<div class="card"><b>✓ Matches the bank</b><p class="note" style="margin:4px 0 0">Latest alert (${esc(b.src)}, ${fmt(d)}): ${fmx(b.avl,k.cur)} available. The app shows the same.</p></div>`
    :`<div class="card"><b>The bank says ${fmx(b.avl,k.cur)} available</b><p class="note" style="margin:4px 0 0">Latest alert: ${esc(b.src)}, ${fmt(d)} ${new Date(b.t).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}.</p>
      <p class="note">The app shows ${fmx(app,k.cur)} available, ${fmx(Math.abs(diff),k.cur)} ${diff>0?"less":"more"}.${first?` That’s usually ${diff>0?"a payment or refund":"spending"} from before the first entry in the app, so it goes into the card’s opening balance; your entries stay as they are.`:` A correction entry is added on ${fmt(d)}.`}</p></div>
      <div class="acts"><button class="btn" data-act="cardMatchGo" data-id="${id}">Match the bank: ${fmx(b.avl,k.cur)}</button></div>`)
    :`<p class="sub">No alert with “Available Limit” for this card${cardL4(k)?" (ending "+esc(cardL4(k))+")":""} was found in the last 30 days in ${esc(where)}.${cardL4(k)?"":" Add the card’s last 4 digits in Edit account so alerts can be matched."}</p>`}
  <h3>${b?"Or type":"Type"} what the bank app shows</h3>${F("f_cav","Available to spend now ("+k.cur+")","","number")}<div class="acts"><button class="btn${b&&Math.abs(diff)>=1?" ghost":""}" data-act="cardMatchType" data-id="${id}">Match</button></div>`)}

/* Correct balance on a card goes through the same matching (opening balance the first time) */
{const _sf=ACT.saveFix;ACT.saveFix=function(id,...a){const k=ac(id);if(!k||k.type!="card"||!$("#f_avl"))return _sf.call(this,id,...a);
  const r=cardTarget(k,v("f_avl"),v("f_owe2"),$("#f_lim2")?v("f_lim2"):null);if(r.err)return toast(r.err);if(r.L)put("acc",stamp({...k,lim:r.L},k));
  const K=ac(id),d=($('#over [data-act="saveFix"]')||{dataset:{}}).dataset.d||today();cardMatchBal(K,r.T,d);done();const F2=ac(id);toast(cardLim(F2)?"Available to spend: "+fmx(cardAv(F2),F2.cur):"You owe "+fmx(cardOwe(F2),F2.cur))}}
{const _bf=ACT.balFix;ACT.balFix=function(id,...a){const r=_bf.call(this,id,...a);try{const w=(S.cfg.balWarn||{})[id],b=$('#over [data-act="saveFix"]');if(w&&w.avl!=null&&b)b.dataset.d=w.at}catch(e){}return r}}

Object.assign(ACT,{
  async cardChkNow(id){const k=ac(id);if(!k)return;if(!cardLim(k))return accForm(k);sheet(`<h2>Checking with the bank</h2><p class="sub">Looking for the newest alert for this card with “Available Limit”…</p>`);let b=null;try{b=await cardLook(k,true)}catch(e){}cardResult(id,b||((S.cfg.cardBank||{})[id]||null))},
  cardMatchGo(id){const k=ac(id),b=(S.cfg.cardBank||{})[id];if(!k||!b)return;const d=iso(new Date(b.t));cardMatchBal(k,Math.round((b.avl-cardLim(k))*100)/100,d);render();accMenu(id);toast("Matched. Available to spend: "+fmx(cardAv(ac(id)),k.cur))},
  cardMatchType(id){const k=ac(id),s=v("f_cav").trim();if(!k||s===""||!/\d/.test(s))return toast("Type the available amount from the bank app");cardMatchBal(k,Math.round((Math.abs(num(s))-cardLim(k))*100)/100,today());render();accMenu(id);toast("Matched. Available to spend: "+fmx(cardAv(ac(id)),k.cur))}
});
Object.assign(TA,{"Check with the bank":"வங்கியுடன் சரிபார்","Match the bank":"வங்கியுடன் பொருத்து","Bank’s latest alert":"வங்கியின் சமீபத்திய அறிவிப்பு"});
