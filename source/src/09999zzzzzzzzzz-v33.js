/* ===== Version 33: clearer screens, Reports as pictures, Add or Skip on payment notifications, better payment tracking ===== */

/* ---------- Google Wallet and Samsung Wallet show the shop as the title and only the amount below it;
   Google Pay, PhonePe and Paytm say "Ravi paid you ₹500", which reads like money going out ---------- */
const WALLETPK=/^(com\.google\.android\.apps\.walletnfcrel|com\.samsung\.android\.spay|com\.samsung\.android\.samsungpay\.gear)$/,
  UPIPK=/^(com\.google\.android\.apps\.nbu\.paisa\.user|com\.phonepe\.app|net\.one97\.paytm|in\.org\.npci\.upiapp|com\.dreamplug\.androidapp|com\.mobikwik_new|com\.freecharge\.android)$/,
  AMTX=/(INR|Rs\.?|₹|QAR|QR|USD|AED|SAR|\$)\s*[\d,]*\d(?:\.\d+)?|[\d,]*\d(?:\.\d+)?\s*(?:INR|QAR|QR)\b/i;
function walletNorm(m){const b=String((m&&m.body)||"");if(!m)return b;
  if(UPIPK.test(m.pkg||"")){const am=b.match(AMTX);if(!am||/^(?:paid|received|sent|you paid|you sent|you received)\b/i.test(b))return b;const iI=b.search(/paid you|sent you|received from|you received|you've received|credited to your|added to your|refund|cashback/i),iO=b.search(/you paid|you sent|paid to|sent to|payment to|debited|deducted/i);if(iI<0&&iO<0)return b;
    const inn=iI>=0&&(iO<0||iI<=iO),w=inn?b.match(/^([A-Za-z][\w.' ]{1,40}?)\s+(?:paid|sent)\s+you\b/i)||b.match(/\b(?:received from|from)\s+([A-Za-z][\w.'& ]{1,40}?)(?=\s+(?:on|via|using|to|in|for)\b|[.,;!]|$)/i):b.match(/\b(?:paid to|sent to|payment to|to)\s+([A-Za-z][\w.'& ]{1,40}?)(?=\s+(?:on|via|using|from|for|with)\b|[.,;!]|$)/i),who=w?w[1].trim():"";
    return `${inn?"Received":"Paid"} ${am[0]}${who?(inn?" from ":" to ")+who:""}. ${b}`}
  if(!WALLETPK.test(m.pkg||""))return b;const i=b.indexOf(". "),t=i>0?b.slice(0,i).trim():"",rest=i>0?b.slice(i+2):b;
  const am=rest.match(AMTX);if(!am)return b;
  const l4=(rest.match(/(?:•+|\*{2,}|x{2,}|ending(?: in)?)\s*(\d{4})\b/i)||[])[1]||"",back=/refund|returned|reversed/i.test(b),t2=t.replace(/^(?:refund(?:ed)?|returned|reversed)\s*(?:from|by|of)?\s*/i,""),who=t2&&!/\d/.test(t2)&&t2.length<=40&&!/wallet|google|samsung/i.test(t2)?t2:"";
  return `${back?"Refund of":"Paid"} ${am[0]}${who?(back?" from ":" at ")+who:""}${l4?" with card ending "+l4:""}. ${b}`}

/* ---------- Add or Skip on the phone's notification ---------- */
const payPopOn=()=>S.cfg.payPop!==false;
async function payPopSync(){if(!isApp())return;try{if(payPopOn()&&S.cfg.ntfAuto&&!S.cfg.payAsked){S.cfg.payAsked=1;save();NP("LocalNotifications","requestPermissions").catch(()=>{})}}catch(e){}try{if(typeof payPurge=="function"&&payPurge())render();await NP("DueNative","payPop",{on:payPopOn(),apps:!!S.cfg.ntfAuto,ign:(S.cfg.ignAdd||[]).join(","),allow:(S.cfg.readAdd||[]).join(","),auto:(S.cfg.autoFrom||[]).slice(0,40),hide:!!S.cfg.hide||!!(typeof META!="undefined"&&META.enc)})}catch(e){}}
const payTrim=(o,n)=>Object.fromEntries(Object.entries(o||{}).slice(-n));
/* ids already handled: read from alerts or email, so an answer that finds nothing is not kept waiting */
const paySeen=id=>{id=String(id||"");return (S.cfg.ntfSeen||[]).includes(id)||(id.startsWith("m:")&&(S.cfg.mailSeen||[]).includes(id.slice(2)))};
function payFind(a){const q=S.cfg.smsq||[];let m=q.find(x=>String(x.id)==String(a.id));if(m||!(+a.amt>0))return m||null;
  const d=iso(new Date(+a.t||Date.now()));return q.find(x=>x.p&&(!a.kind||x.p.kind==a.kind)&&Math.abs(x.p.amt-a.amt)<.005&&(!a.cur||!x.p.cur||x.p.cur==a.cur)&&Math.abs(dl(x.p.date)-dl(d))<=1)||null}
/* Add on the phone saves straight away only when the account is clear: the card or account ending matches, you used that
   account for this payee before, or there is only one bank account in that currency. Otherwise it waits for you to pick once. */
function paySure(p){const A=p&&ac(p.acc);if(!A||!A.id)return false;if(p.l4&&A.l4&&String(A.l4)==String(p.l4).slice(-String(A.l4).length))return true;
  if(p.payee&&typeof accFor=="function"&&accFor(p.payee,p.cur)==A.id)return true;return S.acc.filter(a=>a.cur==A.cur&&a.type!="cash"&&!a.closed).length<=1}
function payApply(a){const q=S.cfg.smsq||[],m=payFind(a),T=S.cfg.payTx=S.cfg.payTx||{};
  if(a.act=="skip"){if(m){S.cfg.smsq=q.filter(x=>x!==m);return "skip"}const tid=T[a.id];if(tid&&S.tx.some(t=>t.id==tid)){removeTx(tid);delete T[a.id];return "undo"}return paySeen(a.id)?"skip":"wait"}
  if(a.act!="add")return "done";
  if(!m)return T[a.id]||paySeen(a.id)?"done":"wait";
  let sure=false;if(m.p&&!m.p.l4){const k=(S.cfg.srcAcc||{})[srcKey(m)];if(k&&ac(k).id&&(!m.p.cur||ac(k).cur==m.p.cur)){m.p.acc=k;sure=true}}
  if(qDup(m)){S.cfg.smsq=q.filter(x=>x!==m);return "done"}
  if(quickOk(m)&&(sure||paySure(m.p))){const t=quickSave(m);if(t&&t.id){T[a.id]=t.id;T[m.id]=t.id}return "add"}
  m.yes=1;return "need"}
async function payTake(){if(!isApp())return 0;let A=[];try{const r=await NP("DueNative","payActs");A=((r&&r.items)||[]).filter(a=>a&&a.id&&!String(a.id).startsWith("test:"))}catch(e){}
  const P=[...(S.cfg.payPend||[]).filter(a=>Date.now()-(+a.t||0)<3*864e5),...A];if(!P.length)return 0;const left=[],n={add:0,skip:0,undo:0,need:0};
  P.forEach(a=>{const r=payApply(a);if(r=="wait")left.push(a);else if(n[r]!=null)n[r]++});
  S.cfg.payPend=left.slice(-40);S.cfg.payTx=payTrim(S.cfg.payTx,80);save();
  if(n.add||n.skip||n.undo||n.need){render();const t=[n.add?n.add+(n.add==1?" payment added":" payments added"):"",n.undo?n.undo+" undone":"",n.need?n.need+" need an account: see Payments to review":""].filter(Boolean).join(", ");if(t)toast(t)}return n.add}
let payBusy=false;
async function payNow(){if(payBusy||!isApp())return;payBusy=true;try{await notifScan();await payTake()}catch(e){console.warn("payments",e)}finally{payBusy=false}}
/* an answer given inside the app clears the question on the phone */
function payClear(ids){if(isApp()&&ids&&ids.length)NP("DueNative","payDone",{ids:ids.map(String)}).catch(()=>{})}
{const _qs=quickSave;quickSave=function(m,...r){const t=_qs.call(this,m,...r);try{if(t&&t.id&&m&&m.id){const T=S.cfg.payTx=S.cfg.payTx||{};T[m.id]=t.id;payClear([m.id])}}catch(e){}return t}}
{const _a=ACT.smsAdd;ACT.smsAdd=function(id,...r){payClear([id]);return _a.call(this,id,...r)}}
{const _s=ACT.smsSkip;ACT.smsSkip=function(id,...r){payClear([id]);return _s.call(this,id,...r)}}
{const _sa=ACT.smsSkipAll;ACT.smsSkipAll=function(...r){payClear((S.cfg.smsq||[]).map(m=>m.id));return _sa.apply(this,r)}}
/* emails: answers may come before the email is read in the app, and the hourly check shouldn't ask about emails the app already has */
{const _mt=mailTake;mailTake=async function(ref,d,...r){const res=await _mt.call(this,ref,d,...r);try{const ids=((d&&d.items)||[]).map(m=>m&&m.id).filter(Boolean);if(ids.length&&isApp())NP("DueNative","mailSeen",{ids:ids.map(String)}).catch(()=>{});if((S.cfg.payPend||[]).length)await payTake()}catch(e){}return res}}
/* remember which account you pick for a sender, so a later Add on the phone can save straight away */
/* a message seen through the phone's Messages app is keyed by the bank that sent it, not by the Messages app */
const MSGAPP=/^(com\.google\.android\.apps\.messaging|com\.samsung\.android\.messaging|com\.android\.mms|com\.truecaller)$/;
function srcKey(m){const pk=String(m.id||"").split(":")[0];let f=sendKey(m.from);if(MSGAPP.test(pk)||/^(messages|messaging|truecaller)$/i.test(f)){const t=String(m.body||"").split(". ")[0].trim();f=t&&t.length<=24&&!AMTX.test(t)?t.toLowerCase():""}return f?f+"|"+((m.p&&m.p.cur)||""):""}
let srcPend=null;
{const _a2=ACT.smsAdd;ACT.smsAdd=function(id,...r){const m=(S.cfg.smsq||[]).find(x=>String(x.id)==String(id)),k=m&&m.p&&!m.p.l4?srcKey(m):"";srcPend=k?{k,n:S.tx.length}:null;return _a2.call(this,id,...r)}}
{const _st3=ACT.saveTx;ACT.saveTx=function(...a){const r=_st3.apply(this,a);try{if(srcPend&&S.tx.length>srcPend.n){const t=S.tx[S.tx.length-1];if(t&&t.acc){S.cfg.srcAcc=payTrim({...(S.cfg.srcAcc||{}),[srcPend.k]:t.acc},60);save()}}}catch(e){}srcPend=null;return r}}
/* opening the app from a payment question shows that payment */
async function payOpen(id){await payNow();const m=(S.cfg.smsq||[]).find(x=>String(x.id)==String(id));if(m)return ACT.smsAdd(m.id);if((S.cfg.smsq||[]).length)return smsReview();toast("That payment is already handled")}
{const _ns=nativeStart;nativeStart=function(...a){const r=_ns.apply(this,a);try{payPopSync();window.Capacitor.addListener("DueNative","payAct",()=>setTimeout(payNow,250));setTimeout(payTake,2500)}catch(e){}return r}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState=="visible"&&isApp())setTimeout(()=>{payPopSync();payNow()},400)});
{const _af=ACT.autoFrom;ACT.autoFrom=function(...a){const r=_af.apply(this,a);payPopSync();return r}}
{const _ao=ACT.autoOff;ACT.autoOff=function(k,...a){const hub=!!$("#trk_hub"),r=_ao.call(this,k,...a);payPopSync();if(hub)trackHub();return r}}
{const _na=ACT.notifAuto;ACT.notifAuto=async function(...a){const r=await _na.apply(this,a);payPopSync();return r}}
{const _h=ACT.hide;ACT.hide=function(...a){const r=_h.apply(this,a);payPopSync();return r}}
/* a payment you said yes to on the phone, still waiting for an account */
{const _sr=smsReview;smsReview=function(...a){const r=_sr.apply(this,a);try{(S.cfg.smsq||[]).forEach(m=>{if(!m.yes)return;const b=$(`#over [data-act="smsAdd"][data-id="${CSS.escape(String(m.id))}"]`),c=b&&b.closest(".card");if(c&&!c.querySelector(".yesnote")){c.style.borderColor="var(--pri)";c.insertAdjacentHTML("afterbegin",`<p class="note yesnote" style="margin:0 0 6px;color:var(--pri)"><b>You tapped Add on the phone.</b> Check the account, then tap Save.</p>`)}})}catch(e){}return r}}

/* ---------- Payment tracking: every source and switch on one screen ---------- */
async function trackHub(){const st=isApp()?await readStat(false):RD,gm=gmOn(),ms=msOn(),app=isApp(),auto=S.cfg.autoFrom||[],q=(S.cfg.smsq||[]).length;
  const row=(ok,t,sub,btn)=>`<div class="trow"><span class="tdot ${ok===true||ok=="on"?"good":ok=="bad"?"bad":ok=="warn"?"warn":"na"}" aria-hidden="true"></span><div class="tmain"><b>${t}</b><small>${sub}</small></div>${btn||""}</div>`,
    b=(on,act,id)=>`<button class="btn sm${on?" ghost":""}" data-act="${act}"${id?` data-id="${id}"`:""}>${on?"Turn off":"Turn on"}</button>`;
  sheet(`<h2 id="trk_hub">Payment tracking</h2><p class="sub">Where the app finds your payments, and how it asks you about them. Nothing is sent anywhere.</p>
  ${q?`<div class="card" style="margin:0 0 10px;cursor:pointer;border-color:var(--pri)" data-act="smsReview"><div class="hbl"><b>${q} ${q==1?"payment":"payments"} waiting for you</b><span class="chip">Review</span></div></div>`:""}
  <h3>Where it looks</h3><div class="card">
  ${row(app&&S.cfg.smsAuto?(st.sms===false?"bad":"on"):"off","Bank SMS",app?(S.cfg.smsAuto?(st.sms===false?"Allow the SMS permission to read them":"On · last read "+tAgo(S.cfg.smsLast)):"Off"):"Works in the phone app",app?b(!!S.cfg.smsAuto,"trkSms"):"")}
  ${row(app&&S.cfg.ntfAuto?(st.on?"on":"bad"):"off","Bank apps, wallets and SMS alerts",app?(S.cfg.ntfAuto?(st.on?"On · bank apps, Google Wallet, Google Pay, PhonePe, Paytm, Samsung Wallet, email and bank SMS only · last seen "+tAgo(st.seen):"Notification access is off"):"Off"):"Works in the phone app",app?(S.cfg.ntfAuto&&st.on===false?`<button class="btn sm" data-act="notifOpen">Fix</button>`:b(!!S.cfg.ntfAuto,"trkNotif")):"")}
  ${row(gm?"on":"off","Gmail",gm?"Connected"+(gmLS("acct")?": "+esc(gmLS("acct")):""):"Not connected",`<button class="btn sm ghost" data-act="gmSheet">${gm?"Manage":"Connect"}</button>`)}
  ${row(ms?(msLS("need")?"bad":"on"):"off","Outlook",ms?(msLS("need")?"Needs you to sign in again":"Connected")+(msLS("acct")?": "+esc(msLS("acct")):""):"Not connected",`<button class="btn sm ghost" data-act="msSheet">${ms?"Manage":"Connect"}</button>`)}
  ${app&&(gm||ms)?row(mailBgOn()?"on":"off","Check email every hour","Even when the app is closed",b(mailBgOn(),"trkMail")):""}</div>
  <h3>How it asks you</h3><div class="card">
  ${row(app&&payPopOn()?(S.cfg.ntfAuto||(gm||ms)&&mailBgOn()?"on":"warn"):"off","A notification for each payment",app?(payPopOn()&&!S.cfg.ntfAuto&&!((gm||ms)&&mailBgOn())?"Turn on <b>Bank apps, wallets and SMS alerts</b> above, so the app sees payments as they happen.":"Tap Add or Skip right on the notification. The same payment from SMS, the bank app, a wallet and email is asked about once."):"Works in the phone app",app?b(payPopOn(),"payPopT"):"")}
  ${app&&payPopOn()?`<div class="acts" style="margin-top:6px"><button class="btn sm ghost" data-act="payTest">Show me an example</button></div>`:""}
  ${row(q?"warn":"off","Payments to review on Home",q?q+" waiting":"Nothing waiting","")}
  ${row((S.cfg.payLog||[]).length?"on":"off","Review history",(S.cfg.payLog||[]).length?(S.cfg.payLog||[]).length+" payments added or skipped, kept apart from your entries":"Payments you add or skip are listed here",`<button class="btn sm ghost" data-act="revSheet">Open</button>`)}</div>
  ${auto.length?`<h3>Saved without asking</h3><div class="card">${auto.map(k=>row(true,esc(k),"Added straight away; the notification offers Undo",`<button class="btn sm ghost" data-act="autoOff" data-id="${esc(k)}">Stop</button>`)).join("")}</div>`:""}
  <h3>Apps read</h3><div class="card" style="cursor:pointer" data-act="appsSheet"><div class="hbl"><b>Only banks, wallets, payment apps, email and bank SMS</b><span class="chip">See</span></div><small style="color:var(--mute)">Telegram, WhatsApp, other chat apps and SMS from people are never read.</small></div>
  <div class="acts"><button class="btn ghost" data-act="readCheck">Last messages checked</button>${app?`<button class="btn ghost" data-act="smsScan30">Read SMS from 30 days</button>`:""}</div>`)}
Object.assign(ACT,{
  trackHub(){trackHub()},
  async trkSms(){await ACT.smsAuto();trackHub()},
  async trkNotif(){await ACT.notifAuto();payPopSync();if(!/Read payment alerts/.test($("#over").innerHTML))trackHub()},
  trkMail(){ACT.mailBgT();trackHub()},
  async payPopT(){S.cfg.payPop=!payPopOn();save();if(payPopOn()&&isApp()){try{await NP("LocalNotifications","requestPermissions")}catch(e){}}await payPopSync();trackHub();toast(payPopOn()?"You’ll be asked about each payment":"Payments wait on Home instead")},
  async payTest(){try{await NP("LocalNotifications","requestPermissions")}catch(e){}try{await NP("DueNative","payTest");toast("Look at your notifications")}catch(e){toast("Update the app to see notifications here")}},
  rSeg(k){S.cfg.rSeg=k;save();render();try{window.scrollTo({top:0})}catch(e){}}
});
/* Settings: the reading switches move into Payment tracking */
{const _st=settings;settings=function(...a){const r=_st.apply(this,a);try{const b=$('#over [data-act="notifAuto"]');if(b){const box=b.closest(".acts");box.insertAdjacentHTML("beforebegin",`<div class="card" style="margin:6px 0 10px;cursor:pointer" data-act="trackHub"><div class="hbl"><b>Payment tracking</b><span class="chip">${[S.cfg.smsAuto?"SMS":"",S.cfg.ntfAuto?"Alerts":"",gmOn()?"Gmail":"",msOn()?"Outlook":""].filter(Boolean).join(" · ")||"Off"}</span></div><small style="color:var(--mute)">SMS, bank apps, Google Wallet, Google Pay, Gmail and Outlook, and Add or Skip on notifications</small></div>`);
  const nx=box.nextElementSibling;box.remove();if(nx&&nx.classList.contains("acts")&&nx.querySelector('[data-act="smsAuto"]'))nx.remove()}}catch(e){console.warn(e)}return r}}

/* ---------- small pictures ---------- */
function ringSvg(p,txt,col,sz){sz=sz||64;const c=Math.max(0,Math.min(100,+p||0)),s=String(txt);return `<svg viewBox="0 0 36 36" width="${sz}" height="${sz}" role="img" aria-label="${esc(s)}" style="flex-shrink:0"><circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--line)" stroke-width="3.4"/>${c?`<circle cx="18" cy="18" r="15.9155" fill="none" stroke="${col}" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="${c} ${100-c}" stroke-dashoffset="25"/>`:""}<text x="18" y="20.5" text-anchor="middle" font-size="${s.length>4?6:7.4}" font-weight="700" fill="var(--ink)">${esc(s)}</text></svg>`}
const GOOD="#1f9d6b",lvCol=l=>l=="good"?GOOD:l=="warn"?"var(--soon)":l=="bad"?"var(--late)":"var(--line)";
function meter(val,max,col,mark){const w=max>0?Math.min(100,val/max*100):0,mk=mark!=null&&max>0?Math.min(100,mark/max*100):null;return `<div class="meter"><i style="width:${w}%;background:${col}"></i>${mk!=null?`<em style="left:${mk}%"></em>`:""}</div>`}

/* ---------- Reports: a few pages of pictures instead of one long page ---------- */
const RSEG=[["sum","Summary"],["spend","Spending"],["flow","Cash flow"],["wealth","Wealth"],["tools","Tools"]];
const RMAP={"Where the money went":"sum","This month against before":"sum","Money health":"sum","Where it went":"sum",
  "Fixed and flexible spending":"spend","Last 6 months":"spend","Top payees":"spend","Spending by tag":"spend","Spending by person":"spend","Subscriptions and fixed payments":"spend",
  "Cash-flow forecast":"flow","Dues and EMIs, next 6 months":"flow","QAR ↔ INR transfers":"flow",
  "Investment returns":"wealth","Maturity ladder":"wealth","Loans":"wealth","Cover and yearly totals":"wealth",
  "Streaks and challenge":"tools","Reports to keep":"tools","What if":"tools","Goal planner":"tools","Data checks":"tools"};
const rSeg=()=>RSEG.some(s=>s[0]==S.cfg.rSeg)?S.cfg.rSeg:"sum";
function glanceCard(m){const R=rep(m),rate=R.rate.cur,usual=k=>R[k].avg!=null?R[k].avg:R[k].prev,
    d=(k,up)=>{const c=R[k].cur,b=usual(k);if(!b||c==null)return `<small style="color:var(--mute)">no history yet</small>`;const p=Math.round((c/b-1)*100);return p?`<small class="${(p>0)==up?"gd":"bd"}">${p>0?"▲":"▼"} ${Math.abs(p)}% vs usual</small>`:`<small style="color:var(--mute)">as usual</small>`},
    t=(l,k,up)=>`<div class="stat" data-act="explain" data-id="m:${k}:${m}"><small>${l}</small><b>${fmr(R[k].cur)}</b>${d(k,up)}</div>`,
    col=rate==null?"var(--line)":rate>=20?GOOD:rate>=10?"var(--soon)":"var(--late)",G=[["Spent","out"],["Income","in"],["Saved","save"]].map(([l,k])=>({l,a:R[k].cur||0,b:R[k].prev||0,c:R[k].avg||0}));
  return `<h2>This month at a glance</h2><div class="card"><div class="stats" style="grid-template-columns:repeat(3,1fr);margin:0">${t("Spent","out",false)}${t("Income","in",true)}${t("Saved","save",true)}</div>
  <div class="glance" data-act="explain" data-id="rate:${m}">${ringSvg(rate==null?0:rate/40*100,rate==null?"–":Math.round(rate)+"%",col,70)}<div><b>Kept from income</b><small>${rate==null?"Add income to see it":fmr(Math.max(0,(R.in.cur||0)-(R.out.cur||0)))+" not spent · "+(rate>=20?"on target (20% or more)":"aim for 20% or more")}</small></div></div>
  ${bars(G,["a","b","c"],["var(--pri)","#9fb7ad","var(--soon)"])}<div class="leg"><span><i style="background:var(--pri)"></i>${mlab(m)}</span><span><i style="background:#9fb7ad"></i>${mlab(addMon(m,-1))}</span><span><i style="background:var(--soon)"></i>3-month average</span></div></div>`}
function healthGrid(m){const H=health(m).filter(x=>!/^savings rate$/i.test(x.n||""));return `<h2>Money health</h2><div class="hlth">${H.map(x=>{const v=String(x.v||""),big=(v.match(/^[\d.,]+%?/)||[""])[0],rest=big?v.slice(big.length).trim():v,ic=x.l=="good"?"✓":x.l=="warn"?"!":x.l=="bad"?"✕":"–";
  return `<div class="hcell"${x.k?` data-act="explain" data-id="${esc(x.k)}"`:""}><span class="hbadge" style="background:${lvCol(x.l)}">${esc(big||ic)}</span><div><b>${esc(x.n)}</b><small>${esc(rest||v)}</small></div></div>`}).join("")}</div>
  <details class="rinfo"><summary>What the colours mean</summary><p class="note">Green, amber and red follow common rules of thumb: keep 20% of income, hold 3 to 6 months of spending, keep EMIs under 30 to 40% of income. They are not personal financial advice.</p></details>`}
function budChart(m){const B=budUse(m).filter(x=>x.b&&x.b.lim>0).sort((a,b)=>b.p-a.p);if(!B.length)return "";
  return `<h2>Budgets this month</h2><div class="card">${B.map(x=>{const col=x.p>100?"var(--late)":x.p>=90?"var(--soon)":GOOD;return `<div class="hb"><div class="hbl"><span>${esc(x.b.cat)}</span><b style="color:${x.p>100?"var(--late)":"inherit"}">${fmx(x.s,x.b.cur)} of ${fmx(x.b.lim,x.b.cur)}</b></div>${meter(x.s,x.b.lim,col)}</div>`}).join("")}</div>`}
function retChart(){const L=S.inv.filter(x=>!x.closed).map(x=>[x.name,invRet(x)]).filter(([n,r])=>r&&r.yr!=null).sort((a,b)=>b[1].yr-a[1].yr).slice(0,8);if(!L.length)return "";const mx=Math.max(1,...L.map(([n,r])=>Math.abs(r.yr)));
  return L.map(([n,r])=>`<div class="hb"><div class="hbl"><span>${esc(n)}</span><b class="${r.yr<0?"bd":"gd"}">${r.yr>=0?"+":""}${r.yr.toFixed(1)}% a year</b></div><div class="hbt"><i style="width:${Math.abs(r.yr)/mx*100}%;background:${r.yr<0?"var(--late)":GOOD}"></i></div></div>`).join("")}
/* long explanations fold away; warnings stay in view */
function rFold(root){root.querySelectorAll("p.note").forEach(p=>{const t=p.textContent.trim();if(t.length<110||/below zero|over the|short by|overdue|not set|missing|no spending/i.test(t)||p.closest("details")||p.querySelector("button,input,select,a"))return;
  const d=document.createElement("details");d.className="rinfo";d.innerHTML="<summary>How this works</summary>";p.replaceWith(d);d.appendChild(p)});
  root.querySelectorAll(".card").forEach(c=>{const tb=c.querySelector(":scope > table.tbl");if(!tb||!c.querySelector("svg,.hb"))return;const d=document.createElement("details");d.className="rinfo";d.innerHTML="<summary>See the numbers</summary>";tb.replaceWith(d);d.appendChild(tb)})}
function rLayout(h){const T=document.createElement("template");T.innerHTML=h;const head=[],secs=[];let cur=null;
  [...T.content.childNodes].forEach(n=>{if(n.nodeType==1&&n.tagName=="H2"){cur={t:n.textContent.trim(),nodes:[n]};secs.push(cur)}else if(cur)cur.nodes.push(n);else head.push(n)});
  const seg=rSeg(),m=mon,box=document.createElement("template"),C=box.content,add=x=>typeof x=="string"?C.appendChild(document.createRange().createContextualFragment(x)):C.appendChild(x),hasChk=secs.some(s=>s.t=="Data checks"&&s.nodes.some(n=>n.nodeType==1&&n.querySelector&&n.querySelector(".row,.hrow,[data-act]")));
  /* the page title, the five pages, then currency and month where they matter */
  const keep=head.filter(n=>n.nodeType==1);const h1=keep.find(n=>n.tagName=="H1"),vs=keep.find(n=>n.classList&&n.classList.contains("seg")),mn=keep.find(n=>n.classList&&n.classList.contains("mon")),vd=keep.find(n=>n.dataset&&n.dataset.act=="verdict"),ask=keep.find(n=>n.querySelector&&n.querySelector("#ask_q"));
  const hint=keep.find(n=>n.tagName=="P"&&n.classList.contains("sub"));if(h1)add(h1);add(`<div class="segs rsegs">${RSEG.map(([k,l])=>`<button class="${k==seg?"on":""}" data-act="rSeg" data-id="${k}">${l}${k=="tools"&&hasChk?' <span class="pdot"></span>':""}</button>`).join("")}</div>`);
  if(vs)add(vs);if(mn&&seg!="flow"&&seg!="wealth")add(mn);if(hint&&seg=="sum")add(hint);
  const isSum=n=>n.nodeType==1&&n.classList&&n.classList.contains("card")&&!n.dataset.act&&n.children.length>=2&&[...n.children].every(c=>c.tagName=="P");
  const put=title=>{const s=secs.find(x=>x.t==title);if(!s)return;s.used=1;s.nodes.forEach(n=>{if(!(title=="Where the money went"&&isSum(n)))add(n)})};
  if(seg=="sum"){if(vd){vd.querySelectorAll(":scope > small").forEach(x=>x.remove());add(vd)}if(ask)add(ask);add(glanceCard(m));const tb=secs.find(x=>x.t=="This month against before");if(tb)tb.used=1;const mh=secs.find(x=>x.t=="Money health");if(mh){mh.used=1;add(healthGrid(m))}put("Where it went");put("Where the money went")}
  else if(seg=="spend"){add(budChart(m));["Fixed and flexible spending","Last 6 months","Top payees","Spending by tag","Spending by person","Subscriptions and fixed payments"].forEach(put)}
  else if(seg=="flow")["Cash-flow forecast","Dues and EMIs, next 6 months","QAR ↔ INR transfers"].forEach(put);
  else if(seg=="wealth"){const ir=secs.find(x=>x.t=="Investment returns");if(ir){const c=ir.nodes.find(n=>n.nodeType==1&&n.classList&&n.classList.contains("card")),r=retChart();if(c&&r)c.insertAdjacentHTML("afterbegin",r)}["Investment returns","Maturity ladder","Loans","Cover and yearly totals"].forEach(put)}
  else ["Streaks and challenge","Reports to keep","What if","Goal planner","Data checks"].forEach(put);
  /* anything new that isn't sorted yet shows on Summary, so nothing gets lost */
  if(seg=="sum")secs.filter(s=>!s.used&&!RMAP[s.t]).forEach(s=>put(s.t));
  if(!C.querySelector("h2"))add(`<div class="empty">Nothing to show here yet. Add a few entries and it fills in.</div>`);
  rFold(C);const out=document.createElement("div");out.appendChild(C);return out.innerHTML}
{const _vR=vRep;vRep=function(...a){const ta=typeof taOn=="function"&&taOn();if(ta)S.cfg.lang="";let h;try{h=_vR.apply(this,a)}finally{if(ta)S.cfg.lang="ta"}
  try{h=rLayout(h)}catch(e){console.warn("reports layout",e)}return ta?taHtml(h):h}}

/* ---------- Home: this month as a picture ---------- */
function paceLine(cm){const sp=mSum(cm,"out"),B=budUse(cm).filter(x=>x.b&&x.b.lim>0),day=+today().slice(8),dm=dim(cm),R=rep(cm),usual=R.out.avg||R.out.prev||0;
  if(B.length){const lim=B.reduce((s,x)=>s+iv(x.b.lim,x.b.cur),0),used=B.reduce((s,x)=>s+iv(x.s,x.b.cur),0),p=lim?used/lim*100:0,col=p>100?"var(--late)":p>=day/dm*100+10?"var(--soon)":GOOD;
    return `<div class="pace"><div class="hbl"><span>Budgets used</span><b>${fm(used)} of ${fm(lim)}</b></div>${meter(used,lim,col,lim*day/dm)}<small>${p>100?"Over the budget":p>=day/dm*100+10?"Spending faster than the month":"On track for the month"} · the line is today</small></div>`}
  if(!usual)return "";const col=sp>usual?"var(--late)":sp>usual*day/dm*1.1?"var(--soon)":GOOD;
  return `<div class="pace"><div class="hbl"><span>Spent so far</span><b>${fm(sp)} of usual ${fm(usual)}</b></div>${meter(sp,Math.max(usual,sp),col,usual*day/dm)}<small>${sp>usual?"Already more than a usual month":sp>usual*day/dm*1.1?"A bit faster than usual":"Within your usual pace"} · the line is where a usual month is today</small></div>`}
{const _mc=monthCard;monthCard=function(...a){const h=_mc.apply(this,a);try{const p=paceLine(today().slice(0,7));if(!p)return h;const T=document.createElement("template");T.innerHTML=h;const c=[...T.content.querySelectorAll(".card")].find(x=>x.querySelector(".mini3"));if(!c)return h;
  c.querySelectorAll(":scope > small").forEach(x=>x.remove());c.insertAdjacentHTML("beforeend",p);const d=document.createElement("div");d.appendChild(T.content);return d.innerHTML}catch(e){return h}}}

NEW27.splice(0,NEW27.length,"🔔 A notification for each payment: tap Add to put it in your expenses, or Skip","💳 Reads Google Wallet, Google Pay, PhonePe, Paytm and Samsung Wallet payments, and money people send you","📬 One Payment tracking screen for SMS, app alerts, Gmail and Outlook (Settings)","📊 Reports in five pages, Summary, Spending, Cash flow, Wealth and Tools, with charts first","🟢 Money health as green, amber and red badges; tables fold under the charts","🏠 Home shows how much of this month's budgets is used","🏤 Post office deposits and RD follow post office rules","🪙 Gold uses the live international price and can match your jeweller");
