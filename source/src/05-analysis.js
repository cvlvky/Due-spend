/* ===== analysis: monthly report, forecast, health, checks, explanations ===== */
const histMonths=(m,n)=>[1,2,3,4,5,6].map(j=>addMon(m,-j)).filter(x=>S.tx.some(q=>(q.kind=="out"||q.kind=="in")&&q.date.startsWith(x))).slice(0,n);
const catTotals=m=>{const by={};mTx(m,"out").forEach(x=>{const c=x.cat||"Uncategorised";by[c]=(by[c]||0)+ca(x)});return Object.entries(by).sort((a,b)=>b[1]-a[1])};
const rateOf=(i,s)=>i>0?(i-s)/i*100:null;
/* this month, the month before, and the average of up to three earlier months that have entries */
function rep(m){const p=addMon(m,-1),h=histMonths(m,3),o={h};
  for(const k of ["out","in","save"])o[k]={cur:mSum(m,k),prev:mSum(p,k),avg:h.length?h.reduce((s,x)=>s+mSum(x,k),0)/h.length:null};
  o.rate={cur:rateOf(o.in.cur,o.out.cur),prev:rateOf(o.in.prev,o.out.prev),avg:o.in.avg?rateOf(o.in.avg,o.out.avg):null};return o}

/* plain-language summary of a month; returns HTML-safe sentences */
function summary(m){const R=rep(m),L=[],sp=R.out.cur,inc=R.in.cur,cm=today().slice(0,7),td=+today().slice(8),part=m==cm&&td<dim(m),fs=fixedSet(),fixed=sumV(mTx(m,"out").filter(x=>isFixed(x,fs)));
  if(!sp&&!inc&&!R.save.cur)return ["No entries for "+mlong(m)+" yet. Add spending or income to see a summary."];
  if(inc>0){const left=inc-sp;L.push(left>=0?`You received ${fmr(inc)} and spent ${fmr(sp)}, keeping ${fmr(left)} (${Math.round(left/inc*100)}% of income).`:`You spent ${fmr(sp)}, which is ${fmr(-left)} more than the ${fmr(inc)} you received.`)}
  else L.push(`You spent ${fmr(sp)}. No income is recorded for this month.`);
  if(R.out.prev>0&&sp>0){if(part&&td>=7){const proj=fixed+(sp-fixed)/td*dim(m),d=Math.round((proj/R.out.prev-1)*100);L.push(Math.abs(d)>200?`At this pace the month ends near ${fmr(proj)}, against ${fmr(R.out.prev)} last month.`:`At this pace the month ends near ${fmr(proj)}, ${Math.abs(d)}% ${d>=0?"above":"below"} last month.`)}
    else if(!part){const d=Math.round((sp/R.out.prev-1)*100);L.push(Math.abs(d)>200?`Spending was ${fmr(sp)}, against ${fmr(R.out.prev)} the month before.`:`Spending was ${Math.abs(d)}% ${d>=0?"higher":"lower"} than the month before.`)}}
  const C=catTotals(m);
  if(C.length&&sp>0){L.push(`${esc(C[0][0])} was the largest category at ${fmr(C[0][1])} (${Math.round(C[0][1]/sp*100)}% of spending).`);
    if(!part||td>=20){const pm=Object.fromEntries(catTotals(addMon(m,-1)));let best=null;C.forEach(([c,a])=>{const b=pm[c]||0;if(b>0&&a-b>(best?best[1]:0))best=[c,a-b]});if(best&&best[0]!=C[0][0])L.push(`${esc(best[0])} rose the most, up ${fmr(best[1])} on the month before.`)}}
  if(sp>0&&fixed>0)L.push(`Fixed costs made up ${Math.round(fixed/sp*100)}% of spending.`);
  return L}

function budUse(m){const t=mTx(m,"out");return S.bud.map(b=>{const s=t.filter(x=>(x.cat||"Other").toLowerCase()==String(b.cat).toLowerCase()).reduce((a,x)=>a+cv(x.amt,x.cur,b.cur),0);return {b,s,p:b.lim?Math.round(s/b.lim*100):0}})}
function emiLoad(){const R=rep(today().slice(0,7)),L=[];
  S.loans.forEach(l=>{if(loanLeft(l))L.push({l:l.name,v:iv(l.emi,l.cur)})});
  activeDues().forEach(i=>{const st=REP[i.rep][1];if(i.type=="emi"&&st&&+i.amt)L.push({l:i.name,v:iv(i.amt,i.cur)/st})});
  const recIn=S.rec.filter(r=>r.kind=="in").reduce((s,r)=>s+iv(r.amt,ac(r.acc).cur),0);
  return {L,emi:L.reduce((s,x)=>s+x.v,0),inc:recIn||R.in.avg||R.in.cur||0}}
const liquid=()=>tot(V(),k=>k.type!="card");
/* indicators with a traffic-light level; thresholds are common rules of thumb */
function health(m){const R=rep(m),H=[],cm=today().slice(0,7),r=R.rate.cur;
  H.push(r==null?{n:"Savings rate",v:"Add income entries to see this",l:"na"}:{n:"Savings rate",v:Math.round(r)+"% of income kept",l:r>=20?"good":r>=10?"warn":"bad",k:"rate:"+m,t:"A common target is 20% or more."});
  const need=R.out.avg||(m==cm?R.out.cur/Math.max(1,+today().slice(8))*dim(m):R.out.cur),liq=liquid();
  H.push(need>0?{n:"Emergency cover",v:(liq/need).toFixed(1)+" months of spending",l:liq/need>=6?"good":liq/need>=3?"warn":"bad",k:"emer",t:"A common target is 3 to 6 months."}:{n:"Emergency cover",v:"Add spending entries to see this",l:"na"});
  const E=emiLoad();H.push(!E.emi?{n:"EMI load",v:"No EMIs",l:"good"}:E.inc>0?{n:"EMI load",v:Math.round(E.emi/E.inc*100)+"% of income",l:E.emi/E.inc<=.3?"good":E.emi/E.inc<=.4?"warn":"bad",k:"emi",t:"A common limit is 30 to 40%."}:{n:"EMI load",v:"Add income entries to see this",l:"na",k:"emi"});
  const B=budUse(cm),over=B.filter(x=>x.p>100).length,near=B.filter(x=>x.p>=90&&x.p<=100).length;
  H.push(!B.length?{n:"Budgets",v:"No budgets set",l:"na"}:{n:"Budgets",v:over?`${over} over the limit`:near?`${near} close to the limit`:"All within limits",l:over?"bad":near?"warn":"good"});
  const t=today(),late=upcoming(t,t,true).filter(u=>(u.t=="due"||u.t=="emi")&&u.d<t).length;
  H.push({n:"Payments on time",v:late?`${late} overdue`:"Nothing overdue",l:late?"bad":"good",k:late?"due30":""});
  return H}

/* what the accounts can cover over the next 30 days */
function safeSpend(){const t=today(),U=upcoming(t,plus(30),true).filter(u=>u.t!="fd"&&u.t!="recin"&&u.a),need=U.reduce((s,u)=>s+iv(u.a,u.c),0),have=tot(V());return {have,need,safe:have-need,U}}
/* month-by-month estimate of the total balance */
function forecast(n){const t=today(),cm=t.slice(0,7),td=+t.slice(8),hist=histMonths(cm,3),planned=x=>!!x.rec||!!(x.link&&(x.link.t=="due"||x.link.t=="loan")),flexOf=m=>sumV(mTx(m,"out").filter(x=>!planned(x)));
  const flexAvg=hist.length?hist.reduce((s,m)=>s+flexOf(m),0)/hist.length:(td>=5?flexOf(cm)/td*dim(cm):flexOf(cm));
  const hasRecIn=S.rec.some(r=>r.kind=="in"),incAvg=hist.length?hist.reduce((s,m)=>s+mSum(m,"in"),0)/hist.length:0;
  let b=tot(V());const rows=[];
  for(let j=0;j<n;j++){const m=addMon(cm,j),U=upcoming(j?m+"-01":t,mEnd(m),j==0).filter(u=>u.a);let inc=0,fixed=0;
    U.forEach(u=>{const val=iv(u.a,u.c);if(u.t=="fd"||u.t=="recin")inc+=val;else fixed+=val});
    const est=hasRecIn?0:(j?incAvg:Math.max(0,incAvg-mSum(cm,"in"))),flex=j?flexAvg:Math.max(0,flexAvg*(dim(cm)-td)/dim(cm));
    b+=inc+est-fixed-flex;rows.push({m,inc:inc+est,est,planned:inc,fixed,flex,bal:b,U})}
  return rows}

/* data quality */
function dupes(){const seen=new Map(),out=[];S.tx.filter(x=>(x.kind=="out"||x.kind=="in"||x.kind=="save")&&!x.rec).forEach(x=>{const k=[x.date,x.kind,x.acc,x.amt,(x.cat||"").toLowerCase()].join("|");if(seen.has(k))out.push(x);else seen.set(k,x)});return out}
const staleAcc=()=>S.acc.filter(a=>S.tx.some(x=>x.acc==a.id||x.to==a.id)&&(!a.rcd||dl(a.rcd)<-30));
const bothEmi=()=>activeDues().filter(i=>i.type=="emi"&&S.loans.some(l=>loanLeft(l)&&same(l.name,i.name)));
function checks(){const C=[],pl=(n,a,b)=>n==1?a:b,
  un=S.tx.filter(x=>(x.kind=="out"||x.kind=="in"||x.kind=="save")&&!x.cat),dp=dupes(),st=staleAcc(),na=activeDues().filter(i=>!+i.amt),bo=bothEmi();
  if(un.length)C.push({t:`${un.length} ${pl(un.length,"entry has","entries have")} no category`,k:"chk:uncat"});
  if(dp.length)C.push({t:`${dp.length} possible duplicate ${pl(dp.length,"entry","entries")}`,k:"chk:dup"});
  if(st.length)C.push({t:`${st.length} ${pl(st.length,"account hasn’t","accounts haven’t")} been checked against the bank in 30 days`,k:"chk:acc"});
  if(na.length)C.push({t:`${na.length} due ${pl(na.length,"date has","dates have")} no amount`,k:"chk:noamt"});
  if(bo.length)C.push({t:`${bo.length} ${pl(bo.length,"EMI is","EMIs are")} listed under both Dues and Loans, so ${pl(bo.length,"it is","they are")} counted twice`,k:"chk:both"});
  const usesQar=S.acc.some(a=>a.cur=="QAR")||S.dates.some(i=>i.cur=="QAR");
  if(usesQar&&(!S.cfg.rateAt||dl(S.cfg.rateAt)<-30))C.push({t:`The QAR rate (₹${fx()}) hasn’t been updated ${S.cfg.rateAt?"since "+fmt(S.cfg.rateAt):"in the last 30 days"}. Check it on the Spend tab`,k:""});
  return C}

/* "tap a number to see what is in it" */
function explainData(key){const p=key.split(":"),a=p[0],t=today();
  const txr=x=>({id:x.id,l:(x.cat||KIND[x.kind])+(x.sub?" › "+x.sub:""),s:fmt(x.date)+" · "+an(x.acc)+(x.payee?" · "+x.payee:"")+(x.note?" · "+x.note:""),v:fm(ca(x))});
  const upr=(u,neg)=>({l:u.n,s:fmt(u.d)+(u.d<t?" · overdue":""),v:(neg?"−":"")+fm(iv(u.a,u.c))});
  if(a=="m"){const k=p[1],m=p[2],accId=p[3],fs=fixedSet();let L=S.tx.filter(x=>x.date.startsWith(m)&&(!accId||x.acc==accId));
    L=k=="fixed"?L.filter(x=>x.kind=="out"&&isFixed(x,fs)):k=="flex"?L.filter(x=>x.kind=="out"&&!isFixed(x,fs)):L.filter(x=>x.kind==k);L.sort((x,y)=>ca(y)-ca(x));
    const nm={out:"Spent",in:"Income",save:"Saved",fixed:"Fixed costs",flex:"Flexible spending"}[k],
    how={out:"Every Spent entry dated in this month. Transfers between your accounts are not counted.",in:"Every Income entry dated in this month. Transfers, FD maturities and balance corrections are not counted.",save:"Every Saved entry in this month, including money put into goals and investments.",fixed:"Spending from recurring entries, due dates, EMIs and your fixed-cost categories.",flex:"Spending that is not a fixed cost."}[k];
    return {t:nm+" in "+mlong(m),how:how+(accId?" Only "+esc(an(accId))+".":""),rows:L.map(txr),tot:fm(sumV(L))}}
  if(a=="rate"){const R=rep(p[1]);return {t:"Savings rate, "+mlong(p[1]),how:"Income minus spending, as a share of income.",rows:[{l:"Income",v:fm(R.in.cur)},{l:"Spent",v:"−"+fm(R.out.cur)},{l:"Kept",v:fm(R.in.cur-R.out.cur)}],tot:R.rate.cur==null?"":Math.round(R.rate.cur)+"%"}}
  if(a=="due30"){const U=upcoming(t,plus(30),true).filter(u=>u.t=="due"||u.t=="emi");return {t:"Due in the next 30 days",how:"Unpaid due dates and loan EMIs up to "+fmt(plus(30))+", including anything overdue. FD maturities are not counted.",rows:U.map(u=>upr(u)),tot:fm(U.reduce((s,u)=>s+iv(u.a,u.c),0))}}
  if(a=="safe"){const sf=safeSpend();return {t:"Safe to spend, next 30 days",how:"What your accounts hold now, minus dues, EMIs and recurring payments in the next 30 days. Income not yet received is left out.",rows:[{l:"In your accounts now",v:fm(sf.have)},...sf.U.map(u=>upr(u,true))],tot:fmr(sf.safe)}}
  if(a=="nw"){const rows=[];S.acc.forEach(k=>rows.push({l:k.name,s:ATYPE[k.type]||"Account",v:fm(iv(bal(k),k.cur))}));S.inv.filter(x=>!x.closed).forEach(x=>rows.push({l:x.name,s:IK[x.kind],v:fm(iv(invVal(x),x.cur))}));
    S.goals.forEach(g=>{if(+g.saved)rows.push({l:g.name,s:"Goal savings",v:fm(iv(g.saved,g.cur))})});S.loans.forEach(l=>{if(loanLeft(l))rows.push({l:l.name,s:"Loan still to pay",v:"−"+fm(iv(loanOut(l),l.cur))})});
    return {t:"Net worth",how:"Account balances, plus investments and goal savings, minus what is still owed on loans.",rows,tot:fm(nwv(V()))}}
  if(a=="emer"){const R=rep(mon||t.slice(0,7)),need=R.out.avg||R.out.cur;return {t:"Emergency cover",how:"Cash, bank and wallet balances divided by your average monthly spending"+(need?" ("+fmr(need)+")":"")+". Credit cards are left out.",rows:S.acc.filter(k=>k.type!="card").map(k=>({l:k.name,v:fm(iv(bal(k),k.cur))})),tot:fm(liquid())}}
  if(a=="emi"){const E=emiLoad();return {t:"EMI load",how:"Monthly EMIs divided by monthly income"+(E.inc?" ("+fmr(E.inc)+")":"")+".",rows:E.L.map(x=>({l:x.l,v:fm(x.v)})),tot:fm(E.emi)}}
  if(a=="fc"){const r=forecast(6)[+p[1]];if(!r)return null;const rows=[];
    r.U.forEach(u=>rows.push(upr(u,u.t!="fd"&&u.t!="recin")));if(r.est)rows.push({l:"Expected income",s:"Average of recent months",v:fmr(r.est)});if(r.flex)rows.push({l:"Everyday spending",s:"Average of recent months, without planned items",v:"−"+fmr(r.flex)});
    return {t:"Forecast for "+mlong(r.m),how:"An estimate. Planned items come from your due dates, EMIs and recurring entries. Everyday spending and income use your recent averages.",rows,tot:fmr(r.bal)}}
  if(a=="chk"){const k=p[1];
    if(k=="uncat"){const L=S.tx.filter(x=>(x.kind=="out"||x.kind=="in"||x.kind=="save")&&!x.cat);return {t:"Entries with no category",how:"Tap an entry to add a category, so reports can group it.",rows:L.map(txr)}}
    if(k=="dup")return {t:"Possible duplicates",how:"Same date, account, amount and category as another entry. Tap one to check it and delete it if it is a repeat.",rows:dupes().map(txr)};
    if(k=="acc")return {t:"Accounts to check",how:"Open Accounts and tap Correct on each one. Enter the bank’s balance, or confirm that it matches.",rows:staleAcc().map(x=>({l:x.name,s:x.rcd?"Last checked "+fmt(x.rcd):"Never checked",v:fmx(bal(x),x.cur)}))};
    if(k=="noamt")return {t:"Due dates with no amount",how:"Add the amount on the Dues tab so totals and forecasts include them.",rows:activeDues().filter(i=>!+i.amt).map(i=>({l:i.name,s:fmt(i.date),v:""}))};
    if(k=="both")return {t:"Listed twice",how:"These EMIs are on the Dues tab and also tracked under Loans. Delete the Dues copy so they are counted once.",rows:bothEmi().map(i=>({l:i.name,s:fmt(i.date),v:fmx(i.amt,i.cur)}))}}
  return null}
