/* ===== my scheme accounts: SSY (Selvamagal), PPF (Ponmagan), Post Office RD ===== */
/* rate history: [from date, % a year]. RD uses the rate on the day it was opened, for its whole term. */
const RATES={ssy:[["2014-04-01",9.1],["2015-04-01",9.2],["2016-04-01",8.6],["2016-10-01",8.5],["2017-04-01",8.4],["2017-07-01",8.3],["2018-01-01",8.1],["2018-10-01",8.5],["2019-07-01",8.4],["2020-04-01",7.6],["2023-04-01",8.0],["2024-01-01",8.2]],
  ppf:[["2013-04-01",8.7],["2016-04-01",8.1],["2016-10-01",8.0],["2017-04-01",7.9],["2017-07-01",7.8],["2018-01-01",7.6],["2018-10-01",8.0],["2019-07-01",7.9],["2020-04-01",7.1]],
  rd:[["2019-07-01",7.2],["2020-04-01",5.8],["2023-04-01",6.2],["2023-07-01",6.5],["2023-10-01",6.7]]};
const SAT={ssy:"Sukanya Samriddhi (Selvamagal Semippu Thittam)",ppf:"PPF (Ponmagan Podhuvaippu Nidhi for a son)",rd:"Post Office RD, 5 years"},SAS={ssy:"SSY",ppf:"PPF",rd:"RD"};
const rateAt=(t,d)=>{const L=RATES[t]||[["2000-01-01",0]];let r=L[0][1];for(const [f,v] of L)if(f<=d)r=v;return r};
const mdiff=(a,b)=>{const A=D(a),B=D(b);return (B.getFullYear()-A.getFullYear())*12+B.getMonth()-A.getMonth()-(B.getDate()<A.getDate()?1:0)};
const fyLabel=d=>{const y=+d.slice(0,4),m=+d.slice(5,7),s=m>=4?y:y-1;return s+"-"+String(s+1).slice(2)};
const saMature=x=>x.type=="ssy"?addM(x.open,252):x.type=="rd"?addM(x.open,60):(+x.open.slice(5,7)>=4?+x.open.slice(0,4)+1:+x.open.slice(0,4))+15+"-04-01";
const saDepEnd=x=>x.type=="ssy"?addM(x.open,180):saMature(x);
const saRate=(x,d)=>+x.rate||rateAt(x.type,x.type=="rd"?x.open:d);
const deps=x=>(x.dep||[]).slice().sort((a,b)=>a.d.localeCompare(b.d));
/* SSY and PPF: interest on the lowest balance between the 5th and month end, added every 31 March */
function ssyRun(x,to,extra){const L=[...deps(x),...(extra||[])].sort((a,b)=>a.d.localeCompare(b.d)),endI=saMature(x);let bal=0,m=x.open.slice(0,7),acc=0,yrs=[],fix=x.fix&&x.fix.d?x.fix:null;
  if(fix){bal=+fix.bal||0;m=addMon(fix.d.slice(0,7),1)}
  const em=to.slice(0,7);let cur={fy:fyLabel(m+"-01"),dep:0,int:0};
  for(let k=0;k<400&&m<=em;k++){const D_=L.filter(d=>d.d.slice(0,7)==m&&(!fix||d.d>fix.d)),early=D_.filter(d=>+d.d.slice(8)<=5).reduce((s,d)=>s+ +d.a,0),all=D_.reduce((s,d)=>s+ +d.a,0);
    if(m<em&&m+"-01"<endI)acc+=(bal+early)*saRate(x,m+"-01")/1200;bal+=all;cur.dep+=all;
    if(m.slice(5)=="03"&&m<em){const i=Math.round(acc);bal+=i;cur.int+=i;cur.close=bal;yrs.push(cur);acc=0;cur={fy:fyLabel(addMon(m,1)+"-01"),dep:0,int:0}}
    m=addMon(m,1)}
  cur.close=bal;cur.acc=Math.round(acc);if(cur.dep||cur.acc||!yrs.length)yrs.push(cur);return {bal,acc:Math.round(acc),yrs}}
/* RD: each instalment grows with quarterly compounding at the rate fixed on opening */
function rdRun(x,to,extra){const r=saRate(x,x.open)/100;let v=0,dep=0;[...deps(x),...(extra||[])].forEach(d=>{if(d.d>to)return;dep+=+d.a;v+=d.a*Math.pow(1+r/4,Math.max(0,mdiff(d.d,to))/3)});return {bal:Math.round(v),acc:0,dep}}
function saState(x){const t=today(),L=deps(x),dep=L.reduce((s,d)=>s+ +d.a,0),fy=fyStart(),fyDep=L.filter(d=>d.d>=fy).reduce((s,d)=>s+ +d.a,0),mat=saMature(x),closed=t>=mat;
  const R=x.type=="rd"?rdRun(x,closed?mat:t):ssyRun(x,closed?mat:t),now=R.bal+(R.acc||0);
  /* future deposits from the plan, at today's rate, to project the maturity value */
  const fut=[],plan=planAmt(x),end=saDepEnd(x);let nd=saNext(x);
  if(plan&&nd&&!closed)for(let k=0;k<400&&nd&&nd<end;k++){if(nd>=t||!fut.length)fut.push({d:nd<t?t:nd,a:plan});nd=x.type=="rd"&&L.length+fut.length>=60?null:x.plan&&x.plan.f=="y"?addM(nd,12):addM(nd,1)}
  const P=x.type=="rd"?rdRun({...x},mat,fut):ssyRun({...x,rate:x.rate||0},mat,fut);
  /* a statement that starts with money already in the account: count what was put in and earned since then */
  const base=x.base&&x.base.d?x.base:null,putIn=base?L.filter(d=>d.d>=base.d).reduce((s,d)=>s+ +d.a,0):dep;
  return {dep,fyDep,now,int:now-dep-(x.fix&&x.fix.d?0:0),mat,closed,proj:P.bal,fut:fut.length,next:closed?null:saNext(x),R,putIn,intr:now-(base?+base.bal||0:0)-putIn,since:base?base.d:null}}
const planAmt=x=>x.type=="rd"?+x.inst||0:x.plan&&x.plan.f&&+x.plan.a||0;
/* the next deposit that is due */
function saNext(x){const t=today(),L=deps(x);if(t>=saDepEnd(x))return null;
  if(x.type=="rd"){const inst=+x.inst||0,n=inst?Math.floor(L.reduce((s,d)=>s+ +d.a,0)/inst+1e-9):L.length;return n>=60?null:addM(x.open,n)}
  if(!x.plan||!x.plan.f)return null;const day=Math.min(28,+x.plan.day||+x.open.slice(8)||5);
  if(x.plan.f=="m"){const cm=t.slice(0,7),has=L.some(d=>d.d.slice(0,7)==cm);return (has?addMon(cm,1):cm)+"-"+p2(day)}
  const fy=fyStart(),has=L.filter(d=>d.d>=fy).reduce((s,d)=>s+ +d.a,0)>=+x.plan.a;let d=fy.slice(0,4)+"-"+(x.plan.md||"04-05");if(d<fy)d=addM(d,12);return has?addM(d,12):d}
const saAct=()=>S.sacc.filter(x=>!x.closedHide);
/* reminders, net worth and payments link into the rest of the app */
{const _up=upcoming;upcoming=function(from,to,inc){const L=_up(from,to,inc);
  saAct().forEach(x=>{let d=saNext(x),n=0;const a=planAmt(x),end=saDepEnd(x),paid=deps(x).length;
    for(let k=0;k<60&&d&&d<=to&&d<end;k++){if(d>=from||(inc&&k==0))L.push({d,n:SAS[x.type]+": "+x.name,t:"due",src:"sch",a,c:"INR",id:x.id});n++;if(x.type=="rd"&&paid+n>=60)break;d=x.type!="rd"&&x.plan&&x.plan.f=="y"?addM(d,12):addM(d,1)}});
  return L.sort((a,b)=>a.d.localeCompare(b.d))}}
{const _nw=nwParts;nwParts=function(to){const p=_nw(to);p.inv+=S.sacc.reduce((s,x)=>s+cv(saState(x).now,"INR",to),0);return p}}
{const _la=linkApply;linkApply=function(x,s){if(!x.link||x.link.t!="sch")return _la(x,s);const a=S.sacc.find(q=>q.id==x.link.id);if(!a)return;a.ut=Date.now();a.dep=a.dep||[];
  if(s>0){if(!a.dep.some(d=>d.id==x.link.dep))a.dep.push({id:x.link.dep,d:x.date,a:x.iv??x.amt,tx:x.id})}else a.dep=a.dep.filter(d=>d.id!=x.link.dep)}}
function saDeposit(id,amt,date,accId){const x=S.sacc.find(q=>q.id==id);if(!x||!amt)return null;const did=uid();
  if(accId){const A=ac(accId);return addTx({kind:"save",acc:A.id,amt:cv(amt,"INR",A.cur),cur:A.cur,cat:SAS[x.type],note:x.name,date,link:{t:"sch",id,dep:did},iv:amt})}
  x.dep=[...(x.dep||[]),{id:did,d:date,a:amt}];x.ut=Date.now();return {id:did}}
/* ---------- screens ---------- */
function saHtml(){const L=S.sacc;let h=`<h2>My savings schemes</h2>`;
  if(L.length){const tot=L.reduce((s,x)=>s+saState(x).now,0),c80=L.filter(x=>x.type!="rd").reduce((s,x)=>s+saState(x).fyDep,0);
    h+=`<div class="stats" style="grid-template-columns:1fr 1fr;margin:0 0 8px">${tile("Value today",inr(Math.round(tot)))}${tile("SSY + PPF this year",inr(c80),"","for "+TAXSEC()+", since "+fmt(fyStart()))}</div>`;
    h+=L.map(x=>{const s=saState(x),n=s.next?dl(s.next):null;return `<div class="card ${n!==null&&n<0?"late":n!==null&&n<=7?"soon":""}" style="margin-bottom:8px"><div style="cursor:pointer" data-act="saInfo" data-id="${x.id}"><div class="hbl"><b>${esc(x.name)}</b>${s.closed?`<span class="chip">Matured</span>`:n!==null?`<span class="chip">${n<0?"Due "+fmt(s.next):when(n)}</span>`:""}</div>
      <small style="color:var(--mute);display:block">${SAS[x.type]}${x.holder?" · "+esc(x.holder):""}${x.no?" · "+esc(x.no):""} · opened ${fmt(x.open)} · ${saRate(x,today())}%</small>
      <div class="stats" style="margin:8px 0 0">${tile("Value now",inr(Math.round(s.now)))}${tile(s.since?"Put in since "+fmt(s.since):"You put in",inr(s.putIn))}${tile(s.since?"Interest since "+fmt(s.since):"Interest",inr(Math.round(s.intr)))}</div>${x.type!="rd"&&!s.closed&&s.R&&s.R.acc>0?`<small style="color:var(--mute);display:block;margin-top:6px">In the bank now: ${inr(Math.round(s.R.bal))} · ${inr(Math.round(s.R.acc))} interest building up, added on 31 March</small>`:""}
      <small style="color:var(--mute);display:block;margin-top:6px">${s.closed?"Matured on "+fmt(s.mat):`Matures ${fmt(s.mat)} · about ${inr(Math.round(s.proj))}${s.fut?" if you keep paying "+inr(planAmt(x))+(x.type!="rd"&&x.plan&&x.plan.f=="y"?" a year":" a month"):" with no more deposits"}`}${x.type!="rd"&&s.fyDep>150000?` · <b style="color:var(--late)">over ₹1.5 lakh this year</b>`:""}</small></div>
      ${s.closed?"":`<div class="acts"><button class="btn sm" data-act="saDep" data-id="${x.id}">Deposit</button><button class="btn sm ghost" data-act="saPast" data-id="${x.id}">Past deposits</button></div>`}</div>`}).join("")}
  else h+=`<div class="empty">Add the SSY (Selvamagal), PPF or post office RD accounts you already pay into. Enter your past deposits once, and the app works out the balance and interest.</div>`;
  return h+`<div class="acts"><button class="btn ghost" data-act="saAdd">+ Add scheme account</button></div><p class="note">Balances are estimates from the rates in force each quarter. Check them against your passbook, and correct them from the account details if needed.</p>`}
function saForm(x,pre){x=x||null;const g=k=>x?x[k]??"":pre&&pre[k]||"",ty=x?x.type:pre&&pre.type||"ssy",pl=x&&x.plan||{};
  sheet(`<h2>${x?"Edit scheme account":"New scheme account"}</h2>${SEL("f_ty","Scheme",Object.entries(SAT),ty,x?"disabled":"")}
  ${F("f_name","Name",g("name"),"text",'placeholder="Selvamagal for Anika"')}<div class="two"><div>${F("f_holder","Account holder",g("holder"),"text",'placeholder="Child’s name"')}</div><div>${F("f_no","Account number",g("no"))}</div></div>
  <div class="two"><div>${F("f_open","Date opened",g("open")||today(),"date")}</div><div>${F("f_po","Post office or bank",g("po"))}</div></div>
  <div class="two"><div>${F("f_plan","Usual deposit (₹)",x?(x.type=="rd"?x.inst:pl.a)||"":pre&&pre.amt||"","number")}</div><div>${SEL("f_freq","How often",[["m","Every month"],["y","Once a year"],["","No fixed plan"]],x?(x.type=="rd"?"m":pl.f??"m"):"m")}</div></div>
  <div class="two"><div>${F("f_day","Day of the month I pay",x?(pl.day||+x.open.slice(8)):5,"number")}</div><div>${SEL("f_pay","Pay from",[["","Ask each time"],...ACCS()],g("pay"))}</div></div>
  <details><summary>Interest rate</summary>${F("f_rate","Use a fixed rate instead (% a year)",x&&x.rate||"","number")}<p class="note">Leave empty to use the rate the government set for each quarter. For an RD, that is the rate on the day it was opened, which stays for its 5 years.</p></details>
  <p class="note">For an RD, the usual deposit is the monthly instalment. Deposits made on or before the 5th earn interest for that month in SSY and PPF.</p>${stampNote(x)}${btns("saSave",x&&x.id,"saDel")}`)}
function saPastForm(id){const x=S.sacc.find(q=>q.id==id);if(!x)return;const last=deps(x).slice(-1)[0],from=last?addM(last.d,x.plan&&x.plan.f=="y"?12:1):x.open;
  sheet(`<h2>Past deposits: ${esc(x.name)}</h2><p class="sub">Add deposits you have already made. They count for the balance and interest.</p>
  ${SEL("f_mode","What to add",[["m","The same amount every month"],["y","The same amount every year"],["1","One deposit"]],x.type!="rd"&&x.plan&&x.plan.f=="y"?"y":"m",'data-pmode="1"')}
  <div class="two"><div>${F("f_amt","Amount each time (₹)",planAmt(x)||"","number")}</div><div>${F("f_day","Day of the month",Math.min(28,x.plan&&x.plan.day||+x.open.slice(8)||5),"number")}</div></div>
  <div class="two"><div>${F("f_from","From",from>today()?today():from,"date")}</div><div>${F("f_to","To",addM(today(),-1)<from?today():addM(today(),-1),"date")}</div></div>
  ${SEL("f_acc","Did this money leave one of your accounts in the app?",[["","No, it was paid before I used the app"],...ACCS()],"")}
  <p class="note" id="pd_prev"></p><div class="acts"><button class="btn ghost" data-act="saPastPrev" data-id="${id}">Check</button><button class="btn" data-act="saPastSave" data-id="${id}">Add deposits</button></div>`);pastPrev()}
function pastList(){const mode=v("f_mode"),a=+v("f_amt")||0,day=Math.min(31,Math.max(1,+v("f_day")||5)),f=v("f_from"),t=v("f_to")||f;if(!a||!f)return [];if(mode=="1")return [{d:f,a}];
  const out=[];let m=f.slice(0,7);const step=mode=="y"?12:1;for(let k=0;k<400&&m<=t.slice(0,7);k++){const d=m+"-"+p2(Math.min(day,dim(m)));if(d>=f&&d<=t)out.push({d,a});m=addMon(m,step)}return out}
function pastPrev(){const L=pastList(),e=$("#pd_prev"),one=v("f_mode")=="1",tt=$("#f_to");if(tt)tt.closest("div").style.display=one?"none":"";if(e)e.textContent=L.length?`This adds ${L.length} ${L.length==1?"deposit":"deposits"}, ${inr(L.reduce((s,d)=>s+d.a,0))} in total, from ${fmt(L[0].d)} to ${fmt(L[L.length-1].d)}.`:"Enter the amount and dates."}
function saInfoSheet(id){const x=S.sacc.find(q=>q.id==id);if(!x)return;const s=saState(x),L=deps(x).reverse(),Y=x.type=="rd"?null:ssyRun(x,s.closed?s.mat:today()).yrs;
  sheet(`<h2>${esc(x.name)}</h2><p class="sub">${SAT[x.type]}${x.no?" · "+esc(x.no):""}${x.po?" · "+esc(x.po):""}<br>Opened ${fmt(x.open)} · matures ${fmt(s.mat)}${x.type=="ssy"?" · deposits until "+fmt(saDepEnd(x)):""}</p>
  <div class="stats">${tile("Value now",inr(Math.round(s.now)))}${tile(s.since?"Put in since "+fmt(s.since):"You put in",inr(s.putIn))}${tile(s.since?"Interest since "+fmt(s.since):"Interest",inr(Math.round(s.intr)))}</div>${x.type!="rd"&&!s.closed&&s.R&&s.R.acc>0?`<p class="note">In the bank now: <b>${inr(Math.round(s.R.bal))}</b>. Value now adds ${inr(Math.round(s.R.acc))} of interest building up this year, which the bank adds on 31 March.</p>`:""}${s.since?`<p class="note">${inr(x.base.bal)} was already in the account before ${fmt(s.since)}. Import an older statement to see what was paid in before that.</p>`:""}
  ${Y?`<h3>Year by year</h3><table class="tbl"><tr><th>Year</th><th>Deposited</th><th>Interest</th><th>Balance</th></tr>${Y.map(y=>`<tr><td>${y.fy}</td><td>${inr(y.dep)}</td><td>${y.acc!=null&&y.acc?inr(y.acc)+"*":inr(y.int)}</td><td>${inr(y.close)}</td></tr>`).join("")}</table><p class="note">* interest building up this year, added on 31 March.</p>`:`<p class="note">Rate ${saRate(x,x.open)}% fixed from opening, compounded every quarter. ${deps(x).length} of 60 instalments recorded.</p>`}
  <h3>Correct from passbook</h3><p class="note">${x.fix&&x.fix.d?`Using your passbook balance of ${inr(x.fix.bal)} on ${fmt(x.fix.d)}. `:""}Enter a balance printed in your passbook, for example on 31 March. The app then calculates from that figure.</p><div class="two"><div>${F("f_fd","Date",x.fix&&x.fix.d||"","date")}</div><div>${F("f_fb","Balance (₹)",x.fix&&x.fix.bal||"","number")}</div></div><div class="acts"><button class="btn ghost" data-act="saFix" data-id="${id}">Use passbook balance</button>${x.fix&&x.fix.d?`<button class="btn ghost" data-act="saUnfix" data-id="${id}">Remove</button>`:""}</div>
  <h3>Deposits (${L.length})</h3>${L.slice(0,80).map(d=>`<div class="row" style="cursor:default"><div><b>${inr(d.a)}</b><small>${fmt(d.d)}${d.tx?" · from "+esc(an((S.tx.find(t=>t.id==d.tx)||{}).acc)):""}</small></div><button class="btn sm ghost" data-act="saDelDep" data-id="${x.id}|${d.id}" aria-label="Delete deposit">✕</button></div>`).join("")||`<div class="empty">No deposits yet.</div>`}
  <div class="acts"><button class="btn" data-act="saEdit" data-id="${id}">Edit account</button><button class="btn ghost" data-act="saPast" data-id="${id}">Past deposits</button></div>`)}
{const _vW=vWealth;vWealth=function(){let h=_vW();const k="<h2>Post office schemes (India)</h2>";return h.includes(k)?h.replace(k,saHtml()+k):h+saHtml()}}
Object.assign(ACT,{
  saAdd(){saForm()},
  saEdit(id){saForm(S.sacc.find(q=>q.id==id))},
  saSave(id){const n=v("f_name").trim(),op=v("f_open");if(!n||!op)return toast("Add a name and the opening date");const old=S.sacc.find(q=>q.id==id),ty=old?old.type:v("f_ty"),amt=+v("f_plan")||0,f=v("f_freq"),day=Math.min(28,Math.max(1,+v("f_day")||5));
    const o=stamp({...(old||{}),id:id||uid(),type:ty,name:n,holder:v("f_holder").trim(),no:v("f_no").trim(),po:v("f_po").trim(),open:op,pay:v("f_pay"),rate:+v("f_rate")||0,dep:old?old.dep||[]:[]},old);
    if(ty=="rd")o.inst=amt;else o.plan={f,a:amt,day,md:op.slice(5,7)+"-"+p2(day)};put("sacc",o);done();
    if(!old&&dl(op)<-20)setTimeout(()=>{saPastForm(o.id);toast("Now add the deposits you have already made")},150)},
  saDel(id,t){if(t.getAttribute("data-ok")!="1"){t.setAttribute("data-ok","1");t.textContent="Tap again to delete";return}const x=S.sacc.find(q=>q.id==id);(x.dep||[]).forEach(d=>{if(d.tx)removeTx(d.tx)});trash("sacc",id);done();undoDel(id,"Scheme account deleted")},
  saDep(id){const x=S.sacc.find(q=>q.id==id);if(!x)return;sheet(`<h2>Deposit: ${esc(x.name)}</h2><div class="two"><div>${F("f_amt","Amount (₹)",planAmt(x)||"","number")}</div><div>${F("f_date","Date",today(),"date")}</div></div>${SEL("f_acc","Take it from",[["","Don’t change any account"],...ACCS()],x.pay||S.cfg.last||"")}${x.type!="rd"&&saState(x).fyDep>=150000?`<p class="note" style="color:var(--late)">This account already has ₹1.5 lakh this year, the yearly limit.</p>`:""}${btns("saDepSave",id)}`)},
  saDepSave(id){const a=+v("f_amt")||0,d=v("f_date")||today(),acc=v("f_acc");if(!a)return toast("Enter the amount");saDeposit(id,a,d,acc);if(acc)S.cfg.last=acc;done();toast("Deposit added")},
  saPast(id){saPastForm(id)},saPastPrev(){pastPrev()},
  saPastSave(id){const x=S.sacc.find(q=>q.id==id),L=pastList(),acc=v("f_acc");if(!x||!L.length)return toast("Enter the amount and dates");
    const have=new Set(deps(x).map(d=>d.d+"|"+d.a));let n=0;L.forEach(d=>{if(have.has(d.d+"|"+d.a))return;saDeposit(id,d.a,d.d,acc);n++});done();toast(`Added ${n} ${n==1?"deposit":"deposits"}${L.length-n?", skipped "+(L.length-n)+" already there":""}`)},
  saInfo(id){saInfoSheet(id)},
  saFix(id){const x=S.sacc.find(q=>q.id==id),d=v("f_fd"),b=+v("f_fb");if(!x||!d||!b)return toast("Enter the date and balance");x.fix={d,bal:b};x.ut=Date.now();save();render();saInfoSheet(id);toast("Using your passbook balance")},
  saUnfix(id){const x=S.sacc.find(q=>q.id==id);if(!x)return;delete x.fix;x.ut=Date.now();save();render();saInfoSheet(id)},
  saDelDep(key){const [id,did]=key.split("|"),x=S.sacc.find(q=>q.id==id);if(!x)return;const d=(x.dep||[]).find(q=>q.id==did);if(!d)return;if(d.tx)removeTx(d.tx);else{x.dep=x.dep.filter(q=>q.id!=did);x.ut=Date.now()}save();render();saInfoSheet(id)}
});
{const _sa=ACT.schAdd;ACT.schAdd=function(id){if(id=="ppf"||id=="ssy"||id=="rd"){const a=+v("sch_amt")||0;saForm(null,{type:id,amt:a});return}return _sa(id)}}
document.addEventListener("change",e=>{const t=e.target;if(t&&t.closest&&t.closest("#over")&&["f_mode","f_amt","f_day","f_from","f_to"].includes(t.id)&&$("#pd_prev"))pastPrev()});
