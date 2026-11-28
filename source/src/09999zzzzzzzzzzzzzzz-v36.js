/* ===== Version 36: a fresher look, accent colours, quick actions, Type it, select many entries, Month in review ===== */

/* ---------- look and feel: accent colour, card colours by category ---------- */
const ACCENTS=[["","Teal","#0f6b5c"],["blue","Blue","#2558c9"],["violet","Violet","#6b45c4"],["rose","Rose","#c0335f"],["amber","Amber","#a65f00"],["slate","Graphite","#3c4a57"]];
{const _au=applyUI;applyUI=function(...a){const r=_au.apply(this,a);try{const d=document.documentElement;if(S.cfg.accent)d.setAttribute("data-accent",S.cfg.accent);else d.removeAttribute("data-accent")}catch(e){}return r}}
const CATPAL=["#14b8a6","#6366f1","#f59e0b","#ef4444","#8b5cf6","#22c55e","#0ea5e9","#ec4899","#84cc16","#f97316"];
const catTint=c=>{c=String(c||"");let h=0;for(const ch of c)h=(h*31+ch.charCodeAt(0))>>>0;return CATPAL[h%CATPAL.length]};
function decorate(root){try{(root||document).querySelectorAll('.row[data-act="editTx"]:not([data-dec]),.row[data-act="selTx"]:not([data-dec])').forEach(r=>{r.dataset.dec="1";const x=S.tx.find(t=>t.id==r.dataset.id),ci=r.querySelector(".ci");if(!x||!ci)return;
  const col=x.kind=="tr"?"#7a8a83":x.kind=="in"?"#1f9d6b":catTint(x.cat||"Other");ci.style.background=`color-mix(in srgb,${col} 18%,var(--card))`;ci.style.boxShadow=`inset 0 0 0 1px color-mix(in srgb,${col} 30%,transparent)`})}catch(e){}}
{const _rn=render;render=function(...a){const r=_rn.apply(this,a);decorate($("#app"));return r}}
{const _sh=sheet;sheet=function(h,...a){const r=_sh.call(this,h,...a);if(h)decorate($("#over"));return r}}
function lookCard(){const th=S.cfg.theme||"";return `<div class="card looks"><b>Look</b><div class="segs" style="margin:8px 0">${[["","Auto"],["light","Light"],["dark","Dark"]].map(([k,l])=>`<button class="${th==k?"on":""}" data-act="lookTheme" data-id="${k}">${l}</button>`).join("")}</div>
  <div class="swatches" role="radiogroup" aria-label="Accent colour">${ACCENTS.map(([k,l,c])=>`<button class="sw${(S.cfg.accent||"")==k?" on":""}" data-act="lookAccent" data-id="${k}" style="--sw:${c}" role="radio" aria-checked="${(S.cfg.accent||"")==k}" aria-label="${l}"><i></i><small>${l}</small></button>`).join("")}</div></div>`}
{const _st6=settings;settings=function(...a){const r=_st6.apply(this,a);try{const p=$("#over .setpay");if(p&&!$("#over .looks"))p.insertAdjacentHTML("afterend",lookCard());
  /* payment screens and colours first, above the long list of settings */
  const top=$("#set_more"),lk=$("#over .looks");if(top&&p){top.before(p);if(lk)top.before(lk)}}catch(e){}return r}}
Object.assign(ACT,{
  lookTheme(k){S.cfg.theme=k||"";save();applyUI();render();settings()},
  lookAccent(k){S.cfg.accent=k||"";save();applyUI();render();settings();toast("Colour changed")}
});

/* ---------- Home: quick actions under the top card ---------- */
function qaRow(){const w=(S.cfg.smsq||[]).length;return `<div class="qa" role="group" aria-label="Quick actions">
  <button data-act="qaAdd" data-id="out"><span class="qai" aria-hidden="true">−</span>Expense</button>
  <button data-act="qaAdd" data-id="in"><span class="qai" aria-hidden="true">+</span>Income</button>
  <button data-act="qaTr"><span class="qai" aria-hidden="true">⇄</span>Transfer</button>
  <button data-act="qaReview"><span class="qai" aria-hidden="true">🧾</span>Review${w?`<i class="qab">${w>99?"99+":w}</i>`:""}</button>
  <button data-act="smartAdd"><span class="qai" aria-hidden="true">✨</span>Type it</button></div>`}
{const _hh=homeHero;homeHero=function(...a){return _hh.apply(this,a)+qaRow()}}
Object.assign(ACT,{
  qaAdd(k){qForm(k||"out")},qaTr(){trForm()},
  qaReview(){if((S.cfg.smsq||[]).length&&typeof rvOpen=="function")rvOpen();else payReview()}
});

/* ---------- Type it: “45 lulu”, “salary 12000 qar”, “2000 from qnb to sbi” ---------- */
const SM_IN=/\b(salary|received|got|income|refund|cashback|credited|bonus|interest|dividend|sold|earned)\b/i,SM_TR=/\b(transfer(?:red)?|moved?|move|sent to my|to my)\b/i,
  SM_STOP=new Set(["at","to","from","for","on","in","with","by","via","using","paid","pay","spent","spend","bought","buy","my","the","a","an","and","of","today","yesterday","rs","inr","qar","qr","riyal","riyals","rupee","rupees","card","account","bank","cash","day","before","last","this","transfer","transferred","moved","move","received","got","salary","income"]);
function smAccTokens(a){const w=String(a.name||"").toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>=3&&!/^(bank|account|savings|saving|salary|card|credit|debit|the|main|current)$/.test(t));if(a.l4)w.push(String(a.l4));if(/cash/i.test(a.name)||a.type=="cash")w.push("cash");return [...new Set(w)]}
function smFindAcc(s){const hits=[];S.acc.filter(a=>!a.closed).forEach(a=>smAccTokens(a).forEach(t=>{const i=s.search(new RegExp("\\b"+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i"));if(i>=0)hits.push({a,i,t})}));return hits.sort((x,y)=>x.i-y.i)}
function smartParse(text){const s=String(text||"").trim(),low=s.toLowerCase(),out={text:s,kind:"out",amt:0,cur:"",acc:"",to:"",payee:"",cat:"",date:today()};if(!s)return out;
  const am=low.match(/(?:₹|rs\.?|inr|qar|qr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|l|lakh|lac|lakhs)?\b/);if(am){let n=+am[1].replace(/,/g,"");if(am[2])n*=/^k$/.test(am[2])?1e3:1e5;out.amt=Math.round(n*100)/100}
  if(/\b(qar|qr|riyals?)\b/.test(low))out.cur="QAR";else if(/₹|\b(rs\.?|inr|rupees?)\b/.test(low))out.cur="INR";
  if(/\bday before yesterday\b/.test(low))out.date=plus(-2);else if(/\byesterday\b/.test(low))out.date=plus(-1);
  else{const wd=low.match(/\blast (mon|tue|wed|thu|fri|sat|sun)\w*/);if(wd){const want=["sun","mon","tue","wed","thu","fri","sat"].indexOf(wd[1]);let k=1;while(new Date(D(plus(-k))).getDay()!=want&&k<8)k++;out.date=plus(-k)}
    const dm=low.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);if(dm&&+dm[2]>=1&&+dm[2]<=12&&+dm[1]>=1&&+dm[1]<=31){let y=dm[3]?+dm[3]:+today().slice(0,4);if(y<100)y+=2000;const d=y+"-"+String(dm[2]).padStart(2,"0")+"-"+String(dm[1]).padStart(2,"0");if(d<=today())out.date=d}
    else{const on=low.match(/\bon (\d{1,2})(?:st|nd|rd|th)?\b/);if(on&&+on[1]>=1&&+on[1]<=31){const d=today().slice(0,8)+String(on[1]).padStart(2,"0");out.date=d<=today()?d:addMon(today().slice(0,7),-1)+"-"+String(on[1]).padStart(2,"0")}}}
  const H=smFindAcc(low),ft=low.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?:\s|$)/);
  if(SM_TR.test(low)||(ft&&H.length>=2)){const fa=ft&&H.find(h=>ft[1].includes(h.t)),ta=ft&&H.find(h=>ft[2].includes(h.t)&&(!fa||h.a.id!=fa.a.id));out.kind="tr";out.acc=(fa||H[0]||{a:{}}).a.id||"";out.to=(ta||H.find(h=>h.a.id!=out.acc)||{a:{}}).a.id||""}
  else{if(SM_IN.test(low))out.kind="in";if(H.length)out.acc=H[0].a.id}
  if(out.kind!="tr"){const pm=low.match(out.kind=="in"?/\bfrom\s+([a-z][a-z0-9&.' ]{1,40}?)(?=\s+(?:on|with|by|via|using|for|to|in|yesterday|today)\b|$)/:/\b(?:at|to)\s+([a-z][a-z0-9&.' ]{1,40}?)(?=\s+(?:on|with|by|via|using|for|from|in|yesterday|today)\b|$)/);
    let p=pm?pm[1]:"";const accT=new Set(H.map(h=>h.t));if(p&&p.split(/\s+/).every(w=>accT.has(w)))p="";
    if(!p){p=low.replace(/(?:₹|rs\.?|inr|qar|qr)?\s*\d[\d,]*(?:\.\d+)?\s*(k|l|lakh|lac|lakhs)?\b/g," ").replace(/\b\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\b/g," ").split(/\s+/).filter(w=>w&&!SM_STOP.has(w)&&!accT.has(w)&&!SM_IN.test(w)&&!/^(mon|tue|wed|thu|fri|sat|sun)\w*$/.test(w)).slice(0,3).join(" ")}
    const bw=p.split(/\s+/).filter(w=>w&&!BANKISH.test(w));if(bw.length)p=bw.join(" ");
    out.payee=p.replace(/\b\w/g,c=>c.toUpperCase()).trim();out.cat=(out.payee&&catFor(out.payee))||catFor(s)||catGuess(s)||""}
  if(!out.acc){const L=S.acc.filter(a=>!a.closed&&(!out.cur||a.cur==out.cur)&&(out.kind=="tr"||a.type!="card"||true)),last=S.cfg.last&&ac(S.cfg.last);out.acc=(last&&last.id&&(!out.cur||last.cur==out.cur)?last.id:(L[0]||S.acc[0]||{}).id)||""}
  if(!out.cur)out.cur=ac(out.acc).cur||"INR";return out}
function smartPrev(){const o=$("#sm_prev"),p=smartParse(($("#sm_t")||{}).value);if(!o)return p;if(!p.amt){o.innerHTML=`<p class="note">Write the amount and what it was for. The app fills in the rest.</p>`;return p}
  const A=ac(p.acc),T=ac(p.to),chip=(l,v,bad)=>`<span class="smc${bad?" bad":""}"><small>${l}</small>${v}</span>`;
  o.innerHTML=`<div class="smprev">${chip("Kind",p.kind=="in"?"Income":p.kind=="tr"?"Transfer":"Expense")}${chip("Amount",esc(fmx(p.amt,p.cur)))}${p.kind=="tr"?chip("From",esc(A.name||"?"),!A.id)+chip("To",esc(T.name||"choose"),!T.id||T.id==A.id):chip("Account",esc(A.name||"?"),!A.id)+chip(p.kind=="in"?"From":"Paid to",esc(p.payee||"—"))+chip("Category",esc(p.cat||"—"))}${chip("Date",dl(p.date)==0?"Today":dl(p.date)==-1?"Yesterday":fmt(p.date))}</div>
  <div class="acts"><button class="btn" data-act="smartSave"${p.kind=="tr"&&(!T.id||T.id==A.id)?" disabled":""}>Save</button><button class="btn ghost" data-act="smartForm">Open the full form</button></div>`;return p}
function smartAdd(){sheet(`<h2 id="sm_sheet">✨ Type it</h2><p class="sub">Write it the way you’d say it. Amount first is fine.</p>
  <input id="sm_t" placeholder="e.g. 45 lulu groceries" autocomplete="off" enterkeyhint="done" aria-label="What did you pay or get?">
  <div class="fchips" style="margin-top:8px">${["45 lulu","250 petrol yesterday","salary 12000 qar","2000 from qnb to sbi","1.5k rent"].map(x=>`<button class="fchip" data-act="smEx" data-id="${esc(x)}">${esc(x)}</button>`).join("")}</div><div id="sm_prev"></div>`);
  setTimeout(()=>{const i=$("#sm_t");if(i){i.focus();smartPrev()}},50)}
document.addEventListener("input",e=>{if(e.target&&e.target.id=="sm_t")smartPrev()});
document.addEventListener("keydown",e=>{if(e.target&&e.target.id=="sm_t"&&e.key=="Enter"){e.preventDefault();ACT.smartSave()}});
Object.assign(ACT,{
  smartAdd(){smartAdd()},smEx(t){const i=$("#sm_t");if(i){i.value=t;smartPrev();i.focus()}},
  smartSave(){const p=smartParse(($("#sm_t")||{}).value);if(!p.amt)return toast("Write an amount first");const A=ac(p.acc);if(!A.id)return toast("Add an account first");
    let amt=p.amt,note="";if(p.cur&&A.cur&&p.cur!=A.cur){note="Paid "+fmx(p.amt,p.cur);amt=Math.round(cv(p.amt,p.cur,A.cur)*100)/100}
    let t;if(p.kind=="tr"){const T=ac(p.to);if(!T.id||T.id==A.id)return toast("Choose the account it went to");const got=T.cur==A.cur?amt:Math.round(cv(amt,A.cur,T.cur)*100)/100;t=addTx(stamp({kind:"tr",acc:A.id,to:T.id,amt,got,fee:0,date:p.date,cur:A.cur,note:note||"",via:""}))}
    else t=addTx(stamp({kind:p.kind,acc:A.id,amt,cur:A.cur,date:p.date,cat:p.cat||"",payee:p.payee||"",note,tags:[]}));
    S.cfg.last=A.id;save();sheet("");render();const id=t&&t.id;toast("Saved: "+(p.kind=="in"?"+":p.kind=="tr"?"⇄ ":"−")+fmx(amt,A.cur)+(p.payee?" · "+p.payee:""),()=>{if(id){removeTx(id);save();render();toast("Taken back")}})},
  smartForm(){const p=smartParse(($("#sm_t")||{}).value);if(p.kind=="tr")trForm({acc:p.acc,to:p.to,amt:p.amt,got:p.amt,date:p.date,note:"",via:""});else qForm(p.kind,{amt:p.amt,acc:p.acc,date:p.date,cat:p.cat,payee:p.payee})}
});
/* the add form offers Type it too */
{const _qf=qForm;qForm=function(...a){const r=_qf.apply(this,a);try{const f=$("#f_amt");if(f&&!$("#over .smlink"))f.insertAdjacentHTML("afterend",`<button class="lnk smlink" data-act="smartAdd" style="display:block;margin:0 0 8px">✨ Or just type it: “45 lulu”</button>`)}catch(e){}return r}}

/* ---------- Spending: select many entries and change them together ---------- */
let selMode=false;const SEL_IDS=new Set();
function selBar(){const n=SEL_IDS.size;return `<div class="selbar" role="toolbar" aria-label="Selected entries"><b>${n} selected</b><div class="selbtns"><button data-act="selCat"${n?"":" disabled"}>🏷️<small>Category</small></button><button data-act="selAcc"${n?"":" disabled"}>🏦<small>Account</small></button><button data-act="selTag"${n?"":" disabled"}>#<small>Tag</small></button><button data-act="selDel"${n?"":" disabled"}>🗑️<small>Delete</small></button><button data-act="selDone">✓<small>Done</small></button></div></div>`}
{const _vs7=vSpend;vSpend=function(...a){let h=_vs7(...a);try{const T=document.createElement("template");T.innerHTML=h;const C=T.content,H=[...C.querySelectorAll("h2")].find(x=>x.textContent.trim()=="Entries");
  if(H){H.classList.add("hsel");H.insertAdjacentHTML("beforeend",` <button class="lnk" data-act="selT" style="float:right;font-size:14px">${selMode?"Cancel":"Select"}</button>`)}
  if(selMode){C.querySelectorAll('.row[data-act="editTx"]').forEach(r=>{if(r.closest(".cdet"))return;r.dataset.act="selTx";r.classList.toggle("picked",SEL_IDS.has(r.dataset.id));r.insertAdjacentHTML("afterbegin",`<span class="pick" aria-hidden="true">${SEL_IDS.has(r.dataset.id)?"✓":""}</span>`)});C.appendChild(document.createRange().createContextualFragment(selBar()))}
  const d=document.createElement("div");d.appendChild(C);return d.innerHTML}catch(e){console.warn(e);return h}}}
const selTx=()=>[...SEL_IDS].map(id=>S.tx.find(t=>t.id==id)).filter(Boolean);
function selApply(fn,msg){const L=selTx(),old=L.map(t=>JSON.parse(JSON.stringify(t)));L.forEach(t=>{fn(t);t.ut=Date.now()});save();SEL_IDS.clear();selMode=false;sheet("");render();
  toast(msg+" · "+L.length+(L.length==1?" entry":" entries"),()=>{old.forEach(o=>{const i=S.tx.findIndex(t=>t.id==o.id);if(i>=0)S.tx[i]=o});save();render();toast("Changed back")})}
Object.assign(ACT,{
  selT(){selMode=!selMode;SEL_IDS.clear();render()},selDone(){selMode=false;SEL_IDS.clear();render()},
  selTx(id){SEL_IDS.has(id)?SEL_IDS.delete(id):SEL_IDS.add(id);render()},
  selCat(){const used=[...new Set([...S.tx.map(x=>x.cat).filter(Boolean),...CATS])].slice(0,40);sheet(`<h2>Category for ${SEL_IDS.size} entries</h2><div class="fchips" style="flex-wrap:wrap">${used.map(c=>`<button class="fchip" data-act="selCatSet" data-id="${esc(c)}">${catIcon({cat:c,kind:"out"})} ${esc(c)}</button>`).join("")}</div>`)},
  selCatSet(c){selApply(t=>{if(t.kind=="out"||t.kind=="in")t.cat=c},"Category set to "+c)},
  selAcc(){sheet(`<h2>Account for ${SEL_IDS.size} entries</h2>${S.acc.filter(a=>!a.closed).map(a=>`<div class="row" data-act="selAccSet" data-id="${a.id}"><div><b>${esc(a.name)}</b><small>${a.cur}</small></div><span class="dots">›</span></div>`).join("")}`)},
  selAccSet(id){const A=ac(id);selApply(t=>{if(t.kind=="tr"&&t.to==A.id)return;linkApply(t,-1);const c0=t.cur||ac(t.acc).cur||"INR";if(A.cur!=c0){t.note=[t.note,"Paid "+fmx(t.amt,c0)].filter(Boolean).join(" · ");t.amt=Math.round(cv(t.amt,c0,A.cur)*100)/100;t.cur=A.cur}t.acc=A.id;linkApply(t,1)},"Moved to "+A.name)},
  selTag(){sheet(`<h2>Add a tag to ${SEL_IDS.size} entries</h2>${F("f_seltag","Tag","")}<div class="acts"><button class="btn" data-act="selTagSet">Add tag</button></div>`)},
  selTagSet(){const g=String(($("#f_seltag")||{}).value||"").trim().replace(/^#/,"");if(!g)return toast("Write a tag");selApply(t=>{t.tags=[...new Set([...(t.tags||[]),g])]},"Tagged #"+g)},
  selDel(){const L=selTx();if(!L.length||!confirm("Delete "+L.length+(L.length==1?" entry?":" entries?")))return;const ids=L.map(t=>t.id);ids.forEach(id=>removeTx(id));save();SEL_IDS.clear();selMode=false;render();
    toast("Deleted "+ids.length+" · they’re in the Recycle bin",()=>{ids.forEach(id=>untrash(id));save();render();toast("Restored")})}
});
document.addEventListener("keydown",e=>{if(e.key=="Escape"&&selMode){selMode=false;SEL_IDS.clear();render()}});

/* ---------- Month in review ---------- */
function wrapMonth(){const t=today();return +t.slice(8)<=7?addMon(t.slice(0,7),-1):t.slice(0,7)}
function wrapData(m){const T=S.tx.filter(x=>x.date.startsWith(m)),out=T.filter(x=>x.kind=="out"),inn=T.filter(x=>x.kind=="in"),pm=addMon(m,-1),pout=S.tx.filter(x=>x.kind=="out"&&x.date.startsWith(pm));
  const spent=sumV(out),income=sumV(inn),prev=sumV(pout),by=(L,k)=>{const o={};L.forEach(x=>{const v=k(x);if(!v)return;const r=o[v]=o[v]||{a:0,n:0};r.a+=ca(x);r.n++});return Object.entries(o).sort((a,b)=>b[1].a-a[1].a)};
  const cats=by(out,x=>x.cat||"Other").slice(0,4),shops=by(out,x=>x.payee),days=by(out,x=>x.date),accs=by(T.filter(x=>x.kind=="out"||x.kind=="in"),x=>an(x.acc));
  const last=m<today().slice(0,7)?dim(m):+today().slice(8),noSpend=Math.max(0,last-new Set(out.map(x=>x.date)).size),big=[...out].sort((a,b)=>ca(b)-ca(a))[0];
  return {m,spent,income,prev,cats,shop:shops.find(s=>s[1].n>=2)||shops[0],day:days[0],acc:accs[0],noSpend,last,big,n:T.length,rate:income>0?Math.round((income-spent)/income*100):null}}
function wrapSheet(m){m=m||wrapMonth();const W=wrapData(m);if(!W.n)return sheet(`<h2>Month in review</h2><div class="empty">No entries in ${mlong(m)} yet.</div>`);
  const d=W.prev?Math.round((W.spent/W.prev-1)*100):null,mx=Math.max(1,...W.cats.map(c=>c[1].a));
  const C=[[`<small>${mlong(m)}</small><b class="wbig">${fm(W.spent)}</b><span>spent${d!=null?` · ${d>0?"▲":"▼"} ${Math.abs(d)}% against ${mlong(addMon(m,-1))}`:""}</span><span class="wsm">${W.n} entries${W.income?" · income "+fm(W.income):""}</span>`,"w1"],
    [`<small>Where it went</small>${W.cats.map(([c,r])=>`<div class="wcat"><span>${catIcon({cat:c,kind:"out"})} ${esc(c)}</span><b>${fm(r.a)}</b><div class="wbar"><i style="width:${Math.round(r.a/mx*100)}%"></i></div></div>`).join("")}`,"w2"],
    W.shop?[`<small>Your favourite place</small><b class="wbig">${esc(W.shop[0])}</b><span>${fm(W.shop[1].a)} over ${W.shop[1].n} ${W.shop[1].n==1?"visit":"visits"}</span>`,"w3"]:null,
    W.day?[`<small>Your biggest day</small><b class="wbig">${fmt(W.day[0])}</b><span>${fm(W.day[1].a)} in ${W.day[1].n} ${W.day[1].n==1?"entry":"entries"}</span>${W.big?`<span class="wsm">Biggest single: ${fm(ca(W.big))} · ${esc(W.big.payee||W.big.cat||"")}</span>`:""}`,"w4"]:null,
    [`<small>No-spend days</small><b class="wbig">${W.noSpend}</b><span>out of ${W.last} days</span><div class="wdots">${Array.from({length:W.last},(_,i)=>{const ds=m+"-"+String(i+1).padStart(2,"0");return `<i class="${S.tx.some(x=>x.kind=="out"&&x.date==ds)?"":"z"}"></i>`}).join("")}</div>`,"w5"],
    W.rate!=null?[`<small>Kept from income</small>${ringSvg(Math.max(0,Math.min(100,W.rate)),W.rate+"%","#fff",120)}<span>${W.rate>=20?"Great: 20% or more kept":"Aim to keep 20% or more"}</span>`,"w6"]:null].filter(Boolean);
  sheet(`<h2 id="wrap_sheet">${mlong(m)} in review</h2><div class="wrap" id="wrapc">${C.map(([h,c])=>`<div class="wcard ${c}">${h}</div>`).join("")}</div><div class="wnav">${C.map((_,i)=>`<i class="${i?"":"on"}"></i>`).join("")}</div>
  <div class="acts"><button class="btn ghost sm" data-act="wrapGo" data-id="${addMon(m,-1)}">‹ ${mlong(addMon(m,-1))}</button>${m<today().slice(0,7)?`<button class="btn ghost sm" data-act="wrapGo" data-id="${addMon(m,1)}">${mlong(addMon(m,1))} ›</button>`:""}</div>`);
  S.cfg.wrapSeen=m;save();const w=$("#wrapc");if(w)w.addEventListener("scroll",()=>{const i=Math.round(w.scrollLeft/(w.clientWidth*.86));$$("#over .wnav i").forEach((d,k)=>d.classList.toggle("on",k==i))},{passive:true})}
Object.assign(ACT,{wrapSheet(){wrapSheet()},wrapGo(m){wrapSheet(m)}});
/* Home: a banner in the first week of the month; Reports: a button on Summary */
{const _vh5=vHome;vHome=function(...a){let h=_vh5(...a);try{const m=wrapMonth();if(+today().slice(8)<=7&&S.cfg.wrapSeen!=m&&S.tx.some(x=>x.date.startsWith(m))){const b=`<div class="card wban" data-act="wrapSheet" role="button"><span aria-hidden="true">✨</span><div><b>Your ${mlong(m)} in review</b><small>Where it went, your favourite place, no-spend days</small></div><span class="chev" aria-hidden="true">›</span></div>`;const i=h.indexOf('<div class="qa"');h=i>=0?h.replace(/(<div class="qa"[\s\S]*?<\/div>)/,"$1"+b):b+h}}catch(e){}return h}}
{const _vr=vRep;vRep=function(...a){let h=_vr(...a);try{if(rSeg()=="sum"&&S.tx.length)h=h.replace('<div class="segs rsegs">',`<button class="card wban wbtn" data-act="wrapSheet"><span aria-hidden="true">✨</span><div><b>Month in review</b><small>${mlong(wrapMonth())} in a few pictures</small></div><span class="chev" aria-hidden="true">›</span></button><div class="segs rsegs">`)}catch(e){}return h}}
