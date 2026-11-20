/* ===== Version 29: email check in the background, card bills from statements, bank balance check,
   one-tap saving of payments, budget suggestions, Tamil voice, fewer "emails without amount" ===== */
TYPES.bill="Card bill";

/* ---------- background email check (Android, about once an hour) ---------- */
const mailBgOn=()=>S.cfg.mailBg!==false;
function bgSync(){if(!isApp())return;const on=(gmOn()||msOn())&&mailBgOn();
  NP("DueNative","mailBg",{on,gmail:gmOn()?gmLS("acct"):"",mscid:msOn()?msClient():"",msrt:msOn()?msLS("rt"):"",msrtAt:+msLS("rtAt")||0,hide:!!S.cfg.hide||!!META.enc}).catch(e=>console.warn("mailBg",e))}
async function bgPull(){if(!isApp())return;try{const r=await NP("DueNative","mailBgGet",{});if(r&&r.msrt&&+r.msrtAt>(+msLS("rtAt")||0)&&msLS("rt")){msLS("rt",r.msrt);msLS("rtAt",String(r.msrtAt));MS.tok=""}}catch(e){}}
/* every new Outlook sign-in is shared with the background check */
{const _mp=msPost;msPost=async function(form){const r=await _mp(form);msLS("rtAt",String(Date.now()));bgSync();return r}}
{const _s=start;start=function(...a){const r=_s(...a);setTimeout(async()=>{await bgPull();bgSync()},5000);return r}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState=="hidden")bgSync()});
for(const k of ["gmStart","gmOff","msStart","msOff"]){const f=ACT[k];ACT[k]=async function(...a){const r=await f.apply(this,a);bgSync();return r}}
/* opened from the "new payment email" notification: check now, then show the list */
async function reviewLaunch(){toast("Checking your emails…");const jobs=[];if(gmOn())jobs.push(gmScan(false).catch(()=>0));if(msOn())jobs.push(msScan().catch(()=>0));await Promise.all(jobs);render();smsReview()}
function bgLine(){return isApp()&&(gmOn()||msOn())?`<div class="hbl" style="margin:10px 0 0"><span>Check every hour and notify me, even when the app is closed</span><button class="btn sm ${mailBgOn()?"":"ghost"}" data-act="mailBgT">${mailBgOn()?"On":"Off"}</button></div>`:""}
{const _g=gmSheet;gmSheet=function(){_g();try{const c=$("#over .card");if(c&&gmOn())c.insertAdjacentHTML("beforeend",bgLine())}catch(e){}}}
{const _m=msSheet;msSheet=function(){_m();try{const c=$("#over .card");if(c&&msOn())c.insertAdjacentHTML("beforeend",bgLine())}catch(e){}}}

/* ---------- card bills from statement emails ---------- */
const BMON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};
function anyDate(s){s=String(s||"").trim();let m=s.match(/^(\d{1,2})[\s\-\/.]+(\d{1,2})[\s\-\/.]+(\d{2,4})$/);let d,mo,y;
  if(m){d=+m[1];mo=+m[2];y=+m[3]}else if((m=s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s\-\/.,]*([A-Za-z]{3,9})[\s\-\/.,]*(\d{2,4})$/))){d=+m[1];mo=BMON[m[2].slice(0,4).toLowerCase()]||BMON[m[2].slice(0,3).toLowerCase()];y=+m[3]}
  else if((m=s.match(/^([A-Za-z]{3,9})[\s\-\/.,]*(\d{1,2})(?:st|nd|rd|th)?[\s,]+(\d{2,4})$/))){mo=BMON[m[1].slice(0,4).toLowerCase()]||BMON[m[1].slice(0,3).toLowerCase()];d=+m[2];y=+m[3]}
  else if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/))){y=+m[1];mo=+m[2];d=+m[3]}
  if(!d||!mo||!y||mo>12||d>31)return "";if(y<100)y+=2000;return y+"-"+String(mo).padStart(2,"0")+"-"+String(d).padStart(2,"0")}
const BNUM=x=>+String(x||"").replace(/,/g,"");
function billParse(text){const s=String(text||"").replace(/\s+/g," ");
  const amt=re=>{const m=s.match(re);return m?{cur:/qar|qr/i.test(m[1]||"")?"QAR":/inr|rs|₹/i.test(m[1]||"")?"INR":"",v:BNUM(m[2])}:null};
  const tot=amt(/(?:total\s+(?:amount\s+)?(?:due|payable)|statement\s+balance|total\s+outstanding|closing\s+balance|amount\s+payable)[^0-9₹]{0,30}?(INR|Rs\.?|₹|QAR|QR)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  const min=amt(/(?:minimum\s+(?:amount\s+)?(?:due|payable)|min\.?\s+(?:amt\.?\s+)?due)[^0-9₹]{0,30}?(INR|Rs\.?|₹|QAR|QR)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  const dm=s.match(/(?:payment\s+due\s+date|due\s+date|due\s+on|pay\s+(?:by|before)|last\s+date\s+(?:for|of)\s+payment)[^0-9A-Za-z]{0,12}(?:is\s+)?(\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?[\s\-\/.,]+(?:\d{1,2}|[A-Za-z]{3,9})[\s\-\/.,]+\d{2,4}|\d{1,2}(?:st|nd|rd|th)?[A-Za-z]{3,9}\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i);
  const l4=(s.match(/(?:card|a\/c|account)[^0-9]{0,25}?(?:ending|no\.?|number)?\s*(?:with|in)?\s*[x*•]*\s*(\d{4})\b/i)||[])[1]||"";
  if(!tot||!tot.v||!dm)return null;const due=anyDate(dm[1]);if(!due)return null;
  const cur=tot.cur||(min&&min.cur)||(/qar|qr\b/i.test(s)?"QAR":"INR");return {total:tot.v,min:min?min.v:0,cur,due,l4}}
function billTake(items){const seen=new Set(S.cfg.billSeen||[]),q=S.cfg.billq=S.cfg.billq||[];let add=0;
  items.forEach(m=>{if(!m||!m.id||seen.has(m.id))return;seen.add(m.id);const p=billParse((m.subject||"")+". "+(m.body||""));if(!p||p.due<plus(-3))return;
    const from=String(m.from||"").replace(/<.*>/,"").replace(/["']/g,"").trim().slice(0,40)||"Card",A=l4Acc(p.l4);
    if(q.some(b=>b.due==p.due&&Math.abs(b.total-p.total)<.01))return;q.push({id:"b"+m.id.slice(-24),from,...p,acc:A?A.id:""});add++});
  S.cfg.billSeen=[...seen].slice(-300);S.cfg.billq=q.filter(b=>b.due>=plus(-10)).slice(-20);if(add){save();toast(add==1?"A card bill was found in your email":add+" card bills were found in your email")}return add}
const BILLQ='(subject:(statement OR "credit card" OR "card bill" OR "e-statement") OR "payment due date" OR "minimum amount due" OR "total amount due" OR "minimum due") -category:promotions -category:social';
async function billScanGmail(){const L=(await gmGet("/messages?maxResults=12&q="+encodeURIComponent(BILLQ+" newer_than:12d"),false)).messages||[],seen=new Set(S.cfg.billSeen||[]),items=[];
  for(const m of L){if(seen.has("g"+m.id))continue;try{const d=await gmGet("/messages/"+m.id+"?format=full",false),H={};(d.payload&&d.payload.headers||[]).forEach(h=>H[h.name.toLowerCase()]=h.value);items.push({id:"g"+m.id,from:H.from||"",subject:H.subject||"",body:gmBody(d.payload)||d.snippet||""})}catch(e){}}
  return billTake(items)}
async function billScanOutlook(){const from=new Date(Date.now()-12*864e5).toISOString().slice(0,19)+"Z";
  const L=(await msGet("/messages?"+new URLSearchParams({"$filter":"receivedDateTime ge "+from,"$top":"50","$select":"id,subject,from,body,bodyPreview"}).toString())).value||[];
  return billTake(L.filter(m=>/statement|amount due|minimum due|due date|payment due/i.test((m.subject||"")+" "+(m.bodyPreview||""))).map(m=>({id:"o"+m.id.slice(-40),from:((m.from||{}).emailAddress||{}).name||"",subject:m.subject||"",body:String((m.body||{}).content||m.bodyPreview||"")})))}
const billDue=()=>{try{const l=localStorage.getItem("ds-bill-last");return !l||Date.now()-+l>6*3600e3}catch(e){return true}};
const billMark=()=>{try{localStorage.setItem("ds-bill-last",String(Date.now()))}catch(e){}};
{const _gs=gmScan;gmScan=async function(...a){const r=await _gs(...a);if(billDue()){billMark();try{await billScanGmail()}catch(e){console.warn("bills",e)}if(msOn())try{await billScanOutlook()}catch(e){}}return r}}
{const _ms=msScan;msScan=async function(...a){const r=await _ms(...a);if(!gmOn()&&billDue()){billMark();try{await billScanOutlook()}catch(e){console.warn("bills",e)}}return r}}
const billOpen=()=>(S.cfg.billq||[]).filter(b=>!b.done&&b.due>=plus(-10)&&!S.dates.some(d=>d.date==b.due&&Math.abs((+d.amt||0)-b.total)<1));

/* ---------- bank balance in alerts vs the app ---------- */
function balParse(text){const s=String(text||"").replace(/\s+/g," ");if(/avl\.?\s*(?:cr\.?\s*)?lmt|available\s+(?:credit\s+)?limit|avl\.?\s*limit/i.test(s)&&!/avl\.?\s*bal|available\s+bal/i.test(s))return null;
  const m=s.match(/(?:avl\.?|avail\.?|available|a\/c|clear|closing)\s*(?:bal(?:ance)?|bal\.)\s*(?:is|:|-|of)?\s*(INR|Rs\.?|₹|QAR|QR)?\s*(-?[\d,]+(?:\.\d{1,2})?)/i)||s.match(/\bbal(?:ance)?\s*(?:is|:)\s*(INR|Rs\.?|₹|QAR|QR)\s*(-?[\d,]+(?:\.\d{1,2})?)/i);
  return m?BNUM(m[2]):null}
function balCheck(acc,bank){const A=ac(acc);if(!A||!A.id||A.type=="card"||bank==null||!isFinite(bank))return;const app=Math.round(bal(A)*100)/100,W={...(S.cfg.balWarn||{})};
  if(Math.abs(app-bank)>=1)W[acc]={bank,app,at:today(),t:Date.now()};else delete W[acc];S.cfg.balWarn=W}
const balOpen=()=>Object.entries(S.cfg.balWarn||{}).filter(([id,w])=>{const A=ac(id);return A&&A.id&&dl(w.at)>=-7&&!S.tx.some(x=>x.acc==id&&x.kind=="adj"&&(x.ct||0)>w.t)});
let balPend=null;

/* ---------- payments to review: save in one tap, add all, add automatically ---------- */
const sendKey=f=>String(f||"").replace(/^(Email|Gmail|Outlook|SMS)\s*·\s*/i,"").replace(/<.*>/,"").trim().toLowerCase().slice(0,40);
function qDup(m){return S.tx.some(x=>Math.abs(dl(x.date)-dl(m.p.date))<=1&&Math.abs(x.amt-m.p.amt)<.005&&x.kind==m.p.kind)}
function quickOk(m){const p=m&&m.p,A=p&&ac(p.acc);return !!(p&&+p.amt>0&&(p.kind=="out"||p.kind=="in")&&A&&A.id&&(!p.cur||p.cur==A.cur)&&p.date&&!qDup(m))}
function quickSave(m){const p=m.p,A=ac(p.acc),cat=p.cat||catFor(p.payee)||catGuess((p.payee||"")+" "+(m.body||""))||"";
  const t=addTx({kind:p.kind,acc:A.id,amt:+p.amt,cur:A.cur,date:p.date,cat,payee:p.payee||"",note:"",tags:[]});S.cfg.smsq=(S.cfg.smsq||[]).filter(x=>x!==m&&String(x.id)!=String(m.id));
  const b=balParse(m.body);if(b!=null)balCheck(A.id,b);return t}
let autoN=0,autoT=0;
function autoTake(){const keys=S.cfg.autoFrom||[];if(!keys.length)return 0;let n=0;[...(S.cfg.smsq||[])].forEach(m=>{if(keys.includes(sendKey(m.from))&&quickOk(m)){quickSave(m);n++}});
  if(n){autoN+=n;clearTimeout(autoT);autoT=setTimeout(()=>{toast(autoN+(autoN==1?" payment was":" payments were")+" added automatically");autoN=0},800)}return n}
{const _dq=dedupeQ;dedupeQ=function(...a){const r=_dq.apply(this,a);try{autoTake()}catch(e){console.warn(e)}return r}}
{const _sr=smsReview;smsReview=function(...a){const r=_sr.apply(this,a);try{const q=S.cfg.smsq||[],ready=q.filter(quickOk);
  $$('#over [data-act="smsAdd"]').forEach(b=>{const m=q.find(x=>String(x.id)==b.dataset.id);if(!m)return;if(quickOk(m)){b.insertAdjacentHTML("beforebegin",`<button class="btn sm" data-act="smsQuick" data-id="${esc(m.id)}">Save</button>`);b.classList.add("ghost");b.textContent="Edit"}
    const k=sendKey(m.from);if(k&&quickOk(m)&&!(S.cfg.autoFrom||[]).includes(k))b.closest(".acts").insertAdjacentHTML("afterend",`<button class="lnk" data-act="autoFrom" data-id="${esc(m.id)}" style="background:none;border:0;color:var(--pri);font:inherit;font-size:13px;padding:2px 0;cursor:pointer">Always save from ${esc(String(m.from||"").replace(/^(Email|SMS)\s*·\s*/i,"").slice(0,30))} without asking</button>`)});
  const sub=$("#over .sub");if(sub&&ready.length)sub.textContent="Found in your bank SMS and emails. Save adds it as shown, Edit lets you change it first, Skip ignores it.";if(sub&&ready.length>1)sub.insertAdjacentHTML("afterend",`<div class="acts"><button class="btn" data-act="smsAllOk">Save all ${ready.length} ready</button></div><p class="note">Ready means the account is known and there’s no matching entry already.</p>`);
  const A=S.cfg.autoFrom||[];if(A.length)$("#over .sheet").insertAdjacentHTML("beforeend",`<h3>Saved without asking</h3>${A.map(k=>`<div class="hbl" style="margin:6px 0"><span>${esc(k)}</span><button class="btn sm ghost" data-act="autoOff" data-id="${esc(k)}">Stop</button></div>`).join("")}`);
  if(taOn())taNode($("#over"))}catch(e){console.warn(e)}return r}}
{const _sa=ACT.smsAdd;ACT.smsAdd=function(id){const m=(S.cfg.smsq||[]).find(x=>String(x.id)==id);const b=m?balParse(m.body):null;balPend=m&&b!=null?{acc:m.p.acc,bank:b,n:S.tx.length}:null;return _sa.call(this,id)}}
{const _st=ACT.saveTx;ACT.saveTx=function(...a){const r=_st.apply(this,a);try{if(balPend&&S.tx.length>balPend.n){const t=S.tx[S.tx.length-1];if(t&&t.acc==balPend.acc){balCheck(t.acc,balPend.bank);save()}}}catch(e){}balPend=null;return r}}
/* emails that showed only a subject are cleared once Gmail or Outlook brings the full email */
{const _mt=mailTake;mailTake=async function(ref,d){const before=new Set((S.cfg.ntfNo||[]).map(n=>n.k)),r=await _mt(ref,d);try{const q=new Set((S.cfg.smsq||[]).map(x=>String(x.id))),subj=(d.items||[]).filter(m=>q.has("m:"+m.id)).map(m=>String(m.subject||"").toLowerCase().replace(/\s+/g," ").trim()).filter(x=>x.length>8),N=(S.cfg.ntfNo||[]).filter(n=>before.has(n.k));
  if(subj.length&&N.length){const drop=new Set(N.filter(n=>{const b=String(n.body||"").toLowerCase().replace(/\s+/g," ");return subj.some(x=>b.includes(x.slice(0,40))||x.includes(b.slice(0,40)))}).map(n=>n.k));if(drop.size){S.cfg.ntfNo=(S.cfg.ntfNo||[]).filter(n=>!drop.has(n.k));save()}}}catch(e){}return r}}

/* ---------- Needs attention: card bills and balance differences ---------- */
{const _ti=todoItems;todoItems=function(){const L=_ti();
  billOpen().forEach(b=>{const n=dl(b.due),A=ac(b.acc);L.push({k:n<=3?-1300+n:-500+n,ic:"💳",tx:(A&&A.id?A.name:b.from)+" card bill "+fmx(b.total,b.cur),sub:"Due "+fmt(b.due)+" ("+when(n)+")"+(b.min?" · minimum "+fmx(b.min,b.cur):"")+" · from your statement email",act:"billAdd",id:b.id,bact:"billAdd",bid:b.id,bt:"Add due",tone:n<=3?"late":"soon"})});
  balOpen().forEach(([id,w])=>{const A=ac(id),d=w.app-w.bank;L.push({k:-700,ic:"⚖️",tx:A.name+": bank says "+fmx(w.bank,A.cur),sub:"The app showed "+fmx(w.app,A.cur)+" ("+(d>0?"higher":"lower")+" by "+fmx(Math.abs(d),A.cur)+") · tap to correct",act:"balFix",id,bact:"balOk",bid:id,bt:"Ignore",tone:"soon"})});
  return L.sort((a,b)=>a.k-b.k)}}

/* ---------- budget suggestions from the last 3 months ---------- */
function budSuggest(){const t=today(),M=[1,2,3].map(i=>addMon(t.slice(0,7),-i)),have=new Set(S.bud.map(b=>(b.cat||"").toLowerCase())),C={};
  S.tx.forEach(x=>{if(x.kind!="out"||!x.cat||have.has(x.cat.toLowerCase())||/balance correction|transfer/i.test(x.cat))return;const m=x.date.slice(0,7),i=M.indexOf(m);if(i<0)return;
    const c=C[x.cat]=C[x.cat]||{m:[0,0,0],cur:{}};c.cur[x.cur||"INR"]=(c.cur[x.cur||"INR"]||0)+1;c.m[i]+=cv(x.amt,x.cur||"INR",V())});
  return Object.entries(C).map(([cat,c])=>{const cur=Object.entries(c.cur).sort((a,b)=>b[1]-a[1])[0][0],months=c.m.filter(v=>v>0).length,avg=c.m.reduce((s,v)=>s+v,0)/3,inCur=cv(avg,V(),cur),step=cur=="INR"?500:50;
    return {cat,cur,avg:inCur,months,lim:Math.max(step,Math.ceil(inCur*1.05/step)*step)}}).filter(s=>s.months>=2&&s.avg>0).sort((a,b)=>cv(b.avg,b.cur,V())-cv(a.avg,a.cur,V()))}
function budSheet(){const L=budSuggest();sheet(`<h2>Suggested budgets</h2><p class="sub">From what you spent in the last 3 months, a little above your usual. Change any amount, untick what you don’t want.</p>
  ${L.length?L.map((s,i)=>`<div class="hbl" style="margin:10px 0;gap:10px"><label style="display:flex;gap:8px;align-items:center;flex:1"><input type="checkbox" data-bs="${i}" checked style="width:auto"> <span>${esc(s.cat)}<small style="display:block;color:var(--mute)">usually ${fmx(Math.round(s.avg),s.cur)} a month</small></span></label><input type="number" id="bs_${i}" value="${s.lim}" style="width:110px;margin:0" aria-label="Budget for ${esc(s.cat)}"><small>${s.cur}</small></div>`).join("")+`<div class="acts"><button class="btn" data-act="budMake">Create budgets</button></div>`:`<div class="empty">Not enough spending yet. Suggestions appear after about two months of entries.</div>`}`);window.__bs=L}
{const _vs=vSpend;vSpend=function(...a){const h=_vs(...a);return h.includes('data-act="addBud"')&&budSuggest().length?h.replace(/(<button[^>]*data-act="addBud"[^>]*>[^<]*<\/button>)/,`$1<button class="btn ghost" data-act="budSug">${esc(taStr("Suggest budgets"))}</button>`):h}}

/* ---------- Tamil voice and typing ---------- */
const TAW=[[/ரியால்(கள்)?|ரியாலு/g," riyal "],[/ரூபாய்|ரூபா|ரூ\./g," rupees "],[/(\d)\s*ஆயிரம்/g,"$1 thousand"],[/ஆயிரம்/g," 1000 "],[/(\d)\s*லட்சம்/g,"$1 lakh"],
 [/தொள்ளாயிரம்/g," 900 "],[/எண்ணூறு/g," 800 "],[/எழுநூறு/g," 700 "],[/அறுநூறு/g," 600 "],[/ஐநூறு/g," 500 "],[/நானூறு/g," 400 "],[/முந்நூறு/g," 300 "],[/இருநூறு/g," 200 "],[/நூறு/g," 100 "],[/ஐம்பது/g," 50 "],
 [/சம்பளம்/g," salary "],[/வரவு|வந்தது|கிடைத்தது/g," received "],[/சாப்பாடு|உணவு|ஹோட்டல்/g," food "],[/மளிகை|காய்கறி|பால்/g," groceries "],[/பெட்ரோல்|டீசல்/g," fuel "],[/வாடகை/g," rent "],
 [/மருந்து|மருத்துவம்|ஆஸ்பத்திரி|டாக்டர்/g," health "],[/கரண்ட்|மின்சாரம்|தண்ணீர்|ரீசார்ஜ்/g," bills "],[/பள்ளி|ஸ்கூல்|பீஸ்/g," education "],[/துணி|டிரஸ்|ஷாப்பிங்/g," shopping "],[/டாக்சி|பஸ்|ஆட்டோ|பயணம்/g," travel "],
 [/செலவு|கொடுத்தேன்|வாங்கினேன்|செலுத்தினேன்/g," "]];
{const _pl=parseLine;parseLine=function(s){let t=String(s||"");if(/[஀-௿]/.test(t))TAW.forEach(([re,x])=>{t=t.replace(re,x)});return _pl(t.replace(/\s+/g," ").trim())}}

/* ---------- settings and reading status ---------- */
{const _st=settings;settings=function(...a){const r=_st(...a);try{const box=$("#set_more");if(box&&!$("#set_vl")){box.insertAdjacentHTML("beforeend",`<button id="set_vl" data-act="vlangT">Voice: ${S.cfg.vlang=="ta"?"தமிழ்":"English"}</button>`);if(taOn())taNode(box)}}catch(e){}return r}}
{const _rc=readCheck;readCheck=async function(...a){const r=await _rc.apply(this,a);try{const sh=$("#over .sheet");if(sh&&isApp())sh.insertAdjacentHTML("beforeend",`<h3>Email accounts</h3><div class="card"><div class="hbl"><span>📧 Gmail</span><b>${esc(gmStatus())}</b></div><div class="hbl"><span>📨 Outlook</span><b>${esc(msStatus())}</b></div><div class="hbl"><span>Hourly check when closed</span><b>${(gmOn()||msOn())&&mailBgOn()?"On":"Off"}</b></div></div>`)}catch(e){}return r}}
Object.assign(TA,{"Save":"சேமி","Edit":"திருத்து","Suggest budgets":"பட்ஜெட் பரிந்துரை","Suggested budgets":"பரிந்துரைக்கப்பட்ட பட்ஜெட்கள்","Create budgets":"பட்ஜெட்களை உருவாக்கு","Add due":"கட்டணமாகச் சேர்","Ignore":"புறக்கணி","Saved without asking":"கேட்காமல் சேமிக்கப்படுபவை","Stop":"நிறுத்து","Payments to review":"பார்வையிட வேண்டிய பணம்"});
NEW27.splice(0,NEW27.length,"Bank emails are checked every hour even when the app is closed, with a notification","Card bills found in statement emails become due dates in one tap","The app warns when the bank’s balance in an alert doesn’t match","Payments to review: Save in one tap, Save all, or always save from a bank","Suggested budgets from your last 3 months (Spend → Suggest budgets)","Voice entry in Tamil (Settings → Voice)","Widget mic button now starts voice entry straight away");

Object.assign(ACT,{
  mailBgT(){S.cfg.mailBg=!mailBgOn();save();bgSync();toast(mailBgOn()?"Hourly email check on":"Hourly email check off");const h=$("#over h2");if(h&&/Gmail/.test(h.textContent))gmSheet();else if(h&&/Outlook/.test(h.textContent))msSheet()},
  smsQuick(id){const m=(S.cfg.smsq||[]).find(x=>String(x.id)==id);if(!m||!quickOk(m))return ACT.smsAdd(id);quickSave(m);save();render();toast("Saved");if((S.cfg.smsq||[]).length)smsReview();else sheet("")},
  smsAllOk(){const L=(S.cfg.smsq||[]).filter(quickOk);L.forEach(quickSave);save();render();toast(L.length+(L.length==1?" payment saved":" payments saved"));if((S.cfg.smsq||[]).length)smsReview();else sheet("")},
  autoFrom(id){const m=(S.cfg.smsq||[]).find(x=>String(x.id)==id);if(!m)return;const k=sendKey(m.from);S.cfg.autoFrom=[...new Set([...(S.cfg.autoFrom||[]),k])];autoTake();save();render();toast("Payments from "+k+" will be saved without asking");if((S.cfg.smsq||[]).length)smsReview();else sheet("")},
  autoOff(k){S.cfg.autoFrom=(S.cfg.autoFrom||[]).filter(x=>x!=k);save();smsReview()},
  billAdd(id){const b=(S.cfg.billq||[]).find(x=>x.id==id);if(!b)return;const A=ac(b.acc);dForm();const set=(i,x)=>{const e=$("#"+i);if(e){e.value=x;e.dispatchEvent(new Event("change",{bubbles:true}))}};
    set("f_name",(A&&A.id?A.name:b.from)+" card bill");set("f_type","bill");set("f_date",b.due);set("f_amt",b.total);set("f_cur",b.cur);
    const h=$("#over h2");if(h)h.insertAdjacentHTML("afterend",`<p class="sub">From your card statement email${b.min?`: total ${fmx(b.total,b.cur)}, minimum ${fmx(b.min,b.cur)}`:""}. Check and save.</p>`)},
  balFix(id){const w=(S.cfg.balWarn||{})[id];fixForm(id);const e=$("#f_bal");if(e&&w)e.value=w.bank},
  balOk(id){const W={...(S.cfg.balWarn||{})};delete W[id];S.cfg.balWarn=W;save();render()},
  budSug(){budSheet()},
  budMake(){const L=window.__bs||[];let n=0;L.forEach((s,i)=>{const c=$(`[data-bs="${i}"]`),v2=+v("bs_"+i);if(c&&c.checked&&v2>0){put("bud",stamp({id:uid(),cat:s.cat,lim:v2,cur:s.cur}));n++}});save();sheet("");render();toast(n?n+(n==1?" budget created":" budgets created"):"No budgets selected")},
  vlangT(){S.cfg.vlang=S.cfg.vlang=="ta"?"":"ta";save();settings();toast(S.cfg.vlang=="ta"?"குரல் பதிவு: தமிழ்":"Voice entry: English")}
});
