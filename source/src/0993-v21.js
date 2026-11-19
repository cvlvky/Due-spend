/* ===== Version 21: Qatar ↔ India: top-up radar, money sent home, rate alert, transfer matcher, gratuity ===== */
PREFX.push("grat","rtgt");
/* market QAR→INR on a day (from the daily price history), or the app's rate */
function mktRate(d){const H=S.mkh||{};if(H[d]&&H[d].qi)return H[d].qi;const ks=Object.keys(H).filter(k=>k<=d&&H[k].qi).sort();const k=ks[ks.length-1];return k&&dl(k)>=dl(d)-7?H[k].qi:0}
const qiNow=()=>(S.mk&&S.mk.qi)||fx();
/* ---------- top-up radar: will each account cover what is coming? ---------- */
function radar(days){days=days||90;const t=today(),U=upcoming(t,plus(days),true),per={};
  const add=(acc,d,a,n)=>{if(acc)(per[acc]=per[acc]||[]).push({d:d<t?t:d,a,n})};
  U.forEach(u=>{let acc="",sg=-1;
    if(u.src=="sub"){const x=S.subs.find(q=>q.id==u.id);if(x)acc=payAcc(x.pay,x.cur).id}
    else if(u.src=="sch"){const x=S.sacc.find(q=>q.id==u.id);if(x)acc=payAcc(x.pay,"INR").id}
    else if(u.src=="lend"){const x=(S.lend||[]).find(q=>q.id==u.id);if(x&&x.acc){acc=x.acc;sg=x.dir=="lent"?1:-1}}
    else if(u.t=="fd")return;
    else if(u.t=="due"){const x=S.dates.find(q=>q.id==u.id);if(x)acc=payAcc(x.pay,x.cur).id}
    else if(u.t=="emi"){const x=S.loans.find(q=>q.id==u.id);if(x)acc=payAcc(x.acc,x.cur).id}
    else if(u.t=="rec"||u.t=="recin"){const x=S.rec.find(q=>q.id==u.id);if(x)acc=x.acc;sg=u.t=="recin"?1:-1}
    if(!acc||!+u.a)return;const A=ac(acc);add(acc,u.d,sg*cv(+u.a,u.c||A.cur,A.cur),u.n)});
  return S.acc.filter(a=>per[a.id]&&a.type!="card").map(a=>{const L=per[a.id].sort((x,y)=>x.d.localeCompare(y.d)||x.a-y.a),min=+a.min||0;let b=bal(a),low=b,lowD=t,lowN="",first=null;
    L.forEach(e=>{b+=e.a;e.b=b;if(b<low){low=b;lowD=e.d;lowN=e.n}if(!first&&b<min)first=e});
    const step=a.cur=="INR"?1000:100,need=first?Math.ceil((min-low)/step)*step:0,by=first?(dl(first.d)>3?addDays(first.d,-3):today()):"";
    return {a,L,start:bal(a),low,lowD,lowN,first,need,by,min}}).filter(r=>r.L.some(e=>e.a<0))}
const addDays=(d,n)=>{const x=D(d);x.setDate(x.getDate()+n);return iso(x)};
function radarCard(home){const R=radar(home?45:90).filter(r=>r.need>0);if(!R.length)return "";
  return `<div class="card late" style="margin:0 0 12px;cursor:pointer" data-act="radar"><b>Top up needed</b>${R.slice(0,3).map(r=>`<div style="margin-top:6px"><div class="hbl"><span>Send <b>${fmx(r.need,r.a.cur)}</b> to ${esc(r.a.name)}</span><span class="chip">by ${fmt(r.by)}</span></div><small style="color:var(--mute)">For ${esc(r.first.n)} on ${fmt(r.first.d)}${r.a.cur=="INR"?" · about QAR "+nf(Math.ceil(r.need/qiNow()),0):""}</small></div>`).join("")}</div>`}
function radarSheet(){const R=radar(90);sheet(`<h2>Top-up radar</h2><p class="sub">Next 90 days of dues, EMIs, scheme deposits, subscriptions and regular payments, account by account.</p>
  ${R.length?R.map(r=>`<div class="card" style="margin-bottom:10px"><div class="hbl"><b>${esc(r.a.name)}</b><span class="chip">${r.need?"Send "+fmx(r.need,r.a.cur):"Covered"}</span></div>
  <small style="color:var(--mute)">Now ${fmx(r.start,r.a.cur)} · lowest ${fmx(r.low,r.a.cur)} on ${fmt(r.lowD)}${r.lowN?" after "+esc(r.lowN):""}</small>
  <table class="tbl" style="margin-top:6px">${r.L.slice(0,12).map(e=>`<tr><td>${fmt(e.d)}</td><td>${esc(e.n)}</td><td style="text-align:right">${e.a<0?"−":"+"}${nf(Math.abs(e.a),0)}</td><td style="text-align:right;color:${e.b<r.min?"var(--late)":"inherit"}">${nf(e.b,0)}</td></tr>`).join("")}</table>
  <div class="two" style="margin-top:6px"><div>${F("min_"+r.a.id,"Keep at least ("+r.a.cur+")",r.a.min||"","number")}</div><div style="display:flex;align-items:flex-end;gap:6px"><button class="btn sm ghost" data-act="radarMin" data-id="${r.a.id}">Save</button>${r.need?`<button class="btn sm" data-act="radarSend" data-id="${r.a.id}">Transfer</button>`:""}</div></div></div>`).join(""):`<div class="empty">Nothing is set to be paid from your accounts in the next 90 days. Choose the "Paid from" account on dues, loans and subscriptions to use this.</div>`}
  <p class="note">Recurring income set up under Regular entries counts too. FD maturities don’t, in case they renew.</p>`)}
/* ---------- money sent home ---------- */
const fyOf=d=>{const y=+d.slice(0,4);return (+d.slice(5,7)>=4?y:y-1)};
function remitRows(from){return remits().filter(r=>!from||r.x.date>=from).map(r=>{const m=mktRate(r.x.date),fee=+r.x.fee||0,feeQ=cv(fee,ac(r.x.acc).cur,"QAR"),cost=m?Math.max(0,m*r.qar-r.inr)+feeQ*m:null;
  return {...r,mkt:m,feeQ,cost,pct:cost!=null&&m?cost/(m*(r.qar+feeQ))*100:null,via:r.x.via||"Not noted"}})}
function remitStats(L){const q=L.reduce((s,r)=>s+r.qar,0),n=L.reduce((s,r)=>s+r.inr,0),f=L.reduce((s,r)=>s+r.feeQ,0),C=L.filter(r=>r.cost!=null),cost=C.reduce((s,r)=>s+r.cost,0);
  const ch={};L.forEach(r=>{const c=ch[r.via]=ch[r.via]||{via:r.via,q:0,n:0,f:0,k:0};c.q+=r.qar;c.n+=r.inr;c.f+=r.feeQ;c.k++});
  const by=Object.values(ch).map(c=>({...c,eff:c.n/(c.q+c.f)})).sort((a,b)=>b.eff-a.eff);
  let beat=0,tot=0;L.forEach(r=>{const mo=r.x.date.slice(0,7),H=Object.entries(S.mkh||{}).filter(([k,x])=>k.startsWith(mo)&&x.qi).map(([,x])=>x.qi);if(H.length>=5&&r.mkt){tot++;if(r.mkt>=H.reduce((s,x)=>s+x,0)/H.length)beat++}});
  return {q,n,f,cost,costPct:C.length?cost/C.reduce((s,r)=>s+r.mkt*(r.qar+r.feeQ),0)*100:null,avg:q?n/q:0,by,beat,tot}}
remitCard=function(){const L=remitRows(fyOf(today())+"-04-01");if(!L.length&&!S.cfg.rtgt)return `<div class="card" style="margin-top:12px;cursor:pointer" data-act="remitSheet"><b>Money sent home</b><p class="note">Record QAR → INR transfers with Transfer money. The app shows the real rate, fees and the best channel. You can also set a rate alert here.</p></div>`;
  const st=remitStats(L),hit=S.cfg.rtgt&&qiNow()>=S.cfg.rtgt;
  return `<div class="card" style="margin-top:12px;cursor:pointer" data-act="remitSheet"><div class="hbl"><b>Money sent home</b><span class="chip">${L.length} this tax year</span></div>
  <div class="stats" style="margin:8px 0 0">${tile("Received",inr(Math.round(st.n)))}${tile("Sent","QAR "+nf(st.q,0))}${tile("Your rate",st.avg?st.avg.toFixed(2):"–")}</div>
  <small style="color:var(--mute);display:block;margin-top:6px">${st.costPct!=null?"Fees and rate gap cost about "+inr(Math.round(st.cost))+" ("+st.costPct.toFixed(1)+"%). ":""}${st.by.length>1?"Best channel: "+esc(st.by[0].via)+". ":""}Today 1 QAR = ₹${qiNow().toFixed(2)}${S.cfg.rtgt?` · alert at ₹${S.cfg.rtgt}${hit?" <b>reached</b>":""}`:""}</small></div>`};
function remitSheet(){const L=remitRows("").reverse(),fy=fyOf(today()),Y=L.filter(r=>r.x.date>=fy+"-04-01"),st=remitStats(Y),H=Object.keys(S.mkh||{}).filter(k=>S.mkh[k].qi).sort().slice(-60);
  sheet(`<h2>Money sent home</h2><p class="sub">Tax year ${fy}-${String(fy+1).slice(2)}: ${Y.length} transfers, QAR ${nf(st.q,0)} → ${inr(Math.round(st.n))}.</p>
  ${H.length>1?`<small style="color:var(--mute)">1 QAR in rupees, last ${H.length} days</small>${area(H.map(d=>({l:+d.slice(8)+" "+mlab(d.slice(0,7)),v:S.mkh[d].qi})),true,2)}`:""}
  <h3>Rate alert</h3><div class="two"><div>${F("f_rtgt","Tell me when 1 QAR reaches ₹",S.cfg.rtgt||"","number",'placeholder="'+(qiNow()+0.15).toFixed(2)+'"')}</div><div style="display:flex;align-items:flex-end"><button class="btn sm" data-act="rtgtSave">Save alert</button></div></div>
  <p class="note">Today ₹${qiNow().toFixed(2)}. The app checks a few times a day when it’s opened, and shows a phone notification once a day while the rate is at or above your number.</p>
  ${st.tot?`<p class="note"><b>Timing:</b> on ${st.beat} of ${st.tot} transfers the market rate was at or above that month’s average.</p>`:""}
  ${st.by.length?`<h3>Channels</h3><table class="tbl"><tr><th>Through</th><th>Times</th><th>Rate after fees</th></tr>${st.by.map(c=>`<tr><td>${esc(c.via)}</td><td>${c.k}</td><td>${c.eff.toFixed(3)}</td></tr>`).join("")}</table><p class="note">Rate after fees = rupees received ÷ (QAR sent + fee). Higher is better. Add "Sent through" on each transfer to compare.</p>`:""}
  <h3>Transfers</h3>${L.length?L.slice(0,40).map(r=>`<div class="row" data-act="editTx" data-id="${r.x.id}"><div><b>QAR ${nf(r.qar)} → ${inr(r.inr)}</b><small>${fmt(r.x.date)} · ${esc(r.via)} · rate ${r.rate.toFixed(3)}${r.mkt?" · market "+r.mkt.toFixed(3):""}${r.feeQ?" · fee QAR "+nf(r.feeQ):""}</small></div>${r.cost!=null?`<small style="text-align:right">cost<br><b>${inr(Math.round(r.cost))}</b></small>`:""}</div>`).join(""):`<div class="empty">No QAR → INR transfers yet.</div>`}
  <div class="acts"><button class="btn" data-act="trf">Transfer money</button></div>`)}
/* rate alert: checked whenever prices refresh */
{const _rm=refreshMarket;refreshMarket=async function(f){const r=await _rm(f);try{const g=+S.cfg.rtgt,q=S.mk&&S.mk.qi;if(g&&q&&q>=g&&S.cfg.rtHit!=today()){S.cfg.rtHit=today();save();if(isApp())nativeNotifyLater();if(tab=="home")render()}}catch(e){}return r}}
{const _nn=nativeNotify;nativeNotify=async function(){await _nn();try{const g=+S.cfg.rtgt,q=S.mk&&S.mk.qi;if(g&&q&&q>=g&&S.cfg.rtHit==today()&&S.cfg.rtNote!=today()){S.cfg.rtNote=today();save();
  await NP("LocalNotifications","schedule",{notifications:[{id:8600,title:"QAR rate alert: ₹"+q.toFixed(2),body:"1 QAR is at or above your ₹"+g+" target. A good day to send money home.",schedule:{at:new Date(Date.now()+1500).toISOString()}}]})}}catch(e){}}}
const rateCard=()=>{const g=+S.cfg.rtgt,q=S.mk&&S.mk.qi;return g&&q&&q>=g?`<div class="card" style="margin:0 0 12px;cursor:pointer;border-color:var(--pri)" data-act="remitSheet"><div class="hbl"><b>1 QAR = ₹${q.toFixed(2)} today</b><span class="chip">Alert</span></div><small style="color:var(--mute)">At or above your ₹${g} target. A good day to send money home.</small></div>`:""};
/* ---------- own-transfer matcher: QAR out + INR in = one transfer ---------- */
function trMatch(outs,ins){const P=[],used=new Set();
  ins.forEach(i=>{let best=null;outs.forEach(o=>{if(used.has(o.k))return;const gap=(D(i.date)-D(o.date))/864e5;if(gap<-1||gap>4)return;const m=mktRate(o.date)||qiNow(),r=i.amt/o.amt;if(r<m*.9||r>m*1.03)return;const sc=Math.abs(r-m)/m+gap*.002;if(!best||sc<best.sc)best={o,sc,r}});
    if(best){used.add(best.o.k);P.push({o:best.o,i,rate:best.r})}});return P}
const isQ=x=>(x.cur||ac(x.acc).cur)=="QAR",isI=x=>(x.cur||ac(x.acc).cur)=="INR";
function trPairsTx(){const since=plus(-60),ign=new Set(S.cfg.trIgn||[]);
  const outs=S.tx.filter(x=>x.kind=="out"&&!x.link&&x.date>=since&&isQ(x)).map(x=>({k:x.id,date:x.date,amt:+x.amt,x})),ins=S.tx.filter(x=>x.kind=="in"&&!x.link&&x.date>=since&&isI(x)).map(x=>({k:x.id,date:x.date,amt:+x.amt,x}));
  return trMatch(outs,ins).filter(p=>!ign.has(p.o.k+"|"+p.i.k))}
function trPairCard(){const P=trPairsTx();if(!P.length)return "";return `<div class="card" style="margin-top:12px"><b>Possible transfers between your accounts</b><p class="note">A QAR payment and a rupee credit a few days apart, at about the market rate.</p>${P.slice(0,4).map(p=>`<div style="margin-top:8px"><div class="hbl"><span>QAR ${nf(p.o.amt)} from ${esc(an(p.o.x.acc))} → ${inr(p.i.amt)} to ${esc(an(p.i.x.acc))}</span></div><small style="color:var(--mute)">${fmt(p.o.date)} and ${fmt(p.i.date)} · rate ${p.rate.toFixed(3)}</small><div class="acts" style="margin-top:4px"><button class="btn sm" data-act="trMerge" data-id="${p.o.k}|${p.i.k}">Make it one transfer</button><button class="btn sm ghost" data-act="trNo" data-id="${p.o.k}|${p.i.k}">Not the same</button></div></div>`).join("")}</div>`}
/* in the review queue */
function qPairs(){const q=(S.cfg.smsq||[]).filter(m=>m.p),since=plus(-10);
  const outs=[...q.filter(m=>m.p.kind=="out"&&(m.p.cur||ac(m.p.acc).cur)=="QAR").map(m=>({k:"q:"+m.id,date:m.p.date,amt:+m.p.amt,m})),...S.tx.filter(x=>x.kind=="out"&&!x.link&&x.date>=since&&isQ(x)).map(x=>({k:"t:"+x.id,date:x.date,amt:+x.amt,x}))];
  const ins=q.filter(m=>m.p.kind=="in"&&(m.p.cur||ac(m.p.acc).cur)=="INR").map(m=>({k:"q:"+m.id,date:m.p.date,amt:+m.p.amt,m}));return trMatch(outs,ins)}
{const _sr=smsReview;smsReview=function(){_sr();qPairs().forEach(p=>{const b=$(`#over [data-act='smsAdd'][data-id='${CSS.escape(String(p.i.m.id))}']`);if(!b)return;const card=b.closest(".card");if(!card||card.querySelector("[data-act='qMerge']"))return;
  card.insertAdjacentHTML("beforeend",`<div class="note" style="margin-top:6px;color:var(--pri)">Looks like your transfer of QAR ${nf(p.o.amt)} from ${esc(an(p.o.m?p.o.m.p.acc:p.o.x.acc)||"your Qatar account")} on ${fmt(p.o.date)} (rate ${p.rate.toFixed(3)}).</div><div class="acts"><button class="btn sm" data-act="qMerge" data-id="${esc(p.o.k)}|${esc(p.i.k)}">Record as one transfer</button></div>`)})}}
function makeTransfer(o,i,via){const fromAcc=o.acc||S.acc.find(a=>a.cur=="QAR")&&S.acc.find(a=>a.cur=="QAR").id,toAcc=i.acc||S.acc.find(a=>a.cur=="INR")&&S.acc.find(a=>a.cur=="INR").id;if(!fromAcc||!toAcc)return null;
  return addTx(stamp({kind:"tr",acc:fromAcc,to:toAcc,amt:+o.amt,got:+i.amt,fee:0,date:o.date,cur:ac(fromAcc).cur,note:"Sent home",via:via||""}))}
/* ---------- gratuity (Qatar end of service) ---------- */
function gratCalc(at){const G=S.cfg.grat;if(!G||!G.join||!(+G.basic>0))return null;const end=at||(G.exit&&G.exit<today()?G.exit:today()),days=Math.max(0,(D(end)-D(G.join))/864e5-(+G.unpaid||0)),yrs=days/365,perYr=(+G.basic)/30*(+G.days||21);
  return {yrs,amt:yrs>=1?perYr*yrs:0,accr:perYr*yrs,perYr,perMo:perYr/12,elig:yrs>=1,from:addM(G.join,12)}}
{const _nw=nwParts;nwParts=function(to){const p=_nw(to),G=S.cfg.grat,g=G&&G.on!==false?gratCalc():null;p.grat=g?cv(g.amt,"QAR",to):0;p.inv+=p.grat;return p}}
function gratCard(){const g=gratCalc(),G=S.cfg.grat;if(!g)return `<h2>Gratuity</h2><div class="card" style="cursor:pointer" data-act="gratForm"><b>End-of-service gratuity</b><p class="note">Add your joining date and basic pay. The app works out what you’ve earned so far and counts it in your net worth.</p></div>`;
  const ex=G.exit&&G.exit>today()?gratCalc(G.exit):null;
  return `<h2>Gratuity</h2><div class="card" style="cursor:pointer" data-act="gratForm"><div class="hbl"><b>End-of-service gratuity</b><span class="chip">${nf(g.yrs,1)} years</span></div>
  <div class="stats" style="margin:8px 0 0">${tile("Earned so far","QAR "+nf(Math.round(g.accr)))}${tile("Each month","+QAR "+nf(Math.round(g.perMo)))}${ex?tile("By "+fmt(G.exit),"QAR "+nf(Math.round(ex.amt))):tile("In rupees",inr(Math.round(cv(g.accr,"QAR","INR"))))}</div>
  <small style="color:var(--mute);display:block;margin-top:6px">${g.elig?"":"Payable after one year of service ("+fmt(g.from)+"). "}${+G.days||21} days of basic pay a year${G.on===false?" · not counted in net worth":" · counted in net worth"}. Estimate; your contract may give more.</small></div>`}
function gratForm(){const G=S.cfg.grat||{};sheet(`<h2>End-of-service gratuity</h2><p class="sub">Qatar’s labour law sets at least three weeks (21 days) of your last basic pay for each year, with part years paid pro rata, after one year of service. Your contract can give more.</p>
  <div class="two"><div>${F("g_join","Joining date",G.join||"","date")}</div><div>${F("g_basic","Basic pay a month (QAR)",G.basic||"","number")}</div></div>
  <div class="two"><div>${F("g_days","Days of pay per year",G.days||21,"number")}</div><div>${F("g_unpaid","Unpaid leave days (not counted)",G.unpaid||"","number")}</div></div>
  ${F("g_exit","Planned last working day (optional)",G.exit||"","date")}${SEL("g_on","Count it in net worth?",[["1","Yes"],["0","No"]],G.on===false?"0":"1")}
  <p class="note">Use your basic pay only, without housing or transport allowances.</p>${btns("gratSave",G.join?"g":"",G.join?"gratDel":"")}`)}
Object.assign(ACT,{
  radar(){radarSheet()},
  radarMin(id){const a=S.acc.find(x=>x.id==id);if(!a)return;a.min=+v("min_"+id)||0;stamp(a,a);save();render();radarSheet();toast("Saved")},
  radarSend(id){const r=radar(90).find(x=>x.a.id==id);if(!r)return;const src=S.acc.filter(a=>a.cur!=r.a.cur&&a.type!="card").sort((a,b)=>bal(b)-bal(a))[0]||S.acc.find(a=>a.id!=id);trForm(null);
    if(src)setVal("f_from",src.id);setVal("f_to",id);if(src){setVal("f_amt",src.cur==r.a.cur?r.need:Math.ceil(cv(r.need,r.a.cur,src.cur)));setVal("f_got",r.need)}},
  remitSheet(){remitSheet()},
  rtgtSave(){const g=+v("f_rtgt")||0;S.cfg.rtgt=g||null;S.cfg.rtHit="";S.cfg.rtNote="";save();toast(g?"You’ll get an alert at ₹"+g:"Rate alert off");if(g&&S.mk&&S.mk.qi>=g){S.cfg.rtHit=today();if(isApp())nativeNotifyLater()}render();remitSheet()},
  trMerge(key){const [a,b]=key.split("|"),o=S.tx.find(x=>x.id==a),i=S.tx.find(x=>x.id==b);if(!o||!i)return;const t=makeTransfer({acc:o.acc,amt:o.amt,date:o.date},{acc:i.acc,amt:i.amt});if(!t)return;removeTx(a);removeTx(b);save();render();toast("Recorded as one transfer",()=>{removeTx(t.id);untrash(a);untrash(b);save();render()})},
  trNo(key){S.cfg.trIgn=[...new Set([...(S.cfg.trIgn||[]),key])].slice(-200);save();render()},
  qMerge(key){const [ok_,ik]=key.split("|"),q=S.cfg.smsq||[],im=q.find(m=>"q:"+m.id==ik);if(!im)return;let o;
    if(ok_.startsWith("q:")){const om=q.find(m=>"q:"+m.id==ok_);if(!om)return;o={acc:om.p.acc,amt:om.p.amt,date:om.p.date};S.cfg.smsq=q.filter(m=>m!==om&&m!==im)}
    else{const x=S.tx.find(t=>"t:"+t.id==ok_);if(!x)return;o={acc:x.acc,amt:x.amt,date:x.date};removeTx(x.id);S.cfg.smsq=q.filter(m=>m!==im)}
    const t=makeTransfer(o,{acc:im.p.acc,amt:im.p.amt});save();render();if(t){toast("Recorded as one transfer");smsReview()}},
  gratForm(){gratForm()},
  gratSave(){const j=v("g_join"),b=+v("g_basic");if(!j||!(b>0))return toast("Add the joining date and basic pay");S.cfg.grat={join:j,basic:b,days:+v("g_days")||21,unpaid:+v("g_unpaid")||0,exit:v("g_exit"),on:v("g_on")!="0"};save();done();toast("Gratuity saved")},
  gratDel(){S.cfg.grat=null;save();done()}
});
{const _vA=vAcc;vAcc=function(){let h=_vA();const r=radarCard(false),p=trPairCard(),k='<div class="acts"><button class="btn" data-act="trf">';const i=h.indexOf(k);
  return i>=0?h.slice(0,i)+r+h.slice(i).replace("<h2>Transfers</h2>",p+"<h2>Transfers</h2>"):r+h+p}}
{const _vW=vWealth;vWealth=function(){const h=_vW(),k="<h2>My savings schemes</h2>";return h.includes(k)?h.replace(k,gratCard()+k):h+gratCard()}}
{const _sc=smsCard;smsCard=()=>_sc()+radarCard(true)+rateCard()}
