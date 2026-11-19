/* ===== Version 24: Gmail reader inbox, bank statement PDFs, mutual fund statements (CAS) ===== */
/* ---------- emails that the Gmail script puts in the space's "__mail" document ---------- */
let mailUnsub=null;
{const _ln=listen;listen=function(){_ln();try{if(mailUnsub)mailUnsub();const ref=fdb.collection("spaces").doc(SY.space+"__mail");
  mailUnsub=ref.onSnapshot(sn=>{if(!sn.exists||(sn.metadata&&sn.metadata.hasPendingWrites))return;mailTake(ref,sn.data()||{})},()=>{mailUnsub=null})}catch(e){console.warn("mail",e)}}}
async function mailTake(ref,d){const L=Array.isArray(d.items)?d.items.filter(Boolean):[];if(!L.length)return;const seen=new Set(S.cfg.mailSeen||[]),q=S.cfg.smsq=S.cfg.smsq||[],na=(S.cfg.ntfNo||[]).length;let add=0;
  L.forEach(m=>{if(!m.id||seen.has(m.id))return;seen.add(m.id);const text=normMsg((m.subject?m.subject+". ":"")+(m.body||""));S.cfg.mailN=(S.cfg.mailN||0)+1;S.cfg.mailLast=+m.time||Date.now();
    if(/\botp\b|one.time password|verification code/i.test(text))return;const p=parseSms(text);
    if(!p||p.weak){if(/debit|credit|transaction|payment|spent|purchase|txn|transfer/i.test(text))noAmt({id:"m:"+m.id,app:"Email · "+String(m.from||"").replace(/<.*>/,"").trim(),body:text.slice(0,200),time:m.time});return}
    if(!p.date||Math.abs(dl(p.date))>5)p.date=iso(new Date(+m.time||Date.now()));q.push({id:"m:"+m.id,from:"Email · "+String(m.from||"").replace(/<.*>/,"").trim().slice(0,40),body:text.slice(0,300),p,src:"m"});add++});
  S.cfg.mailSeen=[...seen].slice(-500);S.cfg.smsq=q.slice(-60);dedupeQ();save();if(add||(S.cfg.ntfNo||[]).length!=na)render();if(add)toast(add+(add==1?" payment":" payments")+" from your email to review");
  try{await ref.update({items:firebase.firestore.FieldValue.arrayRemove(...L)})}catch(e){console.warn("mail clear",e)}}
function gmailGuide(){const code=setupCode();sheet(`<h2>Read bank emails from Gmail</h2><p class="sub">A small script in your own Google account checks for bank emails every 15 minutes, even when the phone is off, and sends them here to review. Your email password isn’t needed.</p>
  <ol class="steps"><li>Tap <b>Copy the script</b>, then open <b>script.google.com</b> on a computer or in the phone browser, make a <b>New project</b> and paste it in.</li>
  <li>Tap <b>Copy setup code</b> and paste it in the script where it says SETUP_CODE. Also fill in EMAIL and PASSWORD, the ones you use for sync here.</li>
  <li>Choose <b>setup</b> at the top and press <b>Run</b>. Allow access. Google warns because you wrote the script: Advanced → Go to project → Allow.</li>
  <li>When the log says All set, delete the password from the script and save.</li>
  <li><b>Outlook:</b> on outlook.com, Settings → Mail → Rules → new rule: from your banks → Forward to your Gmail.</li></ol>
  <div class="acts"><button class="btn" data-act="gsCopy">Copy the script</button>${code?`<button class="btn ghost" data-act="gsCode">Copy setup code</button>`:""}</div>
  ${code?"":`<p class="note" style="color:var(--late)">Turn on Google sync first. The script sends emails to your sync space.</p>`}
  <p class="note">${S.cfg.mailN?`${S.cfg.mailN} emails received so far, the last ${tAgo(S.cfg.mailLast)}.`:"No emails received from the script yet."}</p>`)}
const copyText=async(t,what)=>{try{await navigator.clipboard.writeText(t);toast(what+" copied")}catch(e){const a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();try{document.execCommand("copy");toast(what+" copied")}catch(x){toast("Couldn’t copy here")}a.remove()}};
/* ---------- PDF reading (pdf.js, loaded only when needed) ---------- */
const PDFJS=["https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/","https://unpkg.com/pdfjs-dist@3.11.174/build/"];let pdfjsP=null;
function loadPdfJs(){if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);if(pdfjsP)return pdfjsP;const B=[...(S.cfg.pdfjsBase?[S.cfg.pdfjsBase]:[]),...PDFJS];
  pdfjsP=new Promise((res,rej)=>{let i=0;const nx=()=>{if(i>=B.length){pdfjsP=null;return rej(new Error("Couldn’t load the PDF reader. Check the internet connection and try again."))}
    const b=B[i++],s=document.createElement("script");s.src=b+"pdf.min.js";s.onload=()=>{if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc=b+"pdf.worker.min.js";res(window.pdfjsLib)}else nx()};s.onerror=()=>{s.remove();nx()};document.head.appendChild(s)};nx()});return pdfjsP}
async function pdfLines(buf,pw){const L=await loadPdfJs(),doc=await L.getDocument({data:new Uint8Array(buf),password:pw||undefined,isEvalSupported:false}).promise,out=[];
  for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p),tc=await pg.getTextContent(),rows=[];
    tc.items.forEach(it=>{if(!it.str||!it.str.trim())return;const x=it.transform[4],y=it.transform[5];let r=rows.find(q=>Math.abs(q.y-y)<2.5);if(!r){r={y,items:[]};rows.push(r)}r.items.push({x,s:it.str,w:it.width||0})});
    rows.sort((a,b)=>b.y-a.y).forEach(r=>{r.items.sort((a,b)=>a.x-b.x);let t="",lx=null;r.items.forEach(it=>{if(lx!=null){const g=it.x-lx;t+=g>14?"   ":g>1.2?" ":""}t+=it.s;lx=it.x+(it.w||it.s.length*4.5)});out.push({p,y:r.y,t:t.replace(/\s+$/,""),items:r.items})})}
  try{doc.destroy()}catch(e){}return out}
const pdfErr=e=>e&&(e.name=="PasswordException"||/password/i.test(e.message||""))?(e.code==2?"wrong":"need"):"";
/* ---------- bank statement PDFs ---------- */
const SDRE=/^\s*(\d{1,2}[-\/.](?:\d{1,2}|[A-Za-z]{3})[-\/.]\d{2,4}|\d{1,2}\s[A-Za-z]{3}\s\d{2,4}|\d{4}-\d\d-\d\d)(?=\s|$)/,SAMRE=/\(?-?(?:\d{1,3}(?:,\d{2,3})+|\d+)\.\d{2}\)?(?:\s?(?:Cr|Dr|CR|DR)\b)?/g;
const amtOf=s=>{s=s.trim();const n=num(s.replace(/\s?(Cr|Dr|CR|DR)$/,""));return /^\(|^-|(Dr|DR)$/.test(s)?-n:n};
function stmtParse(lines){const rows=[];let prev=null,cur=null,hdr=null,open=null;
  for(const L of lines){const t=L.t.trim();if(!t)continue;
    if(/opening balance|balance b\/f|brought forward/i.test(t)){const a=t.match(SAMRE);if(a){prev=amtOf(a[a.length-1]);if(open==null)open=prev}continue}
    if(/withdraw|debit|\bdr\b/i.test(t)&&/deposit|credit|\bcr\b/i.test(t)&&/balance/i.test(t)){const f=re=>{const it=L.items.find(i=>re.test(i.s));return it?it.x+(it.w||0)/2:null};hdr={dr:f(/withdraw|debit|\bdr\b/i),cr:f(/deposit|credit|\bcr\b/i)};continue}
    const dm=t.match(SDRE);
    if(dm&&!/opening|closing|total/i.test(t)){const am=[...t.matchAll(SAMRE)].filter(m=>m.index>=dm[0].length),d=pDate(dm[1].replace(/\s/g,"-"));if(!d||!am.length){cur=null;continue}
      let desc=t.slice(dm[0].length,am[0].index).replace(/^\s*\d{1,2}[-\/.](?:\d{1,2}|[A-Za-z]{3})[-\/.]\d{2,4}\s*/,"").replace(/\s+/g," ").trim();
      const vals=am.map(m=>amtOf(m[0]));let amt=null,dir=null,bal=null;
      if(vals.length>=2){bal=vals[vals.length-1];const cand=vals.slice(0,-1).filter(v=>Math.abs(v)>0.004);
        if(prev!=null)for(const a of cand){const x=Math.abs(a);if(Math.abs(prev-x-bal)<0.011){amt=x;dir="out";break}if(Math.abs(prev+x-bal)<0.011){amt=x;dir="in";break}}
        if(amt==null&&cand.length){amt=Math.abs(cand[0]);if(hdr&&hdr.dr!=null&&hdr.cr!=null){const s=am[0][0].replace(/[()\s]|Cr|Dr|CR|DR/g,""),it=L.items.find(i=>i.s.replace(/\s/g,"").includes(s));dir=it&&Math.abs(it.x+(it.w||0)/2-hdr.cr)<Math.abs(it.x+(it.w||0)/2-hdr.dr)?"in":"out"}else dir=/\bcr\b|credit|deposit|salary|refund|reversal/i.test(desc)?"in":"out"}}
      else{amt=Math.abs(vals[0]);dir=/\bcr\b|credit|deposit/i.test(t)?"in":"out"}
      if(amt>0){cur={date:d,amt,dir,desc,bal};rows.push(cur);if(bal!=null)prev=bal}continue}
    if(cur&&!/^(page|statement|total|closing|account|customer|branch|ifsc|this is|unless|please|registered)/i.test(t)&&!SDRE.test(t)&&!(t.match(SAMRE)||[]).length&&t.length<90)cur.desc=(cur.desc+" "+t).replace(/\s+/g," ").trim()}
  return {rows,open,close:rows.length&&rows[rows.length-1].bal!=null?rows[rows.length-1].bal:null}}
const sgn=(x,id)=>{if(x.kind=="tr"){if(x.acc==id)return -((+x.amt||0)+(+x.fee||0));if(x.to==id)return +x.got||0;return 0}if(x.acc!=id)return 0;return (x.kind=="in"||x.kind=="adj")?+x.amt:-x.amt};
function balAt(acc,d){const A=ac(acc);return bal(A)-S.tx.filter(x=>x.date>d).reduce((s,x)=>s+sgn(x,acc),0)}
function stmtMatch(P,acc){const used=new Set(),L=S.tx.map(x=>({x,v:sgn(x,acc)})).filter(o=>o.v);
  const res=P.rows.map(r=>{const want=r.dir=="in"?r.amt:-r.amt,m=L.filter(o=>!used.has(o.x.id)&&Math.abs(o.v-want)<0.011&&Math.abs(dl(o.x.date)-dl(r.date))<=3).sort((a,b)=>Math.abs(dl(a.x.date)-dl(r.date))-Math.abs(dl(b.x.date)-dl(r.date)))[0];if(m)used.add(m.x.id);return {...r,match:m?m.x.id:""}});
  const D_=P.rows.map(r=>r.date).sort(),from=D_[0],to=D_[D_.length-1],only=from?L.filter(o=>!used.has(o.x.id)&&o.x.date>=from&&o.x.date<=to&&o.x.cat!="Balance correction").map(o=>o.x):[];return {res,only,from,to}}
const descPayee=d=>{const m=String(d||"").match(/(?:UPI|IMPS|NEFT|RTGS|NACH|ACH|MMT)[\/-](?:[^\/\s]+\/)+([A-Za-z][A-Za-z .&'\-]{1,40})/i);return (m?m[1]:String(d||"").replace(/[\d\/\\:#*-]+/g," ").replace(/\s+/g," ")).trim().slice(0,40)};
let stPend=null;
async function stmtFile(f,pw){const o=$("#csvout"),acc=v("f_acc");if(!o)return;o.innerHTML=`<p class="note">Reading the PDF…</p>`;
  try{const buf=await f.arrayBuffer(),P=stmtParse(await pdfLines(buf,pw));if(!P.rows.length){o.innerHTML=`<p class="note" style="color:var(--late)">No transactions found in this PDF. If it’s a scanned image, it can’t be read; use the bank’s downloaded e-statement instead.</p>`;return}
    stPend={file:f,acc,P,M:stmtMatch(P,acc)};stmtShow()}
  catch(e){const k=pdfErr(e);if(k){stPend={file:f,acc};o.innerHTML=`<div class="card" style="margin-top:10px"><b>${k=="wrong"?"That password didn’t work":"This statement has a password"}</b><p class="note">Banks often use part of your customer ID or date of birth. Check the email the statement came with.</p>${F("f_pdfpw","PDF password","","password")}<div class="acts"><button class="btn" data-act="stPw">Open</button></div></div>`;return}
    o.innerHTML=`<p class="note" style="color:var(--late)">${esc(e.message||e)}</p>`}}
function stmtShow(){const p=stPend,o=$("#csvout");if(!o||!p||!p.M)return;const A=ac(p.acc),nw=p.M.res.filter(r=>!r.match),app=p.P.close!=null?balAt(p.acc,p.M.to):null;
  o.innerHTML=`<div class="card" style="margin-top:10px"><b>${fmt(p.M.from)} to ${fmt(p.M.to)}: ${p.M.res.length} transactions</b><small style="display:block;color:var(--mute)">${p.M.res.length-nw.length} already in the app · ${nw.length} new · going into ${esc(A.name)}</small>
  ${nw.length?nw.map((r,i)=>`<label class="hbl" style="margin:8px 0;gap:8px;align-items:flex-start"><span style="display:flex;gap:8px"><input type="checkbox" data-sti="${p.M.res.indexOf(r)}" checked style="width:auto;margin-top:3px"><span>${fmt(r.date)} · ${esc(descPayee(r.desc)||"No description")}<small style="display:block;color:var(--mute)">${esc(catFor(descPayee(r.desc))||"No category")}</small></span></span><b>${r.dir=="out"?"−":"+"}${fmx(r.amt,A.cur)}</b></label>`).join(""):`<p class="note">Everything in this statement is already in the app.</p>`}
  ${app!=null?`<p class="note">Balance on ${fmt(p.M.to)}: statement ${fmx(p.P.close,A.cur)} · app ${fmx(app,A.cur)}${Math.abs(app-p.P.close)>0.009?" (after adding the new ones it is checked again)":" ✓"}</p>`:""}
  ${p.M.only.length?`<details><summary>${p.M.only.length} in the app but not in the statement</summary>${p.M.only.map(x=>`<div class="hbl" style="margin:6px 0"><span>${fmt(x.date)} · ${esc(x.payee||x.cat||KIND[x.kind])}</span><b>${fmx(Math.abs(sgn(x,p.acc)),A.cur)}</b></div>`).join("")}<p class="note">These may be cash, typed twice, or from another account.</p></details>`:""}</div>
  ${nw.length?`<div class="acts"><button class="btn" data-act="stImportGo">Add the ticked ones</button></div>`:""}${app!=null?`<div class="acts"><button class="btn ghost" data-act="stFixBal">Make the balance match the statement</button></div>`:""}`}
/* ---------- mutual fund statements (CAMS / KFintech CAS) ---------- */
function casParse(lines){const F=[];let cur=null,folio="";const T=lines.map(l=>l.t.replace(/\s+/g," ").trim()).filter(Boolean),dnum=/\(?-?(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?\)?/g;
  for(let i=0;i<T.length;i++){const t=T[i];const fm=t.match(/Folio No\s*:?\s*([A-Za-z0-9]+(?:\s*\/\s*[A-Za-z0-9]+)?)/i);if(fm){folio=fm[1].replace(/\s/g,"");if(!/ISIN/i.test(t))continue}
    const im=t.match(/ISIN\s*:?\s*(INF[A-Z0-9]{9})/i);
    if(im){let name=t.slice(0,t.search(/[-–]?\s*ISIN/i)).replace(/Folio No\s*:?\s*\S+(\s*\/\s*\S+)?/i,"").replace(/^[A-Z0-9]{2,10}\s*-\s*/,"").replace(/\((?:Non-Demat|Demat|formerly[^)]*)\)/ig,"").replace(/[-–\s]+$/,"").trim();
      if(name.length<6&&i>0&&!/ISIN|Folio/i.test(T[i-1]))name=(T[i-1]+" "+name).trim();cur={name,isin:im[1].toUpperCase(),folio,units:0,nav:0,value:0,cost:0,navDate:"",tx:[]};F.push(cur);continue}
    if(!cur)continue;let hit=false;
    let m=t.match(/Closing Unit Balance\s*:?\s*([\d,]*\.?\d+)/i);if(m){cur.units=num(m[1]);hit=true}
    m=t.match(/NAV on\s*(\d{1,2}-[A-Za-z]{3}-\d{4})\s*:?\s*(?:INR|Rs\.?|₹)?\s*([\d,]*\.?\d+)/i);if(m){cur.nav=num(m[2]);cur.navDate=pDate(m[1])||cur.navDate;hit=true}
    m=t.match(/(?:Market Value|Valuation)\s*on\s*(\d{1,2}-[A-Za-z]{3}-\d{4})\s*:?\s*(?:INR|Rs\.?|₹)?\s*([\d,]*\.?\d+)/i);if(m){cur.value=num(m[2]);cur.navDate=pDate(m[1])||cur.navDate;hit=true}
    m=t.match(/(?:Total )?Cost Value\s*:?\s*(?:INR|Rs\.?|₹)?\s*([\d,]*\.?\d+)/i);if(m){cur.cost=num(m[1]);hit=true}
    if(hit)continue;
    const dm=t.match(/^(\d{2}-[A-Za-z]{3}-\d{4})\s+(.*)$/);if(dm){const N=[...dm[2].matchAll(dnum)].filter(x=>/\d/.test(x[0])&&/[.,]/.test(x[0])).map(x=>({v:/^\(|^-/.test(x[0])?-num(x[0]):num(x[0]),i:x.index}));
      if(N.length>=3){const desc=dm[2].slice(0,N[0].i).trim();if(/stamp duty|\bstt\b|\btds\b/i.test(desc))continue;const d=pDate(dm[1]);if(d)cur.tx.push({d,amt:N[0].v,units:N[1].v,price:N[2].v,desc})}}}
  F.forEach(f=>{if(!f.value&&f.units&&f.nav)f.value=Math.round(f.units*f.nav*100)/100;if(!f.cost)f.cost=Math.round(f.tx.reduce((s,x)=>s+x.amt,0)*100)/100;f.xirr=fundXirr(f)});return F.filter(f=>f.units>0||f.tx.length)}
function xirr(cf){cf=cf.filter(c=>c.d&&isFinite(c.a)&&c.a).sort((a,b)=>a.d.localeCompare(b.d));if(cf.length<2||!cf.some(c=>c.a<0)||!cf.some(c=>c.a>0))return null;const t0=D(cf[0].d),yr=c=>(D(c.d)-t0)/31557600000;
  const f=r=>cf.reduce((s,c)=>s+c.a/Math.pow(1+r,yr(c)),0);let lo=-0.99,hi=10,flo=f(lo);if(flo*f(hi)>0)return null;for(let i=0;i<200;i++){const m=(lo+hi)/2,fm_=f(m);if(Math.abs(fm_)<1e-6)return m*100;if(flo*fm_<0)hi=m;else{lo=m;flo=fm_}}return (lo+hi)/2*100}
const fundXirr=f=>xirr([...f.tx.map(t=>({d:t.d,a:-t.amt})),{d:f.navDate||today(),a:f.value}]);
{const _ir=invRet;invRet=function(x){const r=_ir(x);if(Array.isArray(x.cf)&&x.cf.length&&invVal(x)>0){const y=xirr([...x.cf.map(c=>({d:c.d,a:-c.a})),{d:today(),a:invVal(x)}]);if(y!=null&&isFinite(y))r.yr=y}return r}}
let casPend=null;
function casForm(){casPend=null;sheet(`<h2>Mutual fund statement</h2><p class="sub">Request a Consolidated Account Statement (CAS) from CAMS or KFintech; it arrives by email as a PDF. The app adds each fund with its units, cost and value, and keeps the NAV updated.</p>
  ${F("f_caspw","PDF password (often your PAN in capitals)","","password",'autocomplete="off"')}<label for="f_cas">CAS PDF</label><input id="f_cas" type="file" accept=".pdf,application/pdf" data-cas="1"><div id="casout"></div>`)}
let casFileLast=null;
async function casFile(f){const o=$("#casout");if(!o)return;casFileLast=f;o.innerHTML=`<p class="note">Reading the statement…</p>`;
  try{const L=await pdfLines(await f.arrayBuffer(),v("f_caspw")),F=casParse(L);if(!F.length){o.innerHTML=`<p class="note" style="color:var(--late)">No funds found. Use the detailed CAS from CAMS or KFintech.</p>`;return}casPend=F;casShow()}
  catch(e){const k=pdfErr(e);o.innerHTML=`<p class="note" style="color:var(--late)">${k?(k=="wrong"?"That password didn’t work. Change it above and try again.":"This PDF needs its password. Enter it above and try again."):esc(e.message||e)}</p>${k?`<div class="acts"><button class="btn" data-act="casRetry">Try again</button></div>`:""}`}}
const casMatch=f=>S.inv.find(q=>q.isin&&q.isin==f.isin&&(!f.folio||!q.no||q.no==f.folio))||S.inv.find(q=>q.kind=="mf"&&!q.isin&&same(q.name,f.name));
function casShow(){const F=casPend,o=$("#casout");if(!o||!F)return;const tv=F.reduce((s,f)=>s+f.value,0),tc=F.reduce((s,f)=>s+f.cost,0);
  o.innerHTML=`<div class="card" style="margin-top:10px"><b>${F.length} ${F.length==1?"fund":"funds"} · value ${inr(Math.round(tv))}</b><small style="display:block;color:var(--mute)">Cost ${inr(Math.round(tc))} · gain ${inr(Math.round(tv-tc))}</small>
  ${F.map(f=>`<div style="margin-top:8px"><div class="hbl"><span>${esc(f.name)}</span><b>${inr(Math.round(f.value))}</b></div><small style="color:var(--mute)">${f.folio?"Folio "+esc(f.folio)+" · ":""}${nf(f.units,3)} units${f.nav?" · NAV "+nf(f.nav,4):""}${f.xirr!=null?" · "+f.xirr.toFixed(1)+"% a year":""} · ${casMatch(f)?"updates the existing one":"new"}</small></div>`).join("")}</div>
  <div class="acts"><button class="btn" data-act="casGo">Add to my investments</button></div>`}
async function mfCode(name){try{const L=await getJSON("https://api.mfapi.in/mf/search?q="+encodeURIComponent(name.replace(/\s*-\s*/g," ").split(" ").slice(0,6).join(" ")));if(!Array.isArray(L)||!L.length)return null;
  const W=s=>new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(w=>w.length>2)),a=W(name);let best=null,bs=0;
  L.slice(0,40).forEach(x=>{const b=W(x.schemeName);let s=0;a.forEach(w=>{if(b.has(w))s++});if(/direct/i.test(name)!=/direct/i.test(x.schemeName))s-=2;if(/growth/i.test(name)!=/growth/i.test(x.schemeName))s-=2;if(s>bs){bs=s;best=x}});return bs>=3?best:null}catch(e){return null}}
Object.assign(ACT,{
  gmail(){gmailGuide()},gsCopy(){copyText(GSCRIPT,"Script")},gsCode(){copyText(setupCode(),"Setup code")},
  stPw(){const p=stPend;if(p&&p.file)stmtFile(p.file,v("f_pdfpw"))},
  stImport(id){csvForm();setVal("f_acc",id)},
  stImportGo(){const p=stPend;if(!p||!p.M)return;const A=ac(p.acc),batch="imp_"+uid(),ids=[];
    $$("#csvout input[data-sti]").forEach(c=>{if(!c.checked)return;const r=p.M.res[+c.dataset.sti];if(!r||r.match)return;const py=descPayee(r.desc);ids.push(addTx({kind:r.dir=="in"?"in":"out",acc:A.id,amt:r.amt,cur:A.cur,date:r.date,cat:catFor(py),payee:py,note:r.desc.slice(0,80),imp:batch}).id)});
    p.M=stmtMatch(p.P,p.acc);save();render();stmtShow();toast(`Added ${ids.length} ${ids.length==1?"entry":"entries"}`,()=>{ids.forEach(i=>removeTx(i));S.bin=S.bin.filter(b=>!ids.includes(b.r.id));save();render();if(stPend&&stPend.P){stPend.M=stmtMatch(stPend.P,stPend.acc);stmtShow()}})},
  stFixBal(){const p=stPend;if(!p||!p.M||p.P.close==null)return;const d=p.P.close-balAt(p.acc,p.M.to);if(Math.abs(d)<0.005)return toast("Already matches");const A=ac(p.acc);addTx({kind:"adj",acc:A.id,amt:d,cur:A.cur,date:p.M.to,cat:"Balance correction",note:"Matched to the bank statement"});save();render();stmtShow();toast("Balance now matches the statement")},
  casOpen(){casForm()},casRetry(){if(casFileLast)casFile(casFileLast)},
  async casGo(){const F=casPend;if(!F)return;let n=0,u=0;for(const f of F){const x=casMatch(f),cf=f.tx.map(t=>({d:t.d,a:t.amt}));
      const o=stamp({...(x||{att:[]}),id:x?x.id:uid(),name:x?x.name:f.name,kind:"mf",no:f.folio||(x&&x.no)||"",inv:Math.round(f.cost*100)/100,val:Math.round(f.value*100)/100,units:f.units,isin:f.isin,cf,cas:f.navDate||today(),sd:(x&&x.sd)||(cf.length?cf.map(c=>c.d).sort()[0]:today()),cur:"INR"},x);
      if(f.nav&&f.navDate){o.nav=f.nav;o.navAt=f.navDate}put("inv",o);x?u++:n++}
    casPend=null;done();toast(`${n} added, ${u} updated. Looking up NAV codes…`);
    for(const x of S.inv.filter(q=>q.kind=="mf"&&q.isin&&!q.mf)){const c=await mfCode(x.name);if(c){x.mf=String(c.schemeCode);x.mfn=c.schemeName;x.ut=Date.now()}}save();try{await refreshFunds(true)}catch(e){}render()}
});
document.addEventListener("change",e=>{const t=e.target;if(!t||!t.files||!t.files[0])return;
  if(t.dataset&&t.dataset.csv){const f=t.files[0];if(/\.pdf$/i.test(f.name)||f.type=="application/pdf"){e.stopImmediatePropagation();stPend=null;stmtFile(f,"")}}
  else if(t.dataset&&t.dataset.cas)casFile(t.files[0])},true);
{const _cf=csvForm;csvForm=function(){_cf();const i=$("#f_csv");if(i){i.accept=".csv,.pdf,text/csv,application/pdf,text/plain";const l=$('label[for="f_csv"]');if(l)l.textContent="Statement file (PDF or CSV)"}const s=$("#over .sub");if(s)s.textContent="Choose the statement PDF from your bank’s email, or a CSV. The app adds what’s missing, skips what’s already here and checks the balance."}}
{const _vA=vAcc;vAcc=function(){return _vA().replace(/(<button class="btn sm ghost" data-act="stmt" data-id="([^"]+)">Statement<\/button>)/g,'$1<button class="btn sm ghost" data-act="stImport" data-id="$2">Import PDF</button>')}}
{const _vW=vWealth;vWealth=function(){const h=_vW(),c=`<div class="card" style="margin-top:12px"><b>Import from statements</b><p class="note">Mutual funds from a CAMS or KFintech statement (CAS PDF).</p><div class="acts"><button class="btn sm" data-act="casOpen">Import mutual fund statement</button></div></div>`,k="<h2>Return to India</h2>";return h.includes(k)?h.replace(k,c+k):h+c}}
{const _rc=readCheck;readCheck=async function(){await _rc();const sh=$("#over .sheet");if(sh)sh.insertAdjacentHTML("beforeend",`<h3>Gmail reader</h3><p class="note">${S.cfg.mailN?S.cfg.mailN+" bank emails received, the last "+tAgo(S.cfg.mailLast)+".":"Read bank emails even when the phone is off."}</p><div class="acts"><button class="btn sm ghost" data-act="gmail">Set up the Gmail reader</button></div>`)}}
