/* ===== Version 33.1: only payment sources are read; a separate review history; a card bill paid from savings is a transfer; overdue alerts ===== */

/* ---------- which apps are read: banks, wallets and payment apps, email, and SMS from banks. Never chat apps. ---------- */
const CHATPK=new Set(["com.whatsapp","com.whatsapp.w4b","org.thoughtcrime.securesms","com.facebook.orca","com.facebook.mlite","com.facebook.katana","com.facebook.lite","com.instagram.android","com.instagram.barcelona",
  "com.snapchat.android","com.viber.voip","com.imo.android.imoim","im.thebot.messenger","com.skype.raider","com.microsoft.teams","com.Slack","com.discord","com.twitter.android","com.tencent.mm","jp.naver.line.android",
  "com.google.android.apps.dynamite","com.linkedin.android","com.google.android.youtube"]);
const chatLike=p=>{p=String(p||"");return CHATPK.has(p)||/telegram|challegram|nekogram|cherrygram/i.test(p)};
const EMAILPK=new Set(["com.google.android.gm","com.microsoft.office.outlook","com.samsung.android.email.provider","com.yahoo.mobile.client.android.mail"]),
  SMSPK=new Set(["com.google.android.apps.messaging","com.samsung.android.messaging","com.android.mms","com.truecaller"]),
  PAYPK=/bank|banking|wallet|upi|yono|sbi|hdfc|icici|imobile|axis|kotak|fedmobile|federal|canara|iob|indianbank|pnb|baroda|unionbank|idfc|indusind|yesbank|rbl|kvb|karurvysya|southindian|dhanlaxmi|aubank|equitas|ujjivan|qnb|cbq|dohabank|dukhan|qiib|alrayan|rayan|hsbc|ahli|masraf|mashreq|emiratesnbd|adcb|citi|amex|americanexpress|stanchart|creditcard|onecard|exchange|remit|westernunion|lulumoney|paytm|phonepe|mobikwik|freecharge|bhim|(^|[._])[a-z]*pay[a-z]*($|[._])/i;
function payRead(pkg){pkg=String(pkg||"");if(!pkg||pkg=="m"||pkg=="mail"||pkg=="test")return true;if(chatLike(pkg)||(S.cfg.ignAdd||[]).includes(pkg))return false;if((S.cfg.readAdd||[]).includes(pkg))return true;
  return EMAILPK.has(pkg)||SMSPK.has(pkg)||WALLETPK.test(pkg)||UPIPK.test(pkg)||PAYPK.test(pkg)}
const payIgn=pkg=>!payRead(pkg);
/* an SMS from a person (a contact, or a number with no bank details) is not a bank alert */
const BANKISH=/bank|bnk|card|pay|upi|wallet|exchange|remit|sbi|hdfc|icici|axis|kotak|qnb|cbq|qiib|hsbc|ahli|dukhan|rayan|doha|amex|citi/i,
  BANKMARK=/(a\/c|acct|account|card)\s*(no\.?)?\s*(ending\s*(in|with)?\s*)?(x+|\*+|•+)?\s*\d{3,6}\b|avl\.?\s*bal|available\s+(bal|balance|limit)|debited\s+from|credited\s+to\s+(your\s+)?a|upi\s*ref|ref\.?\s*no|txn\s*(id|no)|imps|neft|rtgs|\bbank\b/i;
function smsPerson(from,body){const t=String(from||"").trim();if(BANKISH.test(t))return false;if(/^[A-Za-z]{2}-[A-Za-z0-9]{3,9}(-[A-Za-z])?$/.test(t))return false;
  if(!t||/^\+?[\d ()-]{6,}$/.test(t))return !BANKMARK.test(String(body||""));if(/\s/.test(t)&&/[a-z]/.test(t))return true;return /^[A-Z][a-z]+$/.test(t)}
const pkgOf=x=>{if(!x)return "";if(x.pkg)return String(x.pkg);const i=String(x.id||"");return i.includes(":")?i.split(":")[0]:""};
const CHATNAME=/telegram|whatsapp|signal|messenger|instagram|facebook|snapchat|viber|\bimo\b|botim|skype|teams|slack|discord|wechat|\bline\b|google chat|linkedin|threads|youtube/i;
/* an alert from an app that isn't read, or an SMS from a person, is passed over */
const ntfSkip=m=>{const k=pkgOf(m);if(!k||!k.includes("."))return CHATNAME.test(String((m&&(m.app||m.from))||""));return payIgn(k)||(SMSPK.has(k)&&smsPerson(String((m&&m.body)||"").split(". ")[0],m&&m.body))};
/* anything already picked up from apps or people that aren't read goes, with its question on the phone */
function payPurge(){const q=S.cfg.smsq||[],bad=x=>x.src=="n"&&ntfSkip(x),gone=q.filter(bad);
  const no=(S.cfg.ntfNo||[]).filter(x=>!payIgn(pkgOf(x))),pend=(S.cfg.payPend||[]).filter(a=>!payIgn(pkgOf(a)));
  const n=gone.length+(S.cfg.ntfNo||[]).length-no.length+(S.cfg.payPend||[]).length-pend.length;if(!n)return 0;
  S.cfg.smsq=q.filter(x=>!gone.includes(x));S.cfg.ntfNo=no;S.cfg.payPend=pend;save();payClear(gone.map(x=>x.id));return n}

/* ---------- Apps read ---------- */
const APPNAME={"com.google.android.gm":"Gmail","com.microsoft.office.outlook":"Outlook","com.google.android.apps.walletnfcrel":"Google Wallet","com.google.android.apps.nbu.paisa.user":"Google Pay","com.phonepe.app":"PhonePe","net.one97.paytm":"Paytm","com.samsung.android.spay":"Samsung Wallet","com.dreamplug.androidapp":"CRED","in.org.npci.upiapp":"BHIM"};
const appName=pkg=>APPNAME[pkg]||(S.cfg.appNames||{})[pkg]||pkg;
async function appsSheet(){let sk=[];if(isApp()){try{sk=((await NP("DueNative","appsSkipped")).items||[]).filter(x=>x&&x.pkg&&!payRead(x.pkg))}catch(e){}}
  const add=S.cfg.readAdd||[],ign=S.cfg.ignAdd||[],row=(name,sub,act,id,lab,solid,dot)=>`<div class="trow"><span class="tdot ${dot||(act=="appStop"?"good":"na")}" aria-hidden="true"></span><div class="tmain"><b>${esc(name)}</b><small>${sub}</small></div>${act?`<button class="btn sm${solid?"":" ghost"}" data-act="${act}" data-id="${esc(id)}" data-name="${esc(name)}">${lab}</button>`:""}</div>`;
  sheet(`<h2 id="apps_sheet">Apps read</h2><p class="sub">Only payment messages are read. Nothing else on your phone is looked at.</p>
  <div class="card">${row("Bank and card apps","Your banks’ and cards’ own apps","","","","","good")}${row("Wallets and payment apps","Google Wallet, Google Pay, PhonePe, Paytm, Samsung Wallet, CRED, BHIM","","","","","good")}${row("Email","Gmail and Outlook, for bank emails","","","","","good")}${row("SMS from banks","Messages from people are not read","","","","","good")}</div>
  <h3>Never read</h3><div class="card">${row("Telegram, WhatsApp and other chat apps","Signal, Messenger, Instagram, Facebook, Snapchat, Viber, imo, BOTIM, Skype, Teams and the rest","","","","","bad")}${row("Every other app","Shopping, games, news and so on","","","","","na")}</div>
  ${sk.length?`<h3>Apps that showed an amount</h3><p class="note">These aren’t read. If one is your bank’s app, tap Read it.</p><div class="card">${sk.map(x=>row(x.app||x.pkg,"Not read · seen "+tAgo(+x.t),"appRead",x.pkg,"Read it",false)).join("")}</div>`:""}
  ${add.length?`<h3>You chose to read</h3><div class="card">${add.map(p=>row(appName(p),"Read","appStop",p,"Stop reading",false)).join("")}</div>`:""}
  ${ign.length?`<h3>You stopped reading</h3><div class="card">${ign.map(p=>row(appName(p),"Not read","appAgain",p,"Read again",false)).join("")}</div>`:""}
  <p class="note">To stop reading any app, open <b>Last messages checked</b> and tap <b>Don’t read this app</b> under its message.</p>`)}
async function appsApply(msg){const n=payPurge();await payPopSync();render();toast(msg+(n?" · "+n+" cleared":""))}
const nameKeep=(pkg,name)=>{if(name&&name!=pkg)S.cfg.appNames=payTrim({...(S.cfg.appNames||{}),[pkg]:name},40)};
Object.assign(ACT,{
  appsSheet(){appsSheet()},
  async appRead(pkg,el){if(!pkg||chatLike(pkg))return;nameKeep(pkg,el&&el.dataset&&el.dataset.name);S.cfg.readAdd=[...new Set([...(S.cfg.readAdd||[]),pkg])];S.cfg.ignAdd=(S.cfg.ignAdd||[]).filter(p=>p!=pkg);save();await appsApply(appName(pkg)+" is read now");appsSheet()},
  async appStop(pkg){S.cfg.readAdd=(S.cfg.readAdd||[]).filter(p=>p!=pkg);save();await appsApply(appName(pkg)+" is not read");appsSheet()},
  async appAgain(pkg){S.cfg.ignAdd=(S.cfg.ignAdd||[]).filter(p=>p!=pkg);save();await appsApply(appName(pkg)+" is read again");appsSheet()},
  async ignAdd(pkg,el){if(!pkg)return;const name=el&&el.dataset?el.dataset.name||"":"";nameKeep(pkg,name);S.cfg.ignAdd=[...new Set([...(S.cfg.ignAdd||[]),pkg])];S.cfg.readAdd=(S.cfg.readAdd||[]).filter(p=>p!=pkg);save();await appsApply((name||appName(pkg))+" won’t be read");readCheck()}
});
/* Last messages checked: a button under each app's message to stop reading that app */
{const _rc=readCheck;readCheck=async function(...a){const r=await _rc.apply(this,a);try{if(!isApp())return r;let L=[];try{L=(await NP("DueNative","notifLog")).items||[]}catch(e){}
  const byBody=new Map(L.filter(x=>x&&x.pkg).map(x=>[String(x.body||"").slice(0,140),x]));
  $$("#over .row").forEach(rw=>{const sm=rw.querySelectorAll("small"),b=sm.length?sm[sm.length-1].textContent:"",x=byBody.get(b);if(!x||payIgn(x.pkg)||rw.querySelector(".ignb"))return;
    rw.querySelector("div").insertAdjacentHTML("beforeend",`<button class="btn sm ghost ignb" style="margin-top:6px" data-act="ignAdd" data-id="${esc(x.pkg)}" data-name="${esc(x.app||"")}">Don’t read this app</button>`)})}catch(e){console.warn(e)}return r}}

/* ---------- a card bill paid from a bank account is a transfer, not spending ---------- */
const CC_YES=/credit\s*card|\bcc\b|card\s*(?:bill|a\/c|account)|\bcred\b/i,
  CC_SURE=/payment\s+(?:of\s+\S+\s*[\d,.]+\s+)?(?:has\s+been\s+|is\s+)?received|thank\s+you\s+for\s+(?:your\s+|the\s+)?payment|towards\s+(?:your\s+)?(?:[\w&]+\s+){0,3}credit\s*card|credited\s+to\s+(?:your\s+)?(?:[\w&]+\s+){0,3}(?:credit\s*)?card|(?:paid|transferred)\s+to\s+(?:your\s+)?(?:[\w&]+\s+){0,3}credit\s*card|credit\s*card\s+(?:bill\s+)?payment\s+(?:of|for)|\bto\s+cred\b/i,
  CC_PAY=/payment|repayment|\bpaid\b|settle|transferred to|thank you for/i,
  CC_NO=/\bspent\b|purchase|used\s+(?:for|at)|\bpos\b|withdraw|\bdue\b|minimum amount|statement|outstanding|reminder|\bemi\b/i,
  CC_HARD=/declined|failed|unsuccessful|will be|reversed|refund|please pay|pay by|is due/i,
  /* a bill or due reminder is not a payment */
  BILLNOTE=/minimum\s+(?:amount\s+)?due|payment\s+due|due\s+date|total\s+(?:amount\s+)?due|statement\s+(?:is|has been)\s+(?:generated|ready)|is\s+due\s+on/i,
  DONEW=/debited|spent|was used|has been (?:paid|received|credited)|credited to|received|thank you for/i;
function cardBill(t){t=String(t||"");if(!CC_YES.test(t)||CC_HARD.test(t))return false;return CC_SURE.test(t)||(CC_PAY.test(t)&&!CC_NO.test(t)&&!/\bat\s+[A-Z][A-Za-z]/.test(t))}
function ccDigits(t){const R=/(a\/c|acct|account|card)\s*(?:no\.?\s*)?(?:ending\s*(?:in|with)?\s*)?(?:x+|\*+|•+)?\s*(\d{4})\b/gi;let m,acc="",card="";while((m=R.exec(t))){if(m[1].toLowerCase()=="card"){if(!card)card=m[2]}else if(!acc)acc=m[2]}return {acc,card}}
{const _ps=parseSms;parseSms=function(t,...a){const s=String(t||"");if(BILLNOTE.test(s)&&!DONEW.test(s))return null;const p=_ps.call(this,t,...a);
  try{if(p&&cardBill(s)){const d=ccDigits(s),A=d.acc?l4Acc(d.acc):null,C=d.card?l4Acc(d.card):null,P=p.acc?ac(p.acc):null,cards=S.acc.filter(x=>x.type=="card"&&(!p.cur||x.cur==p.cur));
    let to=C&&C.type=="card"?C.id:P&&P.id&&P.type=="card"&&p.kind=="in"?P.id:"",toSure=!!to;if(!to&&cards.length==1)to=cards[0].id;
    let from=A&&A.type!="card"?A.id:"",fromSure=!!from;if(!from&&to)from=(S.cfg.ccFrom||{})[to]||"";if(!from){const B=S.acc.filter(x=>x.type=="bank"&&(!p.cur||x.cur==p.cur));if(B.length==1)from=B[0].id}
    Object.assign(p,{cc:1,card:d.card||"",ccFrom:from,ccTo:to,ccFromSure:fromSure,ccToSure:toSure,payee:"Card bill"+(d.card?" "+d.card:"")})}}catch(e){}return p}}
/* the bank's "debited towards your card" and the card's "payment received" are one payment */
{const _dq=dedupeQ;dedupeQ=function(...a){try{const q=S.cfg.smsq||[],out=[],al={...(S.cfg.qAlias||{})};
  q.forEach(m=>{if(!(m.p&&m.p.cc))return out.push(m);const d=out.find(o=>o.p&&o.p.cc&&Math.abs(o.p.amt-m.p.amt)<.005&&Math.abs(dl(o.p.date)-dl(m.p.date))<=1);if(!d)return out.push(m);
    if(m.p.ccFrom&&(m.p.ccFromSure||!d.p.ccFrom)){d.p.ccFrom=m.p.ccFrom;d.p.ccFromSure=d.p.ccFromSure||m.p.ccFromSure}if(m.p.ccTo&&(m.p.ccToSure||!d.p.ccTo)){d.p.ccTo=m.p.ccTo;d.p.ccToSure=d.p.ccToSure||m.p.ccToSure}
    if(!d.p.card&&m.p.card){d.p.card=m.p.card;d.p.payee="Card bill "+m.p.card}if(m.p.kind=="out"&&d.p.kind!="out"){d.body=m.body;d.from=m.from}al[m.id]=d.id;if(m.yes)d.yes=1});
  S.cfg.smsq=out;S.cfg.qAlias=payTrim(al,60)}catch(e){}return _dq.apply(this,a)}}
{const _pf=payFind;payFind=function(a){const m=_pf(a);if(m)return m;const q=S.cfg.smsq||[],al=(S.cfg.qAlias||{})[a.id];if(al){const x=q.find(y=>String(y.id)==String(al));if(x)return x}
  if(a.kind=="tr"&&+a.amt>0){const d=iso(new Date(+a.t||Date.now()));return q.find(x=>x.p&&x.p.cc&&Math.abs(x.p.amt-a.amt)<.005&&Math.abs(dl(x.p.date)-dl(d))<=1)||null}return null}}
const ccOk=p=>{const F=ac(p.ccFrom),T=ac(p.ccTo);return !!(F.id&&T.id&&F.id!=T.id&&F.cur==T.cur)};
const ccHas=m=>S.tx.some(x=>x.kind=="tr"&&Math.abs(x.amt-m.p.amt)<.005&&Math.abs(dl(x.date)-dl(m.p.date))<=1&&(!m.p.ccTo||x.to==m.p.ccTo));
function ccMake(m,via){const f=m.p.ccFrom,t=m.p.ccTo,tx=addTx(stamp({kind:"tr",acc:f,to:t,amt:+m.p.amt,got:+m.p.amt,fee:0,date:m.p.date||today(),cur:ac(f).cur,note:"Card bill payment",via:""}));
  S.cfg.smsq=(S.cfg.smsq||[]).filter(x=>x!==m&&String(x.id)!=String(m.id));S.cfg.ccFrom=payTrim({...(S.cfg.ccFrom||{}),[t]:f},20);revLog(m,"transfer",via,tx);payClear([m.id]);return tx}
let ccPend=null;
{const _qo=quickOk;quickOk=function(m,...a){if(m&&m.p&&m.p.cc)return false;return _qo.call(this,m,...a)}}
Object.assign(ACT,{
  ccSave(id){const m=(S.cfg.smsq||[]).find(x=>String(x.id)==String(id));if(!m)return;if(!ccOk(m.p))return ACT.ccForm(id);const tx=ccMake(m,m.yes?"phone":"app");save();render();toast("Saved as a transfer to "+ac(tx.to).name);if((S.cfg.smsq||[]).length)smsReview();else sheet("")},
  ccForm(id){const m=(S.cfg.smsq||[]).find(x=>String(x.id)==String(id));if(!m)return;ccPend={m:JSON.parse(JSON.stringify(m)),n:S.tx.length};
    trForm({acc:m.p.ccFrom||"",to:m.p.ccTo||"",amt:m.p.amt,got:m.p.amt,date:m.p.date||today(),note:"Card bill payment",via:""});const h=$("#over h2");if(h)h.textContent="Card bill payment";
    const n=$("#trn");if(n&&!ccOk(m.p))n.insertAdjacentHTML("beforebegin",`<p class="note" style="color:var(--pri)">Choose the bank account it was paid from and the card it went to.${S.acc.some(a=>a.type=="card")?"":" Add the card as an account of type Credit card first."}</p>`)}
});
{const _str=ACT.saveTr;ACT.saveTr=function(...a){const pend=ccPend;ccPend=null;const r=_str.apply(this,a);try{if(pend&&S.tx.length>pend.n){const tx=S.tx[S.tx.length-1];S.cfg.smsq=(S.cfg.smsq||[]).filter(x=>String(x.id)!=String(pend.m.id));
  if(tx&&tx.to&&tx.acc)S.cfg.ccFrom=payTrim({...(S.cfg.ccFrom||{}),[tx.to]:tx.acc},20);revLog(pend.m,"transfer",pend.m.yes?"phone":"app",tx);payClear([pend.m.id]);save();render()}}catch(e){}return r}}
/* the review card offers the transfer first */
{const _sr2=smsReview;smsReview=function(...a){const r=_sr2.apply(this,a);try{(S.cfg.smsq||[]).forEach(m=>{if(!(m.p&&m.p.cc))return;const b=$(`#over [data-act="smsAdd"][data-id="${CSS.escape(String(m.id))}"]`),c=b&&b.closest(".card");if(!c||c.querySelector(".ccnote"))return;
  const F=ac(m.p.ccFrom),T=ac(m.p.ccTo),ok=ccOk(m.p),hb=c.querySelector(".hbl b");if(hb)hb.textContent="⇄ "+fmx(m.p.amt,m.p.cur||F.cur||T.cur||"INR")+" · Card bill payment";
  c.querySelectorAll('[data-act="smsQuick"],[data-act="autoFrom"]').forEach(x=>x.remove());c.querySelectorAll("p.note").forEach(x=>{if(/^Account:/.test(x.textContent))x.remove()});const acts=b.closest(".acts");
  acts.insertAdjacentHTML("beforebegin",`<p class="note ccnote" style="color:var(--pri)"><b>A transfer, not spending:</b> ${F.id?esc(F.name):"your bank account"} → ${T.id?esc(T.name):"your card"+(m.p.card?" ending "+esc(m.p.card):"")}</p>`);
  acts.insertAdjacentHTML("afterbegin",`${ok?`<button class="btn sm" data-act="ccSave" data-id="${esc(m.id)}">Save transfer</button>`:""}<button class="btn sm${ok?" ghost":""}" data-act="ccForm" data-id="${esc(m.id)}">${ok?"Change":"Transfer…"}</button>`);
  b.classList.add("ghost");b.textContent="Expense instead";const y=c.querySelector(".yesnote");if(y)y.innerHTML="<b>You tapped Add transfer on the phone.</b> Check the accounts, then save."});
  const h=$("#over h2");if(h&&!$("#over [data-act='revSheet']"))h.parentElement.insertAdjacentHTML("beforeend",`<div class="acts"><button class="btn ghost" data-act="revSheet">Review history</button></div>`)}catch(e){console.warn(e)}return r}}

/* ---------- review history: every payment added, skipped or saved for you, kept apart from your entries ---------- */
let payVia="app";
function revLog(m,act,via,tx){try{const p=(m&&m.p)||{},L=S.cfg.payLog=S.cfg.payLog||[];
  L.push({id:String((m&&m.id)||uid()),t:Date.now(),act,via:via||payVia||"app",amt:+p.amt||+(tx&&tx.amt)||0,cur:p.cur||(tx&&(tx.cur||ac(tx.acc).cur))||"",kind:p.cc||act=="transfer"?"tr":p.kind||(tx&&tx.kind)||"",
    payee:p.payee||(tx&&tx.payee)||"",from:String((m&&m.from)||"").replace(/^(Email|SMS)\s*·\s*/i,"").slice(0,40),date:p.date||(tx&&tx.date)||today(),tx:(tx&&tx.id)||"",...(act=="skip"?{body:String((m&&m.body)||"").slice(0,240),p:{...p}}:{})});
  S.cfg.payLog=L.slice(-200)}catch(e){}}
{const _qs2=quickSave;quickSave=function(m,...r){const t=_qs2.call(this,m,...r);try{if(t&&t.id)revLog(m,payVia=="auto"?"auto":"add",payVia,t)}catch(e){}return t}}
{const _at=autoTake;autoTake=function(...a){const v=payVia;payVia="auto";try{let n=_at.apply(this,a)||0;const keys=S.cfg.autoFrom||[];
  [...(S.cfg.smsq||[])].forEach(m=>{if(m.p&&m.p.cc&&keys.includes(sendKey(m.from))&&ccOk(m.p)&&!ccHas(m)){ccMake(m,"auto");n++}});return n}finally{payVia=v}}}
{const _pa=payApply;payApply=function(a){const v=payVia;payVia="phone";try{
  if(a&&a.act=="add"){const m=payFind(a);if(m&&m.p&&m.p.cc){if(ccHas(m)){S.cfg.smsq=(S.cfg.smsq||[]).filter(x=>x!==m);return "done"}
    if(ccOk(m.p)){const tx=ccMake(m,"phone"),T=S.cfg.payTx=S.cfg.payTx||{};T[a.id]=tx.id;T[m.id]=tx.id;return "add"}m.yes=1;return "need"}}
  const before=a&&a.act=="skip"?payFind(a):null,r=_pa(a);
  if(r=="skip"&&before)revLog(before,"skip","phone");else if(r=="undo"){const L=S.cfg.payLog||[],x=[...L].reverse().find(e=>e.id==String(a.id)&&e.act!="undo");if(x){L.push({...x,t:Date.now(),act:"undo",via:"phone"});S.cfg.payLog=L.slice(-200)}}
  return r}finally{payVia=v}}}
let revPend=null;
{const _a3=ACT.smsAdd;ACT.smsAdd=function(id,...r){const m=(S.cfg.smsq||[]).find(x=>String(x.id)==String(id));revPend=m?{m:JSON.parse(JSON.stringify(m)),n:S.tx.length}:null;return _a3.call(this,id,...r)}}
{const _st4=ACT.saveTx;ACT.saveTx=function(...a){const pend=revPend;revPend=null;const r=_st4.apply(this,a);try{if(pend&&S.tx.length>pend.n){revLog(pend.m,"add",pend.m.yes?"phone":"app",S.tx[S.tx.length-1]);save()}}catch(e){}return r}}
{const _sk=ACT.smsSkip;ACT.smsSkip=function(id,...r){const m=(S.cfg.smsq||[]).find(x=>String(x.id)==String(id));if(m)revLog(m,"skip","app");return _sk.call(this,id,...r)}}
{const _ska=ACT.smsSkipAll;ACT.smsSkipAll=function(...r){(S.cfg.smsq||[]).forEach(m=>revLog(m,"skip","app"));return _ska.apply(this,r)}}
const REVIC={add:["✓","Added",GOOD],auto:["✓","Saved without asking","var(--pri)"],transfer:["⇄","Saved as a transfer","var(--pri)"],skip:["–","Skipped","#9aa6a0"],undo:["↩","Undone","var(--soon)"]},REVVIA={phone:"on the phone",app:"in the app",auto:""};
function revSheet(f){f=f||S.cfg.revF||"all";S.cfg.revF=f;const L=(S.cfg.payLog||[]).slice().reverse(),pick=x=>f=="all"||(f=="add"?/^(add|auto|transfer)$/.test(x.act):/^(skip|undo)$/.test(x.act)),F=L.filter(pick).slice(0,150);
  const m0=today().slice(0,7),mo=L.filter(x=>iso(new Date(x.t)).slice(0,7)==m0),cnt=re=>mo.filter(x=>re.test(x.act)).length,G=[];
  F.forEach(x=>{const d=iso(new Date(x.t));let g=G.find(y=>y.d==d);if(!g)G.push(g={d,L:[]});g.L.push(x)});
  const row=x=>{const I=REVIC[x.act]||["•",x.act,"var(--mute)"],has=x.tx&&S.tx.some(t=>t.id==x.tx),tm=new Date(x.t),hh=String(tm.getHours()).padStart(2,"0")+":"+String(tm.getMinutes()).padStart(2,"0");
    const btn=x.act=="skip"&&!x.re&&x.p&&+x.p.amt?`<button class="btn sm ghost" data-act="revAdd" data-id="${esc(x.id)}">Add it</button>`:has?`<button class="btn sm ghost" data-act="revOpen" data-id="${esc(x.tx)}">Open</button>`:"";
    return `<div class="trow"><span class="rvic" style="background:${I[2]}" aria-hidden="true">${I[0]}</span><div class="tmain"><b>${x.kind=="in"?"+":x.kind=="tr"?"⇄ ":"−"}${fmx(x.amt,x.cur||"INR")}${x.payee?" · "+esc(x.payee):""}</b><small>${I[1]}${REVVIA[x.via]?" "+REVVIA[x.via]:""} · ${hh}${x.from?" · "+esc(x.from):""}</small></div>${btn}</div>`};
  sheet(`<h2 id="rev_sheet">Review history</h2><p class="sub">Every payment you added, skipped or that was saved for you, kept apart from your entries.</p>
  <div class="stats" style="grid-template-columns:repeat(3,1fr);margin:0 0 10px"><div class="stat"><small>Added this month</small><b>${cnt(/^(add|auto|transfer)$/)}</b></div><div class="stat"><small>Skipped</small><b>${cnt(/^skip$/)}</b></div><div class="stat" data-act="smsReview"><small>Waiting</small><b>${(S.cfg.smsq||[]).length}</b></div></div>
  <div class="segs">${[["all","All"],["add","Added"],["skip","Skipped"]].map(([k,l])=>`<button class="${k==f?"on":""}" data-act="revF" data-id="${k}">${l}</button>`).join("")}</div>
  ${G.length?G.map(g=>`<h3>${g.d==today()?"Today":g.d==plus(-1)?"Yesterday":fmt(g.d)}</h3><div class="card">${g.L.map(row).join("")}</div>`).join(""):`<div class="empty">Nothing here yet. Payments you add or skip show here.</div>`}
  ${(S.cfg.smsq||[]).length?`<div class="acts"><button class="btn" data-act="smsReview">Review ${(S.cfg.smsq||[]).length} waiting</button></div>`:""}`)}
Object.assign(ACT,{
  revSheet(){revSheet()},revF(k){revSheet(k)},revOpen(id){if(S.tx.some(t=>t.id==id))ACT.editTx(id)},
  revAdd(id){const x=[...(S.cfg.payLog||[])].reverse().find(e=>e.id==id&&e.act=="skip"&&e.p);if(!x)return;x.re=1;const q=S.cfg.smsq=S.cfg.smsq||[];if(!q.some(m=>String(m.id)==String(id)))q.push({id:x.id,from:x.from,body:x.body||"",p:{...x.p},src:"r"});save();ACT.smsAdd(x.id)}
});

/* ---------- alerts: not paid yet after the due date; document expiry never crowded out ---------- */
{const _nn=nativeNotify;nativeNotify=async function(...a){const r=await _nn.apply(this,a);try{if(!isApp())return r;const pm=await NP("LocalNotifications","checkPermissions");if(!pm||pm.display!="granted")return r;
  const now=Date.now(),secret=!!META.enc||!!S.cfg.hide,N=[];let k=0;
  upcoming(plus(-3),plus(45),true).filter(u=>(u.t=="due"||u.t=="emi")&&u.d>=plus(-3)).slice(0,25).forEach(u=>[[1,"was due yesterday"],[3,"was due 3 days ago"]].forEach(([b,w])=>{const at=D(u.d);at.setDate(at.getDate()+b);at.setHours(9,15,0,0);if(at.getTime()<=now||k>=40)return;
    const n={id:7700+k++,title:"Not paid yet: "+u.n,body:u.n+" "+w+(u.a&&!secret?" · "+fmx(u.a,u.c):"")+". Tap Mark paid if it’s done.",schedule:{at:at.toISOString(),allowWhileIdle:true},extra:{due:u.t=="due"&&!u.src?u.id:"",loan:u.t=="emi"?u.id:"",sub:u.src=="sub"?u.id:"",sch:u.src=="sch"?u.id:""}};if(u.a)n.actionTypeId="DUE";N.push(n)}));
  S.docs.forEach((d,i)=>{if(!d.exp)return;[[+d.rem||30,"in "+(+d.rem||30)+" days"],[7,"in 7 days"]].forEach(([b,w],j)=>{const at=D(d.exp);at.setDate(at.getDate()-b);at.setHours(9,30,0,0);if(at.getTime()>now)N.push({id:7000+i*2+j,title:d.name+" expires "+w,body:(d.type||"Document")+" · "+fmt(d.exp),schedule:{at:at.toISOString(),allowWhileIdle:true}})})});
  if(N.length)await NP("LocalNotifications","schedule",{notifications:N})}catch(e){console.warn("overdue reminders",e)}return r}}
