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
function saImpPlan(x,P){const have=deps(x),used=new Set(),dep=[],ints=[],wd=[];
  P.rows.forEach(r=>{if(r.dir=="in"&&SA_INT.test(r.desc||"")){ints.push(r);return}
    const sgn=r.dir=="in"?1:-1,m=have.find(d=>!used.has(d.id)&&Math.abs(+d.a-sgn*r.amt)<0.01&&Math.abs(dl(d.d)-dl(r.date))<=3);if(m)used.add(m.id);(r.dir=="in"?dep:wd).push({...r,have:!!m})});
  /* the bank's balance right after its last 31 March interest; otherwise the statement's opening balance */
  let own=null;if(x.type!="rd"){const I=[...ints].reverse().find(r=>r.bal!=null&&/-(?:03-(?:2[5-9]|3[01])|04-0[1-5])$/.test(r.date));
    if(I){const same=P.rows.filter(r=>r.date==I.date&&r.bal!=null);own={d:I.date,bal:Math.round(((same.length?same[same.length-1]:I).bal)*100)/100,why:"int"}}
    else if(P.open!=null&&P.open>0.004){own={d:iso(new Date(D(P.rows[0].date).getTime()-864e5)),bal:Math.round(P.open*100)/100,why:"open"}}}
  /* an older statement never replaces a newer bank balance */
  const fix=own&&(!x.fix||!x.fix.d||own.d>=x.fix.d)?own:null;
  /* opening date: printed in the header, or the first deposit when the statement starts at zero */
  const T=String(P.text||""),DT="(\\d{1,2}[-\\/. ](?:\\d{1,2}|[A-Za-z]{3,9})[-\\/. ]\\d{2,4}|\\d{4}-\\d\\d-\\d\\d)",om=T.match(new RegExp("(?:open(?:ing)?\\s*date|date\\s*of\\s*(?:a\\/c\\s*|account\\s*)?opening|opened\\s*on)\\s*:?\\s*"+DT,"i"));
  let open=om?pDate(om[1].replace(/\s+/g,"-")):"",guess=false;if(!open&&P.rows.length&&P.rows[0].date<x.open){open=P.rows[0].date;guess=!(P.open==null||P.open<0.01)}
  if(open&&open==x.open)open="";
  /* is it this account? */
  const no=String(x.no||"").replace(/\D/g,""),digits=T.replace(/[^\d]/g," "),mis=no.length>=6&&/\d{9,}/.test(digits)&&!T.replace(/\s/g,"").includes(no.slice(-6));
  /* years the bank has finished: deposits, interest and the balance after interest */
  const hist={};P.rows.forEach(r=>{const fy=fyLabel(r.date),h=hist[fy]=hist[fy]||{fy,dep:0,int:0,close:null};if(r.dir=="in"&&SA_INT.test(r.desc||""))h.int+=r.amt;else h.dep+=r.dir=="in"?r.amt:-r.amt;if(r.bal!=null)h.close=r.bal});
  const H=Object.values(hist).filter(h=>own&&own.why=="int"&&h.close!=null&&(+h.fy.slice(0,4)+1)+"-03-31"<=own.d).map(h=>({...h,dep:Math.round(h.dep*100)/100,int:Math.round(h.int*100)/100,close:Math.round(h.close*100)/100}));
  return {dep,ints,wd,fix,open,guess,mis,hist:H,from:P.rows[0].date,to:P.rows[P.rows.length-1].date,close:P.close,startBal:P.open}}
function saImpShow(){const p=saImpP,o=$("#saout");if(!o||!p||!p.Q)return;const x=S.sacc.find(q=>q.id==p.id),Q=p.Q,nw=Q.dep.filter(r=>!r.have),nwW=Q.wd.filter(r=>!r.have),sum=a=>a.reduce((s,r)=>s+r.amt,0);
  const newOpen=Q.open&&Q.open!=x.open?Q.open:"",mat=newOpen?saMature({...x,open:newOpen}):"";
  o.innerHTML=`${Q.mis?`<div class="card" style="margin-top:10px;border-color:var(--late)"><b>This may be another account</b><p class="note" style="margin:4px 0 0">The statement doesn’t show ${esc(x.no)}. Check it’s the statement for ${esc(x.name)}.</p></div>`:""}
  <div class="card" style="margin-top:10px"><b>${fmt(Q.from)} to ${fmt(Q.to)}</b>
    <p class="note" style="margin:4px 0 0">Deposits: ${Q.dep.length} · ${inr(sum(Q.dep))}${Q.dep.length?` (${nw.length} new, ${Q.dep.length-nw.length} already in the app)`:""}</p>
    ${Q.ints.length?`<p class="note" style="margin:2px 0 0">Interest added by the bank: ${inr(sum(Q.ints))} (${Q.ints.map(r=>fmt(r.date)).slice(-3).join(", ")})</p>`:""}
    ${Q.wd.length?`<p class="note" style="margin:2px 0 0">Withdrawals: ${Q.wd.length} · ${inr(sum(Q.wd))}</p>`:""}
    ${Q.close!=null?`<p class="note" style="margin:2px 0 0">Balance on ${fmt(Q.to)}: <b>${inr(Q.close)}</b></p>`:""}</div>
  ${nw.length||nwW.length?`<label class="hbl" style="margin:10px 0;gap:8px;justify-content:flex-start"><input type="checkbox" id="sa_dep" checked style="width:auto"><span>Add ${nw.length} ${nw.length==1?"deposit":"deposits"} (${inr(sum(nw))})${nwW.length?` and ${nwW.length} ${nwW.length==1?"withdrawal":"withdrawals"}`:""}</span></label>
    <details><summary>See them</summary>${[...nw,...nwW].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,120).map(r=>`<div class="hbl" style="margin:4px 0"><span>${fmt(r.date)}<small style="display:block;color:var(--mute)">${esc((r.desc||"").slice(0,48))}</small></span><b>${r.dir=="out"?"−":""}${inr(r.amt)}</b></div>`).join("")}</details>`:`<p class="note">All the deposits in this statement are already in the app.</p>`}
  ${Q.fix?`<label class="hbl" style="margin:10px 0;gap:8px;justify-content:flex-start;align-items:flex-start"><input type="checkbox" id="sa_fix" checked style="width:auto;margin-top:3px"><span>Start from the bank’s balance: ${inr(Q.fix.bal)} on ${fmt(Q.fix.d)}<small style="display:block;color:var(--mute)">${Q.fix.why=="int"?"Right after the bank added the year’s interest. The app adds this year’s interest from there, so its figures match the bank.":"The statement’s opening balance. The app calculates from there."}</small></span></label>`:""}
  ${newOpen?`<label class="hbl" style="margin:10px 0;gap:8px;justify-content:flex-start;align-items:flex-start"><input type="checkbox" id="sa_open" checked style="width:auto;margin-top:3px"><span>Opening date: ${fmt(newOpen)}<small style="display:block;color:var(--mute)">The app has ${fmt(x.open)}. With ${fmt(newOpen)}, it matures on ${fmt(mat)}${x.type=="ssy"?" and takes deposits until "+fmt(saDepEnd({...x,open:newOpen})):""}.${Q.guess?" This is the statement’s first entry; if the account is older, change it in Edit account.":""}</small></span></label>`:""}
  <div class="acts"><button class="btn" data-act="saImpGo" data-id="${x.id}">Import</button></div>`}
/* the bank's finished years in Year by year, before the years the app works out */
{const _si=saInfoSheet;saInfoSheet=function(id){_si(id);try{const x=S.sacc.find(q=>q.id==id);if(!x)return;
  const a=$('#over [data-act="saPast"]');if(a&&!$('#over [data-act="saImp"]'))a.insertAdjacentHTML("afterend",`<button class="btn ghost" data-act="saImp" data-id="${id}">Import statement</button>`);
  const tb=$("#over table.tbl"),H=x.hist||[];if(tb&&H.length){const have=new Set([...tb.querySelectorAll("tr td:first-child")].map(td=>td.textContent.trim())),hd=tb.querySelector("tr");
    H.filter(h=>!have.has(h.fy)).sort((a,b)=>b.fy.localeCompare(a.fy)).forEach(h=>hd.insertAdjacentHTML("afterend",`<tr><td>${h.fy}</td><td>${inr(h.dep)}</td><td>${inr(h.int)}</td><td>${inr(h.close)}</td></tr>`));
    tb.insertAdjacentHTML("afterend",`<p class="note">Years up to ${fmt(x.fix&&x.fix.d||H[H.length-1].fy)} are from the bank statement.</p>`)}}catch(e){console.warn(e)}}}
Object.assign(ACT,{
  saImp(id){saImpForm(id)},
  saImpPw(id){const f=saImpP&&saImpP.file;if(!f)return;saImpFile(id,f,v("f_sapw"))},
  saImpGo(id){const p=saImpP,x=S.sacc.find(q=>q.id==id);if(!p||!p.Q||!x)return;const Q=p.Q,chk=k=>{const e=$("#"+k);return !!e&&e.checked};let n=0,w=0;
    x.dep=x.dep||[];if(chk("sa_dep")){Q.dep.filter(r=>!r.have).forEach(r=>{x.dep.push({id:uid(),d:r.date,a:r.amt,src:"stmt"});n++});Q.wd.filter(r=>!r.have).forEach(r=>{x.dep.push({id:uid(),d:r.date,a:-r.amt,w:1,src:"stmt"});w++})}
    if(Q.fix&&chk("sa_fix"))x.fix={d:Q.fix.d,bal:Q.fix.bal,src:"stmt"};
    if(Q.hist.length&&x.fix&&x.fix.d){const M={};(x.hist||[]).forEach(h=>M[h.fy]=h);Q.hist.filter(h=>(+h.fy.slice(0,4)+1)+"-03-31"<=x.fix.d).forEach(h=>M[h.fy]=h);x.hist=Object.values(M).sort((a,b)=>a.fy.localeCompare(b.fy))}
    /* money already in the account when the statement starts */
    if(chk("sa_dep")||!Q.dep.some(r=>!r.have)){const earlier=deps(x).some(d=>d.d<Q.from&&d.src!="stmt");
      if(Q.startBal!=null&&Q.startBal>0.004){if(!earlier&&(!x.base||x.base.d>Q.from))x.base={d:Q.from,bal:Math.round(Q.startBal*100)/100}}
      else if(x.base&&Q.from<=x.base.d)delete x.base}
    if(Q.open&&chk("sa_open")){x.open=Q.open;if(x.plan&&x.plan.f)x.plan.md=Q.open.slice(5,7)+"-"+p2(Math.min(28,+x.plan.day||5))}
    x.ut=Date.now();put("sacc",x);save();render();saInfoSheet(id);toast(`Imported: ${n} ${n==1?"deposit":"deposits"}${w?", "+w+" withdrawals":""}${x.fix&&x.fix.src=="stmt"?" · balance from the bank":""}`)}
});
{const g=GUIDE.find(g=>g[0]=="Wealth and plans");if(g)g[1].push(["📄","Scheme statements","Import the SSY, PPF or RD statement: deposits, the bank’s interest and balance.","schemes"])}
