/* ===== Version 26: clearer Home and Wealth, update prompt, duplicate finder, share summary ===== */
const SVGI={bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:'<path d="M3 3l18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.2 6.2C3.6 8 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'};
const ico=(k,lab,act)=>`<button class="ib" data-act="${act}" aria-label="${lab}" title="${lab}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVGI[k]}</svg></button>`;
const homeOff=k=>(S.cfg.homeOff||[]).includes(k);
/* ---------- one "Needs attention" list instead of a stack of cards ---------- */
function todoItems(){const t=today(),L=[],add=o=>L.push(o);
  if(isApp()&&S.cfg.upd)add({k:-3000,ic:"⬆️",tx:"New version ready"+(S.cfg.upd.ver?": Version "+S.cfg.upd.ver:""),sub:"Your data stays on the phone.",act:"updInstall",bt:"Update",tone:"pri"});
  if(storeErr)add({k:-2900,ic:"⚠️",tx:"Couldn’t save to the phone database",sub:storeErr,act:"settings",tone:"late"});
  if(isApp()&&S.cfg.ntfAuto&&RD.on===false)add({k:-2800,ic:"🔕",tx:"Payment alert reading has stopped",sub:"Notification access for Personal Diary is off.",act:"readCheck",bt:"Fix",tone:"late"});
  const q=(S.cfg.smsq||[]).length,nn=(S.cfg.ntfNo||[]).length;if(q||nn)add({k:-2500,ic:"📩",tx:q?`${q} ${q==1?"payment":"payments"} to review`:`${nn} payment ${nn==1?"email":"emails"} without an amount`,sub:q&&nn?nn+" more without an amount":"From SMS, email and payment alerts",act:"smsReview",bt:"Review",tone:"pri"});
  radar(45).filter(r=>r.need>0).slice(0,2).forEach(r=>add({k:-2000,ic:"🏦",tx:"Top up needed: "+r.a.name,sub:`Send ${fmx(r.need,r.a.cur)} by ${fmt(r.by)} for ${r.first.n}${r.a.cur=="INR"?" · about QAR "+nf(Math.ceil(r.need/qiNow()),0):""}`,act:"radar",bt:"Plan",tone:"late"}));
  const g=+S.cfg.rtgt,qi=S.mk&&S.mk.qi;if(g&&qi&&qi>=g)add({k:-1800,ic:"💱",tx:"1 QAR = ₹"+qi.toFixed(2)+" today",sub:"At or above your ₹"+g+" target. A good day to send money home.",act:"remitSheet",bt:"Send",tone:"pri"});
  upcoming(t,plus(7),true).filter(u=>["due","emi","fd","lend"].includes(u.t)||u.src).forEach(u=>{const n=dl(u.d),o={k:n<0?-1500+n:n,ic:n<0?"⏰":u.src=="sch"?"🏤":u.src=="sub"?"🔁":u.t=="lend"?"🤝":u.t=="fd"?"💰":"📅",tx:u.n,sub:when(n)+(+u.a?" · "+fmx(u.a,u.c||"INR"):""),tone:n<0?"late":n<=3?"soon":""};
    if(u.src=="sub"){o.act="tab";o.id="dates"}else if(u.src=="sch"){o.act="saInfo";o.id=u.id;o.bact="saDep";o.bt="Deposit"}else if(u.t=="lend"||u.src=="lend"){o.act="lendView";o.id=u.id}
    else if(u.t=="emi"){o.act="tab";o.id="invest";o.bact="emiPaid";o.bt="Paid"}else{o.act="editDate";o.id=u.id;o.bact="paid";o.bt=u.t=="fd"?"Received":"Paid"}if(o.bact)o.bid=u.id;add(o)});
  S.inv.forEach(x=>{if(x.mdate&&!x.closed){const n=dl(x.mdate);if(n>=-30&&n<=7)add({k:n,ic:"💰",tx:"Matures: "+x.name,sub:when(n),act:"editInv",id:x.id})}});
  budUse(t.slice(0,7)).forEach(u=>{if(u.p>=90)add({k:-900,ic:"📊",tx:"Budget: "+u.b.cat+" at "+u.p+"%",sub:fmx(Math.round(u.s),u.b.cur||"INR")+" of "+fmx(u.b.lim,u.b.cur||"INR"),act:"tab",id:"spend",tone:u.p>100?"late":"soon"})});
  docAlerts().forEach(a=>add({k:a[0],ic:"🪪",tx:a[1],sub:"",act:"tab",id:"dates",tone:a[0]<0?"late":"soon"}));
  S.moi.forEach(m=>{const n=dl(m.date);if(n>=0&&n<=7)add({k:n,ic:"🎁",tx:m.person+": "+m.occ,sub:when(n)+(m.cash?" · "+fmx(m.cash,m.cur):""),act:"moiEdit",id:m.id})});
  const E=S.cfg.ep;if(E&&E.at&&dl(E.at)<-365)add({k:500,ic:"🗂️",tx:"Emergency pack is over a year old",sub:"Make a fresh copy in Family",act:"famGo"});
  const dp=dupFind(30).length;if(dp)add({k:600,ic:"🧹",tx:dp+" possible duplicate "+(dp==1?"entry":"entries"),sub:"Same amount, account and day",act:"dupSheet",bt:"Check"});
  {const at=allAtt().length;if(at&&(!S.cfg.lastFullBk||dl(S.cfg.lastFullBk)<-31))add({k:998,ic:"💾",tx:at+(at==1?" attached file isn’t":" attached files aren’t")+" in a backup",sub:"Settings › Backup with files",act:"settings"})}
  if(hasData()&&!(SY.on&&SY.lastOk&&Date.now()-SY.lastOk<3*864e5)&&(!S.cfg.lastBk||dl(S.cfg.lastBk)<-14))add({k:999,ic:"💾",tx:S.cfg.lastBk?"Last backup exported "+fmt(S.cfg.lastBk):"No backup exported yet",sub:"Open Settings and backup",act:"settings"});
  return L.sort((a,b)=>a.k-b.k)}
function todoCard(){const L=todoItems();if(!L.length)return `<div class="card todo"><b>Nothing needs attention</b><p class="note" style="margin:2px 0 0">You’re all caught up.</p></div>`;const all=window.__todoAll,show=all?L:L.slice(0,5);
  return `<div class="card todo"><div class="hbl"><b>Needs attention</b><span class="chip">${L.length}</span></div>${show.map(x=>`<div class="trow ${x.tone||""}"${x.act?` data-act="${x.act}" data-id="${esc(String(x.id||""))}"`:""}><span class="ci">${x.ic}</span><div class="tx"><b>${esc(x.tx)}</b>${x.sub?`<small>${esc(x.sub)}</small>`:""}</div>${x.bt?`<button class="btn sm${x.tone=="late"?"":""}" data-act="${x.bact||x.act}" data-id="${esc(String(x.bid||x.id||""))}">${x.bt}</button>`:`<span class="chev">›</span>`}</div>`).join("")}
  ${L.length>5?`<button class="btn sm ghost" data-act="todoAll" style="margin-top:8px;width:100%">${all?"Show fewer":"Show all "+L.length}</button>`:""}</div>`}
alerts=function(){return todoCard()};
/* ---------- Home ---------- */
function homeHero(){const t=today(),U=upcoming(t,plus(30),true).filter(u=>u.t=="due"||u.t=="emi"),sum=U.reduce((s,u)=>s+iv(u.a,u.c),0),late=U.filter(u=>u.d<t).length,sf=safeSpend();
  return `<div class="hero" data-act="explain" data-id="nw" style="cursor:pointer"><small>Net worth</small><div class="big">${fm(nwv(V()))}</div>
  <div class="hgrid"><div data-act="tab" data-id="acc"><small>In accounts</small><b>${fm(tot(V()))}</b></div><div data-act="explain" data-id="due30"><small>Due in 30 days</small><b>${fm(sum)}</b>${late?`<small>${late} overdue</small>`:""}</div><div data-act="explain" data-id="safe"><small>Safe to spend</small><b>${sf.safe<0?"−"+fmr(-sf.safe):fmr(sf.safe)}</b></div></div></div>`}
function monthCard(){const cm=today().slice(0,7),X=S.tx.length?verdict(cm):null;
  return `<h2>This month</h2><div class="card"${X?` data-act="verdict" data-id="${cm}"`:""} style="cursor:pointer;${X?"border-left:5px solid "+vCol(X.sc):""}"><div class="hbl"><b>${mlong(cm)} so far${X?": "+X.label:""}</b>${X?`<span class="chip">${X.sc}/100</span>`:""}</div>
  <div class="mini3"><div class="stat" data-act="explain" data-id="m:out:${cm}"><small>Spent</small><b>${fm(mSum(cm,"out"))}</b></div><div class="stat" data-act="explain" data-id="m:in:${cm}"><small>Income</small><b>${fm(mSum(cm,"in"))}</b></div><div class="stat" data-act="explain" data-id="m:save:${cm}"><small>Saved</small><b>${fm(mSum(cm,"save"))}</b></div></div>${X&&(X.why[0]||X.pts[0])?`<small style="color:var(--mute)">${esc(X.why[0]||X.pts.map(p=>p[0]+": "+p[1]).slice(0,2).join(" · "))}</small>`:""}</div>`}
function comingCard(){const t=today(),U=upcoming(plus(8),plus(45),false).filter(u=>u.t!="rec"&&u.t!="recin"&&+u.a).slice(0,5);if(!U.length)return "";
  const open=u=>u.src=="sch"?`data-act="saInfo" data-id="${u.id}"`:u.src=="sub"||u.t=="fd"&&!S.dates.some(d=>d.id==u.id)?`data-act="tab" data-id="dates"`:u.t=="emi"?`data-act="tab" data-id="invest"`:u.t=="lend"?`data-act="lendView" data-id="${u.id}"`:`data-act="editDate" data-id="${u.id}"`;
  return `<h2>Coming up</h2><div class="card">${U.map(u=>`<div class="crow" ${open(u)}><div><b>${esc(u.n)}</b><small>${fmt(u.d)} · ${when(dl(u.d)).toLowerCase()}</small></div><b>${fmx(u.a,u.c||"INR")}</b></div>`).join("")}<button class="btn sm ghost" data-act="tab" data-id="dates" style="margin-top:8px;width:100%">All dues and renewals</button></div>`}
function famLine(){const o=S.lend.filter(x=>!x.closed&&x.dir=="lent").reduce((s,x)=>s+iv(lOut(x),x.cur),0),up=S.moi.filter(m=>m.date>=today()).sort((a,b)=>a.date.localeCompare(b.date))[0];
  return [S.fam.length?S.fam.length+(S.fam.length==1?" person":" people"):"Add family members",o?"people owe you "+fm(o):"",up?"next: "+up.person+" "+up.occ.toLowerCase()+" "+when(dl(up.date)).toLowerCase():""].filter(Boolean).join(" · ")}
vHome=function(){const d=new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
  return `<div class="top"><div><h1 style="margin:0">Personal Diary</h1><p class="sub" style="margin:2px 0 0">${d}${SY.on&&sstat&&sstat!="Sync off"?" · "+esc(sstat):""}</p></div><div class="icons">${ico("bolt","Quick add","quick")}${ico(S.cfg.hide?"eyeoff":"eye",S.cfg.hide?"Show amounts":"Hide amounts","hide")}${ico("gear","Settings and backup","settings")}</div></div>
  ${searchBox()}${startCard()}${cloudCard()}${homeHero()}<div style="height:12px"></div>${todoCard()}
  ${homeOff("month")?"":monthCard()}${homeOff("coming")?"":comingCard()}${homeOff("acc")?"":`<h2>Accounts</h2>${accStrip()}`}
  ${homeOff("rates")||!(S.mk&&S.mk.g)?"":`<div class="card rates" data-act="wGo" data-id="inv" style="margin-top:12px"><span>Gold 22K <b>₹${nf(Math.round(goldGram("INR",22)))}</b> a gram</span><span>1 QAR <b>₹${S.mk.qi.toFixed(2)}</b></span></div>`}
  <div class="short3" style="margin-top:12px">${homeOff("fam")?"":`<button data-act="famGo"><span>👪</span><b>Family</b><small>${esc(famLine())}</small></button>`}<button data-act="tab" data-id="rep"><span>📈</span><b>Reports</b><small>Month by month</small></button><button data-act="settings"><span>💾</span><b>Backup</b><small>${S.cfg.lastBk?"Last "+fmt(S.cfg.lastBk):"Settings and backup"}</small></button></div>
  <p class="note" style="text-align:center;margin-top:14px">Version ${VER} · ${storeLabel()} · <a href="#" data-act="homeEdit">Choose what Home shows</a></p>`};
/* ---------- Wealth in sections ---------- */
const WSEG=[["over","Overview"],["inv","Investments"],["sch","Schemes"],["goals","Goals & loans"],["plans","Plans"]];
function byPerson(){if(!S.fam.length)return "";const rows=[...S.fam.map(m=>[m.name,ownWorth(m.id),m.id]),["Family / joint",ownWorth(""),""]].filter(r=>Math.abs(r[1])>0.5);if(!rows.length)return "";
  return `<h2>By person</h2><div class="card">${rows.map(r=>`<div class="hbl" style="margin:6px 0;cursor:pointer" data-act="famView" data-id="${r[2]}"><span>${esc(r[0])}</span><b>${fm(r[1])}</b></div>`).join("")}</div>`}
function nwParts2(){const to=V(),p=nwParts(to),sch=S.sacc.reduce((s,x)=>s+cv(saState(x).now,"INR",to),0),lent=S.lend.filter(x=>!x.closed&&x.dir=="lent").reduce((s,x)=>s+cv(lOut(x),x.cur,to),0),gr=p.grat||0;
  return [["Bank and cash",p.acc],["Investments",p.inv-sch-gr-lent],["Savings schemes",sch],["Gratuity",gr],["Goal savings",p.goal],["Lent to people",lent],["Loans",-p.loan]].filter(x=>Math.abs(x[1])>0.5)}
function invSection(){const L=S.inv.filter(x=>!x.closed),cl=S.inv.filter(x=>x.closed),ti=L.reduce((s,x)=>s+iv(+x.inv||0,x.cur),0),tv=L.reduce((s,x)=>s+iv(invVal(x),x.cur),0),g=tv-ti,by={};L.forEach(x=>{by[IK[x.kind]]=(by[IK[x.kind]]||0)+iv(invVal(x),x.cur)});
  return `<h2>Investments</h2>`+(L.length?`<div class="card"><div class="hbl"><span>Current value</span><b>${fm(tv)}</b></div><small style="color:var(--mute)">${g>=0?"Gain":"Loss"} of ${fm(Math.abs(g))}${ti?` (${(g/ti*100).toFixed(1)}%)`:""} on ${fm(ti)} invested</small><div style="height:8px"></div>${hbars(Object.entries(by).sort((a,b)=>b[1]-a[1]))}</div><div style="height:8px"></div>`+L.map(iRow).join(""):`<div class="empty">No investments yet. Add an FD, fund, PPF or gold.</div>`)+
  (cl.length?`<details><summary>Closed (${cl.length})</summary>${cl.map(iRow).join("")}</details>`:"")+`<div class="acts"><button class="btn" data-act="addInv">+ Investment</button><button class="btn ghost" data-act="casOpen">Import mutual fund statement</button></div>`}
vWealth=function(){const sg=WSEG.some(w=>w[0]==S.cfg.wSeg)||S.cfg.wSeg=="all"?S.cfg.wSeg:"over";let h=`<h1>Wealth</h1><div class="segs">${WSEG.map(([k,l])=>`<button class="${sg==k?"on":""}" data-act="wSeg" data-id="${k}">${l}</button>`).join("")}</div>`;
  if(sg=="over"){const P=nwParts2();h+=`${viewSeg()}<div style="height:10px"></div>${nwCard()}${P.length?`<h2>What it’s made of</h2><div class="card">${P.map(([k,v])=>`<div class="hbl" style="margin:6px 0"><span>${k}</span><b style="color:${v<0?"var(--late)":"inherit"}">${fm(v)}</b></div>`).join("")}</div>`:""}${byPerson()}
    ${S.mk&&S.mk.g?`<div class="card rates" data-act="wSeg" data-id="inv" style="margin-top:12px"><span>Gold 22K <b>₹${nf(Math.round(goldGram("INR",22)))}</b> a gram</span><span>1 QAR <b>₹${S.mk.qi.toFixed(2)}</b></span></div>`:""}`}
  else if(sg=="inv")h+=marketCard()+invSection();
  else if(sg=="sch")h+=saHtml()+schemesHtml();
  else if(sg=="goals")h+=goalsHtml()+`<div class="acts"><button class="btn ghost" data-act="addGoal">+ Goal</button></div>`+loansHtml()+`<div class="acts"><button class="btn ghost" data-act="addLoan">+ Loan</button></div>`;
  else if(sg=="plans")h+=retCard()+gratCard();
  else h+=`${viewSeg()}<div style="height:10px"></div>${nwCard()}`+marketCard()+invSection()+goalsHtml()+loansHtml()+`<div class="acts"><button class="btn ghost" data-act="addGoal">+ Goal</button><button class="btn ghost" data-act="addLoan">+ Loan</button></div>`+retCard()+gratCard()+saHtml()+schemesHtml()+byPerson();
  return h+`<div style="height:70px"></div>`};
/* ---------- update prompt when the app opens ---------- */
let updShownAt=0;
async function updPrompt(){if(!isApp()||inClaude())return;await updCheck(!S.cfg.updAt||Date.now()-S.cfg.updAt>30*6e4);const u=S.cfg.upd;if(!u)return;
  if(Date.now()-updShownAt<30*6e4||(S.cfg.updSnooze&&Date.now()-S.cfg.updSnooze<30*6e4&&S.cfg.updSnoozeCode==u.code))return;
  if(S.cfg.updAuto){updShownAt=Date.now();toast("Updating to Version "+(u.ver||"")+"…");return updInstall()}
  const show=n=>{if($("#over .sheet")||$(".lockscr")){if(n<40)setTimeout(()=>show(n+1),1500);return}updShownAt=Date.now();
    sheet(`<div class="updbox"><div class="updic">⬆️</div><h2 style="margin-top:0">Update available</h2><p class="sub">Version ${esc(u.ver||"")} · build ${u.code}${u.date?" · "+fmt(String(u.date).slice(0,10)):""}</p>
    ${u.notes?`<div class="card" style="text-align:left;margin:10px 0"><b>What’s new</b><p class="note" style="white-space:pre-line;margin:4px 0 0">${esc(u.notes)}</p></div>`:""}
    <label style="display:flex;gap:8px;align-items:center;justify-content:center;margin:12px 0"><input type="checkbox" id="u_auto" style="width:auto;margin:0"${S.cfg.updAuto?" checked":""}> Next time, update without asking</label>
    <div class="acts" style="justify-content:center"><button class="btn" data-act="updGo">Update now</button><button class="btn ghost" data-act="updLater">Later</button></div><p class="note">Your data stays on the phone. Android asks you to confirm the install.</p></div>`)};show(0)}
{const _ns=nativeStart;nativeStart=function(){_ns();setTimeout(updPrompt,2500)}}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&isApp())setTimeout(updPrompt,1200)});
/* ---------- duplicates ---------- */
function dupFind(days){const since=days?plus(-days):"0000",L=S.tx.filter(x=>(x.kind=="out"||x.kind=="in")&&x.date>=since&&!x.link).sort((a,b)=>a.date.localeCompare(b.date)||(a.ct||0)-(b.ct||0)),G=[],used=new Set();
  L.forEach((x,i)=>{if(used.has(x.id))return;const g=[x];for(let j=i+1;j<L.length;j++){const y=L[j];if(dl(y.date)-dl(x.date)>1)break;if(!used.has(y.id)&&y.kind==x.kind&&y.acc==x.acc&&Math.abs(+y.amt-(+x.amt))<0.005&&!S.cfg.dupOk?.includes(x.id+"|"+y.id))g.push(y)}
    if(g.length>1){g.forEach(z=>used.add(z.id));G.push(g)}});return G}
function dupSheet(){const G=dupFind(0);sheet(`<h2>Possible duplicates</h2><p class="sub">Same amount and account, on the same or next day. Often the same payment arriving by SMS and email.</p>
  ${G.length?G.map(g=>`<div class="card" style="margin-bottom:8px">${g.map((x,i)=>`<div class="hbl" style="margin:4px 0"><span>${fmt(x.date)} · ${esc(x.payee||x.cat||KIND[x.kind])}<small style="display:block;color:var(--mute)">${esc(an(x.acc))}${x.note?" · "+esc(x.note):""}</small></span><b>${fmx(x.amt,x.cur)}</b></div>`).join("")}
  <div class="acts"><button class="btn sm" data-act="dupDel" data-id="${g.slice(1).map(x=>x.id).join(",")}">Delete the extra ${g.length==2?"one":g.length-1}</button><button class="btn sm ghost" data-act="dupKeep" data-id="${g.map(x=>x.id).join(",")}">Both are real</button></div></div>`).join(""):`<div class="empty">No duplicates found.</div>`}`)}
/* ---------- share the month ---------- */
function monthText(m){const X=verdict(m),R=X.R;return [`Personal Diary · ${mlong(m)}${X.part?" so far":""}: ${X.label} (${X.sc}/100)`,`Spent ${fmr(mSum(m,"out"))} · Income ${fmr(mSum(m,"in"))} · Saved ${fmr(mSum(m,"save"))}`,...X.pts.map(p=>p[0]+": "+p[1]),...(X.why.length?["What changed: "+X.why.join("; ")]:[]),`Coming up in 30 days: ${fmr(X.cs)}${X.big.length?" ("+X.big.map(u=>u.n+" "+fmx(u.a,u.c)).join(", ")+")":""}`].join("\n")}
{const _vs=verdictSheet;verdictSheet=function(m){_vs(m);const sh=$("#over .sheet");if(sh)sh.insertAdjacentHTML("beforeend",`<div class="acts"><button class="btn sm" data-act="shareWa" data-id="${m}">Share on WhatsApp</button><button class="btn sm ghost" data-act="shareCopy" data-id="${m}">Copy summary</button></div>`)}}
Object.assign(ACT,{
  todoAll(){window.__todoAll=!window.__todoAll;render()},
  wSeg(k){S.cfg.wSeg=k;save();render();scrollTo(0,0)},
  wGo(k){S.cfg.wSeg=k;tab="invest";save();render();scrollTo(0,0)},
  updGo(){const c=$("#u_auto");if(c)S.cfg.updAuto=c.checked;save();sheet("");updInstall()},
  updLater(){const c=$("#u_auto");if(c)S.cfg.updAuto=c.checked;S.cfg.updSnooze=Date.now();S.cfg.updSnoozeCode=S.cfg.upd&&S.cfg.upd.code;save();sheet("")},
  updAutoT(){S.cfg.updAuto=!S.cfg.updAuto;save();settings();toast(S.cfg.updAuto?"Updates install as soon as they’re found":"You’ll be asked before each update")},
  dupSheet(){dupSheet()},
  dupDel(ids){const L=String(ids).split(",").filter(Boolean);L.forEach(i=>removeTx(i));save();render();dupSheet();toast(`Deleted ${L.length} ${L.length==1?"entry":"entries"}`,()=>{L.forEach(i=>untrash(i));save();render();dupSheet()})},
  dupKeep(ids){const L=String(ids).split(","),P=[];for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){P.push(L[i]+"|"+L[j],L[j]+"|"+L[i])}S.cfg.dupOk=[...new Set([...(S.cfg.dupOk||[]),...P])].slice(-400);save();render();dupSheet()},
  shareWa(m){openExt("https://wa.me/?text="+encodeURIComponent(monthText(m)))},
  shareCopy(m){copyText(monthText(m),"Summary")},
  homeEdit(){const K=[["month","This month"],["coming","Coming up"],["acc","Accounts"],["rates","Gold and QAR rate"],["fam","Family shortcut"]];
    sheet(`<h2>Choose what Home shows</h2><p class="sub">Net worth and Needs attention always show.</p>${K.map(([k,l])=>`<label class="hbl" style="margin:10px 0;justify-content:flex-start;gap:10px"><input type="checkbox" data-home="${k}" style="width:auto;margin:0"${homeOff(k)?"":" checked"}> ${l}</label>`).join("")}<div class="acts"><button class="btn" data-act="homeSave">Done</button></div>`)},
  homeSave(){S.cfg.homeOff=$$("#over input[data-home]").filter(c=>!c.checked).map(c=>c.dataset.home);save();sheet("");render()}
});
{const _th=ACT.theme;ACT.theme=function(...a){const r=_th.apply(this,a);if($("#over .sheet")&&$("#f_repo"))settings();return r}}
/* settings: grouped extras (theme, automatic updates, duplicates, Home) */
{const _st=settings;settings=function(...a){const r=_st(...a);try{const sh=$("#over .sheet"),rp=$("#f_repo");if(sh&&!$("#set_more")){
  sh.insertAdjacentHTML("afterbegin",`<div id="set_more" class="segs" style="margin-top:0"><button data-act="theme">Theme: ${({"":"Auto",light:"Light",dark:"Dark"})[S.cfg.theme||""]}</button><button data-act="hide">${S.cfg.hide?"Show":"Hide"} amounts</button><button data-act="dupSheet">Find duplicates</button><button data-act="homeEdit">Choose what Home shows</button></div>`);
  if(rp&&isApp()){const a=rp.closest("div")&&rp.parentNode;const box=$("#over [data-act='updNow']");if(box)box.parentNode.insertAdjacentHTML("afterend",`<label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" style="width:auto;margin:0" data-act="updAutoT"${S.cfg.updAuto?" checked":""}> Install updates automatically when the app opens</label>`)}}}catch(e){console.warn(e)}return r}}
