/* ===== Version 32.5: import a scheme statement (SSY, PPF, RD): deposits, the bank's interest and balance, the opening date ===== */
const SA_INT=/\binterest\b|\bint\.?\s*(?:cr|credit|pd|paid|cap|capitali[sz]ed|added|on)\b|\bby int\b|int\.cr|\bint\s*\d{4}/i;
let saImpP=null;
function saImpForm(id){const x=S.sacc.find(q=>q.id==id);if(!x)return;saImpP={id};
  sheet(`<h2>Import statement</h2><p class="sub">${esc(x.name)} · ${esc(SAT[x.type])}${x.no?" · "+esc(x.no):""}</p>
  <p class="note">Choose the account statement from ${esc(x.po||"the bank or post office")}: the PDF or CSV you download from its app or website. The app reads the deposits, the interest the bank added and the balance, so its figures match the bank. Importing the same statement again adds nothing twice.</p>
  <label for="f_safile">Statement file</label><input id="f_safile" type="file" accept=".pdf,.csv,application/pdf,text/csv" data-safile="${id}"><div id="saout"></div>`)}
document.addEventListener("change",e=>{const t=e.target;if(!t||!t.dataset||!t.dataset.safile||!t.files||!t.files[0])return;saImpFile(t.dataset.safile,t.files[0])});
async function saImpFile(id,f,pw){const o=$("#saout");if(!o)return;o.innerHTML=`<p class="note">Reading the statement…</p>`;saImpP={id,file:f};
  try{let P;if(/\.csv$/i.test(f.name||"")||/csv/.test(f.type||""))P=saCsv(await f.text());else{const L=await pdfLines(await f.arrayBuffer(),pw);P=stmtParse(L);P.text=L.filter(l=>(l.p||1)==1).slice(0,40).map(l=>l.t).join(" ")}
    saImpLoad(id,P)}
  catch(e){const k=pdfErr(e);if(k){o.innerHTML=`<div class="card" style="margin-top:10px"><b>${k=="wrong"?"That password didn’t work":"This statement has a password"}</b><p class="note">For SBI it is often the last 5 digits of your registered mobile number followed by your date of birth (DDMMYY). Check the email the statement came with.</p>${F("f_sapw","PDF password","","password",'autocomplete="off"')}<div class="acts"><button class="btn" data-act="saImpPw" data-id="${id}">Open</button></div></div>`;return}
    o.innerHTML=`<p class="note" style="color:var(--late)">${esc(e.message||e)}</p>`}}
function saImpLoad(id,P){const o=$("#saout"),x=S.sacc.find(q=>q.id==id);if(!o||!x)return;
  if(!P.rows.length){o.innerHTML=`<p class="note" style="color:var(--late)">No transactions found in this file. A scanned page or a photo of the passbook can’t be read; download the statement from the bank’s app or website instead.</p>`;return}
  saImpP={id,P,Q:saImpPlan(x,P)};saImpShow()}
/* CSV statements: date, description, debit / credit or amount, balance */
function saCsv(t){const R=csvRows(t),fi=(h,re)=>h.findIndex(x=>re.test(x));let hi=-1,H=null;
  for(let i=0;i<Math.min(R.length,40);i++){const h=R[i].map(x=>String(x).toLowerCase().trim());if(fi(h,/date/)>=0&&fi(h,/amount|debit|withdraw|credit|deposit/)>=0){hi=i;H=h;break}}
  if(hi<0)throw new Error("Couldn’t find the date and amount columns in that file");
  const cD=fi(H,/date/),cT=fi(H,/narration|description|details|particular|remark/),cDr=fi(H,/debit|withdraw|\bdr\b/),cCr=fi(H,/credit|deposit|\bcr\b/),cA=fi(H,/^amount|amount$|\bamt\b/),cB=fi(H,/balance/),rows=[];let open=null;
  for(let i=hi+1;i<R.length;i++){const r=R[i];if(!r||r.every(x=>!String(x).trim()))continue;const line=r.join(" ");
    if(/opening balance|balance b\/f|brought forward/i.test(line)&&cB>=0&&String(r[cB]||"").trim()){open=num(r[cB]);continue}
    const date=pDate(String(r[cD]||"").trim());let amt=0,dir="in";
    if(cDr>=0&&num(r[cDr])){amt=Math.abs(num(r[cDr]));dir="out"}else if(cCr>=0&&num(r[cCr])){amt=Math.abs(num(r[cCr]));dir="in"}else if(cA>=0&&num(r[cA])){const n=num(r[cA]);amt=Math.abs(n);dir=n<0?"out":"in"}
    if(!date||!amt)continue;rows.push({date,dir,amt,desc:String(cT>=0?r[cT]:"").replace(/\s+/g," ").trim(),bal:cB>=0&&String(r[cB]||"").trim()?num(r[cB]):null,sv:dir=="out"?-amt:amt,dr:dir=="out",cr:dir=="in",parts:[]})}
  const o=stmtOrder(rows,open);o.text=R.slice(0,hi).map(r=>r.join(" ")).join(" ");return o}
/* what the statement means for this scheme account */
function saImpPlan(x,P){const have=deps(x),used=new Set(),dep=[],ints=[],wd=[],from=P.period&&P.period.from||P.rows[0].date,to=P.period&&P.period.to||P.rows[P.rows.length-1].date;
  P.rows.forEach(r=>{if(r.dir=="in"&&SA_INT.test(r.desc||"")){ints.push(r);return}const sgn=r.dir=="in"?1:-1,near=d=>!used.has(d.id)&&Math.abs(dl(d.d)-dl(r.date))<=3;
    const m=have.find(d=>near(d)&&Math.abs(+d.a-sgn*r.amt)<0.01);if(m){used.add(m.id);(r.dir=="in"?dep:wd).push({...r,have:true});return}
    /* saved the other way round by an earlier import: put it right */
    const f=have.find(d=>near(d)&&Math.abs(+d.a+sgn*r.amt)<0.01);if(f){used.add(f.id);(r.dir=="in"?dep:wd).push({...r,have:true,flipId:f.id});return}
    (r.dir=="in"?dep:wd).push({...r,have:false})});
  /* opening date: printed in the header, or the first deposit when the statement starts at zero */
  const T=String(P.text||""),DT="(\\d{1,2}[-\\/. ](?:\\d{1,2}|[A-Za-z]{3,9})[-\\/. ]\\d{2,4}|\\d{4}-\\d\\d-\\d\\d)",om=T.match(new RegExp("(?:open(?:ing)?\\s*date|date\\s*of\\s*(?:a\\/c\\s*|account\\s*)?opening|opened\\s*on)\\s*:?\\s*"+DT,"i"));
  const hdrOpen=om?pDate(om[1].replace(/\s+/g,"-")):"";let open=hdrOpen,guess=false;if(!open&&P.rows.length&&P.rows[0].date<x.open){open=P.rows[0].date;guess=!(P.open==null||P.open<0.01)}
  const openD=open||x.open;if(open&&open==x.open)open="";
  /* money already there when the statement starts: before the first 31 March it can only be deposits, so it is the opening deposit */
  const sb=P.open!=null&&P.open>0.004?Math.round(P.open*100)/100:0,mar31=d=>{const y=+d.slice(0,4);return (d.slice(5)>="03-31"?y:y-1)+"-03-31"},
    noIntYet=sb&&openD&&openD<from&&mar31(from)<openD,firstDep=noIntYet&&!have.some(d=>d.d<from&&!used.has(d.id)&&Math.abs(+d.a-sb)>0.01)?{date:openD,amt:sb,have:have.some(d=>Math.abs(dl(d.d)-dl(openD))<=3&&Math.abs(+d.a-sb)<0.01)}:null;
  /* the bank's balance right after its last 31 March interest: an interest line, or the balance brought into a statement that starts on 1 April */
  let own=null;if(x.type!="rd"){const I=[...ints].reverse().find(r=>r.bal!=null&&/-(?:03-(?:2[5-9]|3[01])|04-0[1-5])$/.test(r.date));
    if(I){const same=P.rows.filter(r=>r.date==I.date&&r.bal!=null);own={d:I.date,bal:Math.round(((same.length?same[same.length-1]:I).bal)*100)/100,why:"int"}}
    const st=sb&&P.period?iso(new Date(D(P.period.from).getTime()-864e5)):"";if(st&&!firstDep&&(!own||st>own.d))own={d:st,bal:sb,why:st.slice(5)=="03-31"?"int":"open"};
    if(!own&&sb&&!firstDep)own={d:iso(new Date(D(P.rows[0].date).getTime()-864e5)),bal:sb,why:"open"}}
  /* the bank's balance on a date, as this statement shows it */
  const balOn=d=>{if(d<from||d>to)return null;const L=P.rows.filter(r=>r.bal!=null&&r.date<=d);return L.length?L[L.length-1].bal:P.open};
  /* an older statement never replaces a newer bank balance, unless that one came from an import this statement shows to be wrong */
  const wrong=!!(x.fix&&x.fix.d&&x.fix.src=="stmt"&&balOn(x.fix.d)!=null&&Math.abs(balOn(x.fix.d)-x.fix.bal)>0.5);
  const fix=own&&(!x.fix||!x.fix.d||own.d>=x.fix.d||wrong)?own:null;
  /* is it this account? */
  const no=String(x.no||"").replace(/\D/g,""),digits=T.replace(/[^\d]/g," "),mis=no.length>=6&&/\d{9,}/.test(digits)&&!T.replace(/\s/g,"").includes(no.slice(-6));
  /* years the bank has finished: deposits, interest and the balance after interest */
  const hist={};P.rows.forEach(r=>{const fy=fyLabel(r.date),h=hist[fy]=hist[fy]||{fy,dep:0,int:0,close:null};if(r.dir=="in"&&SA_INT.test(r.desc||""))h.int+=r.amt;else h.dep+=r.dir=="in"?r.amt:-r.amt;if(r.bal!=null)h.close=r.bal});
  const H=Object.values(hist).filter(h=>own&&own.why=="int"&&h.close!=null&&ints.length&&(+h.fy.slice(0,4)+1)+"-03-31"<=own.d).map(h=>({...h,dep:Math.round(h.dep*100)/100,int:Math.round(h.int*100)/100,close:Math.round(h.close*100)/100}));
  return {dep,ints,wd,fix,wrong,open,guess,mis,hist:H,from,to,first:P.rows[0].date,close:P.close!=null?P.close:P.sumClose,startBal:sb,firstDep,flips:[...dep,...wd].filter(r=>r.flipId).length}}
function saImpShow(){const p=saImpP,o=$("#saout");if(!o||!p||!p.Q)return;const x=S.sacc.find(q=>q.id==p.id),Q=p.Q,nw=Q.dep.filter(r=>!r.have),nwW=Q.wd.filter(r=>!r.have),sum=a=>a.reduce((s,r)=>s+r.amt,0);
  const newOpen=Q.open&&Q.open!=x.open?Q.open:"",mat=newOpen?saMature({...x,open:newOpen}):"",fd=Q.firstDep&&!Q.firstDep.have?Q.firstDep:null;
  o.innerHTML=`${Q.mis?`<div class="card" style="margin-top:10px;border-color:var(--late)"><b>This may be another account</b><p class="note" style="margin:4px 0 0">The statement doesn’t show ${esc(x.no)}. Check it’s the statement for ${esc(x.name)}.</p></div>`:""}
  <div class="card" style="margin-top:10px"><b>${fmt(Q.from)} to ${fmt(Q.to)}</b>
    ${Q.startBal?`<p class="note" style="margin:4px 0 0">Balance at the start: ${inr(Q.startBal)}</p>`:""}
    <p class="note" style="margin:2px 0 0">Deposits: ${Q.dep.length} · ${inr(sum(Q.dep))}${Q.dep.length?` (${nw.length} new, ${Q.dep.length-nw.length} already in the app)`:""}</p>
    ${Q.ints.length?`<p class="note" style="margin:2px 0 0">Interest added by the bank: ${inr(sum(Q.ints))} (${Q.ints.map(r=>fmt(r.date)).slice(-3).join(", ")})</p>`:""}
    ${Q.wd.length?`<p class="note" style="margin:2px 0 0">Withdrawals: ${Q.wd.length} · ${inr(sum(Q.wd))}</p>`:""}
    ${Q.close!=null?`<p class="note" style="margin:2px 0 0">Balance at the end: <b>${inr(Q.close)}</b></p>`:""}</div>
  ${Q.flips?`<div class="card" style="margin-top:10px;border-color:var(--soon)"><b>${Q.flips} ${Q.flips==1?"entry was":"entries were"} saved the wrong way round</b><p class="note" style="margin:4px 0 0">An earlier import read ${Q.flips==1?"this deposit":"these deposits"} as money taken out. Importing puts ${Q.flips==1?"it":"them"} right.</p></div>`:""}
  ${nw.length||nwW.length||fd?`<label class="hbl" style="margin:10px 0;gap:8px;justify-content:flex-start;align-items:flex-start"><input type="checkbox" id="sa_dep" checked style="width:auto;margin-top:3px"><span>Add ${nw.length+(fd?1:0)} ${nw.length+(fd?1:0)==1?"deposit":"deposits"} (${inr(sum(nw)+(fd?fd.amt:0))})${nwW.length?` and ${nwW.length} ${nwW.length==1?"withdrawal":"withdrawals"}`:""}${fd?`<small style="display:block;color:var(--mute)">Including the opening deposit of ${inr(fd.amt)} on ${fmt(fd.date)}: the money already in the account when the statement starts, before any interest was added.</small>`:""}</span></label>
    <details><summary>See them</summary>${[...(fd?[{date:fd.date,amt:fd.amt,dir:"in",desc:"Opening deposit"}]:[]),...nw,...nwW].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,120).map(r=>`<div class="hbl" style="margin:4px 0"><span>${fmt(r.date)}<small style="display:block;color:var(--mute)">${esc((r.desc||"").slice(0,48))}</small></span><b>${r.dir=="out"?"−":""}${inr(r.amt)}</b></div>`).join("")}</details>`:Q.flips?"":`<p class="note">All the deposits in this statement are already in the app.</p>`}
  ${Q.fix?`<label class="hbl" style="margin:10px 0;gap:8px;justify-content:flex-start;align-items:flex-start"><input type="checkbox" id="sa_fix" checked style="width:auto;margin-top:3px"><span>Start from the bank’s balance: ${inr(Q.fix.bal)} on ${fmt(Q.fix.d)}<small style="display:block;color:var(--mute)">${Q.fix.why=="int"?"Right after the bank added the year’s interest. The app adds this year’s interest from there, so its figures match the bank.":"The statement’s opening balance. The app calculates from there."}${Q.wrong?` This replaces ${inr(x.fix.bal)} on ${fmt(x.fix.d)}, which an earlier import got wrong.`:""}</small></span></label>`:""}
  ${newOpen?`<label class="hbl" style="margin:10px 0;gap:8px;justify-content:flex-start;align-items:flex-start"><input type="checkbox" id="sa_open" checked style="width:auto;margin-top:3px"><span>Opening date: ${fmt(newOpen)}<small style="display:block;color:var(--mute)">The app has ${fmt(x.open)}. With ${fmt(newOpen)}, it matures on ${fmt(mat)}${x.type=="ssy"?" and takes deposits until "+fmt(saDepEnd({...x,open:newOpen})):""}.${Q.guess?" This is the statement’s first entry; if the account is older, change it in Edit account.":""}</small></span></label>`:""}
  <div class="acts"><button class="btn" data-act="saImpGo" data-id="${x.id}">Import</button></div>`}
/* the bank's finished years in Year by year, before the years the app works out */
{const _si=saInfoSheet;saInfoSheet=function(id){_si(id);try{const x=S.sacc.find(q=>q.id==id);if(!x)return;
  const a=$('#over [data-act="saPast"]');if(a&&!$('#over [data-act="saImp"]'))a.insertAdjacentHTML("afterend",`<button class="btn ghost" data-act="saImp" data-id="${id}">Import statement</button>`);
  let H=[...(x.hist||[])];if(x.fix&&x.fix.d&&x.fix.d.slice(5)=="03-31"){const fy=fyLabel(x.fix.d);if(!H.some(h=>h.fy==fy)){const fs=(+x.fix.d.slice(0,4)-1)+"-04-01",dep=deps(x).filter(d=>d.d>=fs&&d.d<=x.fix.d).reduce((s,d)=>s+ +d.a,0),pv=H.find(h=>h.fy==fyLabel(addM(x.fix.d,-12))),prev=pv?pv.close:x.open>=fs?0:null;
    if(prev!=null){const it=Math.round((x.fix.bal-prev-dep)*100)/100;if(it>=0)H.push({fy,dep,int:it,close:x.fix.bal})}}}
  const tb=$("#over table.tbl");if(tb&&H.length){const have=new Set([...tb.querySelectorAll("tr td:first-child")].map(td=>td.textContent.trim())),hd=tb.querySelector("tr");
    H.filter(h=>!have.has(h.fy)).sort((a,b)=>b.fy.localeCompare(a.fy)).forEach(h=>hd.insertAdjacentHTML("afterend",`<tr><td>${h.fy}</td><td>${inr(h.dep)}</td><td>${inr(h.int)}</td><td>${inr(h.close)}</td></tr>`));
    tb.insertAdjacentHTML("afterend",`<p class="note">Years up to ${fmt(x.fix&&x.fix.d||H[H.length-1].fy)} are from the bank statement.</p>`)}}catch(e){console.warn(e)}}}
Object.assign(ACT,{
  saImp(id){saImpForm(id)},
  saImpPw(id){const f=saImpP&&saImpP.file;if(!f)return;saImpFile(id,f,v("f_sapw"))},
  saImpGo(id){const p=saImpP,x=S.sacc.find(q=>q.id==id);if(!p||!p.Q||!x)return;const Q=p.Q,chk=k=>{const e=$("#"+k);return !!e&&e.checked};let n=0,w=0,f=0;
    x.dep=x.dep||[];
    /* entries an earlier import saved the wrong way round */
    [...Q.dep,...Q.wd].filter(r=>r.flipId).forEach(r=>{const d=x.dep.find(q=>q.id==r.flipId);if(!d)return;d.a=r.dir=="in"?r.amt:-r.amt;if(r.dir=="in")delete d.w;else d.w=1;f++});
    if(chk("sa_dep")){if(Q.firstDep&&!Q.firstDep.have){x.dep.push({id:uid(),d:Q.firstDep.date,a:Q.firstDep.amt,src:"stmt",first:1});n++}
      Q.dep.filter(r=>!r.have).forEach(r=>{x.dep.push({id:uid(),d:r.date,a:r.amt,src:"stmt"});n++});Q.wd.filter(r=>!r.have).forEach(r=>{x.dep.push({id:uid(),d:r.date,a:-r.amt,w:1,src:"stmt"});w++})}
    if(Q.fix&&chk("sa_fix"))x.fix={d:Q.fix.d,bal:Q.fix.bal,src:"stmt"};
    if(Q.hist.length&&x.fix&&x.fix.d){const M={};(x.hist||[]).forEach(h=>M[h.fy]=h);Q.hist.filter(h=>(+h.fy.slice(0,4)+1)+"-03-31"<=x.fix.d).forEach(h=>M[h.fy]=h);x.hist=Object.values(M).sort((a,b)=>a.fy.localeCompare(b.fy))}
    /* money already in the account when the statement starts, which the deposits don't explain */
    {const earlier=deps(x).some(d=>d.d<Q.from);if(Q.startBal&&!Q.firstDep){if(!earlier&&(!x.base||x.base.d>Q.from))x.base={d:Q.from,bal:Q.startBal}}else if(x.base&&Q.from<=x.base.d)delete x.base;
      /* deposits going back to the opening explain everything */
      const L=deps(x),op=Q.open&&chk("sa_open")?Q.open:x.open,gap=L.length?dl(L[0].d)-dl(op):99;if(x.base&&L.some(d=>d.d<x.base.d)&&gap>=0&&gap<=31)delete x.base}
    if(Q.open&&chk("sa_open")){x.open=Q.open;if(x.plan&&x.plan.f)x.plan.md=Q.open.slice(5,7)+"-"+p2(Math.min(28,+x.plan.day||5))}
    x.ut=Date.now();put("sacc",x);save();render();saInfoSheet(id);toast(`Imported: ${n} ${n==1?"deposit":"deposits"}${w?", "+w+" withdrawals":""}${f?", "+f+" put right":""}${x.fix&&x.fix.src=="stmt"?" · balance from the bank":""}`)}
});
{const g=GUIDE.find(g=>g[0]=="Wealth and plans");if(g)g[1].push(["📄","Scheme statements","Import the SSY, PPF or RD statement: deposits, the bank’s interest and balance.","schemes"])}
