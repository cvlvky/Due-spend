/* ===== Version 27: say or type one line, compact accounts, cheques, days in India, payday plan, Tamil ===== */
const escRe=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const tcase=s=>String(s||"").replace(/\b\p{L}/gu,z=>z.toUpperCase());

/* ---------- one line: "Lulu 120 riyal groceries" ---------- */
const CURW=[[/\b(qar|qr|riyals?|rials?|qatari)\b/i,"QAR"],[/(₹|\brs\b\.?|\binr\b|\brupees?\b|\bruppees?\b)/i,"INR"]];
const INW=/\b(received|receive|got|income|salary|credited|credit|bonus|refund|cashback)\b/i;
const SAVEW=/\b(saved|save|invested|invest|sip)\b/i;
const FILLW=/\b(spent|spend|paid|pay|for|on|at|to|from|in|the|a|an|of|and|with|by|using|via|bought|buy|today|yesterday|riyals?|rials?|qar|qr|rupees?|ruppees?|rs|inr|received|receive|got|income|credited|credit|amount|saved|save|invested|invest|sip|rupay|only)\b/gi;
function lineCats(){return [...new Set([...S.tx.map(x=>x.cat),...S.bud.map(b=>b.cat),...CATS].filter(Boolean))].sort((a,b)=>b.length-a.length)}
const stem=w=>w.toLowerCase().replace(/ies$/,"y").replace(/s$/,"");
function parseLine(s){s=String(s||"").trim();const o={};if(!s)return o;let t=" "+s.replace(/[,](?=\d{3}\b)/g,"")+" ";
  const m=t.match(/(\d+(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?)?\b/i);
  if(m){let n=+m[1];const u=(m[2]||"").toLowerCase();if(u=="k"||u=="thousand")n*=1000;else if(u)n*=100000;o.amt=Math.round(n*100)/100;t=t.replace(m[0]," ")}
  for(const [re,c] of CURW)if(re.test(t)){o.cur=c;break}
  if(INW.test(t))o.kind="in";else if(SAVEW.test(t))o.kind="save";else o.kind="out";
  if(/\byesterday\b/i.test(t))o.date=plus(-1);
  /* an account named in the line: "from CBQ", "axis card" */
  const low=t.toLowerCase();
  for(const a of S.acc){const W=a.name.toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!/^(bank|account|savings?|salary|current|card|wallet|cash)$/.test(x));
    const hit=W.find(x=>new RegExp("\\b"+escRe(x)+"\\b").test(low));if(hit){o.acc=a.id;t=t.replace(new RegExp("\\b"+escRe(hit)+"\\b","i")," ");break}}
  if(!o.acc&&/\bcash\b/i.test(t)){const c=S.acc.find(a=>a.type=="cash"&&(!o.cur||a.cur==o.cur));if(c)o.acc=c.id}
  t=t.replace(/\bcash\b/ig," ");
  /* "for groceries" / "on fuel" at the end names the category */
  const fo=t.match(/\b(?:for|on)\s+([\p{L}][\p{L} &-]*?)\s*$/u);
  const cats=lineCats();
  const findCat=w=>{w=String(w||"").trim();if(!w)return "";const sw=stem(w);return cats.find(c=>c.toLowerCase()==w.toLowerCase())||cats.find(c=>stem(c)==sw)||""};
  if(fo){const w=fo[1].replace(FILLW," ").trim();if(w){o.cat=findCat(w)||catGuess(w)||tcase(w);t=t.replace(fo[0]," ")}}
  if(!o.cat){const c=cats.find(c=>new RegExp("\\b"+escRe(c)+"\\b","i").test(t));if(c&&c.length>2){o.cat=c;t=t.replace(new RegExp("\\b"+escRe(c)+"\\b","i")," ")}}
  let rest=t.replace(FILLW," ").replace(/[^\p{L}\p{N}&' .-]/gu," ").replace(/\s+/g," ").trim();
  if(!o.cat&&rest){const W=rest.split(" ");if(W.length>=2){const last=W[W.length-1],g=findCat(last)||catGuess(last);if(g){o.cat=g;W.pop();rest=W.join(" ")}}}
  if(rest&&!/^\d+$/.test(rest))o.payee=tcase(rest);
  if(!o.cat){const g=(o.payee&&(catFor(o.payee)||catGuess(o.payee)))||catGuess(s);if(g)o.cat=g;else if(o.kind=="in"&&/salary/i.test(s))o.cat="Salary"}
  if(!o.acc){if(o.payee)o.acc=accFor(o.payee,o.cur)||"";
    if(!o.acc&&o.cur){const last=S.cfg.last&&ac(S.cfg.last);o.acc=last&&last.cur==o.cur?last.id:((S.acc.find(a=>a.cur==o.cur&&a.type!="card")||S.acc.find(a=>a.cur==o.cur)||{}).id||"")}}
  return o}
function lineSay(o){if(!o.amt)return "Add an amount, for example: Lulu 120 riyal groceries";const A=o.acc?ac(o.acc):null,c=(A&&A.cur)||o.cur||"INR";
  return `${({out:"Spent",in:"Income",save:"Saved"})[o.kind]} ${fmx(o.amt,c)}${o.payee?(o.kind=="in"?" from ":" at ")+o.payee:""}${o.cat?" · "+o.cat:""}${A?" · "+A.name:""}${o.date?" · yesterday":""}`}
function lineApply(){const o=parseLine(v("f_line")),say=$("#f_lineok");if(!$("#f_amt"))return o;
  if(o.kind&&v("f_k")!=o.kind)ACT.qk(o.kind);if(o.amt)$("#f_amt").value=o.amt;if(o.cat)$("#f_cat").value=o.cat;
  if(o.payee&&$("#f_payee")){$("#f_payee").value=o.payee}if(o.acc&&$("#f_acc"))$("#f_acc").value=o.acc;if(o.date&&$("#f_date"))$("#f_date").value=o.date;
  if(say)say.textContent=v("f_line").trim()?lineSay(o):"";budHint();return o}
/* budget check while adding */
function budHint(){const el=$("#q_bud");if(!el)return;const cat=v("f_cat").trim().toLowerCase(),amt=+v("f_amt")||0,k=v("f_k")||"out";
  const B=k=="out"&&cat&&S.bud.find(b=>(b.cat||"").toLowerCase()==cat);if(!B){el.innerHTML="";return}
  const u=budUse(today().slice(0,7)).find(x=>x.b.id==B.id),used=u?u.s:0,A=ac(v("f_acc")),add=cv(amt,A.cur||"INR",B.cur||"INR"),p=Math.round((used+add)/B.lim*100);
  el.innerHTML=`<span style="color:${p>=100?"var(--late)":p>=80?"var(--soon)":"var(--mute)"}">${esc(B.cat)} budget: ${fmx(Math.round(used),B.cur||"INR")} of ${fmx(B.lim,B.cur||"INR")} used${amt?` · with this ${p}%${p>100?" (over by "+fmx(Math.round(used+add-B.lim),B.cur||"INR")+")":""}`:""}</span>`}
let lineT=0;
document.addEventListener("input",e=>{const id=e.target&&e.target.id;if(id=="f_line"){clearTimeout(lineT);lineT=setTimeout(lineApply,250)}else if(id=="f_amt"||id=="f_cat")budHint()});
document.addEventListener("change",e=>{const id=e.target&&e.target.id;if(id=="f_acc"||id=="f_cat")budHint()});
{const _q=qForm;qForm=function(k0,pre){const r=_q(k0,pre);try{const amt=$("#f_amt");if(amt&&!$("#f_line")){
    amt.insertAdjacentHTML("beforebegin",`<div class="lineq"><input id="f_line" placeholder="Type or say it: Lulu 120 riyal groceries" aria-label="Type it in one line" autocomplete="off">${isApp()||canVoice()?`<button class="ib" data-act="voice" aria-label="Say it" title="Say it"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg></button>`:""}</div><small id="f_lineok" class="note" style="display:block;min-height:1em"></small>`);
    const qc=$("#q_c");if(qc)qc.insertAdjacentHTML("afterend",`<div id="q_bud" class="note" style="margin:4px 0"></div>`);
    $$("#over [data-act='voice']").forEach((b,i)=>{if(i>0||!b.classList.contains("ib"))b.remove()});budHint()}}catch(e){console.warn(e)}return r}}
async function voice(){if(!$("#f_line"))qForm("out");
  const put1=s=>{const e=$("#f_line");if(!e)return;e.value=s;lineApply();if(!parseLine(s).amt)toast("Heard: "+s+". Add the amount.")};
  if(isApp()){try{const r=await NP("DueNative","listen",{lang:"en-IN",prompt:"Say amount, place and category"});if(r&&r.text)put1(r.text)}catch(e){const m=String(e&&e.message||e);if(!/cancel/i.test(m))toast(/No voice/i.test(m)?"Install or turn on Google voice typing to use this":"Couldn’t start voice typing. Update the app if this keeps happening.")}return}
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return toast("Voice isn’t supported here. Type the line instead.");
  const r=new R();r.lang="en-IN";r.onerror=()=>toast("Couldn’t hear that");r.onresult=e=>put1(e.results[0][0].transcript);try{r.start()}catch(e){toast("Couldn’t start voice entry")}}

/* ---------- Accounts: compact rows, actions behind ⋯ ---------- */
const AICON={bank:"🏦",cash:"💵",card:"💳",wallet:"👛",loan:"🏠"};
function accLast(){const L={};S.tx.forEach(x=>{if(x.acc&&(!L[x.acc]||x.date>L[x.acc]))L[x.acc]=x.date;if(x.to&&(!L[x.to]||x.date>L[x.to]))L[x.to]=x.date});return L}
vAcc=function(){const y=today().slice(0,4),T=S.tx.filter(x=>x.kind=="tr").sort((a,b)=>b.date.localeCompare(a.date)),LA=accLast(),curs=[...new Set(S.acc.map(k=>k.cur))].sort((a,b)=>a=="QAR"?-1:b=="QAR"?1:a.localeCompare(b));
  const row=k=>{const b=bal(k),l=LA[k.id];return `<div class="arow" data-act="accMenu" data-id="${k.id}"><span class="aic">${AICON[k.type]||"🏦"}</span><div class="an"><b>${esc(k.name)}</b><small>${ATYPE[k.type]||"Account"}${l?" · "+fmt(l):""}</small></div><b class="ab${b<0?" neg":""}">${fmx(b,k.cur)}</b><span class="dots" aria-hidden="true">⋯</span></div>`};
  return `<h1>Accounts</h1><div class="hero"><small>Total across accounts</small><div class="big">${fm(tot(V()))}</div><small>${S.acc.length} ${S.acc.length==1?"account":"accounts"} · 1 QAR = ₹${fx()}</small></div>
  ${radarCard(false)}<div class="acts"><button class="btn" data-act="trf">Transfer money</button><button class="btn ghost" data-act="addAcc">+ Add account</button></div>
  ${curs.map(c=>{const L=S.acc.filter(k=>k.cur==c);return `<div class="agrp"><div class="hbl"><b>${c=="QAR"?"In Qatar (QAR)":c=="INR"?"In India (₹)":c}</b><small>${fmx(L.reduce((s,k)=>s+bal(k),0),c)}</small></div><div class="card" style="padding:4px 12px">${L.map(row).join("")}</div></div>`}).join("")}
  <p class="note" style="margin-top:6px">Tap an account to add money, correct the balance, see its statement or edit it.</p>
  ${chqHtml()}${remitCard(remits().filter(r=>r.x.date.startsWith(y)))}${trPairCard()}<h2>Transfers</h2>${T.length?T.slice(0,5).map(trRow).join("")+(T.length>5?`<details><summary>Older transfers (${Math.min(T.length,40)-5})</summary>${T.slice(5,40).map(trRow).join("")}</details>`:""):`<div class="empty">No transfers yet.</div>`}`};
function accMenu(id){const k=S.acc.find(a=>a.id==id);if(!k)return;const b=bal(k),n=S.tx.filter(x=>x.acc==id||x.to==id).length;
  sheet(`<h2>${esc(k.name)}</h2><p class="sub">${ATYPE[k.type]||"Account"} · ${k.cur} · ${n} ${n==1?"entry":"entries"}</p><div class="big" style="font-size:28px;font-weight:700;color:${b<0?"var(--late)":"inherit"}">${fmx(b,k.cur)}</div>
  <div class="mgrid"><button data-act="addMoney" data-id="${id}"><span>➕</span>Add money</button><button data-act="accSpend" data-id="${id}"><span>➖</span>Add expense</button><button data-act="trfFrom" data-id="${id}"><span>🔁</span>Transfer</button>
  <button data-act="stmt" data-id="${id}"><span>📄</span>Statement</button><button data-act="fixBal" data-id="${id}"><span>⚖️</span>Correct balance</button><button data-act="editAcc" data-id="${id}"><span>✏️</span>Edit account</button><button data-act="stImport" data-id="${id}"><span>📥</span>Import PDF</button></div>`)}

/* ---------- cheques (PDCs for rent, loans, cards) ---------- */
const CHQST=[["issued","Issued, not cleared"],["cleared","Cleared"],["bounced","Returned / bounced"],["cancelled","Cancelled or taken back"]];
const chqOpen=()=>S.chq.filter(c=>c.status=="issued").sort((a,b)=>a.date.localeCompare(b.date));
/* for each open cheque: is the account short when it is presented, counting earlier cheques on the same account */
function chqShort(){const run={},R={};chqOpen().forEach(c=>{const A=ac(c.acc);if(!A.id)return;run[c.acc]=(run[c.acc]||0)+(+c.amt||0);const s=run[c.acc]-bal(A);R[c.id]=s>0?Math.min(s,+c.amt||0):0});return R}
function chqHtml(){const O=chqOpen(),sh=chqShort(),done=S.chq.filter(c=>c.status!="issued").sort((a,b)=>b.date.localeCompare(a.date));
  const row=c=>{const A=ac(c.acc),n=dl(c.date),s=sh[c.id]||0;return `<div class="row" data-act="chqEdit" data-id="${c.id}"><div><b>${esc(c.payee||"Cheque")}${c.no?" · #"+esc(c.no):""}</b><small>${fmt(c.date)}${c.status=="issued"?" · "+when(n):" · "+(CHQST.find(x=>x[0]==c.status)||[0,""])[1]}${A.id?" · "+esc(A.name):""}${s>0?` · <span style="color:var(--late)">short by ${fmx(Math.ceil(s),A.cur)}</span>`:""}</small></div><b>${fmx(c.amt,c.cur||A.cur)}</b></div>`};
  return `<h2>Cheques</h2>${O.length?O.map(row).join(""):`<div class="empty">No open cheques. Add post-dated cheques for rent, loans or cards to get a warning when the balance is short.</div>`}${done.length?`<details><summary>Cleared and old (${done.length})</summary>${done.slice(0,30).map(row).join("")}</details>`:""}<div class="acts"><button class="btn ghost" data-act="chqEdit">+ Cheque</button>${O.length>1?`<button class="btn ghost" data-act="chqSeries">+ Series</button>`:`<button class="btn ghost" data-act="chqSeries">+ Monthly series</button>`}</div>`}
function chqForm(c,series){c=c||{};const A0=c.acc||(S.acc.find(a=>a.cur=="QAR"&&a.type=="bank")||S.acc[0]||{}).id;
  sheet(`<h2>${series?"Cheque series":c.id?"Edit cheque":"New cheque"}</h2>${series?`<p class="sub">For rent or loan cheques given together, one each month.</p>`:""}
  ${F("f_cpay","Given to",c.payee,"text",'placeholder="Landlord, bank, card"')}<div class="two"><div>${F("f_camt","Amount",c.amt,"number")}</div><div>${SEL("f_cacc","From account",ACCS(),A0)}</div></div>
  <div class="two"><div>${F("f_cdate",series?"First cheque date":"Cheque date",c.date||today(),"date")}</div><div>${F("f_cno",series?"First cheque number":"Cheque number",c.no,"text",'inputmode="numeric"')}</div></div>
  ${series?F("f_cn","How many cheques",12,"number"):SEL("f_cst","Status",CHQST,c.status||"issued")}${F("f_cnote","Note",c.note)}
  <div class="acts"><button class="btn" data-act="${series?"chqSaveS":"chqSave"}" data-id="${c.id||""}">Save</button>${c.id&&c.status=="issued"?`<button class="btn ghost" data-act="chqClr" data-id="${c.id}">Mark cleared</button>`:""}${c.id?`<button class="btn del" data-act="chqDel" data-id="${c.id}">Delete</button>`:""}</div>`)}
function chqClear(id){const c=S.chq.find(x=>x.id==id);if(!c||c.status!="issued")return;const A=ac(c.acc);
  if(A.id){const t=stamp({id:uid(),kind:"out",acc:A.id,amt:+c.amt,cur:A.cur,fx:fx(),date:c.date<=today()?c.date:today(),cat:c.cat||"Cheque",payee:c.payee||"",note:"Cheque"+(c.no?" #"+c.no:"")+" cleared",tags:[]});put("tx",t);c.tx=t.id}
  c.status="cleared";stamp(c,c);save();toast("Cheque marked cleared"+(A.id?" and taken out of "+A.name:""))}

/* ---------- days in India (NRI status for tax) ---------- */
const fyEnd=s=>(+s.slice(0,4)+1)+"-03-31";
const dayN=s=>Math.round(D(s).getTime()/864e5);
function indiaDays(fs){fs=fs||fyStart();const fe=fyEnd(fs),t=today();let n=0;
  S.trips.forEach(x=>{if(!x.from)return;const a=x.from>fs?x.from:fs,e0=x.to||t,b=e0<fe?e0:fe;if(b>=a)n+=dayN(b)-dayN(a)+1});return n}
function indiaHtml(){const fs=fyStart(),n=indiaDays(fs),prev=indiaDays((+fs.slice(0,4)-1)+"-04-01"),T=[...S.trips].sort((a,b)=>b.from.localeCompare(a.from)),p=Math.min(100,n/182*100);
  const st=n>=182?["You count as resident in India this year","late"]:n>=120?["Watch this: from 120 days you can count as resident if your Indian income is over ₹15 lakh","soon"]:["You stay NRI on days alone",""];
  return `<h2>Days in India</h2><div class="card"><div class="hbl"><span>This financial year (Apr ${fs.slice(0,4)} – Mar ${+fs.slice(0,4)+1})</span><b style="font-size:22px">${n} ${n==1?"day":"days"}</b></div>
  <div class="dbar"><i style="width:${p}%;background:${st[1]?"var(--"+st[1]+")":"var(--pri)"}"></i><em style="left:${120/182*100}%"></em></div><div class="hbl"><small>0</small><small>120</small><small>182</small></div>
  <p class="note" style="margin:6px 0 0;color:${st[1]?"var(--"+st[1]+")":"inherit"}">${st[0]}. Last year: ${prev} days.</p><p class="note" style="margin:4px 0 0">Arrival and departure days both count. This is a guide only; confirm your status with a tax adviser.</p>
  ${T.slice(0,4).map(x=>`<div class="row" data-act="tripEdit" data-id="${x.id}"><div><b>${fmt(x.from)} – ${x.to?fmt(x.to):"still in India"}</b><small>${esc(x.note||"Trip")}</small></div><b>${dayN(x.to||today())-dayN(x.from)+1}d</b></div>`).join("")}
  ${T.length>4?`<details><summary>All trips (${T.length})</summary>${T.slice(4).map(x=>`<div class="row" data-act="tripEdit" data-id="${x.id}"><div><b>${fmt(x.from)} – ${x.to?fmt(x.to):"now"}</b><small>${esc(x.note||"Trip")}</small></div></div>`).join("")}</details>`:""}
  <div class="acts"><button class="btn ghost" data-act="tripEdit">+ Trip to India</button></div></div>`}
function tripForm(x){x=x||{};sheet(`<h2>${x.id?"Edit trip":"Trip to India"}</h2><p class="sub">Leave the return date empty while you’re still in India.</p><div class="two"><div>${F("f_tf","Arrived in India",x.from||today(),"date")}</div><div>${F("f_tt","Left India",x.to||"","date")}</div></div>${F("f_tn","Note",x.note,"text",'placeholder="Annual leave, wedding"')}${btns("tripSave",x.id,"tripDel")}`)}

/* ---------- until payday ---------- */
function payDay(){const r=S.rec.find(r=>r.kind=="in"&&/salary/i.test((r.cat||"")+" "+(r.note||"")))||S.rec.find(r=>r.kind=="in"&&+r.amt>0);if(r&&+r.day)return +r.day;
  const C={};S.tx.filter(x=>x.kind=="in"&&/salary/i.test((x.cat||"")+" "+(x.payee||"")+" "+(x.note||""))).slice(-6).forEach(x=>{const d=+x.date.slice(8);C[d]=(C[d]||0)+1});const b=Object.entries(C).sort((a,b)=>b[1]-a[1])[0];return b?+b[0]:0}
function nextPay(){const d=payDay();if(!d)return "";const t=today(),y=+t.slice(0,4),m=+t.slice(5,7),mk=(yy,mm)=>{const mx=new Date(yy,mm,0).getDate();return yy+"-"+String(mm).padStart(2,"0")+"-"+String(Math.min(d,mx)).padStart(2,"0")};
  const a=mk(y,m);return a>t?a:m==12?mk(y+1,1):mk(y,m+1)}
function payPlan(){const np=nextPay();if(!np)return null;const end=iso(new Date(D(np).getTime()-864e5)),U=upcoming(today(),end,true).filter(u=>["due","emi","rec"].includes(u.t)&&+u.a>0),c=chqOpen().filter(x=>x.date<=end);
  const items=[...U.map(u=>({d:u.d,n:u.n,a:cv(u.a,u.c||"INR",V())})),...c.map(x=>({d:x.date,n:"Cheque: "+(x.payee||"#"+x.no),a:cv(x.amt,x.cur||ac(x.acc).cur,V())}))].sort((a,b)=>a.d.localeCompare(b.d));
  const need=items.reduce((s,x)=>s+x.a,0),have=tot(V());return {np,days:dl(np),items,need,have,left:have-need}}
function payCard(){const P=payPlan();if(!P)return "";return `<div class="card pay" data-act="paySheet" style="margin-top:12px"><div class="hbl"><b>Until payday</b><small>${fmt(P.np)} · ${when(P.days)}</small></div>
  <div class="mini3"><div><small>To pay</small><b>${fmr(P.need)}</b></div><div><small>In accounts</small><b>${fmr(P.have)}</b></div><div><small>${P.left<0?"Short by":"Left"}</small><b style="color:${P.left<0?"var(--late)":"var(--good,inherit)"}">${fmr(Math.abs(P.left))}</b></div></div>
  <small class="note">${P.items.length?P.items.length+" "+(P.items.length==1?"payment":"payments")+" before salary"+(P.days>0?" · about "+fmr(Math.max(0,P.left)/P.days)+" a day to spend":""):"Nothing due before salary"}</small></div>`}
function paySheet(){const P=payPlan();if(!P)return;sheet(`<h2>Until payday</h2><p class="sub">Salary expected ${fmt(P.np)} (${when(P.days)}). Money in all accounts, minus what has to go out before then.</p>
  ${P.items.length?P.items.map(x=>`<div class="hbl" style="margin:8px 0"><span>${esc(x.n)}<small style="display:block;color:var(--mute)">${fmt(x.d)}</small></span><b>${fmr(x.a)}</b></div>`).join(""):`<div class="empty">Nothing due before salary.</div>`}
  <div class="card" style="margin-top:10px"><div class="hbl"><span>In accounts now</span><b>${fmr(P.have)}</b></div><div class="hbl"><span>To pay</span><b>− ${fmr(P.need)}</b></div><div class="hbl"><b>${P.left<0?"Short by":"Left to spend"}</b><b style="color:${P.left<0?"var(--late)":"inherit"}">${fmr(Math.abs(P.left))}</b></div></div>
  <p class="note">Payday comes from your salary recurring entry or past salary credits.</p>`)}

/* ---------- Home, Wealth, Dues additions ---------- */
{const _mc=monthCard;monthCard=function(...a){return _mc(...a)+(homeOff("pay")?"":payCard())}}
{const _gc=gratCard;gratCard=function(...a){return _gc(...a)+indiaHtml()}}
{const _vd=vDates;vDates=function(...a){return _vd(...a).replace(/(<div class="acts" style="margin:10px 0 12px"><button class="btn" data-act="addDate">\+ Add due date<\/button>)/,`$1<button class="btn ghost" data-act="calAll">📆 Add all to calendar</button>`)}}
{const _ti=todoItems;todoItems=function(){const L=_ti(),sh=chqShort();
  chqOpen().forEach(c=>{const n=dl(c.date),A=ac(c.acc),s=sh[c.id]||0;if(n>7&&!(s>0&&n<=20))return;
    L.push({k:s>0?-1700:n<0?-1500+n:n,ic:"🧾",tx:"Cheque"+(c.no?" #"+c.no:"")+" to "+(c.payee||"someone"),sub:(s>0?"Balance short by "+fmx(Math.ceil(s),A.cur)+" · ":"")+when(n)+" · "+fmx(c.amt,c.cur||A.cur),act:"chqEdit",id:c.id,bact:n<=0&&!s?"chqClr":s>0?"addMoney":"",bid:s>0?c.acc:c.id,bt:n<=0&&!s?"Cleared":s>0?"Add money":"",tone:s>0||n<0?"late":n<=3?"soon":""})});
  const d=indiaDays();if(d>=100)L.push({k:-600,ic:"🇮🇳",tx:d+" days in India this financial year",sub:d>=182?"You count as resident for tax this year":d>=120?"Past 120 days: check your tax status":"Close to the 120-day mark",act:"indiaGo",tone:d>=120?"late":"soon"});
  return L.sort((a,b)=>a.k-b.k)}}
/* cheque reminders on the phone */
{const _nn=nativeNotify;nativeNotify=async function(...a){const r=await _nn(...a);try{if(!isApp())return r;const secret=!!META.enc||!!S.cfg.hide,now=Date.now(),N=[];
  chqOpen().slice(0,20).forEach((c,i)=>[[1,"tomorrow"],[0,"today"]].forEach(([b,w],j)=>{const at=D(c.date);at.setDate(at.getDate()-b);at.setHours(9,0,0,0);if(at.getTime()>now)N.push({id:6000+i*2+j,title:"Cheque "+(c.no?"#"+c.no+" ":"")+"to "+(c.payee||"someone")+" "+w,body:(secret?"":fmx(c.amt,c.cur||ac(c.acc).cur)+" from ")+ac(c.acc).name+". Keep enough money in the account.",schedule:{at:at.toISOString(),allowWhileIdle:true}})}));
  if(N.length)await NP("LocalNotifications","schedule",{notifications:N})}catch(e){console.warn("cheque reminders",e)}return r}}
/* home-screen widget: top of Needs attention */
{const _nw=nativeWidget;nativeWidget=function(){_nw();if(!isApp())return;try{const secret=!!META.enc||!!S.cfg.hide,L=todoItems().filter(x=>!/version ready/i.test(x.tx)).slice(0,3);
  if(L.length)setTimeout(()=>NP("DueNative","setWidget",{line1:"",line2:"",...widgetBase(),line3:L.map(x=>"• "+x.tx+(x.sub&&!secret?" — "+x.sub:"")).join("\n")}).catch(()=>{}),50)}catch(e){}}}
function widgetBase(){const t=today(),U=upcoming(t,plus(30),true).filter(u=>u.t=="due"||u.t=="emi"),u=U[0],sf=safeSpend(),secret=!!META.enc||!!S.cfg.hide;
  return {line1:u?u.n+" · "+when(dl(u.d))+(u.a&&!secret?" · "+fmx(u.a,u.c):""):"Nothing due in the next 30 days",line2:secret?U.length+" due in 30 days":"Safe to spend "+(sf.safe<0?"short by "+fmr(-sf.safe):fmr(sf.safe))}}

/* cheques in the calendar file */
{const _ics=ics;ics=function(...a){const t=_ics(...a),d8=s=>s.replace(/-/g,""),E=[];chqOpen().forEach(c=>{const e=D(c.date);e.setDate(e.getDate()+1);E.push("BEGIN:VEVENT","UID:"+c.id+"@duespend","DTSTAMP:"+d8(today())+"T000000Z","DTSTART;VALUE=DATE:"+d8(c.date),"DTEND;VALUE=DATE:"+d8(iso(e)),"SUMMARY:"+("Cheque "+(c.no?"#"+c.no+" ":"")+"to "+(c.payee||"")+" "+(c.cur||"")+" "+c.amt).replace(/[,;\r\n]/g," "),"BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:Cheque due","TRIGGER:-P1D","END:VALARM","END:VEVENT")});
  if(!E.length)return t;const i=t.lastIndexOf("END:VCALENDAR");return i<0?t:t.slice(0,i)+E.join("\r\n")+"\r\n"+t.slice(i)}}
/* ---------- what's new, once after an update ---------- */
const NEW27=["Type or say an expense in one line: “Lulu 120 riyal groceries”","Accounts in compact rows; tap one for its actions","Cheques: get a warning when the balance is short","Days in India this financial year (Wealth → Plans)","Until payday on Home","Add all dues to your calendar in one tap","Tamil option in Settings"];
function whatsNew(force){if((window.__noNews||navigator.webdriver)&&!force)return;let seen="";try{seen=localStorage.getItem("ds-seenver")||""}catch(e){}if(!force&&seen==VER)return;try{localStorage.setItem("ds-seenver",VER)}catch(e){}
  if(!force&&!seen&&S.tx.length<3)return;if($("#over").innerHTML||$("#lock").innerHTML)return;
  sheet(`<h2>What’s new in Version ${VER}</h2>${NEW27.map(x=>`<div class="hbl" style="margin:8px 0;justify-content:flex-start;gap:10px"><span>✨</span><span>${esc(x)}</span></div>`).join("")}<div class="acts"><button class="btn" data-act="closeX">Got it</button></div>`)}
{const _st=start;start=function(...a){const r=_st(...a);setTimeout(()=>{try{whatsNew()}catch(e){}},4000);return r}}

/* ---------- Tamil ---------- */
const TA={"Home":"முகப்பு","Dues":"கட்டணங்கள்","Wealth":"சொத்து","Accounts":"கணக்குகள்","Spend":"செலவு","Reports":"அறிக்கைகள்","Family":"குடும்பம்","Personal Diary":"தனிப்பட்ட டைரி",
 "Save":"சேமி","Delete":"நீக்கு","Cancel":"ரத்து","Close":"மூடு","Edit":"திருத்து","Done":"முடிந்தது","Next":"அடுத்து","Previous":"முந்தையது","Skip":"தவிர்","Later":"பிறகு","Not now":"இப்போது வேண்டாம்","Undo":"செயல்தவிர்","Open":"திற","Copy":"நகலெடு","Refresh":"புதுப்பி","Remove":"அகற்று","Restore":"மீட்டெடு","Try again":"மீண்டும் முயற்சி","Got it":"சரி","View":"பார்","Check":"சரிபார்","Add":"சேர்","Add it":"சேர்","Unlock":"திற",
 "Needs attention":"கவனிக்க வேண்டியவை","Nothing needs attention":"கவனிக்க எதுவும் இல்லை","You’re all caught up.":"எல்லாம் சரியாக உள்ளது.","This month":"இந்த மாதம்","Coming up":"வரவிருப்பவை","Up next":"அடுத்து வருவது","Until payday":"சம்பளம் வரை","To pay":"செலுத்த வேண்டியது","In accounts":"கணக்குகளில்","Left":"மீதம்","Short by":"குறைவு","Left to spend":"செலவுக்கு மீதம்","In accounts now":"இப்போது கணக்குகளில்",
 "Net worth":"நிகர சொத்து","Spent":"செலவு","Income":"வருமானம்","Saved":"சேமிப்பு","Received":"பெற்றது","Sent":"அனுப்பியது","Interest":"வட்டி","Left over":"மீதி","Savings rate":"சேமிப்பு விகிதம்","Daily average spend":"தினசரி சராசரி செலவு","Biggest spend":"பெரிய செலவு","Overdue":"தாமதம்","Value now":"தற்போதைய மதிப்பு","Value today":"இன்றைய மதிப்பு","You put in":"நீங்கள் செலுத்தியது","Earned so far":"இதுவரை ஈட்டியது","People owe you":"உங்களுக்குத் தர வேண்டியவர்கள்","You owe":"நீங்கள் தர வேண்டியது",
 "Paid":"செலுத்தியது","Cleared":"கிளியர் ஆனது","Update":"புதுப்பி","Review":"பார்வையிடு","Fix":"சரிசெய்","Plan":"திட்டம்","Deposit":"வைப்பு","Add money":"பணம் சேர்","Correct":"திருத்து","Correct balance":"இருப்பைத் திருத்து","Statement":"கணக்கு அறிக்கை","Edit account":"கணக்கைத் திருத்து","Add expense":"செலவு சேர்","Transfer":"மாற்று","Transfer money":"பணம் மாற்று","+ Add account":"+ கணக்கு சேர்","Transfers":"பணமாற்றங்கள்","No transfers yet.":"இன்னும் பணமாற்றம் இல்லை.","Total across accounts":"எல்லா கணக்குகளின் மொத்தம்",
 "In Qatar (QAR)":"கத்தாரில் (QAR)","In India (₹)":"இந்தியாவில் (₹)","Cheques":"காசோலைகள்","+ Cheque":"+ காசோலை","+ Series":"+ தொடர்","+ Monthly series":"+ மாதாந்திர தொடர்","Mark cleared":"கிளியர் எனக் குறி","New cheque":"புதிய காசோலை","Edit cheque":"காசோலையைத் திருத்து","Given to":"யாருக்கு","Amount":"தொகை","From account":"எந்த கணக்கிலிருந்து","Cheque date":"காசோலை தேதி","Cheque number":"காசோலை எண்","Status":"நிலை","Note":"குறிப்பு",
 "Days in India":"இந்தியாவில் இருந்த நாட்கள்","+ Trip to India":"+ இந்தியா பயணம்","Trip to India":"இந்தியா பயணம்","Arrived in India":"இந்தியா வந்த தேதி","Left India":"இந்தியாவிலிருந்து புறப்பட்ட தேதி",
 "Due dates":"கட்டண தேதிகள்","+ Add due date":"+ கட்டண தேதி சேர்","📆 Add all to calendar":"📆 அனைத்தையும் காலெண்டரில் சேர்","Subscriptions":"சந்தாக்கள்","Documents":"ஆவணங்கள்","Completed":"முடிந்தவை","Due date":"கட்டண தேதி",
 "Overview":"மேலோட்டம்","Investments":"முதலீடுகள்","Schemes":"திட்டங்கள்","Goals & loans":"இலக்குகள் & கடன்கள்","Plans":"திட்டமிடல்","What it’s made of":"எதில் உள்ளது","By person":"நபர் வாரியாக","Savings goals":"சேமிப்பு இலக்குகள்","Loans":"கடன்கள்","Loans and EMIs":"கடன்கள் மற்றும் EMI","My savings schemes":"என் சேமிப்புத் திட்டங்கள்","+ Goal":"+ இலக்கு","+ Loan":"+ கடன்","Gratuity":"கிராஜுவிட்டி","End-of-service gratuity":"பணிக்கால முடிவு கிராஜுவிட்டி","Return-to-India plan":"இந்தியா திரும்பும் திட்டம்",
 "Budgets":"பட்ஜெட்கள்","+ Budget":"+ பட்ஜெட்","Recurring entries":"தொடர் பதிவுகள்","+ Recurring entry":"+ தொடர் பதிவு","Spending":"செலவுகள்","Where the money went":"பணம் எங்கே போனது","Top payees":"அதிகம் செலுத்தியவர்கள்","Year in review":"ஆண்டு மதிப்பாய்வு","Money health":"பண ஆரோக்கியம்","Cash-flow forecast":"பணப்புழக்க முன்னறிவிப்பு",
 "Settings and backup":"அமைப்புகள் மற்றும் காப்புப்பிரதி","Backup":"காப்புப்பிரதி","Backup now":"இப்போது காப்புப்பிரதி","Month by month":"மாதம் வாரியாக","Choose what Home shows":"முகப்பில் காட்ட வேண்டியவை","Find duplicates":"நகல்களைக் கண்டறி","Hide amounts":"தொகைகளை மறை","Show amounts":"தொகைகளைக் காட்டு","Quick add":"விரைவாகச் சேர்","Check for update":"புதுப்பிப்பைச் சரிபார்","Install latest":"சமீபத்தியதை நிறுவு","Update now":"இப்போது புதுப்பி","Update available":"புதுப்பிப்பு உள்ளது",
 "Income ":"வருமானம் ","More details":"மேலும் விவரங்கள்","Account":"கணக்கு","Date":"தேதி","Category":"வகை","or type a category":"அல்லது வகையைத் தட்டச்சு செய்","Paste bank SMS":"வங்கி SMS ஒட்டு","Payments to review":"பார்வையிட வேண்டிய பணம்","Share on WhatsApp":"WhatsApp-ல் பகிர்","Copy summary":"சுருக்கத்தை நகலெடு",
 "Food":"உணவு","Travel":"பயணம்","Bills":"பில்கள்","Shopping":"ஷாப்பிங்","Health":"உடல்நலம்","Rent":"வாடகை","Other":"மற்றவை","Groceries":"மளிகை","Salary":"சம்பளம்","Eating out":"வெளியே சாப்பாடு",
 "Type or say it: Lulu 120 riyal groceries":"தட்டச்சு செய்யவும் அல்லது சொல்லவும்: Lulu 120 riyal groceries","Say it":"சொல்லுங்கள்","Got it ":"சரி ",
 "Money sent home":"வீட்டுக்கு அனுப்பிய பணம்","Safe to spend":"செலவிடலாம்","Due in 30 days":"30 நாளில் கட்டணம்","Search everything":"எல்லாவற்றையும் தேடு","All dues and renewals":"அனைத்து கட்டணங்களும்","Nothing due before salary":"சம்பளத்துக்கு முன் கட்டணம் இல்லை","Recycle bin":"குப்பைத் தொட்டி","Language: English":"மொழி: English","Language: தமிழ்":"மொழி: தமிழ்"};
const TARX=[[/^(\d+) days? overdue$/,"$1 நாள் தாமதம்"],[/^in (\d+) days?$/,"$1 நாளில்"],[/^Due in (\d+) days?$/,"$1 நாளில் கட்டணம்"],[/^today$/i,"இன்று"],[/^tomorrow$/i,"நாளை"],[/^yesterday$/i,"நேற்று"],[/^Show all (\d+)$/,"அனைத்தும் ($1)"],[/^Show fewer$/,"குறைவாகக் காட்டு"],[/^Version (\d+)/,"பதிப்பு $1"]];
const taOn=()=>S.cfg&&S.cfg.lang=="ta";
function taStr(s){if(!taOn()||s==null)return s;const t=String(s).trim();if(!t)return s;let r=TA[t];if(r==null)for(const [re,x] of TARX)if(re.test(t)){r=t.replace(re,x);break}return r==null?s:String(s).replace(t,r)}
function taNode(root){if(!taOn()||!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),L=[];let n;while((n=w.nextNode()))L.push(n);
  L.forEach(n=>{const p=n.parentNode;if(!p||/^(SCRIPT|STYLE|TEXTAREA|OPTION)$/.test(p.nodeName))return;const x=taStr(n.nodeValue);if(x!==n.nodeValue)n.nodeValue=x});
  if(root.querySelectorAll)root.querySelectorAll("[placeholder],[aria-label],[title]").forEach(e=>["placeholder","aria-label","title"].forEach(a=>{const o=e.getAttribute(a);if(o){const x=taStr(o);if(x!==o)e.setAttribute(a,x)}}))}
function taHtml(h){if(!taOn()||typeof h!="string")return h;const t=document.createElement("template");t.innerHTML=h;taNode(t.content);return t.innerHTML}
const TABS_EN=TABS.map(t=>t[1]);
function langApply(){TABS.forEach((t,i)=>t[1]=taOn()?(TA[TABS_EN[i]]||TABS_EN[i]):TABS_EN[i]);try{document.documentElement.lang=taOn()?"ta":"en"}catch(e){}}
{const W=f=>function(...a){return taHtml(f.apply(this,a))};vHome=W(vHome);vDates=W(vDates);vWealth=W(vWealth);vAcc=W(vAcc);vSpend=W(vSpend);vRep=W(vRep);vFam=W(vFam)}
{const _sh=sheet;sheet=function(h,...a){const r=_sh(h,...a);if(h&&taOn())try{taNode($("#over"))}catch(e){}return r}}
{const _to=toast;toast=function(m,...a){return _to(taStr(m),...a)}}
{const _ms=start;start=function(...a){langApply();return _ms(...a)}}

/* settings: language and new tools */
{const _st=settings;settings=function(...a){const r=_st(...a);try{const box=$("#set_more");if(box&&!$("#set_lang")){box.insertAdjacentHTML("beforeend",`<button id="set_lang" data-act="lang">${taOn()?"Language: தமிழ்":"Language: English"}</button><button data-act="calAll">Dues to calendar</button><button data-act="whatsNew">What’s new</button>`);if(taOn())taNode(box)}}catch(e){console.warn(e)}return r}}

Object.assign(ACT,{
  accMenu(id){accMenu(id)},
  accSpend(id){qForm("out",{acc:id})},
  trfFrom(id){if(S.acc.length<2)return toast("Add a second account first");trForm();const f=$("#over select")&&[...$$("#over select")].find(s=>[...s.options].some(o=>o.value==id));if(f){f.value=id;f.dispatchEvent(new Event("change",{bubbles:true}))}},
  chqEdit(id){chqForm(S.chq.find(c=>c.id==id))},
  chqSeries(){chqForm(null,true)},
  chqSave(id){const amt=+v("f_camt"),acc=v("f_cacc"),date=v("f_cdate");if(!amt||amt<0||!date)return toast("Add the amount and the cheque date");const old=S.chq.find(c=>c.id==id),A=ac(acc);
    const o={...(old||{}),id:id||uid(),payee:v("f_cpay").trim(),amt,acc,cur:A.cur,date,no:v("f_cno").trim(),status:v("f_cst")||"issued",note:v("f_cnote").trim()};
    if(old&&old.status=="issued"&&o.status=="cleared"&&!old.tx){put("chq",stamp(o,old));o.status="issued";chqClear(o.id)}else put("chq",stamp(o,old));save();sheet("");render();toast("Cheque saved")},
  chqSaveS(){const amt=+v("f_camt"),acc=v("f_cacc"),d0=v("f_cdate"),n=Math.min(60,Math.max(1,+v("f_cn")||0));if(!amt||!d0)return toast("Add the amount and the first date");
    const A=ac(acc),no0=v("f_cno").trim(),num=/^\d+$/.test(no0)?+no0:null,w=no0.length;for(let i=0;i<n;i++){const d=addM(d0,i);put("chq",stamp({id:uid(),payee:v("f_cpay").trim(),amt,acc,cur:A.cur,date:d,no:num!=null?String(num+i).padStart(w,"0"):"",status:"issued",note:v("f_cnote").trim()}))}
    save();sheet("");render();toast(n+" cheques added")},
  chqClr(id){chqClear(id);sheet("");render()},
  chqDel(id){trash("chq",id);save();sheet("");render();toast("Cheque deleted")},
  tripEdit(id){tripForm(S.trips.find(x=>x.id==id))},
  tripSave(id){const from=v("f_tf"),to=v("f_tt");if(!from)return toast("Add the date you arrived");if(to&&to<from)return toast("The leaving date is before the arrival date");const old=S.trips.find(x=>x.id==id);
    put("trips",stamp({...(old||{}),id:id||uid(),from,to,note:v("f_tn").trim()},old));save();sheet("");render()},
  tripDel(id){trash("trips",id);save();sheet("");render()},
  indiaGo(){S.cfg.wSeg="plans";tab="invest";render();setTimeout(()=>{const h=[...$$("#app h2")].find(e=>/Days in India|இந்தியாவில்/.test(e.textContent));h&&h.scrollIntoView({block:"start"})},60)},
  paySheet(){paySheet()},
  calAll(){const n=upcoming(today(),plus(365),true).filter(u=>["due","emi","fd"].includes(u.t)).length;
    sheet(`<h2>Add dues to your calendar</h2><p class="sub">Makes one calendar file with your due dates, EMIs, cheques and maturities (${n} in the next year), each with a reminder 2 days before. Open it and choose Google Calendar to add them all. Send the same file to your wife on WhatsApp so her calendar has them too.</p><div class="acts"><button class="btn" data-act="ics">Make the calendar file</button></div><p class="note">Run it again after you add new dues. Calendar apps skip ones already added.</p>`)},
  whatsNew(){whatsNew(true)},
  lang(){S.cfg.lang=taOn()?"":"ta";save();langApply();lastNav="";sheet("");$("#app").innerHTML="";lastTab="";render();toast(taOn()?"தமிழ் இயக்கப்பட்டது":"English is on")}
});
