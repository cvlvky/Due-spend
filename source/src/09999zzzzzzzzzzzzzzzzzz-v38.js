/* ===== Version 38: one payment is one payment, whichever apps tell you about it; pop-up notifications; cards checked strictly ===== */

/* ---------- where a message came from: the same bank's SMS and its app are two places, Google Wallet and Gmail are others ---------- */
function pdKey(m){const id=String((m&&m.id)||""),src=(m&&m.src)||"",f=String((m&&m.from)||"").toLowerCase().replace(/^(email|gmail|outlook|sms)\s*·\s*/,"").replace(/<.*>/,"").replace(/\s+/g," ").trim();
  if(src=="m"||/^m:/.test(id))return "m:"+f.slice(0,40);const pk=id.match(/^([a-z][\w]*(?:\.[\w]+)+):/i);if(src=="n"||pk)return "n:"+(pk?pk[1].toLowerCase():f);
  if(src=="c")return "c";if(src=="r")return "r:"+f;return "s:"+f.replace(/^[a-z]{2}-(?=[a-z0-9]{3,})/,"").replace(/-[a-z]$/,"")}
const PDSTOP=/^(the|and|doh|doha|qatar|llc|wll|ltd|pvt|card|bank|payment|purchase|from|with|your|for|via|txn|pos)$/;
const pdWords=s=>new Set((String(s||"").toLowerCase().match(/[a-z]{3,}/g)||[]).filter(w=>!PDSTOP.test(w)));
/* two names for one shop share a word ("CITY GRILL DOH" and "City Grill"); an empty name could be anything */
function pdShop(a,b){const A=pdWords(a),B=pdWords(b);if(!A.size||!B.size)return true;for(const w of A)if(B.has(w))return true;return false}
const pdPayLike=t=>/card ?bill|card payment|payment (?:of|has been|is|was)? ?(?:received|credited)|received (?:your |the )?payment|thank you for (?:your |the )?payment|towards (?:your )?(?:\w+ ){0,3}card|credited to (?:your )?(?:\w+ ){0,3}card|paid (?:to|towards) (?:your )?(?:\w+ ){0,3}card|repayment|bank ?direct/i.test(String(t||""));
const pdText=m=>String((m&&m.body)||"")+" "+((m&&m.p&&m.p.payee)||"");
const pdKind=p=>p.cc?"cc":p.kind;
/* a message without a date of its own is dated when it arrived (read the next morning, last night's payment stays last night's) */
function pdHasDate(t){return /\b\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}\b|\b\d{1,2}[-\s]?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s,]*\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/i.test(String(t||""))}
/* the very same message delivered twice: same words, minutes apart. Two payments of the same amount at one shop hours apart are two */
function pdEcho(a,b){if(String(a.body||"").trim()!=String(b.body||"").trim())return false;const ta=+a.t||0,tb=+b.t||0;return !ta||!tb||Math.abs(ta-tb)<=10*60000}
/* the money a message is about is the same as another message's: same amount and currency, close in time, and nothing that tells them apart */
function pdSameQ(a,b){const p=a.p,q=b.p;if(!p||!q||Math.abs((+p.amt||0)-(+q.amt||0))>=0.005)return false;if(p.cur&&q.cur&&p.cur!=q.cur)return false;
  const ka=pdKind(p),kb=pdKind(q),cc=ka=="cc"||kb=="cc";if(ka!=kb){if(!cc)return false;if(!pdPayLike(pdText(ka=="cc"?b:a)))return false}
  const ta=+a.t||0,tb=+b.t||0;if(ta&&tb){if(Math.abs(ta-tb)>36*36e5)return false}else if(Math.abs(dl(p.date)-dl(q.date))>2)return false;
  if(!cc&&p.l4&&q.l4&&String(p.l4).slice(-4)!=String(q.l4).slice(-4))return false;
  if(!cc&&!pdShop(p.payee,q.payee))return false;return true}
/* how sure the app is of a message: the account found from its number, the number, the shop */
const pdScore=m=>{const p=m.p||{};return (p.acc&&!p.newL4&&p.l4?4:0)+(p.l4?2:0)+(p.payee?1:0)+(p.cc&&p.ccFromSure&&p.ccToSure?2:0)};
/* the entry already in the app for this message, if it is the same payment */
function pdTxSame(m,x){const p=m.p,a=+p.amt,cur=p.cur;if(x.kind=="adj")return false;const A=x.kind=="tr"?null:ac(x.acc);
  const accOK=id=>{if(!p.acc||p.newL4)return !p.l4||!(ac(id).l4)||String(ac(id).l4).slice(-4)==String(p.l4).slice(-4)||(ac(id).l4s||[]).map(String).includes(String(p.l4).slice(-4));return id==p.acc};
  if(p.cc){if(x.kind=="tr")return Math.abs((+x.amt||0)-a)<0.005&&(!p.ccTo||x.to==p.ccTo)&&(!p.ccFromSure||!p.ccFrom||x.acc==p.ccFrom);
    return (x.kind=="in"&&ac(x.acc).type=="card"||x.kind=="out"&&ac(x.acc).type!="card")&&Math.abs((+x.amt||0)-a)<0.005&&pdPayLike([x.cat,x.payee,x.note,x.raw].join(" "))}
  const xc=x.kind=="tr"?ac(p.kind=="in"?x.to:x.acc).cur:A.cur;if(cur&&xc&&xc!=cur)return false;
  if(x.kind=="tr"){if(p.kind=="in")return Math.abs((+x.got||0)-a)<0.005&&accOK(x.to)&&pdPayLike(pdText(m)+" "+(x.note||""));return Math.abs((+x.amt||0)-a)<0.005&&accOK(x.acc)&&(pdPayLike(pdText(m))||/card|own|transfer/i.test(x.note||""))}
  return x.kind==p.kind&&Math.abs((+x.amt||0)-a)<0.005&&accOK(x.acc)&&pdShop(p.payee,x.payee||x.note)}
/* where an entry came from: the message that made it, if any */
function pdTxKey(x){const L=S.cfg.payLog||[];for(let i=L.length-1;i>=0;i--){const e=L[i];if(e.tx==x.id&&e.act!="same")return pdKey({id:e.id,from:e.from,src:/^m:/.test(String(e.id))?"m":""})}return ""}
/* an entry saved from another app's message: within a day. From a bank statement or typed by you: the same day only,
   so two small payments at one shop on two days stay two */
function pdTxFind(m,taken){const p=m.p;if(!p||!(+p.amt>0)||!p.date)return null;const d0=dl(p.date),k=pdKey(m);
  return S.tx.filter(x=>{if(taken.has(x.id))return false;const dd=Math.abs(dl(x.date)-d0);if(dd>1)return false;const xk=pdTxKey(x);if(xk==k)return false;if(!xk&&dd>0)return false;return pdTxSame(m,x)})
    .sort((a,b)=>Math.abs(dl(a.date)-d0)-Math.abs(dl(b.date)-d0))[0]||null}
function pdSame(m,x,also){const p=m.p||{},L=S.cfg.payLog=S.cfg.payLog||[];if(L.some(e=>String(e.id)==String(m.id)&&e.act=="same"))return;
  L.push({id:String(m.id),t:Date.now(),act:"same",via:"auto",amt:+p.amt||0,cur:p.cur||"",kind:p.cc?"tr":p.kind||"",payee:p.payee||"",from:String(m.from||"").replace(/^(Email|SMS)\s*·\s*/i,"").slice(0,40),date:p.date||today(),tx:x?x.id:"",also:also||"",body:String(m.body||"").slice(0,240),p:{...p}});S.cfg.payLog=L.slice(-200)}

/* before the other checks: messages about the same payment become one, and a payment already saved is not asked about again */
{const _dq=dedupeQ;dedupeQ=function(...a){try{const q=[...(S.cfg.smsq||[])].filter(m=>m&&m.p).sort((x,y)=>(+x.t||D(x.p.date).getTime())-(+y.t||D(y.p.date).getTime())),out=[],gone=[],al={...(S.cfg.qAlias||{})},logged=new Set((S.cfg.payLog||[]).filter(e=>/^(add|auto|transfer|same|skip)$/.test(e.act)).map(e=>String(e.id)));
    const tOf=m=>+m.t||D(m.p.date).getTime();
    q.forEach(m=>{if(m.src!="r"&&logged.has(String(m.id))){gone.push(m.id);return}
      /* the nearest in time of the messages from other places about the same payment */
      const d=out.filter(o=>pdSameQ(o,m)&&(pdKey(o)!=pdKey(m)||pdEcho(o,m))).sort((x,y)=>Math.abs(tOf(x)-tOf(m))-Math.abs(tOf(y)-tOf(m)))[0];if(!d)return out.push(m);
      const best=pdScore(m)>pdScore(d)?m:d,other=best===m?d:m;["payee","l4","acc","cat"].forEach(f=>{if(!best.p[f]&&other.p[f])best.p[f]=other.p[f]});if(best.p.newL4&&!other.p.newL4&&other.p.acc){best.p.acc=other.p.acc;delete best.p.newL4}
      best.also=[...new Set([...(best.also||[]),...(other.also||[]),String(other.from||pdKey(other))])].slice(0,5);if(best.yes||other.yes)best.yes=1;
      if(best===m)out[out.indexOf(d)]=m;al[other.id]=best.id;pdSame(other,null,String(best.from||""));gone.push(other.id)});
    /* already in the app from another place (or from a bank statement): marked done, not asked again */
    const taken=new Set(),keep=[];out.forEach(m=>{const x=pdTxFind(m,taken);if(x){taken.add(x.id);pdSame(m,x);gone.push(m.id)}else keep.push(m)});
    const ks=new Set(keep);S.cfg.smsq=(S.cfg.smsq||[]).filter(m=>ks.has(m));S.cfg.qAlias=payTrim(al,80);if(gone.length)try{payClear(gone)}catch(e){}}catch(e){console.warn("same payment",e)}return _dq.apply(this,a)}}
/* an answer on the phone for a message already marked "Already saved" is done */
{const _pa=payApply;payApply=function(a,...r){if(a&&(S.cfg.payLog||[]).some(e=>String(e.id)==String(a.id)&&e.act=="same"))return "done";return _pa.call(this,a,...r)}}

/* Payment review: "Already saved" sits with the approved ones, and can be added if it was a different payment after all */
REVIC.same=["⧉","Already saved","var(--pri)"];
{const _pr=prRow;prRow=function(x,...a){if(!x||x.act!="same")return _pr.call(this,x,...a);const t=x.tx?S.tx.find(e=>e.id==x.tx):null,tm=new Date(x.t),hh=String(tm.getHours()).padStart(2,"0")+":"+String(tm.getMinutes()).padStart(2,"0");
  const what=t?(t.kind=="tr"?"⇄ "+ac(t.acc).name+" → "+ac(t.to).name:(t.payee||t.note||t.cat||KIND[t.kind])+" · "+ac(t.acc).name)+" · "+fmt(t.date):x.also?"the one from "+x.also:"another message";
  return `<div class="trow prrow"><span class="rvic" style="background:var(--pri)" aria-hidden="true">⧉</span><div class="tmain"><b>${x.kind=="in"?"+":x.kind=="tr"?"⇄ ":"−"}${fmx(x.amt,x.cur||"INR")}${x.payee?" · "+esc(x.payee):""}</b><small>Already saved · ${hh}${x.from?" · "+esc(x.from):""}</small>
    <div class="pract"><small class="pracc">Same payment as ${esc(what)}</small><div class="prbtns">${t?`<button class="btn sm ghost" data-act="revOpen" data-id="${t.id}">Open</button>`:""}${x.re?"":`<button class="btn sm ghost" data-act="revSameAdd" data-id="${esc(x.id)}">Not the same: add it</button>`}</div></div></div></div>`}}
Object.assign(ACT,{
  revSameAdd(id){const x=[...(S.cfg.payLog||[])].reverse().find(e=>String(e.id)==String(id)&&e.act=="same"&&e.p);if(!x)return;x.re=1;const p={...x.p};
    if(p.cc){save();return trForm({acc:p.ccFrom||"",to:p.ccTo||"",amt:p.amt,got:p.amt,date:p.date||today(),note:"Card bill payment",via:""})}
    save();qForm(p.kind||"out",{...p,cat:p.cat||catFor(p.payee)})}
});

/* ---------- pop-up notifications ---------- */
/* dues, documents, budgets and the rest use their own channel that pops up on the screen; the evening summary stays quiet */
let pdChOk=null;
const pdChannels=np=>pdChOk||(pdChOk=(async()=>{try{await np("LocalNotifications","createChannel",{id:"pd_alerts",name:"Dues and alerts",description:"Pops up for bills and dues, expiring documents and budget warnings",importance:4,visibility:0,vibration:true,lights:true})}catch(e){}
  try{await np("LocalNotifications","createChannel",{id:"pd_daily",name:"Daily summary",description:"The evening summary of the day",importance:3,visibility:0,vibration:false})}catch(e){}})());
function pdWrapNative(){const C=window.Capacitor;if(!C||typeof C.nativePromise!="function"||C.__pdWrap)return;const np=C.nativePromise.bind(C);C.__pdWrap=1;
  C.nativePromise=async function(pl,me,op){if(pl=="LocalNotifications"&&me=="schedule"&&op&&Array.isArray(op.notifications)){await pdChannels(np);op={...op,notifications:op.notifications.map(n=>n&&!n.channelId?{...n,channelId:+n.id>=9000&&+n.id<9100?"pd_daily":"pd_alerts"}:n)}}return np(pl,me,op)}}
pdWrapNative();
{const _s=start;start=function(...a){pdWrapNative();const r=_s.apply(this,a);try{if(isApp())setTimeout(()=>popCheck().catch(()=>{}),4000)}catch(e){}return r}}
/* what the phone allows: notifications on, and each channel set to pop up */
async function popState(){if(!isApp())return null;try{const r=await NP("DueNative","popStatus");if(!r||r.on==null)return null;return {on:!!r.on,pay:(+r.pd_pay2||0)>=4,alert:(+r.pd_alerts||0)>=4,raw:r}}catch(e){return null}}
async function popCheck(){const s=await popState();if(!s)return;const bad=!s.on||!s.pay||!s.alert;if(!!S.cfg.popBad!=bad){S.cfg.popBad=bad;save();if(tab=="home")render()}}
async function popSheet(){const s=await popState(),app=isApp(),row=(ok,t,sub,btns)=>`<div class="trow"><span class="tdot ${ok===true?"good":ok===false?"bad":"na"}" aria-hidden="true"></span><div class="tmain"><b>${t}</b><small>${sub}</small></div>${btns||""}</div>`;
  const yes=s&&s.on,st=k=>!s?null:!s.on?false:s[k];
  sheet(`<h2>Pop-up notifications</h2><p class="sub">Payments to confirm and dues show on top of the screen, not only in the notification list.</p>
  ${app?`<div class="card">${row(s?yes:null,"Notifications from Personal Diary",!s?"Update the app to check this":yes?"On":"Off: nothing can show",yes?"":`<button class="btn sm" data-act="popOpen" data-id="">Turn on</button>`)}
  ${row(st("pay"),"Payment confirmations",!s?"":st("pay")?"Pops up when a payment is found":"Only in the notification list",`<button class="btn sm${st("pay")?" ghost":""}" data-act="popOpen" data-id="pd_pay2">${st("pay")?"Settings":"Turn on"}</button>`)}
  ${row(st("alert"),"Dues and alerts",!s?"":st("alert")?"Pops up for dues, documents and budgets":"Only in the notification list",`<button class="btn sm${st("alert")?" ghost":""}" data-act="popOpen" data-id="pd_alerts">${st("alert")?"Settings":"Turn on"}</button>`)}</div>
  <div class="acts"><button class="btn" data-act="popTestPay">Test a payment pop-up</button><button class="btn ghost" data-act="popTestDue">Test a due alert</button></div>
  <p class="note">In the screen that opens, turn on <b>Pop on screen</b> (on OnePlus and Oppo it’s called <b>Banners</b> or <b>Floating notifications</b>), and Sound and Lock screen. If the test still doesn’t pop up, check Do Not Disturb, and in Settings → Battery let Personal Diary run in the background.</p>`
  :`<p class="note">Pop-ups work in the phone app.</p>`}`)}
Object.assign(ACT,{
  popSheet(){S.cfg.pop38=1;save();return popSheet()},
  async popOpen(id){try{await NP("DueNative","popSettings",{channel:id||""})}catch(e){toast("Open phone Settings → Apps → Personal Diary → Notifications")}S.cfg.popAsked=1;save()},
  async popTestPay(){try{await NP("LocalNotifications","requestPermissions")}catch(e){}try{await NP("DueNative","payTest");toast("It should pop up now. If it doesn’t, tap Turn on for Payment confirmations")}catch(e){toast("Update the app to test this")}},
  async popTestDue(){try{await NP("LocalNotifications","requestPermissions")}catch(e){}try{await NP("LocalNotifications","schedule",{notifications:[{id:8999,title:"Test: a bill is due today",body:"This is how dues and alerts pop up",schedule:{at:new Date(Date.now()+2500).toISOString(),allowWhileIdle:true},channelId:"pd_alerts"}]});toast("A test alert pops up in a few seconds")}catch(e){toast("Couldn’t show a test alert")}},
  popLater(){S.cfg.popAsked=1;save();render()},
  popOk(){S.cfg.pop38=1;save();render()}
});
/* Settings and Payment tracking point to it; Home says so when pop-ups are off */
{const _st=settings;settings=function(...a){const r=_st.apply(this,a);try{const p=$("#over .setpay");if(p&&!p.querySelector('[data-act="popSheet"]'))p.insertAdjacentHTML("beforeend",`<button class="card" data-act="popSheet"><span>🔔</span><b>Pop-ups</b><small>${S.cfg.popBad?"Off: turn on":"Payments and dues on screen"}</small></button>`)}catch(e){}return r}}
{const _th=trackHub;trackHub=async function(...a){const r=await _th.apply(this,a);try{const h=[...$$("#over h3")].find(x=>/How it asks you/.test(x.textContent));if(h&&isApp()){const c=h.nextElementSibling;
  if(c&&!c.querySelector('[data-act="popSheet"]'))c.insertAdjacentHTML("afterbegin",`<div class="trow"><span class="tdot ${S.cfg.popBad?"bad":"good"}" aria-hidden="true"></span><div class="tmain"><b>Pops up on the screen</b><small>${S.cfg.popBad?"Off for some notifications: they only go to the list":"Payments and dues show on top of the screen"}</small></div><button class="btn sm${S.cfg.popBad?"":" ghost"}" data-act="popSheet">${S.cfg.popBad?"Fix":"Check"}</button></div>`)}}catch(e){}return r}}
{const _vh=vHome;vHome=function(...a){let h=_vh(...a);try{const off=S.cfg.popBad&&!S.cfg.popAsked,first=!S.cfg.popBad&&!S.cfg.pop38;if(isApp()&&(off||first)){const c=off?`<div class="card" style="margin:0 0 12px;border-color:var(--soon)"><b>🔔 Pop-ups are off</b><p class="note" style="margin:4px 0 0">Payments to confirm and dues only go to the notification list, so they’re easy to miss.</p><div class="acts"><button class="btn sm" data-act="popSheet">Turn on</button><button class="btn sm ghost" data-act="popLater">Later</button></div></div>`
    :`<div class="card" style="margin:0 0 12px;border-color:var(--pri)"><b>🔔 Payments and dues now pop up on the screen</b><p class="note" style="margin:4px 0 0">Test it once. On some phones (OnePlus too) “Banners” has to be turned on for the app.</p><div class="acts"><button class="btn sm" data-act="popSheet">Test it</button><button class="btn sm ghost" data-act="popOk">OK</button></div></div>`;
  /* right under the quick actions, where it's seen */
  const q=h.indexOf('<div class="qa"');let i=-1;if(q>=0){let dpt=0,j=q;const re=/<div\b|<\/div>/g;re.lastIndex=q;let mt;while((mt=re.exec(h))){dpt+=mt[0]=="</div>"?-1:1;if(dpt==0){i=mt.index+6;break}}}
  if(i<0)i=h.indexOf("<h2>");h=i>=0?h.slice(0,i)+c+h.slice(i):c+h}}catch(e){}return h}}

/* ---------- cards: checked strictly against the bank's latest alert ---------- */
/* entries dated after today (a bank's value date) have already happened, so the bank's figure counts them */
function cardFut(k,d){const t=today();return Math.round(S.tx.filter(x=>x.date>t&&x.date>d&&x.kind!="adj").reduce((s,x)=>s+sgn(x,k.id),0)*100)/100}
{const _cr=cardRecon;cardRecon=function(k,...a){const r=_cr(k,...a);try{const b=(S.cfg.cardBank||{})[k.id];if(r==null||!b)return r;const d=iso(new Date(b.t)),f=cardFut(k,d);if(Math.abs(f)<0.005)return r;
  const app=Math.round((cardAvAt(k,d)+f)*100)/100,diff=Math.round((b.avl-app)*100)/100,W={...(S.cfg.balWarn||{})};
  if(Math.abs(diff)>=1)W[k.id]={bank:Math.round((b.avl-cardLim(k))*100)/100,app:Math.round((app-cardLim(k))*100)/100,avl:b.avl,at:d,t:Date.now(),src:b.src};else delete W[k.id];S.cfg.balWarn=W;return diff}catch(e){return r}}}
/* the alert box says what differs and offers the saved-twice finder */
{const _am=accMenu;accMenu=function(id,...a){const r=_am(id,...a);try{const k=ac(id),w=(S.cfg.balWarn||{})[id],b=(S.cfg.cardBank||{})[id];if(!k||k.type!="card"||!w||w.avl==null||!b)return r;
  const box=$('#over [data-act="cardChkNow"]'),card=box&&box.closest(".card");if(!card)return r;const n=card.querySelector("p.note");const app=Math.round((cardAvAt(k,w.at)+cardFut(k,w.at))*100)/100;
  if(n)n.innerHTML=`The app differs by ${fmx(Math.abs(app-w.avl),k.cur)}: it shows ${fmx(app,k.cur)} available for that time, the bank ${fmx(w.avl,k.cur)}.${app>w.avl?" Usually a payment saved twice.":" Usually spending that isn’t in the app yet."}`;
  if(!card.querySelector('[data-act="dupScan"]'))box.insertAdjacentHTML("beforebegin",`<button class="btn sm" data-act="dupScan" data-id="${id}">Find entries saved twice</button><button class="btn sm ghost" data-act="stImport" data-id="${id}">Check a statement</button>`)}catch(e){console.warn(e)}return r}}

KEYCAT.push([/service charge|finance charge|interest charge|late (?:payment )?fee|annual fee|over ?limit fee|remaining balance|insurance fee|credit shield/i,["Bank charges","Bills"]],[/keeta|talabat|snoonu|deliveroo|food ?delivery/i,["Eating out","Food"]],[/travel|tours?\b|tourism|holidays?\b/i,["Travel"]]);
/* a payment into the card from before the bank account's records: said, so nobody looks for it there */
{const _rl=stRowLab;stRowLab=function(r,A){try{if(r.dir=="in"&&A.type=="card"){const c=stmtClean(r.desc);if(stPayLike(c)){const F0=stmtSource(c,A,r);
  if(F0&&stBefore(F0,r.date))return "Payment from "+F0.name+" · noted on the card only (before the app’s records for "+F0.name+")"+(r.fx?" · "+r.fx:"");
  if(!F0)return "Card payment · noted on the card only"+(S.acc.some(x=>x.type=="bank"&&x.cur==A.cur)?" (from a bank account the app can’t tell)":" (add the bank account it came from to link it)")+(r.fx?" · "+r.fx:"")}}}catch(e){}return _rl(r,A)}}
NEW27.splice(0,NEW27.length,"⧉ One payment, one entry: the same payment from the bank app, Google Wallet, SMS and email is asked about once, even hours apart","✓ A payment already in the app (or in a bank statement) isn’t asked about again; it shows as “Already saved” in Payment review","🔔 Pop-ups: payments to confirm and dues now pop up on the screen (Settings → Pop-ups to check and test)","💳 Cards are checked strictly against the bank’s latest alert, and a payment saved twice is pointed out","🏦 Long card statements: payments from before your bank account’s records are noted on the card only, so the bank account stays right");
