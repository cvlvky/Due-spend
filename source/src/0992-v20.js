/* ===== Version 20: app updates, rules file, teach once, learning, regular payments ===== */
const BUILD="__BUILD__",REPO_DEF="__REPO__";
const buildNo=()=>/^\d+$/.test(BUILD)?+BUILD:0;
function repoSlug(){const r=String(S.cfg.repo||"").trim().replace(/^https?:\/\/(www\.)?github\.com\//i,"").replace(/\.git$/,"").replace(/\/+$/,"");if(/^[\w.-]+\/[\w.-]+$/.test(r))return r;
  if(!/^__/.test(REPO_DEF)&&/^[\w.-]+\/[\w.-]+$/.test(REPO_DEF))return REPO_DEF;
  const m=location.hostname.match(/^([\w-]+)\.github\.io$/i);if(m){const p=location.pathname.split("/").filter(Boolean)[0];if(p&&!/\./.test(p))return m[1]+"/"+p}return ""}
async function getTxt(url){if(isApp()){try{const r=await NP("CapacitorHttp","get",{url,responseType:"text",connectTimeout:15000,readTimeout:20000});if(r&&r.status>=400)throw new Error("HTTP "+r.status);if(r&&r.data!=null)return typeof r.data=="string"?r.data:JSON.stringify(r.data)}catch(e){if(/HTTP/.test(e&&e.message))throw e}}
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),15000);try{const r=await fetch(url,{signal:ctl.signal,cache:"no-store"});if(!r.ok)throw new Error("HTTP "+r.status);return await r.text()}finally{clearTimeout(t)}}
const getJ=async u=>JSON.parse(await getTxt(u));
/* ---------- in-app updates: the build adds version.json next to the APK ---------- */
async function updCheck(force){if(!isApp()||inClaude())return null;const r=repoSlug();if(!r)return null;
  if(!force&&S.cfg.updAt&&Date.now()-S.cfg.updAt<6*36e5)return S.cfg.upd||null;
  try{const j=await getJ(`https://github.com/${r}/releases/download/app/version.json`),code=+(j&&j.code)||0;S.cfg.updAt=Date.now();S.cfg.updErr="";
    S.cfg.updLatest=code?{code,ver:String(j.ver||""),date:String(j.date||""),notes:String(j.notes||"").slice(0,800)}:null;const before=JSON.stringify(S.cfg.upd||null);S.cfg.upd=code&&buildNo()&&code>buildNo()?S.cfg.updLatest:null;save();if(tab=="home"&&before!==JSON.stringify(S.cfg.upd||null))render();return S.cfg.upd}
  catch(e){S.cfg.updAt=Date.now();S.cfg.updErr=String(e&&e.message||e);save();return null}}
async function updInstall(){const r=repoSlug();if(!r){toast("Add your GitHub repo in Settings first");return}const url=`https://github.com/${r}/releases/download/app/personal-diary.apk`;
  toast("Downloading the update…");
  try{const x=await NP("DueNative","installApk",{url});if(x&&x.needPermission)sheet(`<h2>One-time permission</h2><p class="sub">Android needs your OK before Personal Diary can install its own updates.</p><ol class="steps"><li>On the screen that opened, turn on <b>Allow from this source</b>.</li><li>Come back and tap <b>Install update</b>.</li></ol><div class="acts"><button class="btn" data-act="updInstall">Install update</button></div>`);else toast("Tap Install on the next screen. Your data stays.")}
  catch(e){toast("Opening the download in your browser…");try{await NP("DueNative","openUrl",{url})}catch(_){location.href=url}}}
const updCard=()=>S.cfg.upd&&isApp()?`<div class="card" style="margin:0 0 12px;cursor:pointer;border-color:var(--pri)" data-act="updInstall"><div class="hbl"><b>New version ready${S.cfg.upd.ver?": Version "+esc(S.cfg.upd.ver):""}</b><span class="chip">Install</span></div><small style="color:var(--mute)">Build ${S.cfg.upd.code}${S.cfg.upd.date?" · "+esc(S.cfg.upd.date.slice(0,10)):""}. Your data stays on the phone.</small></div>`:"";
/* ---------- rules.json in your GitHub repo: rates and message formats, no new APK needed ---------- */
async function rulesFetch(force){if(inClaude())return false;if(!force&&S.cfg.rulesAt&&Date.now()-S.cfg.rulesAt<12*36e5)return false;
  const r=repoSlug(),U=[];if(/\.github\.io$/i.test(location.hostname))U.push("rules.json?t="+Date.now());
  if(r){const [o,n]=r.split("/");U.push(`https://${o.toLowerCase()}.github.io/${n}/rules.json?t=${Date.now()}`,`https://raw.githubusercontent.com/${r}/HEAD/rules.json`)}
  S.cfg.rulesAt=Date.now();for(const u of U){try{const j=await getJ(u);if(j&&typeof j=="object"&&j.v){S.cfg.rules=j;S.cfg.rulesFrom=u.replace(/\?t=\d+$/,"");S.cfg.rulesOk=Date.now();rulesApply();save();return true}}catch(e){}}save();return false}
let rulesSms=[],rulesSkip=[];
function rulesApply(){const R=S.cfg.rules;if(!R||typeof R!="object")return;
  try{const Q=R.schemes&&R.schemes.quarter;if(Q&&/^\d{4}-\d\d-\d\d$/.test(Q.from||"")&&/^\d{4}-\d\d-\d\d$/.test(Q.to||"")&&Q.to>=SCH_Q.to){SCH_Q.from=Q.from;SCH_Q.to=Q.to;SCH_Q.label=String(Q.label||(fmt(Q.from)+" – "+fmt(Q.to)))}
    const Rt=R.schemes&&R.schemes.rates;if(Rt&&Q&&Q.to>=SCH_Q.to)SCH.forEach(s=>{const x=+Rt[s.id];if(x>0&&x<20)s.rate=x});
    const H=R.rateHist||{};for(const t of ["ssy","ppf","rd"])if(Array.isArray(H[t]))H[t].forEach(a=>{if(Array.isArray(a)&&/^\d{4}-\d\d-\d\d$/.test(a[0])&&+a[1]>0&&+a[1]<20&&!RATES[t].some(q=>q[0]==a[0])){RATES[t].push([a[0],+a[1]]);RATES[t].sort((p,q)=>p[0].localeCompare(q[0]))}});
    rulesSms=(Array.isArray(R.sms)?R.sms:[]).filter(x=>x&&x.re).map(x=>({id:"rule:"+(x.name||x.re).slice(0,40),name:String(x.name||"Rule"),re:String(x.re),flags:String(x.flags||"i"),ai:+x.amt||1,pi:+x.payee||0,kind:x.kind=="in"?"in":x.kind=="out"?"out":"",cur:/^(INR|QAR)$/.test(x.cur)?x.cur:"",cat:String(x.cat||"")}));
    rulesSkip=(Array.isArray(R.skip)?R.skip:[]).map(x=>{try{return new RegExp(String(x),"i")}catch(e){return null}}).filter(Boolean)}catch(e){console.warn("rules",e)}}
/* ---------- learning: shop names → category and account ---------- */
const PSTOP=/\b(doha|qatar|qa|india|in|pvt|private|ltd|limited|llc|wll|w l l|co|company|the|branch|store|online|com|www|upi|imps|neft|pos|ecom|payment|pay|txn)\b/g;
const pkey=s=>String(s||"").toLowerCase().replace(/[^a-z؀-ۿ ]+/g," ").replace(PSTOP," ").replace(/\s+/g," ").trim().split(" ").filter(w=>w.length>1).slice(0,2).join(" ");
const KEYCAT=[[/talabat|snoonu|zomato|swiggy|deliveroo|restaurant|cafe|coffee|karak|bakery|kfc|mcdonald|burger|pizza|shawarma|biryani|hotel saravana|starbucks|tim hortons/i,["Eating out","Food"]],
  [/lulu|carrefour|monoprix|al meera|almeera|spar|safari|nesto|ansar|family food|hypermarket|supermarket|grocery|groceries|bigbasket|blinkit|zepto|dmart|reliance fresh|more retail|vegetable|meat|fish/i,["Groceries","Food"]],
  [/ooredoo|vodafone|kahramaa|jio|airtel|bsnl|tneb|tangedco|electricity|water bill|broadband|internet|recharge|postpaid|prepaid|dth|tata play|gas bill|indane|bharat gas/i,["Bills"]],
  [/woqod|petrol|fuel|shell|indian oil|iocl|hpcl|bpcl|uber|careem|karwa|metro|taxi|ola|rapido|redbus|irctc|qatar airways|indigo|air india|emirates|flydubai|air arabia|airline|airways/i,["Travel"]],
  [/pharmacy|hospital|clinic|medical|apollo|aster|hamad|doctor|lab|diagnostic|medplus|netmeds|1mg|pharmeasy|dental|optical/i,["Health"]],
  [/amazon|flipkart|meesho|myntra|ajio|nykaa|noon|shein|ikea|centrepoint|lc waikiki|max fashion|h&m|zara|decathlon|jarir|virgin|sharaf|extra|croma|reliance digital|mall/i,["Shopping"]],
  [/netflix|spotify|prime video|hotstar|disney|youtube|apple\.com|google play|icloud|shahid|osn|zee5|sonyliv/i,["Subscriptions","Bills"]],
  [/school|tuition|college|university|fees|academy|books/i,["Education","Other"]],[/lic\b|insurance|policy|premium/i,["Insurance","Bills"]],[/rent\b|landlord|housing/i,["Rent"]]];
function catGuess(t){const all=[...S.tx.map(x=>x.cat),...S.bud.map(b=>b.cat)].filter(Boolean);
  for(const [re,L] of KEYCAT)if(re.test(t)){for(const c of L){const own=all.find(a=>a.toLowerCase()==c.toLowerCase());if(own)return own}return L[L.length-1]}return ""}
{const _cf=catFor;catFor=function(text){const t=String(text||"").trim();if(t.length<2)return "";const k=pkey(t);
  if(k){for(let i=S.tx.length-1;i>=0;i--){const x=S.tx[i];if(x.cat&&x.payee&&!x.link&&pkey(x.payee)==k)return x.cat}}
  return _cf(t)||catGuess(t)}}
function accFor(payee,cur){const k=pkey(payee);if(!k)return "";for(let i=S.tx.length-1;i>=0;i--){const x=S.tx[i];if(x.payee&&x.acc&&(x.kind=="out"||x.kind=="in")&&pkey(x.payee)==k&&(!cur||ac(x.acc).cur==cur))return x.acc}return ""}
/* ---------- teach once: message formats you show the app ---------- */
const TOKRE=/[A-Za-z؀-ۿ]+|\d[\d,]*(?:\.\d+)?|\s+|[^\sA-Za-z\d؀-ۿ]/g;
const MONRE=/^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)$/i;
const resc=s=>s.replace(/[.*+?^${}()|[\]\\\/]/g,"\\$&");
const normMsg=t=>String(t||"").replace(/\s+/g," ").trim();
function tplBuild(toks,ia,ps,pe){const sig=[];toks.forEach((t,i)=>{if(/\S/.test(t))sig.push(i)});if(ia<0||!sig.includes(ia))return null;
  const first=ps>=0?Math.min(ia,ps):ia,last=pe>=0?Math.max(ia,pe):ia,fi=sig.indexOf(first),li=sig.indexOf(last),from=sig[Math.max(0,fi-8)],to=sig[Math.min(sig.length-1,li+8)];
  let re="",g=0,ai=0,pi=0;
  for(let i=from;i<=to;i++){const t=toks[i];
    if(i==ia){re+="([\\d,]*\\d(?:\\.\\d+)?)";ai=++g;continue}
    if(ps>=0&&i==ps){re+="(.+?)";pi=++g;i=pe;if(pe>=to)re+="\\s*$";continue}
    if(/^\s+$/.test(t)){re+="\\s*";continue}
    if(/^\d/.test(t)){re+="[\\d,.]+";continue}
    if(MONRE.test(t)){re+="[A-Za-z]{3,9}";continue}
    re+=resc(t)}
  return {re,ai,pi}}
function tplTry(s){const L=[...(S.tpl||[]).filter(t=>t&&t.re&&!t.off).sort((a,b)=>(b.ut||0)-(a.ut||0)),...rulesSms];
  for(const t of L){let re;try{re=new RegExp(t.re,t.flags||"i")}catch(e){continue}const m=s.match(re);if(!m)continue;const amt=num(m[t.ai||1]);if(!(amt>0))continue;return {t,amt,payee:t.pi?String(m[t.pi]||"").replace(/\s+/g," ").trim().slice(0,40):""}}return null}
const dateIn=s=>{const m=s.match(/\b(\d{1,2}[-\/.](?:\d{1,2}|[A-Za-z]{3})[-\/.]\d{2,4}|\d{1,2}[A-Za-z]{3}\d{2,4}|\d{4}-\d\d-\d\d)\b/);if(!m)return "";const d=pDate(m[1]);return d&&d<=plus(1)&&d>=plus(-400)?d:""};
{const _p=parseSms;parseSms=function(text){const s=normMsg(text);if(!s)return null;if(rulesSkip.some(r=>r.test(s)))return null;
  const T=tplTry(s);let p=_p(text);
  if(T){const b=p||{kind:"out",amt:0,cur:"",l4:"",payee:"",date:"",acc:"",cat:"",note:""};p={...b,amt:T.amt,kind:T.t.kind||b.kind||"out",cur:T.t.cur||b.cur,payee:T.payee||b.payee,tpl:T.t.id,weak:false};
    if(!p.date)p.date=dateIn(s)||today();if(!p.l4){const m=s.match(/(?:a\/c|acct|account|card|ac)\s*(?:no\.?|number|ending|ending with)?\s*[:\-]?\s*[xX*.]*\s*(\d{3,6})\b/i);if(m)p.l4=m[1]}
    const A=l4Acc(p.l4);if(T.t.acc&&S.acc.some(a=>a.id==T.t.acc)){p.acc=T.t.acc;delete p.newL4}else if(A){p.acc=A.id;delete p.newL4}else if(p.l4)p.newL4=p.l4;
    if(T.t.cat)p.cat=T.t.cat;else p.cat=catFor(p.payee)}
  if(!p)return null;
  if(p.payee&&!l4Acc(p.l4)&&!(T&&T.t.acc)){const a=accFor(p.payee,p.cur);if(a)p.acc=a}
  if(!p.cat)p.cat=catFor(p.payee);if(!p.cur&&p.acc)p.cur=ac(p.acc).cur;return p}}
let TCH=null;
function teachOpen(text,from){const s=normMsg(text);if(!s)return toast("Nothing to teach");const g=parseSms(s)||{};TCH={s,from:from||"",toks:s.match(TOKRE)||[],ia:-1,ps:-1,pe:-1,mode:"a",kind:g.kind||"out",cur:g.cur||"",acc:g.acc||"",cat:g.cat||""};
  if(g.amt){const i=TCH.toks.findIndex(t=>/^\d/.test(t)&&num(t)==g.amt);if(i>=0){TCH.ia=i;TCH.mode="p"}}teachRender()}
function teachRule(){if(!TCH||TCH.ia<0)return null;const b=tplBuild(TCH.toks,TCH.ia,TCH.ps,TCH.pe);if(!b)return null;let ok=false;try{const m=TCH.s.match(new RegExp(b.re,"i"));ok=!!m&&num(m[b.ai])==num(TCH.toks[TCH.ia])}catch(e){}return ok?b:null}
function teachPrevHtml(){const T=TCH,b=teachRule(),pay=T.ps>=0?T.toks.slice(T.ps,T.pe+1).join("").trim():"";return T.ia<0?"Choose the amount first.":b?`Reads as: <b>${T.kind=="in"?"+":"−"}${fmx(num(T.toks[T.ia]),T.cur||(T.acc&&ac(T.acc).cur)||"INR")}</b>${pay?" · "+esc(pay):""}${T.cat?" · "+esc(T.cat):""}`:"This choice can’t be turned into a rule. Pick the amount again."}
function teachRender(){const T=TCH;if(!T)return;const b=teachRule(),pay=T.ps>=0?T.toks.slice(T.ps,T.pe+1).join("").trim():"";
  const tk=T.toks.map((t,i)=>/^\s+$/.test(t)?" ":`<button class="tk${i==T.ia?" amt":""}${T.ps>=0&&i>=T.ps&&i<=T.pe?" pay":""}" data-act="teachTok" data-id="${i}">${esc(t)}</button>`).join("");
  sheet(`<h2>Teach this message</h2><p class="sub">${T.mode=="a"?"Tap the <b>amount</b>.":"Now tap the <b>first and last word</b> of the shop or person. Skip if there isn’t one."}</p>
  <div class="seg"><button class="btn sm ${T.mode=="a"?"":"ghost"}" data-act="teachMode" data-id="a">Amount</button><button class="btn sm ${T.mode=="p"?"":"ghost"}" data-act="teachMode" data-id="p">Shop or person</button><button class="btn sm ghost" data-act="teachMode" data-id="x">No shop</button></div>
  <div class="tkbox">${tk}</div>
  <div class="two"><div>${SEL("t_kind","This is",[["out","Money out"],["in","Money in"]],T.kind,'data-tch="1"')}</div><div>${SEL("t_cur","Currency",[["","From the account"],...CURS],T.cur,'data-tch="1"')}</div></div>
  <div class="two"><div>${SEL("t_acc","Account",[["","Find from card ending"],...ACCS()],T.acc,'data-tch="1"')}</div><div>${F("t_cat","Category (optional)",T.cat,"text",'list="t_cats" data-tch="1"')}${DL("t_cats",[...S.tx.map(x=>x.cat),...CATS])}</div></div>
  <p class="note" id="t_prev">${teachPrevHtml()}</p>
  <div class="acts"><button class="btn" data-act="teachSave"${b?"":" disabled"}>Save this format</button><button class="btn ghost" data-act="teachReset">Start again</button></div>
  <p class="note">Messages with the same wording are read this way from now on, on both phones. The amount, shop and dates can change.</p>`)}
document.addEventListener("change",e=>{const t=e.target;if(!TCH||!t||!t.dataset||!t.dataset.tch)return;TCH.kind=v("t_kind");TCH.cur=v("t_cur");TCH.acc=v("t_acc");TCH.cat=v("t_cat").trim();const p=$("#t_prev");if(p)p.innerHTML=teachPrevHtml()});
/* ---------- regular payments the app notices ---------- */
const CYCD=[["monthly",25,35,30],["quarterly",84,98,91],["half",175,190,182],["yearly",350,380,365]];
function recFind(){const since=addM(today(),-14),ign=new Set(S.cfg.recIgn||[]),G={};
  S.tx.forEach(x=>{if(x.kind!="out"||x.date<since||x.link||x.rec||/^r_/.test(x.id))return;const k=pkey(x.payee||x.note||"");if(!k)return;const key=k+"|"+(x.cur||"INR");(G[key]=G[key]||[]).push(x)});
  const have=[...S.subs.map(s=>pkey(s.name)),...S.dates.map(d=>pkey(d.name)),...S.rec.map(r=>pkey(r.note||r.cat||"")),...S.loans.map(l=>pkey(l.name))].filter(Boolean),out=[];
  for(const [key,L] of Object.entries(G)){if(L.length<2||ign.has(key))continue;const k=key.split("|")[0];if(have.some(h=>h==k||h.startsWith(k)||k.startsWith(h)))continue;
    L.sort((a,b)=>a.date.localeCompare(b.date));const gaps=L.slice(1).map((x,i)=>(D(x.date)-D(L[i].date))/864e5).filter(g=>g>0).sort((a,b)=>a-b);if(!gaps.length)continue;
    const med=gaps[Math.floor(gaps.length/2)],c=CYCD.find(([,lo,hi])=>med>=lo&&med<=hi);if(!c)continue;if(c[0]=="monthly"&&L.length<3)continue;
    if(gaps.filter(g=>g>=c[1]*.8&&g<=c[2]*1.2).length<gaps.length*.7)continue;
    const A=L.map(x=>+x.amt).sort((a,b)=>a-b),am=A[Math.floor(A.length/2)];if(A.filter(a=>Math.abs(a-am)<=am*.15+0.5).length<A.length*.7)continue;
    const last=L[L.length-1],next=addM(last.date,c[0]=="monthly"?1:c[0]=="quarterly"?3:c[0]=="half"?6:12);if(dl(next)<-c[3])continue;
    out.push({key,name:last.payee||last.note,amt:am,cur:last.cur||"INR",acc:last.acc,cat:last.cat||"",cyc:c[0],n:L.length,last:last.date,next})}
  return out.sort((a,b)=>b.n-a.n)}
function recCard(){const R=recFind().slice(0,4);if(!R.length)return "";const lab={monthly:"every month",quarterly:"every 3 months",half:"every 6 months",yearly:"every year"};
  return `<div class="card" style="margin:0 0 12px"><b>Looks like regular payments</b><p class="note" style="margin-top:2px">Turn them into reminders, so they show up before they’re due.</p>${R.map(r=>`<div style="margin-top:10px"><div class="hbl"><span>${esc(r.name)}</span><b>~${fmx(r.amt,r.cur)}</b></div><small style="color:var(--mute)">${lab[r.cyc]} · seen ${r.n} times · next about ${fmt(r.next)}</small>
  <div class="acts" style="margin-top:6px"><button class="btn sm" data-act="recSub" data-id="${esc(r.key)}">Subscription</button><button class="btn sm ghost" data-act="recDue" data-id="${esc(r.key)}">Due date</button><button class="btn sm ghost" data-act="recIgn" data-id="${esc(r.key)}">Not regular</button></div></div>`).join("")}</div>`}
{const _vD=vDates;vDates=function(){const h=_vD(),c=recCard();if(!c)return h;const i=h.indexOf("</p>");return i>0?h.slice(0,i+4)+c+h.slice(i+4):c+h}}
const setVal=(id,val)=>{const e=$("#"+id);if(e&&val!=null){e.value=val;try{e.dispatchEvent(new Event("change",{bubbles:true}))}catch(x){}}};
/* ---------- settings additions ---------- */
function setExtra(){const R=S.cfg.rules,L=S.cfg.updLatest;return `<h3>App updates</h3><p class="note">You have Version ${VER}${buildNo()?" (build "+buildNo()+")":""}.${isApp()?(S.cfg.upd?` <b>Build ${S.cfg.upd.code} is ready.</b>`:L&&L.code?` Latest on GitHub: build ${L.code}.`:""):" Updates are for the phone app; the web app updates itself."}</p>
  ${F("f_repo","Your GitHub repo",repoSlug(),"text",'placeholder="yourname/Due-spend" autocomplete="off" autocapitalize="off"')}
  <div class="acts"><button class="btn sm ghost" data-act="repoSave">Save repo</button>${isApp()?`<button class="btn sm ghost" data-act="updNow">Check for update</button><button class="btn sm ghost" data-act="updInstall">Install latest</button>`:""}</div>${S.cfg.updErr&&isApp()?`<p class="note">Last check: ${esc(S.cfg.updErr).slice(0,80)}</p>`:""}
  <h3>Rules file</h3><p class="note">${R?`Using rules.json from ${fmt(iso(new Date(S.cfg.rulesOk||Date.now())))}${R.updated?" (edited "+esc(R.updated)+")":""}: ${rulesSms.length} message formats, scheme rates ${esc(SCH_Q.label)}.`:"Put rules.json in your repo to update scheme rates and bank message formats without a new app."}</p><div class="acts"><button class="btn sm ghost" data-act="rulesNow">Download rules now</button></div>`}
{const _st=settings;settings=function(...a){const r=_st(...a);try{const sh=$("#over .sheet");if(sh&&!$("#f_repo"))sh.insertAdjacentHTML("beforeend",setExtra())}catch(e){console.warn(e)}return r}}
Object.assign(ACT,{
  updInstall(){return updInstall()},
  async updNow(){toast("Checking…");const u=await updCheck(true);settings();toast(u?"Build "+u.code+" is ready to install":S.cfg.updErr?"Couldn’t check: "+S.cfg.updErr.slice(0,60):"You have the latest version")},
  repoSave(){const r=v("f_repo").trim();S.cfg.repo=r;S.cfg.updAt=0;S.cfg.rulesAt=0;save();toast(repoSlug()?"Repo saved: "+repoSlug():"That doesn’t look like name/repo");settings()},
  async rulesNow(){toast("Downloading rules…");const ok=await rulesFetch(true);settings();toast(ok?"Rules updated":"Couldn’t download rules.json. Check it’s in your repo.")},
  teach(id){const q=(S.cfg.smsq||[]).find(m=>String(m.id)==id);if(q)teachOpen(q.body,q.from)},
  teachText(){teachOpen(v("f_rt"),"")},
  teachLog(i){const x=(window.__rcLog||[])[+i];if(x)teachOpen(x.body,x.app)},
  teachTok(i){const T=TCH;if(!T)return;i=+i;const t=T.toks[i];
    if(T.mode=="a"){if(!/^\d/.test(t))return toast("Tap a number for the amount");T.ia=i;T.mode="p"}
    else{if(i==T.ia)return;if(T.ps<0)T.ps=T.pe=i;else if(i<T.ps)T.ps=i;else if(i>T.pe)T.pe=i;else T.ps=T.pe=i;
      if(T.ps>=0&&T.ia>=T.ps&&T.ia<=T.pe){toast("The shop can’t include the amount");T.ps=T.pe=-1}}teachRender()},
  teachMode(m){if(!TCH)return;if(m=="x"){TCH.ps=-1;TCH.pe=-1;TCH.mode="p"}else TCH.mode=m;teachRender()},
  teachReset(){if(!TCH)return;Object.assign(TCH,{ia:-1,ps:-1,pe:-1,mode:"a"});teachRender()},
  teachSave(){const T=TCH,b=teachRule();if(!T||!b)return toast("Pick the amount first");
    const o=stamp({id:uid(),name:(T.from||T.s.slice(0,28)).slice(0,40),re:b.re,flags:"i",ai:b.ai,pi:b.pi,kind:T.kind,cur:T.cur,acc:T.acc,cat:T.cat,ex:T.s.slice(0,160)});put("tpl",o);
    let n=0;(S.cfg.smsq||[]).forEach(m=>{const p=parseSms(m.body);if(p&&p.tpl==o.id){m.p=p;n++}});
    const inQ=(S.cfg.smsq||[]).some(m=>normMsg(m.body)==T.s);save();TCH=null;
    if(!inQ){const p=parseSms(T.s);sheet(`<h2>Format saved</h2><p class="sub">${n?n+" waiting "+(n==1?"payment was":"payments were")+" updated. ":""}Add this payment now?</p>${p?`<p><b>${p.kind=="in"?"+":"−"}${fmx(p.amt,p.cur||(p.acc&&ac(p.acc).cur)||"INR")}</b>${p.payee?" · "+esc(p.payee):""} · ${fmt(p.date)}</p>`:""}<div class="acts"><button class="btn" data-act="teachAddNow">Add it</button><button class="btn ghost" data-act="closeX">Not now</button></div>`);window.__tchLast=T.s}
    else{render();smsReview();toast("Format saved"+(n?". "+n+" waiting "+(n==1?"payment":"payments")+" updated":""))}},
  teachAddNow(){const t=window.__tchLast;sheet("");if(t)smsOpen(t)},
  tplDel(id){const x=(S.tpl||[]).find(t=>t.id==id);if(!x)return;trash("tpl",id);save();readCheck();toast("Format removed")},
  recSub(key){const r=recFind().find(x=>x.key==key);if(!r)return;subForm(null);setVal("f_name",r.name);setVal("f_price",r.amt);setVal("f_cur",r.cur);setVal("f_cyc",r.cyc);setVal("f_start",r.last);setVal("f_end",r.next);setVal("f_pay",r.acc);setVal("f_rec","0");
    setVal("f_cat",/netflix|prime|hotstar|disney|osn|shahid|zee5|sonyliv|youtube/i.test(r.name)?"OTT and streaming":/spotify|anghami|music/i.test(r.name)?"Music":/ooredoo|vodafone|jio|airtel|internet|broadband/i.test(r.name)?"Mobile and internet":/gym|fitness/i.test(r.name)?"Gym and fitness":/icloud|google one|microsoft|adobe|dropbox/i.test(r.name)?"Software and cloud":"Other")},
  recDue(key){const r=recFind().find(x=>x.key==key);if(!r)return;dForm(null);setVal("f_name",r.name);setVal("f_type","renewal");setVal("f_amt",r.amt);setVal("f_cur",r.cur);setVal("f_date",r.next);setVal("f_rep",r.cyc=="half"?"half":r.cyc);setVal("f_pay",r.acc)},
  recIgn(key){S.cfg.recIgn=[...new Set([...(S.cfg.recIgn||[]),key])];save();render();toast("Won’t suggest that again")}
});
/* review cards and the reading check get Teach buttons */
{const _sr=smsReview;smsReview=function(){_sr();$$("#over [data-act='smsSkip']").forEach(b=>{const id=b.getAttribute("data-id");if(!b.parentNode.querySelector("[data-act='teach']"))b.insertAdjacentHTML("afterend",`<button class="btn sm ghost" data-act="teach" data-id="${esc(id)}">Wrong? Teach</button>`)})}}
{const _rc=readCheck;readCheck=async function(){await _rc();const sh=$("#over .sheet");if(!sh)return;
  const tb=$("#over [data-act='readTestAdd']");if(tb)tb.insertAdjacentHTML("afterend",`<button class="btn ghost" data-act="teachText">Teach this format</button>`);
  let log=[];if(isApp()){try{log=JSON.parse(JSON.stringify((await NP("DueNative","notifLog")).items||[]))}catch(e){}}
  window.__rcLog=[...log.map(x=>({...x,t:+x.time})),...(S.cfg.smsLog||[])].sort((a,b)=>b.t-a.t).slice(0,30);
  $$("#over .row").forEach((r,i)=>{if(i<window.__rcLog.length)r.insertAdjacentHTML("beforeend",`<button class="btn sm ghost" data-act="teachLog" data-id="${i}">Teach</button>`)});
  const T=(S.tpl||[]).filter(t=>!t.off);sh.insertAdjacentHTML("beforeend",`<h3>Formats you taught (${T.length})</h3>${T.length?T.map(t=>`<div class="row" style="cursor:default"><div><b>${esc(t.name)}</b><small>${t.kind=="in"?"Money in":"Money out"}${t.cur?" · "+t.cur:""}${t.acc?" · "+esc(an(t.acc)):""} · ${esc((t.ex||"").slice(0,70))}…</small></div><button class="btn sm ghost" data-act="tplDel" data-id="${t.id}" aria-label="Remove format">✕</button></div>`).join(""):`<p class="note">When a message is read wrong, tap Teach on it.</p>`}${rulesSms.length?`<p class="note">Plus ${rulesSms.length} formats from your rules file.</p>`:""}`)}}
/* tax label: India's Income-tax Act 2025 renumbered 80C as section 123 from 1 April 2026 */
const TAXSEC=d=>(d||today())>="2026-04-01"?"section 123 (old 80C)":"80C";

{const _rn=refreshMarket;refreshMarket=async function(f){const r=await _rn(f);try{await rulesFetch(!!f)}catch(e){}return r}}
{const _start=start;start=function(...a){try{rulesApply()}catch(e){}return _start(...a)}}
{const _sc=smsCard;smsCard=()=>updCard()+_sc()}
