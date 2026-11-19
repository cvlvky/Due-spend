/* ===== entries without typing, questions, planning, phone-app reminders ===== */
const MON3={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function pDate(s){s=String(s||"").trim();let m,y,mo,d;
  if(m=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/)){y=m[1];mo=+m[2];d=+m[3]}
  else if(m=s.match(/^(\d{1,2})[-\/. ](\d{1,2})[-\/. ](\d{2,4})/)){d=+m[1];mo=+m[2];y=m[3]}
  else if(m=s.match(/^(\d{1,2})[-\/ ]?([A-Za-z]{3})[a-z]*[-\/ ,]*(\d{2,4})/)){d=+m[1];mo=MON3[m[2].toLowerCase()];y=m[3]}
  if(!y||!mo||mo>12||!d||d>31)return "";if(String(y).length==2)y="20"+y;return y+"-"+p2(mo)+"-"+p2(d)}
const num=s=>parseFloat(String(s||"").replace(/[^\d.\-]/g,""))||0;
/* the category used last time for this payee or description */
function catFor(text){const t=String(text||"").toLowerCase().trim();if(t.length<3)return "";
  for(let i=S.tx.length-1;i>=0;i--){const x=S.tx[i],p=(x.payee||"").toLowerCase().trim();if(x.cat&&p.length>=3&&(t.includes(p)||p.includes(t)))return x.cat}return ""}

/* ---------- bank SMS ---------- */
function parseSms(text){const s=String(text||"").replace(/\s+/g," ").trim();if(!s)return null;const low=s.toLowerCase();
  let am=null;for(const m of s.matchAll(/(INR|Rs\.?|₹|QAR|QR|USD|AED|SAR|\$)\s*([\d,]*\d(?:\.\d+)?)|([\d,]*\d(?:\.\d+)?)\s*(INR|QAR|QR|Rs)\b/gi)){if(/(?:bal|balance|limit|avl|avail|outstanding|min(?:imum)? due|total due)[\s.:\-]*(?:is|of|:)?\s*$/i.test(s.slice(Math.max(0,m.index-30),m.index)))continue;am=[m[0],m[1]||m[4]||"",m[2]||m[3]];break}
  if(!am){const m=s.match(/([\d,]*\d\.\d{2})\b/);if(m)am=[m[0],"",m[1]]}if(!am)return null;
  const amt=num(am[2]);if(!amt)return null;const cw=(am[1]||"").toUpperCase(),cur=/QAR|QR/.test(cw)?"QAR":/INR|RS|₹/.test(cw)?"INR":"";
  const iD=low.search(/debited|spent|purchase|withdrawn|withdrawal|paid|payment of|payment to|payment successful|sent|deducted|charged|order total|your order|debit/),iC=low.search(/credited|received|deposited|refund|cashback/),kind=iC>=0&&(iD<0||iC<iD)?"in":"out";
  const l4=(s.match(/(?:a\/c|acct|account|card|ac)\s*(?:no\.?|number|ending|ending with)?\s*[:\-]?\s*[xX*.]*\s*(\d{3,6})\b/i)||[])[1]||"";
  const pm=s.match(new RegExp("\\b(?:"+(kind=="in"?"from|by":"at|to|towards")+")\\s+([A-Za-z0-9&.'\\- ]{2,32}?)(?=\\s+(?:on|ref|upi|avl|avail|bal|via|dated|dt|using|for|has|have|was|is|successful|successfully|with|from|and)\\b|[.,;(!]|$)","i")),mp=s.match(/(?:merchant(?: name)?|paid to|payee|beneficiary)\s*[:\-]\s*([A-Za-z0-9&.'\- ]{2,32}?)(?=\s{2,}|[.,;(|]|\s+(?:on|ref|amount|date|card)\b|$)/i),payee=mp?mp[1].trim():pm&&!/^(a\/c|ac|acct|account|your|card|bank|you|the)\b/i.test(pm[1])?pm[1].trim():"";
  const dm=s.match(/\b(\d{1,2}[-\/.](?:\d{1,2}|[A-Za-z]{3})[-\/.]\d{2,4}|\d{1,2}[A-Za-z]{3}\d{2,4}|\d{4}-\d\d-\d\d)\b/);let date=dm?pDate(dm[1]):"";if(!date||date>plus(1)||date<plus(-400))date=today();
  const A=S.acc.find(a=>l4&&a.l4&&String(a.l4)==l4.slice(-String(a.l4).length))||(cur&&S.acc.find(a=>a.cur==cur&&a.id==S.cfg.last))||(cur&&S.acc.find(a=>a.cur==cur))||null;
  return {kind,amt,cur,l4,payee,date,acc:A?A.id:"",cat:catFor(payee),note:""}}
function smsForm(){sheet(`<h2>Paste a bank message</h2><p class="sub">Paste the SMS from your bank. The app reads the amount, account, date and payee, and you check it before saving. Nothing is sent anywhere.</p><textarea id="f_sms" rows="5" placeholder="Rs.1,250.00 debited from A/c XX1234 on 12-11-26 to LULU HYPERMARKET. Avl Bal Rs.45,300" aria-label="Bank message"></textarea><div class="acts"><button class="btn" data-act="smsRead">Read message</button></div><p class="note">Tip: add the last 4 digits to each account (Accounts, tap the name) so the right account is picked.</p>`)}
function smsOpen(text){const r=parseSms(text);if(!r){toast("Couldn’t find an amount in that message");return false}qForm(r.kind,r);toast("Check the details, then Save");return true}

/* ---------- bank statement (CSV) ---------- */
let csvPend=null;
function csvRows(t){const first=(t.split(/\r?\n/).find(l=>l.trim())||""),cnt=c=>first.split(c).length,dl_=[",",";","\t","|"].sort((a,b)=>cnt(b)-cnt(a))[0],R=[];let r=[],c="",q=false;
  for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch=='"'){if(t[i+1]=='"'){c+='"';i++}else q=false}else c+=ch}else if(ch=='"')q=true;else if(ch==dl_){r.push(c);c=""}else if(ch=="\n"){r.push(c);R.push(r);r=[];c=""}else if(ch!="\r")c+=ch}
  if(c||r.length){r.push(c);R.push(r)}return R}
function csvParse(text,accId){const R=csvRows(text),find=(h,re)=>h.findIndex(x=>re.test(x));let hi=-1,H=null;
  for(let i=0;i<Math.min(R.length,40);i++){const h=R[i].map(x=>String(x).toLowerCase().trim());if(find(h,/date/)>=0&&(find(h,/amount|debit|withdraw|credit|deposit/)>=0)){hi=i;H=h;break}}
  if(hi<0)throw new Error("Couldn’t find the date and amount columns in that file");
  const cD=find(H,/date/),cT=find(H,/narration|description|details|particular|remark|transaction/),cDr=find(H,/debit|withdraw|\bdr\b/),cCr=find(H,/credit|deposit|\bcr\b/),cA=find(H,/^amount|amount$|\bamt\b/),cTy=find(H,/type|dr\/cr|cr\/dr/);
  const rows=[];let bad=0;
  for(let i=hi+1;i<R.length;i++){const r=R[i];if(!r||r.every(x=>!String(x).trim()))continue;const date=pDate(r[cD]);let amt=0,kind="out";
    if(cDr>=0&&num(r[cDr])){amt=Math.abs(num(r[cDr]));kind="out"}else if(cCr>=0&&num(r[cCr])){amt=Math.abs(num(r[cCr]));kind="in"}
    else if(cA>=0&&num(r[cA])){const n=num(r[cA]),ty=String(cTy>=0?r[cTy]:"").toLowerCase();amt=Math.abs(n);kind=/cr|credit|deposit/.test(ty)?"in":/dr|debit|withdraw/.test(ty)?"out":n<0?"out":(cTy>=0?"out":"in");if(cTy<0&&n>0&&/\bdr\b/i.test(String(r[cA])))kind="out"}
    if(!date||!amt){bad++;continue}const desc=String(cT>=0?r[cT]:"").replace(/\s+/g," ").trim().slice(0,60);
    rows.push({date,amt,kind,desc})}
  const have=new Set(S.tx.filter(x=>x.acc==accId).map(x=>x.date+"|"+x.kind+"|"+(+x.amt).toFixed(2))),fresh=[],seen=new Map();let dup=0;
  rows.forEach(r=>{const k=r.date+"|"+r.kind+"|"+r.amt.toFixed(2);seen.set(k,(seen.get(k)||0)+1);if(have.has(k)&&seen.get(k)==1)dup++;else fresh.push(r)});
  return {acc:accId,rows:fresh,dup,bad}}
function csvForm(){csvPend=null;sheet(`<h2>Import a bank statement</h2><p class="sub">Download a statement from your bank as a CSV file, then choose it here. Entries already in the app (same date and amount) are skipped.</p>${SEL("f_acc","Account this statement is for",ACCS(),S.cfg.last||"")}<label for="f_csv">Statement file (CSV)</label><input id="f_csv" type="file" accept=".csv,text/csv,text/plain" data-csv="1"><div id="csvout"></div>`)}
function csvShow(){const p=csvPend,o=$("#csvout");if(!o||!p)return;const A=ac(p.acc);
  o.innerHTML=`<div class="card" style="margin-top:10px"><b>${p.rows.length} new ${p.rows.length==1?"entry":"entries"}</b><small style="display:block;color:var(--mute)">${p.dup} already in the app · ${p.bad} rows skipped as unreadable · going into ${esc(A.name)}</small>${p.rows.slice(0,6).map(r=>`<div class="hbl" style="margin:6px 0"><span>${fmt(r.date)} · ${esc(r.desc||"No description")}</span><b>${r.kind=="out"?"−":"+"}${fmx(r.amt,A.cur)}</b></div>`).join("")}${p.rows.length>6?`<p class="note">and ${p.rows.length-6} more</p>`:""}</div>${p.rows.length?`<div class="acts"><button class="btn" data-act="csvImport">Import ${p.rows.length} ${p.rows.length==1?"entry":"entries"}</button></div>`:""}`}

/* ---------- Claude inside the Claude link: receipts and questions ---------- */
const SMART={sample:null,img:false,ctl:null};
async function smartProbe(n){n=n||0;if(!inClaude()){if(n<5)setTimeout(()=>smartProbe(n+1),1200);return}
  try{const sm=await claude.use("sample");if(!sm)return;SMART.sample=sm;try{const l=await sm.limits();SMART.img=!!(l&&l.images)}catch(e){}
    if((tab=="rep"||tab=="home")&&!$("#over").innerHTML&&!$("#lock").innerHTML)render()}catch(e){}}
const smartErr=e=>({not_granted:"Claude wasn’t allowed for this page, so this feature is off.",rate_limited:"You’ve reached a usage limit. Try again later.",session_expired:"Sign in to Claude again, then retry.",refused:"Claude declined that request.",image_rejected:"That image couldn’t be used. Try another photo.",images_unavailable:"Photos can’t be sent from this view.",cancelled:"Stopped."})[e&&e.code]||"Claude couldn’t answer just now. Try again.";
async function readReceipt(file){if(!SMART.sample)return;toast("Reading the receipt…");
  try{const r=await SMART.sample.json(`This image is a shop receipt or payment screenshot. Reply with only one JSON object: {"amount": number (the total paid), "currency": "INR" or "QAR" or "", "date": "YYYY-MM-DD" or "", "merchant": string, "category": one of ${JSON.stringify([...new Set([...CATS,...S.tx.slice(-200).map(x=>x.cat).filter(Boolean)])].slice(0,30))}}. Use "" when something is not visible. Today is ${today()}.`,{images:[file],cache:false});
    const amt=+r.amount||0;if(!amt)return toast("Couldn’t read a total from that photo");const cur=r.currency=="QAR"?"QAR":r.currency=="INR"?"INR":"",A=(cur&&S.acc.find(a=>a.cur==cur&&a.id==S.cfg.last))||(cur&&S.acc.find(a=>a.cur==cur))||null;
    qForm("out",{amt,date:pDate(r.date)||today(),payee:String(r.merchant||"").slice(0,40),cat:catFor(r.merchant)||String(r.category||""),acc:A?A.id:""});toast("Check the details, then Save")}
  catch(e){if(e&&(e.code=="not_granted"||e.code=="images_unavailable"))SMART.img=false;toast(smartErr(e))}}
/* a compact picture of the records for Claude to answer from */
function askData(){const t=today(),cm=t.slice(0,7),L=[];L.push("Today: "+t+". Amounts are in the currency shown. 1 QAR = "+fx()+" INR.");
  L.push("ACCOUNTS: "+S.acc.map(k=>`${k.name} (${ATYPE[k.type]||""}) ${k.cur} ${Math.round(bal(k))}`).join("; "));
  const P=nwParts("INR");L.push(`NET WORTH (INR): accounts ${Math.round(P.acc)}, investments ${Math.round(P.inv)}, goal savings ${Math.round(P.goal)}, loans owed ${Math.round(P.loan)}`);
  L.push("MONTHLY TOTALS (INR, month: spent/income/saved; top categories):");for(let j=11;j>=0;j--){const m=addMon(cm,-j),v0=S.cfg.view;S.cfg.view="INR";const o=mSum(m,"out"),i=mSum(m,"in"),s=mSum(m,"save"),c=catTotals(m).slice(0,6).map(x=>x[0]+" "+Math.round(x[1])).join(", ");S.cfg.view=v0;if(o||i||s)L.push(`${m}: ${Math.round(o)}/${Math.round(i)}/${Math.round(s)}; ${c}`)}
  L.push("DUE DATES: "+activeDues().map(i=>`${i.name} (${TYPES[i.type]}, ${REP[i.rep][0]}) ${i.cur} ${i.amt||0} due ${i.date}`).join("; "));
  L.push("LOANS: "+S.loans.filter(loanLeft).map(l=>`${l.name}: EMI ${l.cur} ${l.emi}, ${loanLeft(l)} left, owed about ${Math.round(loanOut(l))}${+l.rate?", rate "+l.rate+"%":""}, ends ${loanEnd(l)}`).join("; "));
  L.push("INVESTMENTS: "+S.inv.filter(x=>!x.closed).map(x=>`${x.name} (${IK[x.kind]}) invested ${x.cur} ${Math.round(+x.inv||0)}, value ${Math.round(invVal(x))}${x.mdate?", matures "+x.mdate:""}`).join("; "));
  L.push("GOALS: "+S.goals.map(g=>`${g.name}: ${g.cur} ${Math.round(+g.saved||0)} of ${g.target}${g.date?" by "+g.date:""}`).join("; "));
  L.push("RECURRING: "+S.rec.map(r=>`${KIND[r.kind]} ${ac(r.acc).cur} ${r.amt} ${r.cat||""} day ${r.day}`).join("; "));
  const RM=remits();L.push("QAR-INR TRANSFERS: "+RM.slice(-24).map(r=>`${r.x.date}: QAR ${r.qar} = INR ${r.inr} (rate ${r.rate.toFixed(2)})`).join("; "));
  const v0=S.cfg.view;S.cfg.view="INR";L.push("FORECAST (INR, month: in/out/balance at end): "+forecast(12).map(r=>`${r.m}: ${Math.round(r.inc)}/${Math.round(r.fixed+r.flex)}/${Math.round(r.bal)}`).join("; "));S.cfg.view=v0;
  L.push("RECENT ENTRIES (date, type, account, currency amount, category, payee, tags, note):");
  [...S.tx].filter(x=>x.kind!="tr").sort((a,b)=>b.date.localeCompare(a.date)).slice(0,250).forEach(x=>L.push([x.date,KIND[x.kind],an(x.acc),(x.cur||"INR")+" "+x.amt,x.cat||"",x.payee||"",(x.tags||[]).join(" "),(x.note||"").slice(0,40)].join(" | ")));
  return L.join("\n").slice(0,180000)}
async function askClaude(){const q=v("ask_q").trim(),o=$("#ask_out"),b=$("#ask_stop");if(!q||!o||!SMART.sample)return;SMART.ctl=new AbortController();o.textContent="Thinking…";if(b)b.hidden=false;
  try{const r=await SMART.sample("You answer questions about one person’s own money records from a budgeting app. Use only the data below. Show the figures you used. If the data cannot answer the question, say so. Give factual information, not financial advice, in plain text without Markdown, in under 150 words.\n\nDATA:\n"+askData()+"\n\nQUESTION: "+q,{signal:SMART.ctl.signal,cache:false,onText:({text})=>{const e=$("#ask_out");if(e)e.textContent=text}});
    const e=$("#ask_out");if(e)e.textContent=r.text+(r.truncated?"\n(The answer was cut short.)":"")}
  catch(e){const el=$("#ask_out");if(el)el.textContent=(e&&e.text?e.text+"\n":"")+smartErr(e);if(e&&e.code=="not_granted"){SMART.sample=null}}
  const s=$("#ask_stop");if(s)s.hidden=true}
const askCard=()=>SMART.sample?`<h2>Ask about your money</h2><div class="card"><input id="ask_q" placeholder="How much did I send to India this year?" aria-label="Your question"><div class="acts"><button class="btn" data-act="ask">Ask Claude</button><button class="btn ghost" data-act="askStop" id="ask_stop" hidden>Stop</button></div><p id="ask_out" style="white-space:pre-wrap;margin:10px 0 0"></p><p class="note" style="margin-top:8px">This sends a summary of your records to Claude on your own account and uses your Claude usage. Answers can be wrong, so check the figures.</p></div>`:"";

/* ---------- planning ---------- */
function whatIf(inc,emi,rate,n){n=n||12;const base=forecast(n),r0=S.cfg.rate;let sc;try{if(rate>0)S.cfg.rate=rate;sc=forecast(n)}finally{S.cfg.rate=r0}
  return base.map((b,j)=>({m:b.m,base:b.bal,bal:sc[j].bal+(inc-emi)*j}))}
function goalPlan(){const R=rep(today().slice(0,7)),spare=R.in.avg!=null?R.in.avg-R.out.avg:null;
  return S.goals.map(g=>{const left=Math.max(0,(+g.target||0)-(+g.saved||0));if(!left)return {g,done:true};if(!g.date||dl(g.date)<=0)return {g,left,need:null};
    const mo=Math.max(1,Math.round(dl(g.date)/30.44)),need=left/mo;return {g,left,mo,need,fits:spare==null?null:iv(need,g.cur)<=spare}})}
const fyStart=()=>{const t=today(),y=+t.slice(0,4);return (+t.slice(5,7)>=4?y:y-1)+"-04-01"};
function coverView(){const isH=i=>/health|medi|hospital/i.test(i.name),P=activeDues().filter(i=>i.type=="premium"),yr=i=>{const st=REP[i.rep][1];return iv(+i.amt||0,i.cur)*(st?12/st:1)},
  life=P.filter(i=>!isH(i)),hl=P.filter(isH),cover=life.reduce((s,i)=>s+iv(+i.sa||0,i.cur),0),inc=emiLoad().inc*12,fy=fyStart(),v0=sumV,
  paid=f=>sumV(S.tx.filter(x=>x.date>=fy&&x.link&&f(x)));
  const ppf=paid(x=>x.kind=="save"&&x.link.t=="inv"&&(S.inv.find(n=>n.id==x.link.id)||{}).kind=="ppf"),home=paid(x=>x.link.t=="loan"&&/home|hous/i.test((S.loans.find(l=>l.id==x.link.id)||{}).name||""));
  return {cover,inc,times:inc>0&&cover>0?cover/inc:null,lifeYr:life.reduce((s,i)=>s+yr(i),0),healthYr:hl.reduce((s,i)=>s+yr(i),0),ppf,home,fy}}
function planHtml(){const G=goalPlan(),C=coverView();let h=`<h2>What if</h2><div class="card"><p class="note" style="margin:0 0 4px">Try a change and see your total balance over the next 12 months.</p><div class="two"><div>${F("wi_inc","Monthly income change (+ or −)","","number")}</div><div>${F("wi_emi","New monthly payment","","number")}</div></div>${F("wi_rate","QAR rate (1 QAR = ₹)",fx(),"number")}<div class="acts"><button class="btn" data-act="whatIf">Show the effect</button></div><div id="wi_out"></div></div>`;
  if(G.length)h+=`<h2>Goal planner</h2><div class="card">${G.map(x=>`<div class="hrow"><span class="dot ${x.done?"good":x.need==null?"":x.fits===false?"warn":"good"}"></span><div><b>${esc(x.g.name)}</b><small>${x.done?"Reached":x.need==null?fmx(x.left,x.g.cur)+" to go. Add a target date to see a monthly amount.":`Save ${fmx(Math.ceil(x.need),x.g.cur)} a month for ${x.mo} ${x.mo==1?"month":"months"} to reach it by ${fmt(x.g.date)}.${x.fits===false?" That is more than you usually have left over each month.":""}`}</small></div></div>`).join("")}</div>`;
  if(C.lifeYr||C.healthYr||C.cover||C.ppf||C.home)h+=`<h2>Cover and yearly totals</h2><div class="card"><div class="stats" style="grid-template-columns:1fr 1fr;margin:0 0 8px">${tile("Life cover",fmr(C.cover),"",C.times?C.times.toFixed(1)+" times yearly income":"Add sum assured on premiums")}${tile("Life premiums a year",fmr(C.lifeYr))}${tile("Health premiums a year",fmr(C.healthYr))}${tile("PPF / EPF paid in",fmr(C.ppf),"","since "+fmt(C.fy))}${C.home?tile("Home loan EMIs paid",fmr(C.home),"","since "+fmt(C.fy)):""}</div><p class="note">These totals are often needed at tax time. The app does not work out tax, and rules change, so check the current rules or ask a tax adviser. A common rule of thumb for life cover is around 10 times yearly income.</p></div>`;
  return h}

Object.assign(ACT,{
  smsOpen(){smsForm()},
  smsRead(){smsOpen(v("f_sms"))},
  csvOpen(){csvForm()},
  csvImport(){const p=csvPend;if(!p||!p.rows.length)return;const A=ac(p.acc),batch="imp_"+uid(),ids=[];
    p.rows.forEach(r=>{const x=addTx({kind:r.kind,acc:A.id,amt:r.amt,cur:A.cur,date:r.date,cat:catFor(r.desc),payee:r.desc,note:"",imp:batch});ids.push(x.id)});csvPend=null;done();
    toast(`Imported ${ids.length} ${ids.length==1?"entry":"entries"}`,()=>{ids.forEach(i=>removeTx(i));S.bin=S.bin.filter(b=>!ids.includes(b.r.id));save();render()})},
  ask(){return askClaude()},
  askStop(){if(SMART.ctl)SMART.ctl.abort()},
  whatIf(){const inc=+v("wi_inc")||0,emi=+v("wi_emi")||0,rate=+v("wi_rate")||0,W=whatIf(inc,emi,rate,12),o=$("#wi_out"),L=W[W.length-1],low=W.reduce((a,b)=>b.bal<a.bal?b:a);if(!o)return;
    o.innerHTML=`${bars(W.map(r=>({l:mlab(r.m).slice(0,1),v:r.bal})),["v"],["var(--pri)"])}<p style="margin:6px 0">After 12 months your total would be about <b>${fmr(L.bal)}</b>, against <b>${fmr(L.base)}</b> as things are now (${L.bal>=L.base?"+":"−"}${fmr(Math.abs(L.bal-L.base))}).</p><p class="note">Lowest point: ${fmr(low.bal)} in ${mlong(low.m)}.${low.bal<0?" The balance goes below zero.":""} The change starts next month. This is an estimate.</p>`},
  cloudShareOn(){return cloudShare(true)},
  cloudShareOff(){return cloudShare(false)}
});
document.addEventListener("change",async e=>{const t=e.target,has=k=>t.getAttribute&&t.getAttribute(k);
  try{
    if(t.id=="f_payee"){const c=$("#f_cat");if(c&&!c.value){const g=catFor(t.value);if(g)c.value=g}return}
    if(has("data-receipt")){const f=t.files[0];t.value="";if(f)await readReceipt(f);return}
    if(has("data-csv")){const f=t.files[0];if(!f)return;csvPend=csvParse(await f.text(),v("f_acc"));csvShow()}
  }catch(err){console.error(err);const o=$("#csvout");if(o)o.innerHTML=`<p class="note" style="color:var(--late)">${esc(err&&err.message||err)}</p>`;else toast(String(err&&err.message||err))}});
