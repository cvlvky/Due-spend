/* ===== views: one function per tab ===== */
function applyUI(){try{const r=document.documentElement;if(S.cfg.theme)r.setAttribute("data-theme",S.cfg.theme);else r.removeAttribute("data-theme");document.body.classList.toggle("hide",!!S.cfg.hide)}catch(e){}}
function countUp(){if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  $$(".hero .big").forEach(e=>{const t=e.textContent,m=t.match(/[\d,]+(\.\d+)?/);if(!m)return;const n=parseFloat(m[0].replace(/,/g,"")),pre=t.slice(0,m.index),suf=t.slice(m.index+m[0].length),dec=m[1]?m[1].length-1:0;if(!isFinite(n)||n<1)return;const t0=performance.now();
    (function f(now){const p=Math.min(1,(now-t0)/600),val=n*(1-Math.pow(1-p,3));e.textContent=pre+val.toLocaleString("en-IN",{minimumFractionDigits:dec,maximumFractionDigits:dec})+suf;if(p<1)requestAnimationFrame(f)})(t0)})}
/* Redraws touch only the cards that changed. Background updates (sync, SMS, prices) used to rebuild the
   whole screen and replay the entrance animation and count-ups each time, which looked like flickering. */
let lastTab=null,lastNav="";
/* each top-level card remembers the HTML it was drawn from (__k), so count-ups, opened sections and typed search text don't count as changes */
const nodeKey=x=>x.__k!=null?x.__k:x.nodeType==1?x.outerHTML:x.textContent;
function patchKids(box,html){const T=document.createElement("template");T.innerHTML=html;const N=[...T.content.childNodes],O=[...box.childNodes];let j=0,n=0;
  for(const x of N){const kx=x.nodeType==1?x.outerHTML:x.textContent;let m=-1;for(let q=j;q<Math.min(O.length,j+8);q++)if(nodeKey(O[q])===kx){m=q;break}
    if(m>=0){for(let q=j;q<m;q++){if(O[q].parentNode===box){O[q].remove();n++}}j=m+1;continue}
    x.__k=kx;if(x.nodeType==1)x.classList.add("nofx");if(j<O.length&&O[j].parentNode===box)box.insertBefore(x,O[j]);else box.appendChild(x);n++}
  for(let q=j;q<O.length;q++){if(O[q].parentNode===box){O[q].remove();n++}}return n}
/* a field losing focus during a redraw can fire a handler that redraws again; run that one after, not inside */
let rendering=false,renderAgain=false;
function render(){if(rendering){renderAgain=true;return}rendering=true;try{renderNow()}finally{rendering=false}if(renderAgain){renderAgain=false;render()}}
function renderNow(){
  const nv=navHtml();if(nv!==lastNav||!$("#nav").firstChild){$("#nav").innerHTML=nv;lastNav=nv}
  let h;try{h=({home:vHome,dates:vDates,invest:vWealth,acc:vAcc,spend:vSpend,rep:vRep,fam:vFam})[tab]()}
  catch(e){console.error(e);h=`<h1>Personal Diary</h1><div class="card"><b>This page couldn’t be shown.</b><p class="note">${esc(e&&e.message||e)}</p><p class="note">Your data is still saved. Open Settings and backup from Home to export it.</p></div>`}
  const app=$("#app"),same=lastTab===tab&&!!app.querySelector(".fab2");
  if(same)patchKids(app,h+FABBTN);else{app.innerHTML=h+FABBTN;app.childNodes.forEach(x=>{x.__k=x.nodeType==1?x.outerHTML:x.textContent})}
  lastTab=tab;applyUI();if(!same)try{countUp()}catch(e){}}

const tile=(l,val,key,sub)=>`<div class="stat"${key?` data-act="explain" data-id="${esc(key)}"`:""}><small>${l}</small><b>${val}</b>${sub?`<small>${sub}</small>`:""}</div>`;
const monNav=()=>`<div class="mon"><button class="btn ghost sm" data-act="mon" data-id="-1">Previous</button><b>${mlong(mon)}</b><button class="btn ghost sm" data-act="mon" data-id="1">Next</button></div>`;
const viewSeg=()=>`<div class="seg"><button class="btn sm ${V()=="INR"?"":"ghost"}" data-act="view" data-id="INR">Show in INR</button><button class="btn sm ${V()=="QAR"?"":"ghost"}" data-act="view" data-id="QAR">Show in QAR</button></div>`;
const ctl=()=>`<div class="acts" style="margin:0 0 12px"><button class="btn sm" data-act="quick">⚡ Quick add</button><button class="btn sm ghost" data-act="theme">Theme: ${({"":"Auto",light:"Light",dark:"Dark"})[S.cfg.theme||""]}</button><button class="btn sm ghost" data-act="hide">${S.cfg.hide?"Show":"Hide"} amounts</button></div>`;
const summaryCard=(m,n)=>`<div class="card" style="margin-top:8px">${summary(m).slice(0,n||9).map(x=>`<p style="margin:6px 0">${x}</p>`).join("")}</div>`;

function alerts(){const A=[],t=today();
  upcoming(t,plus(7),true).filter(u=>u.t=="due"||u.t=="emi"||u.t=="fd").forEach(u=>A.push([dl(u.d),u.n+" · "+when(dl(u.d)),u.a?fmx(u.a,u.c):""]));
  S.inv.forEach(x=>{if(x.mdate&&!x.closed){const n=dl(x.mdate);if(n>=-30&&n<=7)A.push([n,"Matures: "+x.name+" · "+when(n),""])}});
  budUse(t.slice(0,7)).forEach(u=>{if(u.p>=90)A.push([-999,"Budget: "+u.b.cat+" at "+u.p+"%",""])});docAlerts().forEach(a=>A.push(a));
  {const at=allAtt().length;if(at&&(!S.cfg.lastFullBk||dl(S.cfg.lastFullBk)<-31))A.push([998,at+(at==1?" attached file isn’t":" attached files aren’t")+" in a backup. Open Settings and backup, then Backup with files",""])}
  if(hasData()&&!(SY.on&&SY.lastOk&&Date.now()-SY.lastOk<3*864e5)&&(!S.cfg.lastBk||dl(S.cfg.lastBk)<-14))A.push([999,S.cfg.lastBk?"Last backup exported "+fmt(S.cfg.lastBk):"No backup exported yet. Open Settings and backup","" ]);
  if(storeErr)A.push([-1000,"Couldn’t save to the phone database: "+storeErr,""]);
  return A.length?`<div class="card" style="border-color:var(--soon);background:var(--soonbg);margin:0 0 12px"><b>Needs attention</b>${A.sort((a,b)=>a[0]-b[0]).slice(0,8).map(a=>`<div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px"><span>${esc(a[1])}</span><b>${a[2]}</b></div>`).join("")}</div>`:""}

function dRow(i){const n=dl(i.date);return `<div class="row ${i.done?"":cls(n)}" data-act="editDate" data-id="${i.id}"><div><b>${esc(i.name)}</b><small>${TYPES[i.type]} · ${fmt(i.date)}${i.rep!="none"?" · "+REP[i.rep][0].toLowerCase():""}${i.no?" · "+esc(i.no):""}${i.att&&i.att.length?" · "+i.att.length+(i.att.length==1?" file":" files"):""}</small></div><div class="r"><span class="chip">${i.done?"Done":when(n)}</span>${+i.amt?`<b>${fmx(i.amt,i.cur)}</b>`:""}${i.done?"":`<button class="btn sm" data-act="paid" data-id="${i.id}">${i.type=="fd"?"Received":"Paid"}</button>`}</div></div>`}
const txRow=x=>`<div class="row" data-act="editTx" data-id="${x.id}" style="border-left-color:${x.kind=="out"?"var(--late)":"var(--pri)"}"><span class="ci">${catIcon(x)}</span><div><b>${esc(x.cat||KIND[x.kind])}${x.sub?" › "+esc(x.sub):""}</b><small>${fmt(x.date)} · ${esc(an(x.acc))}${x.payee?" · "+esc(x.payee):""}${(x.tags||[]).map(t=>" #"+esc(t)).join("")}${x.note?" · "+esc(x.note):""}${byTag(x)}</small></div><div class="r"><b>${x.kind=="out"?"−":x.kind=="adj"&&x.amt<0?"":"+"}${fmx(x.amt,x.cur)}</b>${(x.cur||"INR")!=V()?`<small>≈ ${fm(ca(x))}</small>`:""}</div></div>`;
const trRow=t=>`<div class="row" data-act="editTx" data-id="${t.id}"><div><b>${esc(an(t.acc))} → ${esc(an(t.to))}</b><small>${fmt(t.date)}${t.note?" · "+esc(t.note):""}</small></div><div class="r"><b>${fmx(t.amt,ac(t.acc).cur)}</b>${ac(t.acc).cur!=ac(t.to).cur?`<small>→ ${fmx(t.got,ac(t.to).cur)}</small>`:""}</div></div>`;

/* ---------- Home ---------- */
function vHome(){const t=today(),cm=t.slice(0,7),U=upcoming(t,plus(30),true).filter(u=>u.t=="due"||u.t=="emi"),sum=U.reduce((s,u)=>s+iv(u.a,u.c),0),late=U.filter(u=>u.d<t).length,ds=activeDues(),sf=safeSpend();
  return `<h1>Personal Diary</h1><p class="sub">Everything coming up, in one place.</p>${ctl()}${searchBox()}${smsCard()}${startCard()}${cloudCard()}${alerts()}
  <div class="hero" data-act="explain" data-id="due30" style="cursor:pointer"><small>Due in the next 30 days</small><div class="big">${fm(sum)}</div><small>${U.length?`${U.length} ${U.length==1?"item":"items"}${late?`, ${late} overdue`:""}`:"Nothing due soon"}</small></div>
  <div class="stats">${tile("Spent",fm(mSum(cm,"out")),"m:out:"+cm)}${tile("Income",fm(mSum(cm,"in")),"m:in:"+cm)}${tile("Saved",fm(mSum(cm,"save")),"m:save:"+cm)}</div>
  <div class="card" style="margin-top:8px;cursor:pointer" data-act="explain" data-id="safe"><small style="color:var(--mute)">Safe to spend, next 30 days</small><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b style="font-size:22px;color:${sf.safe<0?"var(--late)":"inherit"}">${sf.safe<0?"Short by "+fmr(-sf.safe):fmr(sf.safe)}</b><span class="note">${sf.safe>0?"about "+fmr(sf.safe/30)+" a day":""}</span></div></div>
  ${summaryCard(cm,2)}
  <h2>Accounts</h2>${accStrip()}<h2>Up next</h2>${ds.length?ds.slice(0,6).map(dRow).join(""):`<div class="empty">No dates yet. Add your LIC premium, FD maturity or EMI.</div>`}
  ${timeline()}
  <h2>Money</h2>${S.mk&&S.mk.g?`<div class="card" style="margin-bottom:8px;cursor:pointer" data-act="tab" data-id="invest"><div class="hbl"><span>Gold 22K a gram</span><b>₹${nf(Math.round(goldGram("INR",22)))} · QAR ${nf(goldGram("QAR",22),2)}</b></div><div class="hbl"><span>1 QAR</span><b>₹${S.mk.qi.toFixed(2)}</b></div></div>`:""}<div class="stats" style="grid-template-columns:1fr 1fr">${tile("In accounts",fm(tot(V())),"")}${tile("Net worth",fm(nwv(V())),"nw")}</div>
  <div class="acts"><button class="btn ghost" data-act="tab" data-id="rep">Open reports</button><button class="btn ghost" data-act="settings">Settings and backup</button></div>
  <p class="note" style="text-align:center;margin-top:14px">Version ${VER} · ${storeLabel()}${sstat!="Sync off"?" · "+esc(sstat):""}</p>
  `}

/* ---------- Dues ---------- */
function dueMonths(){const t=today(),cm=t.slice(0,7);return [...Array(6)].map((_,j)=>{const m=addMon(cm,j);return {l:mlab(m),v:upcoming(j?m+"-01":t,mEnd(m),j==0).filter(u=>u.t=="due"||u.t=="emi").reduce((s,u)=>s+iv(u.a,u.c),0)}})}
const dueChart=()=>{const d=dueMonths();return d.some(x=>x.v)?bars(d,["v"],["var(--pri)"]):`<p class="note">Add premiums or EMIs with an amount to see what is coming each month.</p>`};
function dateSummary(){const ds=activeDues();if(!ds.length)return "";const by={};let yr=0,fd=0;
  ds.forEach(i=>{const st=REP[i.rep][1],a=iv(+i.amt||0,i.cur),y=st?a*12/st:a;if(i.type=="fd")fd+=a;else{yr+=y;by[TYPES[i.type]]=(by[TYPES[i.type]]||0)+y}});
  const late=ds.filter(i=>dl(i.date)<0).length,e=Object.entries(by).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]);
  return `<div class="stats">${tile("Yearly outflow",fm(yr))}${tile("FDs maturing",fm(fd))}${tile("Overdue",late)}</div><h2>Dues and EMIs, next 6 months</h2><div class="card">${dueChart()}</div>${e.length?`<h2>Yearly cost by type</h2><div class="card">${hbars(e)}</div>`:""}<h2>All items</h2>`}
function vDates(){const ds=activeDues(),dn=S.dates.filter(i=>i.done);
  return `<h1>Due dates</h1><p class="sub">Premiums, FD maturities, EMIs and renewals. Tap an item to edit.</p>${viewSeg()}<div class="acts" style="margin:10px 0 12px"><button class="btn" data-act="addDate">+ Add due date</button></div>${dueCal()}${dateSummary()}${ds.length?ds.map(dRow).join(""):`<div class="empty">Nothing here yet. Tap + Add due date.</div>`}${dn.length?`<details><summary>Completed (${dn.length})</summary>${dn.map(dRow).join("")}</details>`:""}<div class="acts"><button class="btn ghost" data-act="showSubs">Subscriptions (${subAct().length})</button><button class="btn ghost" data-act="showDocs">Documents (${S.docs.length})</button></div>`}

/* ---------- Wealth ---------- */
function nwCard(){const k=Object.keys(S.nw).sort().slice(-30),d=k.map(x=>({l:+x.slice(8)+" "+mlab(x.slice(0,7)),v:iv(S.nw[x],"INR")}));
  return `<div class="hero" data-act="explain" data-id="nw" style="cursor:pointer"><small>Net worth</small><div class="big">${fm(nwv(V()))}</div><small>Accounts, investments and goal savings, minus loans</small></div><div class="card" style="margin-top:8px">${k.length>1?area(d,true):`<p class="note">The trend chart appears after you open the app on a few different days.</p>`}</div>`}
function iRow(x){const val=invVal(x,true),g=val-(+x.inv||0),n=x.mdate&&!x.closed?dl(x.mdate):null,est=fdEst(x);
  return `<div class="row ${n!==null?cls(n):""}" data-act="editInv" data-id="${x.id}"><div><b>${esc(x.name)}</b><small>${IK[x.kind]}${x.mdate?" · matures "+fmt(x.mdate):""}${est?" · est. "+fmx(Math.round(est),x.cur):""}${x.att&&x.att.length?" · "+x.att.length+(x.att.length==1?" file":" files"):""}</small></div><div class="r">${x.closed?`<span class="chip">Closed</span>`:n!==null?`<span class="chip">${when(n)}</span>`:""}<b>${fmx(val,x.cur)}</b>${x.closed?"":`<small style="color:${g<0?"var(--late)":"var(--pri)"}">${g>=0?"+":"−"}${fmx(Math.abs(g),x.cur)}</small>`}</div></div>`}
function goalsHtml(){return `<h2>Savings goals</h2>`+(S.goals.length?S.goals.map(g=>`<div class="card" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer" data-act="editGoal" data-id="${g.id}"><b>${esc(g.name)}</b>${ring(pct(g.saved,g.target))}</div><div class="hbt"><i style="width:${pct(g.saved,g.target)}%;background:var(--pri)"></i></div><small style="color:var(--mute)">${fmx(g.saved,g.cur)} of ${fmx(g.target,g.cur)}${g.date?" · by "+fmt(g.date):""}</small><div class="acts"><button class="btn sm" data-act="addGoalAmt" data-id="${g.id}">Add money</button></div></div>`).join(""):`<div class="empty">No goals yet. Try “Gold ₹2L by June”.</div>`)}
function loansHtml(){return `<h2>Loans and EMIs</h2>`+(S.loans.length?S.loans.map(l=>{const dn=!loanLeft(l),end=loanEnd(l);
  return `<div class="card" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;gap:8px;cursor:pointer" data-act="editLoan" data-id="${l.id}"><b>${esc(l.name)}</b><b>${dn?"Cleared":fmx(Math.round(loanOut(l)),l.cur)+" left"}</b></div><div class="hbt"><i style="width:${pct(l.paid,l.total)}%;background:var(--pri)"></i></div><small style="color:var(--mute)">${l.paid} of ${l.total} paid · EMI ${fmx(l.emi,l.cur)}${l.next&&!dn?" · next "+fmt(l.next):""}${end?" · ends "+mlong(end.slice(0,7)):""}</small>${dn?"":`<div class="acts"><button class="btn sm" data-act="emiPaid" data-id="${l.id}">EMI paid</button></div>`}</div>`}).join(""):`<div class="empty">No loans yet.</div>`)}
function vWealth(){const L=S.inv.filter(x=>!x.closed),cl=S.inv.filter(x=>x.closed),ti=L.reduce((s,x)=>s+iv(+x.inv||0,x.cur),0),tv=L.reduce((s,x)=>s+iv(invVal(x),x.cur),0),g=tv-ti,by={};
  L.forEach(x=>{by[IK[x.kind]]=(by[IK[x.kind]]||0)+iv(invVal(x),x.cur)});
  return `<h1>Wealth</h1><p class="sub">Net worth, investments, goals and loans. Tap an item to edit it.</p>${viewSeg()}<div style="height:10px"></div>${nwCard()}<h2>Investments</h2>`+
  (L.length?`<div class="card"><div class="hbl"><span>Current value</span><b>${fm(tv)}</b></div><small style="color:var(--mute)">${g>=0?"Gain":"Loss"} of ${fm(Math.abs(g))}${ti?` (${(g/ti*100).toFixed(1)}%)`:""} on ${fm(ti)} invested</small><div style="height:8px"></div>${hbars(Object.entries(by).sort((a,b)=>b[1]-a[1]))}</div><div style="height:8px"></div>`+L.map(iRow).join(""):`<div class="empty">No investments yet. Add an FD, fund, PPF or gold.</div>`)+
  (cl.length?`<details><summary>Closed (${cl.length})</summary>${cl.map(iRow).join("")}</details>`:"")+goalsHtml()+loansHtml()+
  `<div class="acts" style="margin-bottom:60px"><button class="btn" data-act="addInv">+ Investment</button><button class="btn ghost" data-act="addGoal">+ Goal</button><button class="btn ghost" data-act="addLoan">+ Loan</button></div>`}

/* ---------- Accounts ---------- */
function remitCard(R){if(!R.length)return "";const q=R.reduce((s,r)=>s+r.qar,0),n=R.reduce((s,r)=>s+r.inr,0),fee=R.reduce((s,r)=>s+cv(+r.x.fee||0,ac(r.x.acc).cur,"INR"),0),rs=R.map(r=>r.rate);
  return `<h2>QAR ↔ INR transfers this year</h2><div class="card"><div class="stats" style="grid-template-columns:1fr 1fr;margin:0 0 8px">${tile("QAR moved","QAR "+nf(q))}${tile("INR moved",inr(n))}${tile("Average rate","₹"+(n/q).toFixed(2))}${tile("Best / worst","₹"+Math.max(...rs).toFixed(2)+" / ₹"+Math.min(...rs).toFixed(2))}</div><p class="note">${R.length} ${R.length==1?"transfer":"transfers"} · fees about ${inr(Math.round(fee))}. More in Reports.</p></div>`}
function vAcc(){const y=today().slice(0,4),T=S.tx.filter(x=>x.kind=="tr").sort((a,b)=>b.date.localeCompare(a.date));
  return `<h1>Accounts</h1><p class="sub">Bank accounts, cash and wallets. Tap a name to edit it.</p><div class="hero"><small>Total across accounts</small><div class="big">${fm(tot(V()))}</div><small>${S.acc.length} ${S.acc.length==1?"account":"accounts"} · 1 QAR = ₹${fx()}</small></div><div class="acts"><button class="btn" data-act="trf">Transfer money</button><button class="btn ghost" data-act="addAcc">+ Add account</button></div>`+
  S.acc.map(k=>{const b=bal(k);return `<div class="card" style="margin-top:10px"><div style="display:flex;justify-content:space-between;gap:8px;cursor:pointer" data-act="editAcc" data-id="${k.id}"><div><b>${esc(k.name)}</b><small style="display:block;color:var(--mute)">${ATYPE[k.type]||"Account"} · ${k.cur}</small></div><b style="font-size:20px;color:${b<0?"var(--late)":"inherit"}">${fmx(b,k.cur)}</b></div><div class="acts"><button class="btn sm" data-act="addMoney" data-id="${k.id}">Add money</button><button class="btn sm ghost" data-act="fixBal" data-id="${k.id}">Correct</button><button class="btn sm ghost" data-act="stmt" data-id="${k.id}">Statement</button></div></div>`}).join("")+
  remitCard(remits().filter(r=>r.x.date.startsWith(y)))+`<h2>Transfers</h2>`+(T.length?T.slice(0,10).map(trRow).join(""):`<div class="empty">No transfers yet.</div>`)+``}

/* ---------- Spend ---------- */
function catDonut(t){const by={};t.filter(x=>x.kind=="out").forEach(x=>{const c=x.cat||"Uncategorised";by[c]=(by[c]||0)+ca(x)});const d=Object.entries(by).sort((a,b)=>b[1]-a[1]);
  if(!d.length)return `<p class="note">No spending recorded for this month.</p>`;const top=d.slice(0,7),rest=d.slice(7).reduce((s,x)=>s+x[1],0);if(rest)top.push(["Everything else",rest]);return donut(top)}
function spendDetail(t){if(!t.length)return "";const o=t.filter(x=>x.kind=="out"),sp=sumV(o),inc=sumV(t.filter(x=>x.kind=="in")),sv=sumV(t.filter(x=>x.kind=="save")),cur=mon==today().slice(0,7),days=cur?+today().slice(8):dim(mon),big=[...o].sort((a,b)=>ca(b)-ca(a))[0];
  return `<div class="stats" style="grid-template-columns:1fr 1fr">${tile("Daily average spend",fmr(sp/days))}${tile("Savings rate",inc?Math.round((inc-sp)/inc*100)+"% of income":"Add income",inc&&!S.cfg.fa?"rate:"+mon:"")}${tile("Left over",fm(inc-sp-sv))}${tile("Biggest spend",big?fm(ca(big)):"None","",big?esc(big.cat||"Other"):"")}</div>`}
function budHtml(){const B=budUse(mon);return `<h2>Budgets</h2>`+(B.length?B.map(({b,s,p})=>`<div class="card" style="margin-bottom:8px;cursor:pointer" data-act="editBud" data-id="${b.id}"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(b.cat)}</b><span>${fmx(s,b.cur)} of ${fmx(b.lim,b.cur)}</span></div><div class="hbt"><i style="width:${Math.min(100,p)}%;background:${p>=100?"var(--late)":p>=80?"var(--soon)":"var(--pri)"}"></i></div><small style="color:${p>=100?"var(--late)":"var(--mute)"}">${p>100?"Over budget by "+fmx(s-b.lim,b.cur):p+"% used"}</small></div>`).join(""):`<div class="empty">No budgets yet.</div>`)+`<div class="acts"><button class="btn ghost" data-act="addBud">+ Budget</button></div>`}
function recHtml(){return `<h2>Recurring entries</h2>`+(S.rec.length?S.rec.map(r=>`<div class="row" data-act="editRec" data-id="${r.id}"><div><b>${esc(r.cat||r.note||"Recurring")}</b><small>${KIND[r.kind]} · day ${r.day} each month · ${esc(an(r.acc))}</small></div><b>${fmx(r.amt,ac(r.acc).cur)}</b></div>`).join(""):`<div class="empty">None yet. Add salary, rent or subscriptions.</div>`)+`<div class="acts"><button class="btn ghost" data-act="addRec">+ Recurring entry</button></div>`}
function vSpend(){if(S.cfg.fa&&!S.acc.some(a=>a.id==S.cfg.fa))S.cfg.fa="";
  const q=qs.trim().toLowerCase(),all=S.tx.filter(x=>x.date.startsWith(mon)&&(x.kind=="out"||x.kind=="in"||x.kind=="save")&&(!S.cfg.fa||x.acc==S.cfg.fa)),
  t=all.filter(x=>!q||[x.cat,x.sub,x.payee,x.note,an(x.acc),...(x.tags||[])].join(" ").toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date)||(b.ct||0)-(a.ct||0)),
  f=k=>sumV(all.filter(x=>x.kind==k)),key=k=>`m:${k}:${mon}${S.cfg.fa?":"+S.cfg.fa:""}`;
  return `<h1>Spending</h1><div class="card" style="margin:6px 0 12px">${viewSeg()}${SEL("f_fa","Account",[["","All accounts"],...S.acc.map(a=>[a.id,a.name])],S.cfg.fa||"",'data-fa="1"')}<label for="f_rate">Exchange rate: 1 QAR = ₹</label><input id="f_rate" type="number" inputmode="decimal" step="0.01" value="${fx()}" data-rate="1"><p class="note" style="margin-top:6px">Set this to your own rate. Each entry remembers the rate from when you added it.</p></div>${monNav()}
  <div class="stats">${tile("Spent",fm(f("out")),key("out"))}${tile("Income",fm(f("in")),key("in"))}${tile("Saved",fm(f("save")),key("save"))}</div>${spendDetail(all)}
  <h2>Where it went</h2><div class="card">${catDonut(all)}</div><h2>Daily heatmap</h2><div class="card">${heat(all)}</div>${budHtml()}${recHtml()}
  <h2>Entries</h2><input data-q="1" type="search" placeholder="Search category, payee, tag or note" value="${esc(qs)}" style="margin-bottom:8px" aria-label="Search entries">${t.length?dayGroups(t):`<div class="empty">${q?"Nothing matches that search.":"No entries this month. Tap + Add entry."}</div>`}
  `}

/* ---------- Reports ---------- */
function chart6(){const c=today().slice(0,7),o=[];for(let i=5;i>=0;i--){const k=addMon(c,-i);o.push({l:mlab(k),out:mSum(k,"out"),in:mSum(k,"in"),save:mSum(k,"save")})}
  return o.some(d=>d.out||d.in||d.save)?bars(o,["out","in","save"],["var(--late)","var(--pri)","var(--soon)"])+LEG:`<p class="note">Add spending entries to see this chart.</p>`}
function vRep(){const m=mon,t=today(),R=rep(m),fs=fixedSet(),out=mTx(m,"out"),sp=sumV(out),fixed=sumV(out.filter(x=>isFixed(x,fs))),flex=sp-fixed,F6=forecast(6),sf=safeSpend(),H=health(m),C=checks();
  const arrow=(c,p,goodUp)=>{if(!p||c==null)return "";const d=Math.round((c/p-1)*100);return d?` <small class="${(d>0)==goodUp?"gd":"bd"}">${d>0?"▲":"▼"}${Math.abs(d)}%</small>`:""};
  const row=(l,k,goodUp)=>`<tr><td>${l}</td><td data-act="explain" data-id="m:${k}:${m}" style="cursor:pointer"><b>${fmr(R[k].cur)}</b>${arrow(R[k].cur,R[k].prev,goodUp)}</td><td>${fmr(R[k].prev)}</td><td>${R[k].avg==null?"–":fmr(R[k].avg)}</td></tr>`;
  const pc=x=>x==null?"–":Math.round(x)+"%";
  let h=`<h1>Reports</h1><p class="sub">Tap any number to see what is in it.</p>${viewSeg()}<div style="height:8px"></div>${monNav()}${summaryCard(m)}${askCard()}
  <h2>This month against before</h2><div class="card"><table class="tbl"><tr><th></th><th>${mlab(m)}</th><th>${mlab(addMon(m,-1))}</th><th>3-month avg</th></tr>${row("Spent","out",false)}${row("Income","in",true)}${row("Saved","save",true)}<tr><td>Savings rate</td><td data-act="explain" data-id="rate:${m}" style="cursor:pointer"><b>${pc(R.rate.cur)}</b></td><td>${pc(R.rate.prev)}</td><td>${pc(R.rate.avg)}</td></tr></table></div>
  <h2>Money health</h2><div class="card">${H.map(x=>`<div class="hrow"${x.k?` data-act="explain" data-id="${x.k}" style="cursor:pointer"`:""}><span class="dot ${x.l}"></span><div><b>${x.n}</b><small>${x.v}${x.t?" · "+x.t:""}</small></div></div>`).join("")}<p class="note" style="margin-top:8px">Green, amber and red follow common rules of thumb. They are not personal financial advice.</p></div>
  <h2>Cash-flow forecast</h2><div class="card"><div class="hbl" data-act="explain" data-id="safe" style="cursor:pointer"><span>Safe to spend, next 30 days</span><b style="color:${sf.safe<0?"var(--late)":"inherit"}">${sf.safe<0?"Short by "+fmr(-sf.safe):fmr(sf.safe)}</b></div><div style="height:8px"></div>${bars(F6.map(r=>({l:mlab(r.m),v:r.bal})),["v"],["var(--pri)"])}
  <table class="tbl"><tr><th>Month</th><th>In</th><th>Out</th><th>Balance at end</th></tr>${F6.map((r,j)=>`<tr data-act="explain" data-id="fc:${j}" style="cursor:pointer"><td>${mlab(r.m)}</td><td>${fmr(r.inc)}</td><td>${fmr(r.fixed+r.flex)}</td><td><b style="color:${r.bal<0?"var(--late)":"inherit"}">${fmr(r.bal)}</b></td></tr>`).join("")}</table>
  <p class="note" style="margin-top:8px">An estimate from your dues, EMIs, recurring entries and recent averages.${F6.some(r=>r.bal<0)?" The balance goes below zero in at least one month.":""}</p></div>
  <h2>Fixed and flexible spending</h2><div class="card">${sp?split(fixed,flex)+`<div class="stats" style="grid-template-columns:1fr 1fr;margin-top:10px">${tile("Fixed",fmr(fixed),"m:fixed:"+m,Math.round(fixed/sp*100)+"% of spending")}${tile("Flexible",fmr(flex),"m:flex:"+m,Math.round(flex/sp*100)+"% of spending")}</div>`:`<p class="note">No spending recorded for this month.</p>`}</div>
  <h2>Where it went</h2><div class="card">${catDonut(out)}</div>
  <h2>Last 6 months</h2><div class="card">${chart6()}</div>
  <h2>Dues and EMIs, next 6 months</h2><div class="card">${dueChart()}</div>`;
  /* payees and tags */
  const grp=(f)=>{const by={};out.forEach(x=>f(x).forEach(k=>{by[k]=(by[k]||0)+ca(x)}));return Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,6)},py=grp(x=>x.payee?[x.payee]:[]),tg=grp(x=>(x.tags||[]).map(s=>"#"+s));
  if(py.length)h+=`<h2>Top payees</h2><div class="card">${hbars(py)}</div>`;
  if(tg.length)h+=`<h2>Spending by tag</h2><div class="card">${hbars(tg)}</div>`;
  /* investments */
  const L=S.inv.filter(x=>!x.closed);
  if(L.length){h+=`<h2>Investment returns</h2><div class="card"><table class="tbl"><tr><th>Investment</th><th>Gain</th><th>Per year</th></tr>${L.map(x=>{const r=invRet(x);return `<tr><td>${esc(x.name)}</td><td>${r.abs==null?"–":`<span class="${r.abs<0?"bd":"gd"}">${r.abs>=0?"+":""}${r.abs.toFixed(1)}%</span>`}</td><td>${r.yr==null?"–":r.yr.toFixed(1)+"%"}</td></tr>`}).join("")}</table><p class="note" style="margin-top:8px">Per year is an approximate yearly rate from the start date. It needs a start date at least 3 months back.</p></div>`;
    const lad=L.filter(x=>x.mdate&&dl(x.mdate)>=0).sort((a,b)=>a.mdate.localeCompare(b.mdate));
    if(lad.length){const by={};lad.forEach(x=>{const y=x.mdate.slice(0,4);by[y]=(by[y]||0)+iv(fdEst(x)||invVal(x),x.cur)});
      h+=`<h2>Maturity ladder</h2><div class="card">${hbars(Object.entries(by),fmr)}<div style="height:6px"></div>${lad.map(x=>`<div class="hbl" style="margin:6px 0"><span>${esc(x.name)} · ${fmt(x.mdate)}</span><b>${fmx(Math.round(fdEst(x)||invVal(x)),x.cur)}</b></div>`).join("")}</div>`}}
  /* loans */
  const LN=S.loans.filter(loanLeft);
  if(LN.length)h+=`<h2>Loans</h2><div class="card">${LN.map(l=>{const o=loanOut(l),left=loanLeft(l),int=Math.max(0,left*l.emi-o);return `<div style="margin-bottom:10px"><div class="hbl"><span><b>${esc(l.name)}</b></span><b>${fmx(Math.round(o),l.cur)}</b></div><small style="color:var(--mute)">${left} EMIs left · ends ${mlong(loanEnd(l).slice(0,7))}${+l.rate?" · about "+fmx(Math.round(int),l.cur)+" interest still to pay":""}</small></div>`}).join("")}
    <b>Prepayment calculator</b>${SEL("pp_loan","Loan",LN.map(l=>[l.id,l.name]),LN[0].id)}${F("pp_amt","Extra amount to pay now","","number")}<div class="acts"><button class="btn" data-act="prepay">Calculate</button></div><p class="note" id="pp_out"></p></div>`;
  /* remittances */
  const RM=remits();
  if(RM.length){const by={};RM.forEach(r=>{const k=r.x.date.slice(0,7);by[k]=(by[k]||0)+r.inr});const ms=[...Array(6)].map((_,j)=>addMon(t.slice(0,7),j-5)),last=RM.slice(-12);
    h+=`<h2>QAR ↔ INR transfers</h2><div class="card"><small style="color:var(--mute)">Rupees moved each month</small>${bars(ms.map(k=>({l:mlab(k),v:by[k]||0})),["v"],["var(--pri)"])}${last.length>1?`<small style="color:var(--mute)">Rate you got (₹ per QAR)</small>${area(last.map(r=>({l:+r.x.date.slice(8)+" "+mlab(r.x.date.slice(0,7)),v:r.rate})),true,2)}`:`<p class="note">Your rate so far: ₹${last[0].rate.toFixed(2)} per QAR. A chart appears after a second transfer.</p>`}</div>`}
  h+=moreRep(m)+planHtml();
  /* checks */
  h+=`<h2>Data checks</h2><div class="card">${C.length?C.map(c=>`<div class="hrow"${c.k?` data-act="explain" data-id="${c.k}" style="cursor:pointer"`:""}><span class="dot warn"></span><div><b>${esc(c.t)}</b></div></div>`).join(""):`<div class="hrow"><span class="dot good"></span><div><b>No problems found in your entries.</b></div></div>`}</div>`;
  return h}
