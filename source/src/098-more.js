/* ===== documents, recurring costs, family view, streaks, reports to keep ===== */
const DOCT=["Passport","Qatar ID","Visa","Driving licence","Insurance card","Warranty","Bill or receipt","Other"];
const docLeft=d=>d.exp?dl(d.exp):null;
function docsHtml(){const L=[...S.docs].sort((a,b)=>(a.exp||"9999").localeCompare(b.exp||"9999"));
  return `<h2>Documents and warranties</h2>${L.length?L.map(d=>{const n=docLeft(d);return `<div class="row ${n===null?"":n<0?"late":n<=30?"soon":""}" data-act="editDoc" data-id="${d.id}"><div><b>${esc(d.name)}</b><small>${esc(d.type||"Document")}${d.no?" · "+esc(d.no):""}${d.exp?" · expires "+fmt(d.exp):""}${d.att&&d.att.length?" · "+d.att.length+(d.att.length==1?" file":" files"):""}</small></div>${n===null?"":`<span class="chip">${n<0?"Expired":when(n)}</span>`}</div>`}).join(""):`<div class="empty">Keep your passport, Qatar ID, warranties and bills here, with a reminder before they expire.</div>`}<div class="acts"><button class="btn ghost" data-act="addDoc">+ Add document</button></div>`}
function docForm(d){attInit(d&&d.att);d=d||null;sheet(`<h2>${d?"Edit document":"New document"}</h2>${F("f_name","Name",d?d.name:"","text",'placeholder="My passport, fridge warranty"')}<div class="two"><div>${SEL("f_type","Type",DOCT.map(x=>[x,x]),d?d.type:"Passport")}</div><div>${F("f_exp","Expiry date (optional)",d?d.exp:"","date")}</div></div>${F("f_no","Number (optional)",d?d.no:"")}${F("f_note","Note (optional)",d?d.note:"")}${attHtml()}<p class="note">You get a reminder on Home 30 days before the expiry date.</p>${stampNote(d)}${btns("saveDoc",d&&d.id,"delDoc")}`)}
const docAlerts=()=>S.docs.filter(d=>d.exp&&dl(d.exp)<=(+d.rem||30)).map(d=>[dl(d.exp),d.name+" · "+(dl(d.exp)<0?"expired "+fmt(d.exp):"expires "+when(dl(d.exp)).toLowerCase()),""]);

/* who added an entry (when sync is signed in) */
const byName=e=>String(e||"").split("@")[0];
const byTag=x=>x.by&&S.tx.some(q=>q.by&&q.by!=x.by)?" · by "+esc(byName(x.by)):"";

/* days with no everyday spending */
function streaks(){const spent=new Set(S.tx.filter(x=>x.kind=="out"&&!x.rec&&!x.link).map(x=>x.date)),first=S.tx.reduce((m,x)=>x.date<m?x.date:m,today()),t=today();
  let cur=0;for(let i=0;i<400;i++){const d=plus(-i);if(d<first)break;if(spent.has(d))break;cur++}
  let best=0,run=0;for(let i=89;i>=0;i--){const d=plus(-i);if(d<first)continue;if(spent.has(d))run=0;else{run++;best=Math.max(best,run)}}
  const cm=t.slice(0,7);let mdays=0;for(let k=1;k<=+t.slice(8);k++){const d=cm+"-"+p2(k);if(d>=first&&!spent.has(d))mdays++}
  return {cur,best,mdays}}
function recurringCosts(){const L=[];subAct().forEach(x=>{if(subMon(x))L.push([x.name,subMon(x)*12])});S.rec.filter(r=>r.kind=="out").forEach(r=>L.push([r.cat||r.note||"Recurring",iv(r.amt,ac(r.acc).cur)*12]));
  activeDues().forEach(i=>{const st=REP[i.rep][1];if(st&&i.type!="fd"&&+i.amt)L.push([i.name,iv(i.amt,i.cur)*12/st])});
  S.loans.filter(loanLeft).forEach(l=>L.push(["EMI: "+l.name,iv(l.emi,l.cur)*Math.min(12,loanLeft(l))]));return L.sort((a,b)=>b[1]-a[1])}
function moreRep(m){let h="";const RC=recurringCosts(),st=streaks(),ch=S.cfg.chal,sv=mSum(today().slice(0,7),"save");
  if(RC.length){const tot=RC.reduce((s,x)=>s+x[1],0);h+=`<h2>Subscriptions and fixed payments</h2><div class="card"><div class="hbl"><span>Next 12 months</span><b>${fmr(tot)}</b></div><small style="color:var(--mute)">About ${fmr(tot/12)} a month</small><div style="height:8px"></div>${hbars(RC.slice(0,12),fmr)}</div>`}
  const by={};mTx(m,"out").forEach(x=>{if(x.by)by[byName(x.by)]=(by[byName(x.by)]||0)+ca(x)});
  if(Object.keys(by).length>1)h+=`<h2>Spending by person</h2><div class="card">${hbars(Object.entries(by).sort((a,b)=>b[1]-a[1]))}<p class="note" style="margin-top:6px">Shows who added each entry while sync was signed in.</p></div>`;
  h+=`<h2>Streaks and challenge</h2><div class="card"><div class="stats" style="margin:0 0 8px">${tile("No-spend streak",st.cur+(st.cur==1?" day":" days"))}${tile("Best in 90 days",st.best+(st.best==1?" day":" days"))}${tile("This month",st.mdays+" no-spend")}</div><p class="note" style="margin:0 0 6px">A no-spend day has no everyday spending. Dues, EMIs and recurring entries don’t count.</p>
  ${ch?`<div class="hbl"><span>Savings challenge for ${mlab(today().slice(0,7))}</span><b>${fmr(sv)} of ${fmr(ch)}</b></div><div class="hbt"><i style="width:${pct(sv,ch)}%;background:var(--pri)"></i></div><small style="color:var(--mute)">${sv>=ch?"Reached. Well done.":fmr(ch-sv)+" to go, from Saved entries this month."}</small>`:""}
  <div class="two">${`<div>${F("f_chal","Savings target this month",ch||"","number")}</div><div style="display:flex;align-items:flex-end"><button class="btn ghost" style="width:100%" data-act="setChal">Set challenge</button></div>`}</div></div>
  <h2>Reports to keep</h2><div class="card"><div class="acts" style="margin-top:0"><button class="btn" data-act="pdfMonth">Monthly report (PDF)</button><button class="btn ghost" data-act="yearView">Year in review</button></div><p class="note" style="margin-top:8px">The PDF covers ${mlong(m)}. It uses plain letters, so ₹ shows as INR and names in other scripts may not print.</p></div>`;
  return h}

/* a small text-only PDF writer (A4, Helvetica) */
const asc=s=>String(s).replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/₹/g,"INR ").replace(/[−–—]/g,"-").replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/·/g,"-").replace(/›/g,">").replace(/[^\x20-\x7E]/g,"?");
function mkPdf(lines){const pe=s=>asc(s).replace(/[\\()]/g,"\\$&"),pages=[];let y=800,cur=[];
  const wrap=(t,size)=>{const max=Math.floor(495/(size*0.5)),out=[];let s=asc(t);while(s.length>max){let k=s.lastIndexOf(" ",max);if(k<10)k=max;out.push(s.slice(0,k));s=s.slice(k).trim()}out.push(s);return out};
  lines.forEach(([t,size,bold,gap])=>{size=size||11;y-=gap||0;wrap(t,size).forEach(w=>{const h=size*1.5;if(y-h<50){pages.push(cur);cur=[];y=800}y-=h;cur.push(`BT /F${bold?2:1} ${size} Tf 50 ${y.toFixed(1)} Td (${pe(w)}) Tj ET`)})});pages.push(cur);
  const obj=[];obj[1]="<< /Type /Catalog /Pages 2 0 R >>";obj[3]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";obj[4]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";const kids=[];
  pages.forEach((p,i)=>{const pn=5+i*2,cn=pn+1,st=p.join("\n");kids.push(pn+" 0 R");obj[pn]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cn} 0 R >>`;obj[cn]=`<< /Length ${st.length} >>\nstream\n${st}\nendstream`});
  obj[2]=`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;
  let out="%PDF-1.4\n";const off=[];for(let i=1;i<obj.length;i++){off[i]=out.length;out+=`${i} 0 obj\n${obj[i]}\nendobj\n`}
  const x=out.length;out+=`xref\n0 ${obj.length}\n0000000000 65535 f \n`+off.slice(1).map(o=>String(o).padStart(10,"0")+" 00000 n \n").join("")+`trailer\n<< /Size ${obj.length} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;return out}
function monthPdf(m){const R=rep(m),L=[["Personal Diary report",20,1],[mlong(m)+" - amounts in "+V()+" - made on "+fmt(today()),10,0],["Summary",14,1,14]];
  summary(m).forEach(s=>L.push([s,11]));
  L.push(["Totals",14,1,14],["Spent: "+fmr(R.out.cur)+"    Last month: "+fmr(R.out.prev),11],["Income: "+fmr(R.in.cur)+"    Last month: "+fmr(R.in.prev),11],["Saved: "+fmr(R.save.cur)+"    Last month: "+fmr(R.save.prev),11],["Savings rate: "+(R.rate.cur==null?"not available":Math.round(R.rate.cur)+"%"),11]);
  const C=catTotals(m);if(C.length){L.push(["Spending by category",14,1,14]);C.slice(0,15).forEach(c=>L.push([c[0]+": "+fmr(c[1])+" ("+Math.round(c[1]/(R.out.cur||1)*100)+"%)",11]))}
  const B=budUse(m);if(B.length){L.push(["Budgets",14,1,14]);B.forEach(u=>L.push([u.b.cat+": "+fmx(Math.round(u.s),u.b.cur)+" of "+fmx(u.b.lim,u.b.cur)+" ("+u.p+"%)",11]))}
  L.push(["Accounts",14,1,14]);S.acc.forEach(k=>L.push([k.name+": "+fmx(Math.round(bal(k)),k.cur),11]));L.push(["Net worth: "+fmr(nwv(V())),11,1]);
  const U=upcoming(today(),plus(30),true).filter(u=>u.t=="due"||u.t=="emi");if(U.length){L.push(["Due in the next 30 days",14,1,14]);U.slice(0,25).forEach(u=>L.push([fmt(u.d)+" - "+u.n+(u.a?" - "+fmx(u.a,u.c):""),11]))}
  const E=mTx(m,"out").sort((a,b)=>ca(b)-ca(a)).slice(0,15);if(E.length){L.push(["Largest expenses",14,1,14]);E.forEach(x=>L.push([fmt(x.date)+" - "+(x.cat||"Other")+(x.payee?" - "+x.payee:"")+" - "+fmr(ca(x)),11]))}
  L.push(["Figures come from the entries in the app and may not match bank statements exactly.",9,0,16]);return mkPdf(L)}
function yearData(y){const ms=[...Array(12)].map((_,i)=>y+"-"+p2(i+1)),T=S.tx.filter(x=>x.date.startsWith(y)),out=T.filter(x=>x.kind=="out"),sp=sumV(out),inc=sumV(T.filter(x=>x.kind=="in")),sv=sumV(T.filter(x=>x.kind=="save")),by={};
  out.forEach(x=>{const c=x.cat||"Uncategorised";by[c]=(by[c]||0)+ca(x)});const pm=ms.map(m=>({m,v:mSum(m,"out")})).filter(x=>x.v>0),RM=remits().filter(r=>r.x.date.startsWith(y)),nk=Object.keys(S.nw).filter(k=>k.startsWith(y)).sort(),spent=new Set(out.filter(x=>!x.rec&&!x.link).map(x=>x.date));
  let days=0;const end=y==today().slice(0,4)?today():y+"-12-31",first=T.reduce((m,x)=>x.date<m?x.date:m,end);for(let d=first;d<=end;d=iso(new Date(D(d).getTime()+864e5+36e5)))if(!spent.has(d))days++;
  return {sp,inc,sv,n:T.length,rate:inc?(inc-sp)/inc*100:null,cats:Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,5),big:[...out].sort((a,b)=>ca(b)-ca(a))[0],hi:pm.length?pm.reduce((a,b)=>b.v>a.v?b:a):null,lo:pm.length?pm.reduce((a,b)=>b.v<a.v?b:a):null,ms:ms.map(m=>({l:mlab(m).slice(0,1),v:mSum(m,"out")})),
    qar:RM.reduce((s,r)=>s+r.qar,0),inr:RM.reduce((s,r)=>s+r.inr,0),paid:T.filter(x=>x.link&&(x.link.t=="due"||x.link.t=="loan")).length,nw:nk.length>1?S.nw[nk[nk.length-1]]-S.nw[nk[0]]:null,days}}
let yv="";
function yearSheet(){yv=yv||today().slice(0,4);const Y=yearData(yv);
  sheet(`<h2>Your ${yv} in review</h2><div class="mon" style="margin:0 0 8px"><button class="btn ghost sm" data-act="yv" data-id="-1">‹ ${+yv-1}</button><span class="note">${Y.n} entries</span><button class="btn ghost sm" data-act="yv" data-id="1">${+yv+1} ›</button></div>`+
  (Y.n?`<div class="stats">${tile("Spent",fmr(Y.sp))}${tile("Income",fmr(Y.inc))}${tile("Saved",fmr(Y.sv))}</div><div class="stats" style="grid-template-columns:1fr 1fr">${tile("Savings rate",Y.rate==null?"–":Math.round(Y.rate)+"%")}${tile("No-spend days",Y.days)}${tile("Dues and EMIs paid",Y.paid)}${tile("Net worth change",Y.nw==null?"–":(Y.nw>=0?"+":"")+fmr(iv(Y.nw,"INR")))}</div>
  <h3>Spending by month</h3>${bars(Y.ms,["v"],["var(--pri)"])}${Y.hi?`<p class="note">Highest: ${mlong(Y.hi.m)} (${fmr(Y.hi.v)}). Lowest: ${mlong(Y.lo.m)} (${fmr(Y.lo.v)}).</p>`:""}
  ${Y.cats.length?`<h3>Top categories</h3>${hbars(Y.cats,fmr)}`:""}${Y.big?`<h3>Biggest expense</h3><div class="hbl"><span>${esc(Y.big.cat||"Other")}${Y.big.payee?" · "+esc(Y.big.payee):""} · ${fmt(Y.big.date)}</span><b>${fmr(ca(Y.big))}</b></div>`:""}
  ${Y.qar?`<h3>Sent between QAR and INR</h3><div class="hbl"><span>QAR ${nf(Y.qar)} ↔ ${inr(Math.round(Y.inr))}</span><b>₹${(Y.inr/Y.qar).toFixed(2)} avg</b></div>`:""}`:`<div class="empty">No entries in ${yv}.</div>`))}

Object.assign(ACT,{
  addDoc(){docForm()},
  editDoc(id){docForm(S.docs.find(d=>d.id==id))},
  saveDoc(id){const n=v("f_name").trim();if(!n)return toast("Add a name");const old=S.docs.find(d=>d.id==id);put("docs",stamp({...(old||{}),id:id||uid(),name:n,type:v("f_type"),exp:v("f_exp"),no:v("f_no").trim(),note:v("f_note").trim(),att:[...pend]},old));attDone(true);done()},
  delDoc(id){attDone(false);trash("docs",id);done();undoDel(id,"Document deleted")},
  setChal(){S.cfg.chal=+v("f_chal")||0;save();render();toast(S.cfg.chal?"Challenge set":"Challenge cleared")},
  pdfMonth(){return saveFile("personal-diary-"+mon+".pdf",monthPdf(mon),"application/pdf")},
  yearView(){yv=mon.slice(0,4);yearSheet()},
  yv(id){yv=String(+yv+(+id));yearSheet()}
});
