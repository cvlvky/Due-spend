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
const amtOf=s=>{s=s.trim();const n=Math.abs(num(s.replace(/\s?(Cr|Dr|CR|DR)$/,"")));return /^\(|^-|(Dr|DR)$/.test(s)?-n:n};
function stmtParse(lines){const rows=[];let prev=null,cur=null,hdr=null,open=null,pend=[],stop=false,period=null,sumNext=false,sumOpen=null,sumClose=null;
  const rEdge=L=>(L.items||[]).reduce((m,i)=>Math.max(m,i.x+(i.w||i.s.length*4.5)),0);
  /* description lines can sit above the date line (Axis, ICICI) or below it (most banks): they are shared out once the whole table is read (stPlace) */
  const groups=[],place=nx=>{if(pend.length)groups.push({pv:rows.length?rows[rows.length-1]:null,nx,L:pend});pend=[]};
  for(const L of lines){const t=L.t.trim();if(!t)continue;
    if(!hdr&&!rows.length&&/date/i.test(t)&&/amount|debit|credit/i.test(t)&&/detail|description|narration|particular|merchant|remark/i.test(t)&&!/balance/i.test(t)){const nb=stmtCols(L.items||[]);
      if(nb){const i=lines.indexOf(L),pre=lines.slice(0,i).map(l=>l.t).join(" "),m4=pre.match(/(?:X{2,}|\*{2,}|•{2,})\s*(\d{4})\b/i),o=stmtParseNB(lines.slice(i+1),nb);o.l4=m4?m4[1]:"";return o}}
    if(/opening balance|balance b\/f|brought forward|balance as on/i.test(t)&&!/closing/i.test(t)){const a=t.match(SAMRE);if(a){prev=amtOf(a[a.length-1]);if(open==null)open=prev}pend=[];continue}
    /* a column header repeated on the next page: the lines before it finish the last entry of the page before */
    if(/withdraw|debit|\bdr\b/i.test(t)&&/deposit|credit|\bcr\b/i.test(t)&&/balance/i.test(t)){const f=re=>{const it=L.items.find(i=>re.test(i.s));return it?it.x+(it.w||0)/2:null};hdr={dr:f(/withdraw|debit|\bdr\b/i),cr:f(/deposit|credit|\bcr\b/i)};if(rows.length)place(null);else pend=[];continue}
    {const pm=t.match(/statement (?:from|for the period(?: from)?)\s+(\S+(?:\s[A-Za-z]{3}\s\d{4})?)\s+to\s+(\S+(?:\s[A-Za-z]{3}\s\d{4})?)/i);if(pm){if(!period){const a=pDate(pm[1].replace(/\s+/g,"-")),b=pDate(pm[2].replace(/\s+/g,"-"));if(a&&b)period={from:a,to:b}}continue}}
    if(/\bbrought\b/i.test(t)&&/closing balance/i.test(t)){place(null);stop=true;sumNext=true;continue}
    if(sumNext){sumNext=false;const a=t.match(SAMRE);if(a&&a.length>=2){sumOpen=amtOf(a[0]);sumClose=amtOf(a[a.length-1])}continue}
    if(/^(?:ref\.? no\/?|cheque no|chq\.? no)\b/i.test(t)&&!(t.match(SAMRE)||[]).length)continue;
    if(/\b(?:date|txn date|tran date|value date)\b/i.test(t)&&/\b(?:balance|amount|debit|credit|withdrawals?|deposits?|details|description|particulars|narration)\b/i.test(t)&&!SDRE.test(t)){if(rows.length)place(null);else pend=[];continue}
    /* the table ends at its totals or closing balance; the bank's notes and legends after it are not part of any entry */
    if(/closing balance|transaction total|grand total|end of statement|^total\b|^statement summary/i.test(t)){place(null);stop=true;continue}
    const dm=t.match(SDRE);
    if(dm&&!/opening|closing|total/i.test(t)){const am=[...t.matchAll(SAMRE)].filter(m=>m.index>=dm[0].length),d=pDate(dm[1].replace(/\s/g,"-"));if(!d||!am.length){cur=null;continue}
      /* a dash on its own in the Debit or Credit column (SBI) says which side the amount is on */
      const its=(L.items||[]).map(i=>({x:i.x,s:String(i.s||"").trim()})).filter(i=>i.s).sort((a,b)=>a.x-b.x),nk=x=>x.replace(/[\s,]/g,""),ai=am.length==2?its.findIndex(i=>nk(i.s)==nk(am[0][0])):-1,
        isD=i=>!!i&&/^[-–]$/.test(i.s),dashCr=ai>0&&isD(its[ai-1])&&nk((its[ai+1]||{}).s||"")==nk(am[1][0]),dashDr=ai>=0&&isD(its[ai+1])&&nk((its[ai+2]||{}).s||"")==nk(am[1][0]);
      let desc=t.slice(dm[0].length,am[0].index).replace(/^\s*(?:\d{1,2}[-\/.](?:\d{1,2}|[A-Za-z]{3})[-\/.]\d{2,4}|\d{1,2}\s[A-Za-z]{3}\s\d{2,4})\s*/,"").replace(/\s+/g," ").trim();if(dashCr)desc=desc.replace(/(?:^|\s)[-–]$/,"").trim();
      const vals=am.map(m=>amtOf(m[0]));let amt=null,dir=null,bal=null,how="";
      if(vals.length>=2){bal=vals[vals.length-1];const cand=vals.slice(0,-1).filter(v=>Math.abs(v)>0.004);
        if(prev!=null)for(const a of cand){const x=Math.abs(a);if(Math.abs(prev-x-bal)<0.011){amt=x;dir="out";how="chain";break}if(Math.abs(prev+x-bal)<0.011){amt=x;dir="in";how="chain";break}}
        if(amt==null&&cand.length){amt=Math.abs(cand[0]);if(hdr&&hdr.dr!=null&&hdr.cr!=null){const s=am[0][0].replace(/[()\s]|Cr|Dr|CR|DR/g,""),it=L.items.find(i=>i.s.replace(/\s/g,"").includes(s));dir=it&&Math.abs(it.x+(it.w||0)/2-hdr.cr)<Math.abs(it.x+(it.w||0)/2-hdr.dr)?"in":"out";how="hdr"}else{dir=/\bcr\b|credit|deposit|salary|refund|reversal/i.test(desc)?"in":"out";how="kw"}}}
      else{amt=Math.abs(vals[0]);dir=/\bcr\b|credit|deposit/i.test(t)?"in":"out";how="kw"}
      if(dashCr||dashDr){dir=dashCr?"in":"out";how="dash"}
      const aIt=L.items.find(i=>i.s.includes(am[0][0].trim())),dR=L.items.filter(i=>aIt&&i.x+(i.w||0)<aIt.x-2&&!SDRE.test(i.s.trim())).reduce((m,i)=>Math.max(m,i.x+(i.w||i.s.length*4.5)),0);
      if(amt>0){const sv=vals.length>=2?(vals.slice(0,-1).find(v=>Math.abs(v)>0.004)||0):vals[0];cur={date:d,amt,dir,desc,bal,sv,how,p:L.p,y:L.y,parts:[{t:desc,r:dR,p:L.p,y:L.y,main:true}],dr:/(Dr|DR)\s*$/.test(am[0][0])||dashDr,cr:/(Cr|CR)\s*$/.test(am[0][0])||dashCr};place(cur);rows.push(cur);stop=false;if(bal!=null)prev=bal}continue}
    /* a line that isn't text for a description (a time, a code with an amount, a heading) still keeps its place, so the gaps between entries stay readable */
    if(!stop){const keep=!/^(page|statement|total|closing|account(?!\s*[,\/])|customer|branch|ifsc|this is|unless|please|registered)/i.test(t)&&!SDRE.test(t)&&!(t.match(SAMRE)||[]).length&&t.length<90;pend.push(keep?{t,r:rEdge(L),p:L.p,y:L.y}:{t:"",g:1,r:0,p:L.p,y:L.y})}}
  place(null);stPlace(groups);
  {const R=rows.flatMap(r=>(r.parts||[]).filter(p=>!p.main).map(p=>p.r)).filter(Boolean),colR=R.length?Math.max(...R):0;
    rows.forEach(r=>{if(!r.parts||r.parts.length<2)return;const P=(r.parts.every(p=>p.y!=null)?r.parts.map((p,i)=>({p,i})).sort((a,b)=>(a.p.p||0)-(b.p.p||0)||b.p.y-a.p.y||a.i-b.i).map(o=>o.p):r.parts).filter(p=>p.main||String(p.t||"").trim());if(!P.length)return;
      let d=P[0].t.trim();for(let i=1;i<P.length;i++){const pr=P[i-1],nx=P[i].t.trim(),tail=pr.t.trim().split(" ").pop(),full=colR&&pr.r>=colR-3.5&&tail.length>=10;if(!nx)continue;d+=(full&&/[A-Za-z0-9]$/.test(d)&&/^[A-Za-z0-9]/.test(nx)?"":" ")+nx}r.desc=d.replace(/\s+/g," ").trim()})}
  const o=stmtOrder(rows,sumOpen!=null?sumOpen:open);if(period)o.period=period;if(sumClose!=null)o.sumClose=sumClose;return o}
/* Lines between two entries. Banks leave a wider gap between entries than between the lines of one entry, so the widest gap is where
   one entry ends: lines above it belong to the entry before, lines below it to the next. When the gaps are all alike, the statement's own
   habit (descriptions below or above the date line, learnt from the clear cases) decides; with no habit, the nearer entry. */
function stPlace(G){const ok=o=>!!o&&o.y!=null&&isFinite(o.y);
  const cut=g=>{const {pv,nx,L}=g;if(!pv)return 0;if(!nx)return L.length;const s=[pv,...L,nx];if(!s.every(ok)||s.some(o=>o.p!=pv.p))return null;
    const gp=s.slice(1).map((o,i)=>Math.abs(s[i].y-o.y));let m=0;gp.forEach((x,i)=>{if(x>gp[m])m=i});const sec=Math.max(...gp.filter((_,i)=>i!=m));
    return gp[m]>0.5&&gp[m]>=sec*1.18?m:null};
  const K=G.map(cut);let dn=0,up=0,mid=0;G.forEach((g,i)=>{const k=K[i];if(k==null||!g.pv||!g.nx)return;if(k==g.L.length)dn++;else if(k==0)up++;else mid++});
  const habit=dn&&!up&&!mid?"below":up&&!dn&&!mid?"above":"",near=(a,b)=>!ok(a)||!ok(b)||(a.p==b.p&&Math.abs(a.y-b.y)<=30);
  G.forEach((g,i)=>{const {pv,nx,L}=g;let k=K[i];if(k==null&&habit)k=habit=="below"?L.length:0;
    if(k==null){L.forEach(c=>{const dP=pv?(c.y==null||pv.y==null?0:pv.p==c.p?Math.abs(c.y-pv.y):1e9):1e9,dN=nx&&c.y!=null&&nx.y!=null&&nx.p==c.p?Math.abs(c.y-nx.y):1e9;
      if(Math.min(dP,dN)>30)return;const R=dP<=dN?pv:nx;if(R)R.parts.push(c)});return}
    /* follow the lines away from each entry; a big jump (a footer, a note) ends it. Below-the-date habit: a description may carry on at the top of the next page */
    if(pv){let last=pv;for(let j=0;j<k;j++){const c=L[j],turn=habit=="below"&&ok(c)&&ok(last)&&c.p!=last.p&&L.findIndex(o=>o.p==c.p)==j;if(!near(last,c)&&!turn)break;pv.parts.push(c);last=c}}
    if(nx){let last=nx;const U=[];for(let j=L.length-1;j>=k;j--){const c=L[j];if(!near(last,c))break;U.unshift(c);last=c}nx.parts.push(...U)}})}
/* Card transaction lists (CBQ "Transaction History" and similar) have no running balance: each column is read by its position under the header */
function stmtCols(items){const C=[];let cur=null;[...items].sort((a,b)=>a.x-b.x).forEach(it=>{const r=it.x+(it.w||it.s.length*4.5);if(cur&&it.x-cur.r<=8){cur.s+=" "+it.s;cur.r=r}else{cur={x:it.x,r,s:it.s};C.push(cur)}});
  let nd=0;C.forEach(c=>{const s=c.s.toLowerCase().trim();c.k=/balance/.test(s)?"bal":/date/.test(s)?(nd++?"date2":"date"):/detail|description|narration|particular|merchant|remark/.test(s)?"desc":/currency/.test(s)&&!/amount/.test(s)?"cur":/equivalent|billing amount|billed amount|local amount|amount in [a-z]{3}|\((?:qar|inr|aed|usd)\)/.test(s)?"eq":/debit|withdraw/.test(s)?"dc":/credit|deposit/.test(s)?"cc":/amount|value/.test(s)?"amt":/^(?:transaction )?(?:type|status)$/.test(s)?"type":"x";
    if(c.k=="eq"){const m=c.s.match(/\b([A-Z]{3})\b/);c.cur=m?m[1]:""}});
  if(C.some(c=>c.k=="bal")||!C.some(c=>c.k=="date")||!C.some(c=>c.k=="desc")||!C.some(c=>/^(amt|eq|dc|cc)$/.test(c.k)))return null;return {cols:C}}
const SNUM=/^\(?-?(?:\d{1,3}(?:,\d{2,3})+|\d+)\.\d{2}\)?(?:\s?(?:Cr|Dr|CR|DR))?$/;
function stmtColAt(it,nb){const C=nb.cols,s=it.s.trim();if(SNUM.test(s)){const cx=it.x+(it.w||s.length*4.5)/2;return C.filter(c=>/^(amt|eq|dc|cc)$/.test(c.k)).sort((a,b)=>Math.abs((a.x+a.r)/2-cx)-Math.abs((b.x+b.r)/2-cx))[0]||null}
  let k=null;for(const c of C){if(it.x>=c.x-6)k=c;else break}return k}
function stmtParseNB(lines,nb){const rows=[];let cur=null;const eqc=(nb.cols.find(c=>c.k=="eq")||{}).cur||"";
  for(const L of lines){const t=L.t.trim();if(!t)continue;
    if(/date/i.test(t)&&/amount|debit|credit/i.test(t)&&/detail|description|narration|particular|merchant/i.test(t))continue;
    if(/^(page \d|printed|generated|total|disclaimer|note:|this is a|\*)/i.test(t)){cur=null;continue}
    const by={},A=[];(L.items||[]).forEach(it=>{const c=stmtColAt(it,nb);if(!c)return;(by[c.k]=by[c.k]||[]).push(it.s.trim());if(/^(amt|eq|dc|cc)$/.test(c.k)&&SNUM.test(it.s.trim()))A.push({k:c.k,s:it.s.trim()})});
    const dm=t.match(SDRE);
    if(dm){const d=pDate(dm[1].replace(/\s/g,"-"));if(!d){cur=null;continue}
      let a=A.find(x=>x.k=="eq")||A.find(x=>x.k=="amt")||A.find(x=>x.k=="dc")||A.find(x=>x.k=="cc");
      if(!a){const m=[...t.matchAll(SAMRE)].filter(m=>m.index>=dm[0].length);if(m.length)a={k:"amt",s:m[m.length-1][0]}}
      const val=a?amtOf(a.s):0;if(!(Math.abs(val)>0.004)){cur=null;continue}
      const o=A.find(x=>x.k=="amt"),fc=(by.cur||[]).join(" ").trim().toUpperCase();
      cur={date:d,amt:Math.round(Math.abs(val)*100)/100,val,desc:(by.desc||[]).join(" ").replace(/\s+/g," ").trim(),type:(by.type||[]).join(" ").trim(),bal:null,sv:val,
        dr:/(Dr|DR)\s*$/.test(a.s)||a.k=="dc",cr:/(Cr|CR)\s*$/.test(a.s)||a.k=="cc",pend:/unbilled|pending/i.test((by.date2||[]).join(" ")),fx:a.k=="eq"&&o&&/^[A-Z]{3}$/.test(fc)&&eqc&&fc!=eqc?fc+" "+Math.abs(amtOf(o.s)).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}):""};
      cur.parts=[{t:cur.desc,r:0}];rows.push(cur);continue}
    if(cur){const more=(by.desc||[]).join(" ").replace(/\s+/g," ").trim(),ty=(by.type||[]).join(" ").trim();if(more&&more.length<90)cur.desc=(cur.desc+" "+more).trim();if(ty)cur.type=(cur.type+" "+ty).trim()}}
  const pay=r=>/payment|refund|credit|reversal|cash ?back|return/i.test(r.type),deb=r=>/billed|unbilled|purchase|fee|charge|debit|carried|interest|withdraw|cash adv/i.test(r.type),neg=rows.filter(r=>r.val<0).length,negOut=neg>=rows.length-neg;
  rows.forEach(r=>{const dir=r.cr&&!r.dr?"in":r.dr&&!r.cr?"out":r.type&&pay(r)?"in":r.type&&deb(r)?"out":((r.val<0)==negOut?"out":"in");r.dir=dir;r.dr=dir=="out";r.cr=dir=="in"});
  const o=stmtOrder(rows,null);o.nobal=true;return o}
/* Banks list rows oldest-first or newest-first, and same-day rows in any order. Follow the running balance to find the real order. */
function stmtOrder(rows,open0){if(!rows.length)return {rows,open:open0,close:null};
  if(rows.some(r=>r.sv<0))rows.forEach(r=>{if(!r.dr&&!r.cr){r.dir=r.sv<0?"out":"in";r.how="sign"}});rows.forEach(r=>{if(r.dr)r.dir="out";if(r.cr)r.dir="in"});
  const B=rows.filter(r=>r.bal!=null),eq=(a,b)=>Math.abs(a-b)<0.011,sg=r=>r.dir=="in"?r.amt:-r.amt;
  const mk=()=>{B.forEach(r=>r.pre=Math.round((r.bal-sg(r))*100)/100);let chain=null;if(B.length>=2){const starts=B.filter(r=>!B.some(o=>o!==r&&eq(o.bal,r.pre))).sort((a,b)=>a.date.localeCompare(b.date));
    for(const st of starts){const used=new Set([st]),C=[st];let c=st;for(;;){const nx=B.filter(o=>!used.has(o)&&eq(o.pre,c.bal)).sort((a,b)=>a.date.localeCompare(b.date))[0];if(!nx)break;C.push(nx);used.add(nx);c=nx}if(!chain||C.length>chain.length)chain=C;if(C.length==B.length)break}}return chain};
  const back=C=>{if(!C||C.length<2)return false;let up=0,dn=0;for(let i=1;i<C.length;i++){if(C[i].date>C[i-1].date)up++;else if(C[i].date<C[i-1].date)dn++}return dn>up};
  const weak=r=>!r.dr&&!r.cr&&r.how!="sign"&&r.how!="hdr"&&r.how!="dash";let chain=mk();
  if(B.some(weak)&&(back(chain)||!(chain&&chain.length==B.length))){const W=B.filter(weak),flip=()=>W.forEach(r=>r.dir=r.dir=="in"?"out":"in");flip();const c2=mk();
    if(c2&&c2.length==B.length&&!back(c2)&&(!chain||chain.length<B.length||back(chain)))chain=c2;else{flip();chain=mk()}}
  let open=open0,close=null,ordered;
  if(chain&&chain.length==B.length){ordered=[...chain,...rows.filter(r=>r.bal==null)].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:chain.indexOf(a)-chain.indexOf(b));open=open0!=null?open0:chain[0].pre;close=chain[chain.length-1].bal}
  else{const newestFirst=rows[0].date>rows[rows.length-1].date;ordered=newestFirst?[...rows].reverse():[...rows];const f=ordered.find(r=>r.bal!=null),l=[...ordered].reverse().find(r=>r.bal!=null);
    if(open==null&&f)open=f.pre;close=l?l.bal:null;ordered=ordered.map((r,i)=>({r,i})).sort((a,b)=>a.r.date<b.r.date?-1:a.r.date>b.r.date?1:a.i-b.i).map(o=>o.r)}
  return {rows:ordered,open,close,chain:!!(chain&&chain.length==B.length)}}
const QCITY="DOHA|AL ?WAKRAH?|WAKRA|AL ?KHOR|LUSAIL|AL ?RAYYAN|RAYYAN|UMM ?SALAL|MESAIEED|AL ?DAAYEN|DUKHAN|AL ?SHAMAL";
function cardDesc(s){let x=String(s||"").replace(/\s+/g," ").trim();if(/paid using bank ?direct/i.test(x))return "bankDirect payment";
  x=x.replace(/^(?:UNBILLED|PENDING|BILLED)\s+/i,"").replace(/\bAUTH(?:ORI[SZ]ATION)?\b\.?(?:\s*(?:QAR|USD|INR|AED))?(?:\s*(?:NO|CODE|#)\.?)?\s*:?\s*\d{3,}/ig," ").replace(/\bAUTH\b\.?(?:\s*(?:QAR|USD|INR|AED))?(?:\s*(?:NO|CODE)\.?)?\s*$/i," ")
    .replace(/\s(?:QAR|USD|INR|AED|SAR|EUR|GBP|KWD|OMR|BHD)(?=\s|$)/g," ").replace(/\s+(?:Unbilled|Billed|Payment\/Refund|Carried Forward\s*-?)\s*$/i,"").replace(/\s+/g," ").trim();
  x=x.replace(new RegExp("\\s+(?:"+QCITY+")\\s+(?:QA|QAT|634)$","i"),"").replace(/\s+(?:QA|QAT|634)$/i,"").replace(new RegExp("\\s+(?:"+QCITY+")$","i"),"").replace(/\s+DOH$/i,"");
  return stTidy(x.replace(/[\s\-–,.:#]+$/,"").trim())}
/* card terminals cut names short and repeat them in the city field: "CITY FRESH MARKET W CITY FRESH MA" -> CITY FRESH MARKET, "DISCOUNT CENTE" -> DISCOUNT CENTER */
const STRUNC={CENTE:"CENTER",CENTR:"CENTRE",RESTAURAN:"RESTAURANT",RESTAURA:"RESTAURANT",RESTAUR:"RESTAURANT",RESTAU:"RESTAURANT",RESTA:"RESTAURANT",RES:"RESTAURANT",SUPERMARKE:"SUPERMARKET",SUPERMARK:"SUPERMARKET",SUPERMAR:"SUPERMARKET",SUPERMA:"SUPERMARKET",SUPERM:"SUPERMARKET",
  HYPERMARKE:"HYPERMARKET",HYPERMARK:"HYPERMARKET",HYPERMAR:"HYPERMARKET",HYPERMA:"HYPERMARKET",TRADIN:"TRADING",TRDG:"TRADING",PHARMAC:"PHARMACY",CAFETERI:"CAFETERIA",CAFETER:"CAFETERIA",STATIO:"STATION",SERVIC:"SERVICES",INTERNATIONA:"INTERNATIONAL",INTERNATION:"INTERNATIONAL",
  INTERNATIO:"INTERNATIONAL",INTERNATI:"INTERNATIONAL",TOURIS:"TOURISM",DISCOUN:"DISCOUNT",SHOPPIN:"SHOPPING",COMPAN:"COMPANY",CONTRACTIN:"CONTRACTING",MKT:"MARKET",ELECTRONI:"ELECTRONICS"};
function stTidy(x){let W=String(x||"").split(" ").filter(Boolean),cut=false;
  for(let j=2;j<W.length;j++){const t=W.slice(j);if(t.length>j)continue;if((t.length>=2||t[0].length>=3)&&t.every((w,i)=>i<t.length-1?w==W[i]:W[i].startsWith(w))){W=W.slice(0,j);cut=true;break}}
  if(cut&&W.length>2&&/^[A-Z]$/.test(W[W.length-1]))W.pop();const L=W[W.length-1];if(W.length>=2&&/^[A-Z]+$/.test(L||"")&&STRUNC[L])W[W.length-1]=STRUNC[L];return W.join(" ")}
const cardLike=r=>/\bAUTH\b|^(?:UNBILLED|PENDING)\b|paid using bank ?direct|\s(?:QA|QAT|634)(?:\s|$)/i.test(String(r||""));
const stPayLike=c=>/paid using|bank ?direct|payment received|payment.{0,12}thank|thank you for (?:your )?payment|auto ?pay|direct debit|online payment|card payment/i.test((c&&c.raw)||"");
/* Clean bank descriptions: "TRANSFER - DEBIT,010126L00001,rent,SAMPLE PERSON NAME" -> payee Sample Person Name, note rent */
/* the account or card a line is about: the number after "CARD NO" or "Transfer To" first, then the first masked number */
const stL4=raw=>{const s=String(raw||""),m=s.match(/card\s*(?:no|num(?:ber)?|ending(?:\s*with)?)\.?\s*:?\s*\d{0,6}[X*•]{2,}\s*(\d{4})(?!\d)/i)||s.match(/transfer(?:red)?\s*(?:to|from)\s*:?\s*(?:(?:a\/c|acc(?:oun)?t)\s*(?:no\.?)?\s*:?\s*)?\d{0,6}[X*•]{2,}\s*(\d{4})(?!\d)/i)||s.match(/\b(?:to|from)\s*(?:a\/c|acct?|account)\s*(?:no\.?)?\s*:?\s*\d{0,6}[X*•]{2,}\s*(\d{4})(?!\d)/i)||s.match(/(?:^|[^A-Za-z0-9])\d{0,6}[X*•]{2,}\s*(\d{4})(?!\d)/i);return m?m[1]:""};
function stmtClean(desc){const raw=String(desc||"").replace(/\s+/g," ").trim(),T=raw.split(/\s*[,|]\s*/).map(x=>x.trim()).filter(Boolean),l4=stL4(raw);
  const code=x=>/\d{5,}/.test(x.replace(/[\s-]/g,""))||/X{3,}/i.test(x)||(/^[A-Z0-9\-\/ .:]{4,}$/.test(x)&&/\d/.test(x))||/^(paid using|transfer to|transfer from|card no|ref\b|bankdirect)/i.test(x);
  let hint="";if(/transfer (?:to|from) own|own account|own a\/c/i.test(raw))hint="own";else if(/\batm\b|cash withdrawal/i.test(raw))hint="atm";else if(/card bill|card payment|credit card pay|cc payment/i.test(raw))hint="card";
  const names=T.slice(1).map(x=>x.replace(/^(?:BO|B\/O|BY ORDER(?: OF)?|ORD(?:ERING)? CUST(?:OMER)?)[\s:]+(?=[A-Za-z]{3})/i,"")).filter(x=>/[A-Za-z]{3,}/.test(x)&&!code(x)),big=[...names].sort((a,b)=>b.replace(/[^A-Za-z]/g,"").length-a.replace(/[^A-Za-z]/g,"").length)[0]||"",note=names.filter(x=>x!==big).join(", ");
  const tc=x=>tcase(String(x).toLowerCase());let payee=big?tc(big):"";
  if(hint=="own")payee="Own account"+(l4?" "+l4:"");else if(hint=="card")payee="Card bill"+(l4?" "+l4:"");else if(hint=="atm")payee="ATM"+(big?" · "+tc(big):"");
  if(!payee)payee=cardLike(raw)?(()=>{const cd=cardDesc(raw);return cd.length>=3?(/[a-z]/.test(cd)?cd:cd.split(" ").map(w=>/^[A-Z]{2,4}$/.test(w)&&!/[AEIOUY]/.test(w)?w:tc(w)).join(" ")):descPayee(raw)})():descPayee(raw);let cat=hint?"":/salary/i.test(raw)?"Salary":"";
  if(!hint){if(/rdamaste|rdavostr|\bremitter\b|vostro|inward remit|foreign inward|\bfirc\b|western union|moneygram|remitly/i.test(raw)){payee="Remittance"+(/federa/i.test(raw)?" · Federal Bank":/masterca/i.test(raw)?" · Mastercard":/visa direct|\bvmt\b/i.test(raw)?" · Visa":"");cat="Money sent home"}
    else if(/\bint\.?\s*pd\b|interest paid|interest credit|\bsb int\b|int\.?\s*cr\b|savings interest/i.test(raw)){payee="Interest";cat="Interest"}
    else if(/^(?:UPI|IMPS|NEFT|RTGS)[\/-]/i.test(raw)&&payee){const F=/\/P2M\//i.test(raw)?null:stFam(payee);if(F){payee=F.rel=="self"?"Own account":F.name;cat=F.rel=="self"?"Own account transfer":"Family"}else if(!/[a-z]/.test(payee))payee=payee.split(" ").map(w=>/^[A-Z]{2,4}$/.test(w)&&!/[AEIOUY]/.test(w)?w:tc(w)).join(" ")}}
  return {payee:payee.slice(0,40),note:note.slice(0,60),hint,l4,cat,raw}}
function stPeople(p,A){const C={};p.M.res.forEach(r=>{if(r.dir!="out"||!/^(?:UPI|IMPS|NEFT|RTGS)[\/-]/i.test(String(r.desc||""))||/\/P2M\//i.test(r.desc))return;const k=stmtClean(r.desc);if(k.cat||!k.payee||k.payee.length<3)return;(C[k.payee]=C[k.payee]||{n:0,s:0});C[k.payee].n++;C[k.payee].s+=r.amt});
  const L=Object.entries(C).filter(([,o])=>o.n>=2).sort((a,b)=>b[1].s-a[1].s).slice(0,4);if(!L.length)return "";
  return `<div style="margin-top:10px"><b>Paid to people more than once</b><p class="note" style="margin:2px 0 6px">If one is family, tap it: those payments are then labelled Family.</p>${L.map(([nm,o])=>`<div class="hbl" style="margin:6px 0"><span>${esc(nm)}<small style="display:block;color:var(--mute)">${o.n} payments · ${fmx(o.s,A.cur)}</small></span><button class="btn sm ghost" data-act="stFamOpen" data-id="${esc(nm)}">Family member</button></div>`).join("")}</div>`}
/* a UPI name such as "KKAVYA" belongs to a family member called Kavya */
const stFam=nm=>{const s=String(nm||"").toLowerCase().replace(/[^a-z]/g,"");if(s.length<4)return null;return (S.fam||[]).find(m=>String(m.name||"").toLowerCase().split(/\s+/).map(w=>w.replace(/[^a-z]/g,"")).filter(w=>w.length>=4).some(w=>s.includes(w)))||null};
const stSame=(a,b)=>{const n=x=>String(x||"").replace(/\s+/g,"").toLowerCase();const A=n(a),B=n(b);return !!A&&(B.startsWith(A.slice(0,60))||A.startsWith(B.slice(0,60)))};
const stCat=(k,r,A)=>A.type=="card"&&r.dir=="in"?(stPayLike(k)?"Card payment":"Refund"):k.hint&&r.dir=="out"?(k.hint=="atm"?"Cash withdrawal":k.hint=="own"?"Own account transfer":"Card bill"):(k.cat||catFor(k.payee)||catGuess(k.note+" "+k.payee)||"");
/* the account whose number ends in these 4 digits: exact last 4 only (a short "1" saved somewhere must not catch every number ending in 1) */
const acc4=(d,not,want)=>{d=String(d||"").replace(/\D/g,"").slice(-4);if(d.length<4)return null;const z=x=>String(x==null?"":x).replace(/\D/g,""),hit=x=>{const l=z(x.l4),n=z(x.no);
    return (l.length>=3&&d.endsWith(l))||(x.l4s||[]).map(z).includes(d)||(n.length>=4&&n.slice(-4)==d)||new RegExp("(?:^|\\D)"+d+"(?!\\d)").test(x.name||"")};
  const L=S.acc.filter(x=>x.id!=not&&hit(x));if(L.length<2)return L[0]||null;const n=not?ac(not):null;return L.find(x=>want&&x.type==want)||L.find(x=>n&&x.cur==n.cur)||L[0]};
function stmtTarget(c,A){if(c.hint=="own"||c.hint=="card")return acc4(c.l4,A.id,c.hint=="card"?"card":"bank");if(c.hint=="atm")return S.acc.find(x=>x.type=="cash"&&x.cur==A.cur&&x.id!=A.id)||null;return null}
/* money into a card from a bank account (or into this account from your own other account) */
function stmtSource(c,A,r){if(!A)return null;if(A.type!="card"){if(c.hint!="own")return null;const a=acc4(c.l4,A.id,"bank");return a&&a.type!="card"?a:null}if(!stPayLike(c))return null;const a=acc4(c.l4,A.id);if(a&&a.type!="card")return a;
  let L=S.acc.filter(x=>x.id!=A.id&&x.type=="bank"&&x.cur==A.cur);if(L.length>1&&/bank ?direct/i.test(c.raw)){const q=L.filter(x=>/cbq|commercial/i.test(x.name+" "+(x.bank||"")));if(q.length)L=q}
  /* more than one: the one where this payment already shows (same reference, or the same amount going out within 3 days) */
  if(L.length>1&&r){const ref=stRef(c.raw),by=L.filter(B=>S.tx.some(x=>(ref&&String(x.raw||"").includes(ref)&&(x.acc==B.id||x.to==B.id))||(Math.abs(dl(x.date)-dl(r.date))<=3&&x.acc==B.id&&(x.kind=="out"||x.kind=="tr")&&Math.abs((+x.amt||0)-r.amt)<0.011)));if(by.length==1)return by[0]}
  return L.length==1?L[0]:null}
/* the bank's reference for a payment, e.g. 010126K00001: the same on the bank account and on the card */
const stRef=s=>{const m=String(s||"").match(/\b(\d{6}[A-Z]\d{5})\b/)||String(s||"").match(/\b(?:ref(?:erence)?\.?\s*(?:no\.?)?\s*:?\s*)([A-Z0-9]{8,})\b/i);return m?m[1]:""};
function trGot(amt,A,B){return A.cur==B.cur?amt:A.cur=="QAR"&&B.cur=="INR"?Math.round(amt*fx()*100)/100:A.cur=="INR"&&B.cur=="QAR"?Math.round(amt/fx()*100)/100:amt}
const sgn=(x,id)=>{if(x.kind=="tr"){if(x.acc==id)return -((+x.amt||0)+(+x.fee||0));if(x.to==id)return +x.got||0;return 0}if(x.acc!=id)return 0;return (x.kind=="in"||x.kind=="adj")?+x.amt:-x.amt};
function balAt(acc,d){const A=ac(acc);return bal(A)-S.tx.filter(x=>x.date>d).reduce((s,x)=>s+sgn(x,acc),0)}
/* How likely an entry already in the app is this statement line: exact amount, then the nearest date, then the right kind
   (a transfer to the right account beats spending; the entry this statement added before beats a look-alike) */
function stKindCost(x,k,r,A){const B=r.dir=="out"?stmtTarget(k,A):stmtSource(k,A,r);let c=0;
  if(B){if(x.kind=="tr")c=(x.acc==A.id?x.to:x.acc)==B.id?0:0.3;else c=0.5}else if(x.kind=="tr"&&!k.hint&&!stPayLike(k))c=0.4;
  const ref=stRef(r.desc);if((x.raw&&stSame(x.raw,r.desc))||(ref&&String(x.raw||"").includes(ref)))c-=0.2;return c}
/* an amount slightly off (328.28 typed for 328.38) counts only for the same thing: the same accounts, the same reference or the same name */
function stLike(x,k,r,A){const ref=stRef(r.desc);if(ref&&String(x.raw||"").includes(ref))return true;
  if(x.kind=="tr"){const o=x.acc==A.id?x.to:x.acc,B=r.dir=="out"?stmtTarget(k,A):stmtSource(k,A,r);return B?o==B.id:!!(k.hint=="card"||k.hint=="own"||stPayLike(k))}
  const w=s=>String(s||"").toLowerCase().match(/[a-z]{4,}/g)||[],a=new Set(w(k.payee+" "+k.raw).filter(t=>!/^(transfer|debit|credit|payment|card|bill|doha|qatar|bank)$/.test(t)));
  return w((x.payee||"")+" "+(x.note||"")).some(t=>a.has(t))||(!!x.raw&&stSame(x.raw,r.desc))}
const stTol=a=>Math.min(5,Math.max(0.05,Math.abs(a)*0.01));
function stmtMatch(P,acc){const A=ac(acc),L=S.tx.filter(x=>x.kind!="adj").map(x=>({x,v:sgn(x,acc)})).filter(o=>Math.abs(o.v)>0.004),R=P.rows,K=R.map(r=>stmtClean(r.desc)),C=[];L.forEach(o=>o.d=dl(o.x.date));
  R.forEach((r,i)=>{const want=r.dir=="in"?r.amt:-r.amt,rd=dl(r.date);L.forEach(o=>{const dd=Math.abs(o.d-rd);if(dd>3)return;const dv=Math.abs(o.v-want);
    if(dv<0.011)C.push({i,o,c:dd+stKindCost(o.x,K[i],r,A)});else if(o.v*want>0&&dv<=stTol(want)&&stLike(o.x,K[i],r,A))C.push({i,o,c:10+dd+dv,near:1})})});
  /* one entry for one line, best pairs first, so a same-day entry is never taken by a line two days away */
  C.sort((a,b)=>a.c-b.c);const used=new Set(),res=R.map(r=>({...r,match:""}));
  C.forEach(q=>{const r=res[q.i];if(r.match||used.has(q.o.x.id))return;r.match=q.o.x.id;if(q.near){r.near=1;r.appAmt=Math.round(Math.abs(q.o.v)*100)/100}used.add(q.o.x.id)});
  const W=L.filter(o=>(o.x.kind=="in"||o.x.kind=="out")&&o.x.acc==acc);
  res.forEach(r=>{const want=r.dir=="in"?r.amt:-r.amt,m=W.filter(o=>!used.has(o.x.id)&&Math.abs(o.v+want)<0.011&&Math.abs(dl(o.x.date)-dl(r.date))<=3).sort((a,b)=>Math.abs(dl(a.x.date)-dl(r.date))-Math.abs(dl(b.x.date)-dl(r.date)))[0];if(!m)return;used.add(m.x.id);if(r.match)r.dup=m.x.id;else r.flip=m.x.id});
  const D_=R.map(r=>r.date).sort(),from=D_[0],to=D_[D_.length-1],dups=[];
  /* left over, and the same amount as a line the app already has within 3 days: saved twice */
  if(from)L.forEach(o=>{if(used.has(o.x.id))return;const i=res.findIndex((r,j)=>{if(!r.match)return false;const want=r.dir=="in"?r.amt:-r.amt,dv=Math.abs(o.v-want),dd=Math.abs(dl(o.x.date)-dl(r.date));
      return dd<=3&&((dv<0.011&&(dd<=1||!o.x.payee||stLike(o.x,K[j],r,A)))||(o.v*want>0&&dv<=stTol(want)&&stLike(o.x,K[j],r,A)))});if(i<0)return;dups.push({x:o.x,i});used.add(o.x.id)});
  const only=from?L.filter(o=>!used.has(o.x.id)&&o.x.date>=from&&o.x.date<=to).map(o=>o.x):[];
  return {res,only,from,to,dups,day0:from?iso(new Date(D(from).getTime()-864e5)):""}}
const descPayee=d=>{const m=String(d||"").match(/(?:UPI|IMPS|NEFT|RTGS|NACH|ACH|MMT)[\/-](?:[^\/\s]+\/)+([A-Za-z][A-Za-z .&'\-]{1,40})/i);return (m?m[1]:String(d||"").replace(/[\d\/\\:#*-]+/g," ").replace(/\s+/g," ")).trim().slice(0,40)};
let stPend=null;
async function stmtFile(f,pw){const o=$("#csvout"),acc=v("f_acc");if(!o)return;o.innerHTML=`<p class="note">Reading the PDF…</p>`;
  try{const buf=await f.arrayBuffer(),P=stmtParse(await pdfLines(buf,pw));if(!P.rows.length){o.innerHTML=`<p class="note" style="color:var(--late)">No transactions found in this PDF. If it’s a scanned image, it can’t be read; use the bank’s downloaded e-statement instead.</p>`;return}
    stPend={file:f,acc,P,M:stmtMatch(P,acc)};stmtShow()}
  catch(e){const k=pdfErr(e);if(k){stPend={file:f,acc};o.innerHTML=`<div class="card" style="margin-top:10px"><b>${k=="wrong"?"That password didn’t work":"This statement has a password"}</b><p class="note">Banks often use part of your customer ID or date of birth. Check the email the statement came with.</p>${F("f_pdfpw","PDF password","","password")}<div class="acts"><button class="btn" data-act="stPw">Open</button></div></div>`;return}
    o.innerHTML=`<p class="note" style="color:var(--late)">${esc(e.message||e)}</p>`}}
function stRowLab(r,A){const c=stmtClean(r.desc),ex=(r.fx?" · "+r.fx:"")+(r.pend?" · not billed yet":"");
  if(r.dir=="in"&&A.type=="card"){if(stPayLike(c)){const F0=stmtSource(c,A);return (F0?"Payment from "+F0.name:"Card payment (add the bank account it came from to link it)")+ex}return "Refund"+ex}
  const B=r.dir=="out"?stmtTarget(c,A):null;return (c.hint&&r.dir=="out"?(B?"Transfer to "+B.name:c.hint=="atm"?"Cash withdrawal (add a Cash wallet to track it)":c.hint=="own"?"Your own account"+(c.l4?" ending "+c.l4:"")+" (add it to track transfers)":"Card bill"+(c.l4?" "+c.l4:"")+" (add the card to track it)"):(c.cat||catFor(c.payee)||catGuess(c.note+" "+c.payee)||"No category")+(c.note?" · "+c.note:""))+ex}
/* no running balance in the file: ask for the balance now and work out the opening */
function stOweBox(p,A){const b=Math.round(balAt(A.id,today())*100)/100,card=A.type=="card",T=p.T,L=card?cardLim(A):0;
  if(!card)return `<div class="card" style="margin-top:10px"><b>What is the balance now?</b><p class="note" style="margin:4px 0 0">This file lists transactions only, without a running balance, so it can’t show what the account had before the first one. Type the balance the bank app shows now.</p>
    <p class="note">In the app now: <b>${fmx(b,A.cur)}</b>${T!=null&&Math.abs(b-T)<0.01?" ✓":""}</p>${F("f_owe","Balance now",T!=null?String(T):"","number",'placeholder="0.00"')}<div class="acts"><button class="btn" data-act="stSetBal">Set the balance</button></div></div>`;
  const ok=T!=null&&Math.abs(b-T)<0.01,av=Math.round((L+b)*100)/100;
  return `<div class="card" style="margin-top:10px"><b>What does the bank app show for this card now?</b><p class="note" style="margin:4px 0 0">This file lists transactions only, without a running balance. Type what the bank app shows now; the app works out the balance before the first transaction, so every line after it is right.</p>
  <p class="note">In the app now: <b>${L?fmx(av,A.cur)+" available":""}${L?" · ":""}${b<0?"you owe "+fmx(-b,A.cur):b>0?fmx(b,A.cur)+" in credit":"nothing owed"}</b>${ok?" ✓":""}</p>
  ${L?`<p class="note" style="margin-top:-4px">Card limit ${fmx(L,A.cur)}</p>`:F("f_lim3","Card limit","","number",'placeholder="Credit limit"')}
  ${F("f_avl","Available to spend now",ok&&L?String(av):"","number",'placeholder="0.00"')}<p class="note" style="margin:2px 0 8px">or</p>${F("f_owe","Amount you owe now",ok?String(Math.abs(T)):"","number",'placeholder="0.00"')}
  <div class="acts"><button class="btn" data-act="stSetBal">Set the card balance</button></div></div>`}
function stBalTo(p,T){const A=ac(p.acc),day0=iso(new Date(D(p.M.from).getTime()-864e5)),to=p.M.to;
  S.tx.filter(x=>x.acc==A.id&&x.kind=="adj"&&x.date>=day0&&(/^Opening balance worked out/.test(x.note||"")||(x.date<=to&&/^(Matched to the bank statement|Opening balance from the bank statement)/.test(x.note||"")))).forEach(x=>removeTx(x.id));
  const d=Math.round((T-balAt(A.id,today()))*100)/100;if(Math.abs(d)>=0.005)addTx({kind:"adj",acc:A.id,amt:d,cur:A.cur,date:day0,cat:"Balance correction",note:"Opening balance worked out from the balance now"});return d}
function stmtShow(){const p=stPend,o=$("#csvout");if(!o||!p||!p.M)return;const A=ac(p.acc),nw=p.M.res.filter(r=>!r.match&&!r.flip),app=p.P.close!=null?balAt(p.acc,p.M.to):null,W4=p.P.l4?acc4(p.P.l4,null):null;
  o.innerHTML=`${p.P.l4&&W4&&W4.id!=A.id?`<div class="card" style="margin-top:10px;border-color:var(--late)"><b>This file is for the card ending ${esc(p.P.l4)}</b><p class="note" style="margin:4px 0 0">You chose ${esc(A.name)}. It belongs in ${esc(W4.name)}.</p><div class="acts"><button class="btn sm" data-act="stUseAcc" data-id="${W4.id}">Use ${esc(W4.name)}</button></div></div>`:""}<div class="card" style="margin-top:10px"><b>${fmt(p.M.from)} to ${fmt(p.M.to)}: ${p.M.res.length} transactions</b><small style="display:block;color:var(--mute)">${p.M.res.length-nw.length} already in the app · ${nw.length} new · going into ${esc(A.name)}</small>
  ${nw.length?nw.map((r,i)=>`<label class="hbl" style="margin:8px 0;gap:8px;align-items:flex-start"><span style="display:flex;gap:8px"><input type="checkbox" data-sti="${p.M.res.indexOf(r)}" checked style="width:auto;margin-top:3px"><span>${fmt(r.date)} · ${esc(stmtClean(r.desc).payee||"No description")}<small style="display:block;color:var(--mute)">${esc(stRowLab(r,A))}</small></span></span><b>${r.dir=="out"?"−":"+"}${fmx(r.amt,A.cur)}</b></label>`).join(""):`<p class="note">Everything in this statement is already in the app.</p>`}
  ${app!=null?`<p class="note">Balance on ${fmt(p.M.to)}: statement ${fmx(p.P.close,A.cur)} · app ${fmx(app,A.cur)}${Math.abs(app-p.P.close)>0.009?" (after adding the new ones it is checked again)":" ✓"}</p>`:""}
  ${stPeople(p,A)}${stFixList(p,A)}${p.M.only.length?`<details><summary>${p.M.only.length} in the app but not in the statement</summary>${p.M.only.map(x=>`<div class="hbl" style="margin:6px 0"><span>${fmt(x.date)} · ${esc(x.payee||x.cat||KIND[x.kind])}</span><b>${fmx(Math.abs(sgn(x,p.acc)),A.cur)}</b></div>`).join("")}<p class="note">These may be cash, typed twice, or from another account.</p></details>`:""}</div>
  ${nw.length?`<div class="acts"><button class="btn" data-act="stImportGo">Add the ticked ones</button></div>`:""}${app!=null?`<div class="acts"><button class="btn ghost" data-act="stFixBal">Make the balance match the statement</button></div>`:""}${p.P.nobal?stOweBox(p,A):""}`}
/* the same money already noted on the other account: a payment received on the card, "Card bill" spending on the bank account,
   or a transfer that names the wrong account. dirB: "in" when B receives it, "out" when B pays it. */
function stMirror(B,A,amt,date,dirB,ref,skip){if(!B||!B.id)return null;const dd=x=>Math.abs(dl(x.date)-dl(date)),refd=x=>!!ref&&String(x.raw||"").includes(ref),
    same=v=>Math.abs(v-amt)<0.011||(!!ref&&Math.abs(v-amt)<=stTol(amt)),looks=x=>refd(x)||/card ?bill|card payment|credit card|own account|own a\/c|transfer|payment|paid using|bank ?direct/i.test([x.cat,x.payee,x.note,x.raw].join(" "));
  return S.tx.filter(x=>!(skip&&skip.has(x.id))&&x.kind!="adj"&&dd(x)<=3&&((x.acc==B.id&&x.kind==dirB&&same(+x.amt||0)&&looks(x))||
    (x.kind=="tr"&&(dirB=="in"?x.to==B.id&&x.acc!=A.id&&same(+x.got||0):x.acc==B.id&&x.to!=A.id&&same(+x.amt||0))&&(refd(x)||!!x.imp||looks(x)))))
    .sort((a,b)=>dd(a)-dd(b))[0]||null}
/* payee names that say nothing: the bank's name for the shop is better */
const STWEAK=/^(spent|paid|payment|purchase|debit|pos|txn|transaction|card|card spend|food|shopping|fuel|groceries|grocery|others?|misc|expense|unknown|new entry)$/i;
const stEff=(k,r,A,x)=>stCat(k,r,A)||(x&&x.cat)||"";
/* entries already in the app for this statement that need putting right */
function stFixRows(p,A){const out=[],M=p.M,used=new Set();M.res.forEach(r=>{const k=stmtClean(r.desc),ref=stRef(r.desc);
  if(r.flip){const x=S.tx.find(t=>t.id==r.flip);if(x)out.push({x,k,r,op:"flip"})}
  if(r.dup){const x=S.tx.find(t=>t.id==r.dup);if(x)out.push({x,k,r,op:"dup"})}
  if(!r.match)return;const x=S.tx.find(t=>t.id==r.match);if(!x)return;
  if(r.near&&Math.abs((r.appAmt||0)-r.amt)>=0.005)out.push({x,k,r,op:"amt"});
  if(x.kind=="tr"){
    if(x.acc==A.id&&r.dir=="out"){const B=stmtTarget(k,A);if(B&&x.to!=B.id){const e=stMirror(B,A,trGot(r.amt,A,B),r.date,"in",ref,used);if(e)used.add(e.id);out.push({x,k,B,r,e,op:"retr"})}
      else if(!B&&!k.hint&&x.imp&&!stSame(x.raw,r.desc))out.push({x,k,r,op:"untr"})}
    else if(x.to==A.id&&r.dir=="in"){const Src=stmtSource(k,A,r);if(Src&&x.acc!=Src.id){const e=stMirror(Src,A,trGot(r.amt,A,Src),r.date,"out",ref,used);if(e)used.add(e.id);out.push({x,k,B:Src,r,e,op:"resrc"})}}
    return}
  if(x.acc!=A.id||(x.kind!="out"&&x.kind!="in"))return;
  const B=x.kind=="out"?stmtTarget(k,A):null,Src=x.kind=="in"?stmtSource(k,A,r):null,moved=!!x.raw&&!stSame(x.raw,r.desc),raw=moved||/\d{5,}|,/.test(x.payee||"")||(x.note||"")==r.desc.slice(0,80)||(!!x.raw&&/[A-Z]{3,} [A-Z]{2,}/.test(x.payee||""));
  const recat=!!x.imp&&!!k.cat&&(x.cat||"")!=k.cat;
  if(B){const e=stMirror(B,A,trGot(r.amt,A,B),r.date,"in",ref,used);if(e)used.add(e.id);out.push({x,k,B,r,e,op:"tr"})}
  else if(Src){const e=stMirror(Src,A,trGot(r.amt,A,Src),r.date,"out",ref,used);if(e)used.add(e.id);out.push({x,k,B:Src,r,e,op:"trin"})}
  else if((raw||recat)&&k.payee&&(k.payee!=x.payee||(moved||recat)&&(x.cat||"")!=stEff(k,r,A,x)))out.push({x,k,r,op:"name",moved:moved||recat});
  else if(!k.hint&&k.payee&&k.payee.length>=3&&k.payee!=x.payee&&(!x.payee||STWEAK.test(String(x.payee).trim())||(!!x.cat&&x.payee==x.cat)))out.push({x,k,r,op:"name",moved:false,weak:true})});
  (M.dups||[]).forEach(d=>{const r=M.res[d.i];out.push({x:d.x,k:stmtClean(r.desc),r,op:"dup2"})});
  return out}
const stFixLab=f=>{const amt=(v,c)=>fmx(v,c||ac(f.x.acc).cur),mg=f.e?` (the ${esc(ac(f.e.acc).name)} entry of ${fmt(f.e.date)} is the same money and is merged into it)`:"";
  return f.op=="untr"?"Not a cash withdrawal or transfer: the bank shows a payment to "+f.k.payee+". Change it back"+(f.x.to&&ac(f.x.to).id?" ("+ac(f.x.to).name+" goes down by "+fmx(+f.x.got||0,ac(f.x.to).cur)+")":"")
    :f.op=="flip"?(f.x.kind=="in"?"Saved as money in, but the statement shows money out. Change it":"Saved as money out, but the statement shows money in. Change it")
    :f.op=="dup"?"Saved twice: the statement has this as "+(f.r.dir=="in"?"money in":"money out")+", already in the app. Remove this one"
    :f.op=="dup2"?"Saved twice: the bank has it once ("+fmt(f.r.date)+", "+amt(f.r.amt)+"), already matched. Remove this one"
    :f.op=="amt"?"Amount "+amt(f.r.appAmt)+" → "+amt(f.r.amt)+", as the bank shows"
    :f.op=="retr"?"Transfer to "+(ac(f.x.to).id?ac(f.x.to).name:"another account")+" → transfer to "+f.B.name+mg
    :f.op=="resrc"?"Payment from "+(ac(f.x.acc).id?ac(f.x.acc).name:"another account")+" → payment from "+f.B.name+mg
    :f.op=="trin"?"Money in → "+(ac(f.x.acc).type=="card"?"payment from ":"transfer from ")+f.B.name+mg
    :"Spending → transfer to "+f.B.name+mg};
function stFixList(p,A){const F=stFixRows(p,A);if(!F.length)return "";
  const I=F.map((f,i)=>({...f,i})),main=I.filter(f=>f.op!="name"),nm=I.filter(f=>f.op=="name"),sgnF=f=>f.op=="amt"?(f.r.dir=="in"?"+":"−"):(sgn(f.x,A.id)>=0?"+":"−");
  return `<div class="stsec"><b>${F.length} ${F.length==1?"entry":"entries"} can be fixed</b>
  ${main.map(f=>`<label class="hbl" style="margin:8px 0;gap:8px;align-items:flex-start"><span style="display:flex;gap:8px"><input type="checkbox" data-stf="${f.i}" checked style="width:auto;margin-top:3px"><span>${fmt(f.x.date)} · ${esc(f.op=="dup"||f.op=="dup2"?(f.x.payee||f.x.note||f.x.cat||KIND[f.x.kind]):f.k.payee)}<small style="display:block;color:var(--mute)">${stFixLab(f)}</small></span></span><b>${sgnF(f)}${fmx(f.op=="amt"?f.r.amt:Math.abs(sgn(f.x,A.id))||+f.x.amt,A.cur)}</b></label>`).join("")}
  ${nm.length?`<label class="hbl" style="margin:8px 0;gap:8px;align-items:flex-start"><span style="display:flex;gap:8px"><input type="checkbox" data-stf="names" checked style="width:auto;margin-top:3px"><span>${nm.some(f=>f.moved)?"Names and categories from the bank’s text":"Clearer names"} for ${nm.length} ${nm.length==1?"entry":"entries"}<small style="display:block;color:var(--mute)">${(()=>{const f=nm.find(f=>f.moved)||nm[0],ca=stEff(f.k,f.r,A,f.x);return esc((f.x.payee||f.x.cat||"(no name)").slice(0,30)+(f.moved&&f.x.cat?" ("+f.x.cat+")":""))+" → "+esc(f.k.payee+(f.moved&&ca?" ("+ca+")":""))})()}${nm.length>1?" and "+(nm.length-1)+" more":""}</small></span></span></label>`:""}
  <div class="acts"><button class="btn ghost sm" data-act="stFix">Fix the ticked ones</button></div></div>`}
/* every change made from a statement is logged, so one tap undoes it: added ids, removed ids, entries and accounts as they were */
const stLogNew=()=>({add:[],del:[],mod:[],acc:[]});
function stMod(log,x){if(log&&x&&!log.mod.some(o=>o.id==x.id)&&!log.add.includes(x.id))log.mod.push(JSON.parse(JSON.stringify(x)))}
function stDel(log,id){const x=removeTx(id);if(x&&log&&!log.add.includes(id))log.del.push(id);return x}
function stAccMod(log,k){if(log&&k&&k.id&&!log.acc.some(o=>o.id==k.id))log.acc.push(JSON.parse(JSON.stringify(k)))}
function stUndoLog(log){if(!log)return;log.add.forEach(i=>removeTx(i));S.bin=S.bin.filter(b=>!log.add.includes(b.r.id));log.del.forEach(i=>untrash(i));
  log.mod.forEach(o=>{const x=S.tx.find(t=>t.id==o.id);put("tx",stamp({...o},x||o))});log.acc.forEach(o=>{const k=S.acc.find(a=>a.id==o.id);if(k)put("acc",stamp({...o},k));else S.acc.push(o)});
  (log.accNew||[]).forEach(id=>{S.acc=S.acc.filter(a=>a.id!=id)})}
/* one statement line that isn't in the app yet. A transfer whose other side is already noted (a payment on the card, "Card bill" on the bank account)
   becomes that entry, so the money is never counted twice */
function stAddRow(p,A,r,batch,log,skip){const k=stmtClean(r.desc),ref=stRef(r.desc),B=r.dir=="out"?stmtTarget(k,A):null,Src=r.dir=="in"?stmtSource(k,A,r):null,nt=[k.note,r.fx].filter(Boolean).join(" · "),raw=r.desc.slice(0,160);
  const conv=(e,o)=>{skip.add(e.id);stMod(log,e);const n={...e,...o,fee:0,raw,imp:batch};delete n.cat;delete n.payee;if(e.date<n.date)n.date=e.date;put("tx",stamp(n,e));return n};
  if(B){const got=trGot(r.amt,A,B),e=stMirror(B,A,got,r.date,"in",ref,skip);if(e)return conv(e,{kind:"tr",acc:A.id,to:B.id,amt:r.amt,got,cur:A.cur,date:r.date,note:k.payee});
    const t=addTx({kind:"tr",acc:A.id,to:B.id,amt:r.amt,got,fee:0,cur:A.cur,date:r.date,note:k.payee,raw,imp:batch});log.add.push(t.id);return t}
  if(Src){const amt=trGot(r.amt,A,Src),e=stMirror(Src,A,amt,r.date,"out",ref,skip),note=A.type=="card"?"Card payment":k.payee;if(e)return conv(e,{kind:"tr",acc:Src.id,to:A.id,amt,got:r.amt,cur:Src.cur,date:r.date,note});
    const t=addTx({kind:"tr",acc:Src.id,to:A.id,amt,got:r.amt,fee:0,cur:Src.cur,date:r.date,note,raw,imp:batch});log.add.push(t.id);return t}
  const t=addTx({kind:r.dir=="in"?"in":"out",acc:A.id,amt:r.amt,cur:A.cur,date:r.date,cat:stCat(k,r,A),payee:k.payee,note:nt,raw,imp:batch});log.add.push(t.id);return t}
/* put one entry right, as listed by stFixRows */
function stFixOne(f,A,log){const {k,B,r,e}=f,cur=S.tx.find(t=>t.id==f.x.id);if(!cur)return false;
  if(f.op=="dup"||f.op=="dup2"){stDel(log,cur.id);return true}
  stMod(log,cur);const o={...cur},raw=r.desc.slice(0,160),merge=()=>{if(e&&e.id!=cur.id&&S.tx.some(t=>t.id==e.id))stDel(log,e.id)};
  if(f.op=="amt"){if(o.kind=="tr"){const same=ac(o.acc).cur==ac(o.to).cur;if(o.acc==A.id){o.amt=r.amt;if(same)o.got=r.amt}else{o.got=r.amt;if(same)o.amt=r.amt}}else o.amt=r.amt;put("tx",stamp(o,cur));return true}
  if(f.op=="untr"){Object.assign(o,{kind:"out",payee:k.payee,cat:stCat(k,r,A),note:k.note||"",raw});delete o.to;delete o.got;delete o.fee;put("tx",stamp(o,cur));return true}
  if(f.op=="name"&&f.moved){Object.assign(o,{payee:k.payee,cat:stEff(k,r,A,cur),note:k.note||"",raw});put("tx",stamp(o,cur));return true}
  if(f.op=="tr"){Object.assign(o,{kind:"tr",to:B.id,got:trGot(+cur.amt,A,B),fee:0,note:k.payee,raw:cur.raw||raw});delete o.cat;delete o.payee;if(e&&e.date<o.date)o.date=e.date;put("tx",stamp(o,cur));merge();return true}
  if(f.op=="trin"){Object.assign(o,{kind:"tr",acc:B.id,to:A.id,got:+cur.amt,amt:trGot(+cur.amt,A,B),cur:B.cur,fee:0,note:A.type=="card"?"Card payment":k.payee,raw:cur.raw||raw});delete o.cat;delete o.payee;if(e&&e.date<o.date)o.date=e.date;put("tx",stamp(o,cur));merge();return true}
  if(f.op=="retr"){o.to=B.id;o.got=trGot(+cur.amt,A,B);put("tx",stamp(o,cur));merge();return true}
  if(f.op=="resrc"){o.acc=B.id;o.amt=trGot(+cur.got||r.amt,A,B);o.cur=B.cur;put("tx",stamp(o,cur));merge();return true}
  if(f.op=="flip"){o.kind=cur.kind=="in"?"out":"in";if(k.payee&&(!o.payee||/[A-Z]{3,} [A-Z]{2,}/.test(o.payee)))o.payee=k.payee;if(!o.cat)o.cat=o.kind=="out"?(k.cat||catFor(k.payee)||catGuess(k.note+" "+k.payee)||""):A.type=="card"?(stPayLike(k)?"Card payment":"Refund"):""}
  else{o.payee=k.payee;if(k.note&&(!o.note||o.note==k.raw.slice(0,80)))o.note=k.note;if(!o.cat)o.cat=k.hint?(k.hint=="atm"?"Cash withdrawal":k.hint=="own"?"Own account transfer":"Card bill"):(k.cat||catFor(k.payee)||catGuess(k.note+" "+k.payee)||"")}
  o.raw=o.raw||k.raw.slice(0,160);put("tx",stamp(o,cur));return true}
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
  stImportGo(){const p=stPend;if(!p||!p.M)return;const A=ac(p.acc),log=stLogNew(),skip=new Set(),batch="imp_"+uid();
    $$("#csvout input[data-sti]").forEach(c=>{if(!c.checked)return;const r=p.M.res[+c.dataset.sti];if(!r||r.match||r.flip)return;stAddRow(p,A,r,batch,log,skip)});const n=log.add.length+log.mod.length;
    p.M=stmtMatch(p.P,p.acc);if(p.T!=null){stBalTo(p,p.T);p.M=stmtMatch(p.P,p.acc)}save();render();stmtShow();toast(`Added ${n} ${n==1?"entry":"entries"}`,()=>{stUndoLog(log);save();render();if(stPend&&stPend.P){stPend.M=stmtMatch(stPend.P,stPend.acc);stmtShow()}})},
  stFixBal(){const p=stPend;if(!p||!p.M||p.P.close==null)return;const A=ac(p.acc),to=p.M.to,day0=iso(new Date(D(p.M.from).getTime()-864e5));
    const old=S.tx.filter(x=>x.acc==A.id&&x.kind=="adj"&&/^(Matched to the bank statement|Opening balance from the bank statement|Opening balance worked out)/.test(x.note||"")&&x.date>=day0&&x.date<=to);old.forEach(x=>removeTx(x.id));let n=0;
    if(p.P.open!=null){const d=Math.round((p.P.open-balAt(A.id,day0))*100)/100;if(Math.abs(d)>=0.005){addTx({kind:"adj",acc:A.id,amt:d,cur:A.cur,date:day0,cat:"Balance correction",note:"Opening balance from the bank statement"});n++}}
    const e=Math.round((p.P.close-balAt(A.id,to))*100)/100;if(Math.abs(e)>=0.005){addTx({kind:"adj",acc:A.id,amt:e,cur:A.cur,date:to,cat:"Balance correction",note:"Matched to the bank statement"});n++}
    save();render();p.M=stmtMatch(p.P,p.acc);stmtShow();toast(n||old.length?"Balance now matches the statement: "+fmx(p.P.close,A.cur):"Already matches")},
  stFix(){const p=stPend;if(!p||!p.M)return;const A=ac(p.acc),on=new Set($$("#csvout input[data-stf]").filter(c=>c.checked).map(c=>c.dataset.stf)),log=stLogNew();let n=0;
    stFixRows(p,A).forEach((f,i)=>{if(on.has(f.op=="name"?"names":String(i))&&stFixOne(f,A,log))n++});
    p.M=stmtMatch(p.P,p.acc);if(p.T!=null){stBalTo(p,p.T);p.M=stmtMatch(p.P,p.acc)}save();render();stmtShow();toast(n+(n==1?" entry fixed":" entries fixed"),()=>{stUndoLog(log);save();render();if(stPend&&stPend.P){stPend.M=stmtMatch(stPend.P,stPend.acc);stmtShow()}})},
  stSetBal(){const p=stPend;if(!p||!p.M)return;const A=ac(p.acc);let T;
    if(A.type=="card"){const r=cardTarget(A,$("#f_avl")?v("f_avl"):"",v("f_owe"),$("#f_lim3")?v("f_lim3"):null);if(r.err)return toast(r.err);if(r.L){put("acc",stamp({...A,lim:r.L},A))}T=r.T}
    else{const s=v("f_owe").trim();if(s===""||!/\d/.test(s))return toast("Type the balance now");T=num(s)}
    p.T=Math.round(T*100)/100;stBalTo(p,p.T);p.M=stmtMatch(p.P,p.acc);save();render();stmtShow();const K=ac(p.acc);
    toast(A.type=="card"?(cardLim(K)?"Done. Available to spend: "+fmx(cardAv(K),K.cur):p.T<0?"Done. You owe "+fmx(-p.T,K.cur):"Done. The card is "+fmx(p.T,K.cur)+" in credit"):"Balance set to "+fmx(p.T,A.cur))},
  stFamOpen(nm,el){const row=el&&el.closest(".hbl");if(!row)return;const o=$("#stfamf");if(o)o.remove();
    row.insertAdjacentHTML("afterend",`<div class="card" id="stfamf" style="margin:6px 0">${F("f_stfn","Name, as you call them",nm)}${SEL("f_stfr","Relation",Object.entries(REL),"other")}<p class="note" style="margin:4px 0 0">Keep it part of the bank’s name (${esc(nm)}), e.g. without the initial.</p><div class="acts"><button class="btn sm" data-act="stFamSave" data-id="${esc(nm)}">Add to Family</button></div></div>`)},
  stFamSave(raw){const p=stPend;if(!p||!p.P)return;const name=v("f_stfn").trim(),rel=v("f_stfr")||"other";if(!name)return toast("Add a name");
    const a=String(raw||"").toLowerCase().replace(/[^a-z]/g,""),w=name.toLowerCase().split(/\s+/).map(x=>x.replace(/[^a-z]/g,"")).filter(x=>x.length>=4);if(!w.some(x=>a.includes(x)))return toast("Use a name that is part of "+raw+", so the payments can be matched");
    put("fam",stamp({id:uid(),name,rel}));save();p.M=stmtMatch(p.P,p.acc);stmtShow();toast(name+" added to Family. Their payments are labelled Family")},
  stUseAcc(id){const p=stPend;if(!p||!p.P||!ac(id))return;p.acc=id;p.T=null;setVal("f_acc",id);p.M=stmtMatch(p.P,id);stmtShow()},
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
