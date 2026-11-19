/* ===== ledger: one list of money movements, with links to dues, loans, goals and investments ===== */
/* tx kinds: out (spent), in (income), save (saved), adj (neutral balance change), tr (transfer: acc → to) */
function mig(){
  for(const c of COLLS)if(!Array.isArray(S[c]))S[c]=[];
  if(!Array.isArray(S.bin))S.bin=[];if(!Array.isArray(S.del))S.del=[];if(!S.nw||typeof S.nw!="object")S.nw={};
  S.cfg=S.cfg||{};S.cfg.rate=+S.cfg.rate||DEFRATE;S.cfg.view=S.cfg.view=="QAR"?"QAR":"INR";
  if(S.cfg.fixedCats==null)S.cfg.fixedCats="Rent, EMI, Premium, Renewal, Bills";
  S.tx.forEach(x=>{if(x.kind!="tr"&&!x.acc){const c=x.cur||"INR";let k=S.acc.find(q=>q.id=="def_"+c);if(!k){k={id:"def_"+c,name:c=="INR"?"Cash / Main":"Cash (QAR)",type:"cash",cur:c,open:0};S.acc.push(k)}x.acc=k.id;x.cur=c}});
  if(!S.acc.length)S.acc.push({id:"def_INR",name:"Cash / Main",type:"cash",cur:"INR",open:0});
  if(Array.isArray(S.tr)&&S.tr.length){const have=new Set(S.tx.map(x=>x.id));S.tr.forEach(t=>{if(!have.has(t.id))S.tx.push({id:t.id,kind:"tr",acc:t.from,to:t.to,amt:+t.amt||0,got:+t.got||0,fee:+t.fee||0,date:t.date,note:t.note||""})})}
  delete S.tr;
  S.tx.forEach(x=>{x.amt=+x.amt||0;if(x.kind=="tr"&&!x.cur)x.cur=ac(x.acc).cur});
  S.dates.forEach(i=>{i.cur=i.cur||"INR";if(!REP[i.rep])i.rep="none";if(!TYPES[i.type])i.type="renewal"});
  S.inv.forEach(x=>{x.cur=x.cur||"INR";if(!IK[x.kind])x.kind="other"});
  S.loans.forEach(l=>{l.cur=l.cur||"INR";l.paid=+l.paid||0;l.total=+l.total||0;l.emi=+l.emi||0});
  S.goals.forEach(g=>{g.cur=g.cur||"INR"})}

const ac=id=>S.acc.find(k=>k.id==id)||{id:"",name:"Unknown",cur:"INR",open:0};
const an=id=>ac(id).name;
function bal(k){let b=+k.open||0;for(const x of S.tx){if(x.kind=="tr"){if(x.acc==k.id)b-=(+x.amt||0)+(+x.fee||0);if(x.to==k.id)b+=+x.got||0}else if(x.acc==k.id)b+=(x.kind=="in"||x.kind=="adj")?+x.amt:-x.amt}return b}
const tot=(to,f)=>S.acc.filter(f||(()=>true)).reduce((s,k)=>s+cv(bal(k),k.cur,to),0);
/* amount of an entry in the view currency, at the rate saved with the entry */
const ca=x=>{const to=V(),c=x.cur||"INR";if(c==to)return +x.amt;const r=+x.fx||fx();return to=="INR"?x.amt*r:x.amt/r};
const sumV=l=>l.reduce((a,x)=>a+ca(x),0);
const mTx=(m,k)=>S.tx.filter(x=>x.kind==k&&x.date.startsWith(m));
const mSum=(m,k)=>sumV(mTx(m,k));
const fixedSet=()=>new Set(String(S.cfg.fixedCats||"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean));
const isFixed=(x,fs)=>!!x.rec||!!(x.link&&(x.link.t=="due"||x.link.t=="loan"))||(fs||fixedSet()).has((x.cat||"").toLowerCase());
const linked=(t,id)=>S.tx.filter(x=>x.link&&x.link.t==t&&x.link.id==id).sort((a,b)=>b.date.localeCompare(a.date));

/* a linked entry changes the thing it is linked to; s=+1 applies it, s=-1 takes it back */
function linkApply(x,s){const L=x.link;if(!L)return;
  if(L.t=="due"){const i=S.dates.find(d=>d.id==L.id);if(!i)return;i.ut=Date.now();if(s>0){if(x.nd)i.date=x.nd;else i.done=true}else{if(x.pd)i.date=x.pd;i.done=false}}
  if(L.t=="loan"){const l=S.loans.find(q=>q.id==L.id);if(!l)return;l.ut=Date.now();
    if(s>0){if(x.lo==null){const o=+l.out||0,r=(+l.rate||0)/1200;x.lo=o?Math.min(o,Math.max(0,l.emi-o*r)):0}l.paid=(+l.paid||0)+1;if(+l.out)l.out=Math.max(0,+l.out-x.lo);if(l.next)l.next=addM(l.next,1)}
    else{l.paid=Math.max(0,(+l.paid||0)-1);if(x.lo)l.out=(+l.out||0)+x.lo;if(l.next)l.next=addM(l.next,-1)}}
  if(L.t=="goal"){const g=S.goals.find(q=>q.id==L.id);if(!g)return;g.ut=Date.now();if(x.gv==null)x.gv=cv(x.amt,x.cur,g.cur);g.saved=Math.max(0,(+g.saved||0)+s*x.gv)}
  if(L.t=="inv"){const n=S.inv.find(q=>q.id==L.id);if(!n)return;n.ut=Date.now();if(x.iv==null)x.iv=cv(x.amt,x.cur,n.cur);
    if(x.kind=="adj"){const val=invVal(n,true);if(x.cap==null)x.cap=val>0?Math.min(+n.inv||0,x.iv*(+n.inv||0)/val):0;
      if(s>0){n.val=Math.max(0,val-x.iv);n.inv=Math.max(0,(+n.inv||0)-x.cap);if(n.val<.005&&n.inv<.005){n.val=0;n.inv=0;n.closed=true}}
      else{n.val=val+x.iv;n.inv=(+n.inv||0)+x.cap;n.closed=false}}
    else{n.inv=Math.max(0,(+n.inv||0)+s*x.iv);if(+n.val)n.val=Math.max(0,+n.val+s*x.iv)}}}
function addTx(o){o.id=o.id||uid();o.ct=o.ct||Date.now();o.ut=o.ut||Date.now();{const w=whoAmI();if(w&&!o.by)o.by=w}o.fx=o.fx||fx();o.amt=+o.amt||0;S.tx.push(o);linkApply(o,1);return o}
function removeTx(id){const x=S.tx.find(q=>q.id==id);if(!x)return null;linkApply(x,-1);trash("tx",id);return x}

/* due dates */
const activeDues=()=>S.dates.filter(i=>!i.done).sort((a,b)=>a.date.localeCompare(b.date));
const dueAt=(i,k)=>{const m=addMon(i.date.slice(0,7),REP[i.rep][1]*k);return m+"-"+p2(Math.min(+i.day||+i.date.slice(8),dim(m)))};
function dueOcc(i,from,to){const st=REP[i.rep][1],out=[];for(let k=0;k<600;k++){const d=k?dueAt(i,k):i.date;if(d>to)break;if(d>=from)out.push(d);if(!st)break}return out}
const nextDue=i=>{if(!REP[i.rep][1])return null;let k=1,nd=dueAt(i,1);while(k<600&&dl(nd)<-400)nd=dueAt(i,++k);return nd};
const payAcc=(pref,cur)=>S.acc.find(k=>k.id==pref)||S.acc.find(k=>k.id==S.cfg.last)||S.acc.find(k=>k.cur==(cur||"INR"))||S.acc[0];
/* mark a due as paid (or an FD as received): logs it in the ledger and moves the date on */
function payDue(id){const i=S.dates.find(d=>d.id==id);if(!i||i.done)return null;const nd=nextDue(i),a=+i.amt||0,fd=i.type=="fd",prev={date:i.date,done:!!i.done};let tx=null;
  if(a){const pa=payAcc(i.pay,i.cur);tx=addTx({kind:fd?"adj":"out",acc:pa.id,amt:cv(a,i.cur,pa.cur),cur:pa.cur,cat:fd?"FD maturity":TYPES[i.type],note:i.name,date:today(),link:{t:"due",id},pd:i.date,nd})}
  else if(nd)i.date=nd;else i.done=true;
  i.ut=Date.now();return {i,nd,tx,prev}}

/* loans */
const loanLeft=l=>Math.max(0,(+l.total||0)-(+l.paid||0));
const loanOut=l=>{const left=loanLeft(l);if(!left)return 0;if(+l.out)return +l.out;const r=(+l.rate||0)/1200;return r?l.emi*(1-Math.pow(1+r,-left))/r:left*l.emi};
function loanOcc(l,from,to){const left=loanLeft(l),out=[],base=l.next||today();for(let k=0;k<left;k++){const d=addM(base,k);if(d>to)break;if(d>=from)out.push(d)}return out}
const loanEnd=l=>{const left=loanLeft(l);return left?addM(l.next||today(),left-1):null};
function payEmi(id){const l=S.loans.find(x=>x.id==id);if(!l||!loanLeft(l))return null;const pa=payAcc(l.acc,l.cur);
  return addTx({kind:"out",acc:pa.id,amt:cv(l.emi,l.cur,pa.cur),cur:pa.cur,cat:"EMI",note:l.name,date:today(),link:{t:"loan",id}})}
/* months needed to clear principal P with payment E at monthly rate r */
const nper=(P,E,r)=>P<=0?0:r?(E>r*P?-Math.log(1-r*P/E)/Math.log(1+r):Infinity):P/E;

/* recurring entries */
function recOcc(r,from,to){const out=[],end=to.slice(0,7);let m=from.slice(0,7);
  for(let k=0;k<60&&m<=end;k++,m=addMon(m,1)){if(m<r.from||(r.last&&m<=r.last))continue;const d=m+"-"+p2(Math.min(+r.day||1,dim(m)));if(d>=from&&d<=to)out.push(d)}return out}
function applyRec(){let ch=false;const t=today(),cm=t.slice(0,7);
  S.rec.forEach(r=>{if(!ac(r.acc).id)return;let m=r.last?addMon(r.last,1):r.from;
    for(let k=0;k<24&&m&&m<=cm;k++){const d=m+"-"+p2(Math.min(+r.day||1,dim(m)));if(d>t)break;
      const id="r_"+r.id+"_"+m,at=D(d).getTime();if(!S.tx.some(x=>x.id==id)&&!S.del.some(x=>x.id==id))addTx({id,ct:at,ut:at,kind:r.kind,acc:r.acc,amt:+r.amt,cur:ac(r.acc).cur,date:d,cat:r.cat,note:r.note||"Recurring",rec:r.id});r.last=m;r.ut=Date.now();ch=true;m=addMon(m,1)}});
  return ch}

/* everything expected between two dates: t = due | fd | emi | rec | recin */
function upcoming(from,to,incOverdue){const L=[];
  S.dates.forEach(i=>{if(i.done)return;const f=incOverdue&&i.date<from?i.date:from;dueOcc(i,f,to).forEach(d=>L.push({d,n:i.name,t:i.type=="fd"?"fd":"due",a:+i.amt||0,c:i.cur,id:i.id}))});
  S.loans.forEach(l=>{const f=incOverdue&&l.next&&l.next<from?l.next:from;loanOcc(l,f,to).forEach(d=>L.push({d,n:"EMI: "+l.name,t:"emi",a:+l.emi||0,c:l.cur,id:l.id}))});
  S.rec.forEach(r=>recOcc(r,from,to).forEach(d=>L.push({d,n:r.cat||r.note||"Recurring",t:r.kind=="in"?"recin":"rec",a:+r.amt||0,c:ac(r.acc).cur,id:r.id})));
  return L.sort((a,b)=>a.d.localeCompare(b.d))}

/* investments and net worth */
const invVal=(x,any)=>x.closed&&!any?0:(+x.val||+x.inv||0);
const fdEst=x=>{if(!(+x.rt&&x.sd&&x.mdate&&+x.inv))return 0;const y=(D(x.mdate)-D(x.sd))/31557600000;return y>0?x.inv*Math.pow(1+x.rt/400,4*y):0};
function invRet(x){const i=+x.inv||0,val=invVal(x);if(!i)return {abs:null,yr:null};let yr=null;if(x.sd){const y=(Date.now()-D(x.sd))/31557600000;if(y>=.25&&val>0)yr=(Math.pow(val/i,1/y)-1)*100}return {abs:(val/i-1)*100,yr}}
function nwParts(to){return {acc:tot(to),inv:S.inv.reduce((s,x)=>s+cv(invVal(x),x.cur,to),0),goal:S.goals.reduce((s,g)=>s+cv(+g.saved||0,g.cur,to),0),loan:S.loans.reduce((s,l)=>s+cv(loanOut(l),l.cur,to),0)}}
const nwv=to=>{const p=nwParts(to||"INR");return p.acc+p.inv+p.goal-p.loan};
function snapNW(){S.nw[today()]=Math.round(nwv("INR"));Object.keys(S.nw).sort().slice(0,-120).forEach(k=>delete S.nw[k])}

/* cross-currency transfers */
function remits(){return S.tx.filter(x=>x.kind=="tr"&&ac(x.acc).cur!=ac(x.to).cur&&+x.amt&&+x.got).map(x=>{const q=ac(x.acc).cur=="QAR";return {x,qar:q?+x.amt:+x.got,inr:q?+x.got:+x.amt,rate:q?x.got/x.amt:x.amt/x.got}}).sort((a,b)=>a.x.date.localeCompare(b.x.date))}
