/* ===== Version 30: receipt reading, trips & events, shopping list, calculators, can I afford it, yearly dates,
   pay links, fingerprint for documents, text size, live Google Sheet, family activity, bulk fixes, month summary ===== */
const tzLS=(k,v2)=>{try{if(v2===undefined)return localStorage.getItem("ds-"+k)||"";if(v2===null)localStorage.removeItem("ds-"+k);else localStorage.setItem("ds-"+k,v2)}catch(e){return ""}};
const TAG_EV=id=>"ev:"+id;
const inRange=(d,a,b)=>d>=a&&(!b||d<=b);

/* ---------- 1. read a receipt photo ---------- */
function rcptParse(text){const T=String(text||""),L=T.split(/\n+/).map(x=>x.trim()).filter(Boolean),nums=s=>[...String(s).matchAll(/(\d{1,3}(?:[,\s]\d{3})+(?:\.\d{1,3})?|\d+(?:\.\d{1,3})?)/g)].map(m=>+m[1].replace(/[,\s]/g,"")).filter(n=>n>0&&n<1e6);
  const cur=/\bQAR\b|\bQR\b|ر\.?\s?ق|riyal/i.test(T)?"QAR":/₹|\bINR\b|\bRs\.?/i.test(T)?"INR":"";
  const pick=re=>{for(let i=0;i<L.length;i++){if(!re.test(L[i])||/sub\s*-?\s*total|total\s*(qty|quantity|items?|discount|vat|tax|saving)|vat\s*total/i.test(L[i]))continue;const n=nums(L[i]).filter(x=>x!=Math.round(x)||String(x).length<7);if(n.length)return n[n.length-1];const nx=L[i+1]?nums(L[i+1]):[];if(nx.length)return nx[nx.length-1]}return 0};
  let amt=pick(/grand\s*total|net\s*(total|amount|payable)|total\s*(amount|due|payable)|amount\s*(due|payable)|to\s*pay|balance\s*due|المجموع|الإجمالي/i)||pick(/\btotal\b/i);
  if(!amt){const d2=[...T.matchAll(/(\d{1,3}(?:,\d{3})*\.\d{2})\b/g)].map(m=>+m[1].replace(/,/g,"")).filter(n=>n<100000);if(d2.length)amt=Math.max(...d2)}
  let date="";for(const m of T.matchAll(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})/g)){const d=anyDate(m[1].replace(/\//g,"-"));if(d&&d<=today()&&d>=plus(-90)){date=d;break}}
  const shop=(L.find(x=>/[A-Za-z]{3,}/.test(x)&&!/tax\s*invoice|invoice|receipt|welcome|thank|vat|tel|phone|fax|www|http|cr\.?\s*no|bill\s*no|date|time|cashier|^\d/i.test(x))||"").replace(/[^A-Za-z0-9&' .-]/g," ").replace(/\s+/g," ").trim().slice(0,40);
  return {amt:Math.round((amt||0)*100)/100,cur,date,shop:shop?tcase(shop.toLowerCase()):""}}
async function rcptRead(file){if(!isApp())return;try{const f=await shrinkImg(file),r=await NP("DueNative","ocr",{data:await b64(f)}),p=rcptParse(r&&r.text);if(!$("#f_amt"))return;
  const said=[];if(p.amt&&!v("f_amt")){$("#f_amt").value=p.amt;said.push(fmx(p.amt,p.cur||ac(v("f_acc")).cur||"QAR"))}
  if(p.cur&&$("#f_acc")&&ac(v("f_acc")).cur!=p.cur){const A=S.acc.find(a=>a.cur==p.cur&&a.type!="card")||S.acc.find(a=>a.cur==p.cur);if(A)$("#f_acc").value=A.id}
  if(p.shop&&$("#f_payee")&&!v("f_payee")){$("#f_payee").value=p.shop;said.push("at "+p.shop);if(!v("f_cat")){const c=catFor(p.shop)||catGuess(p.shop);if(c)$("#f_cat").value=c}}
  if(p.date&&$("#f_date")&&p.date!=v("f_date")){$("#f_date").value=p.date;said.push("on "+fmt(p.date))}
  const n=$("#f_lineok");if(said.length){if(n)n.textContent="Read from the photo: "+said.join(" ")+". Check it before saving.";budHint()}else toast("Couldn’t find the total on that photo. Type the amount.")}catch(e){console.warn("ocr",e);toast("Couldn’t read the photo. Type the amount.")}}
{const _af=addFiles;addFiles=async function(fs){const L=[...(fs||[])],r=await _af(L);try{const img=L.find(f=>/^image\//.test(f.type));if(img&&$("#f_amt")&&!v("f_amt")&&$("#over .rcpt"))rcptRead(img)}catch(e){}return r}}

/* ---------- 2. trips & events ---------- */
const evActive=d=>S.evts.filter(e=>!e.closed&&inRange(d,e.from,e.to));
const evTx=e=>S.tx.filter(x=>(x.tags||[]).includes(TAG_EV(e.id)));
const evSpent=e=>evTx(e).filter(x=>x.kind=="out").reduce((s,x)=>s+cv(x.amt,x.cur,e.cur||V()),0);
{const _st=ACT.saveTx;ACT.saveTx=function(id,...a){const before=new Set(S.tx.map(t=>t.id)),r=_st.call(this,id,...a);try{const t=S.tx.find(q=>!before.has(q.id));if(t&&t.kind=="out"){const E=evActive(t.date);if(E.length){const o={...t,tags:[...new Set([...(t.tags||[]),...E.map(e=>TAG_EV(e.id))])]};put("tx",stamp(o,t));save()}}}catch(e){}return r}}
function evCard(e){const sp=evSpent(e),p=e.budget?Math.round(sp/e.budget*100):0,act=inRange(today(),e.from,e.to)&&!e.closed;
  return `<div class="card" data-act="evOpen" data-id="${e.id}" style="margin-bottom:8px;cursor:pointer"><div class="hbl"><b>${esc(e.name)}${act?' <span class="chip">now</span>':""}</b><small>${fmt(e.from)}${e.to?" – "+fmt(e.to):""}</small></div>
  <div class="hbl" style="margin-top:6px"><span>${fmx(Math.round(sp),e.cur||V())}${e.budget?" of "+fmx(e.budget,e.cur||V()):" spent"}</span>${e.budget?`<b style="color:${p>100?"var(--late)":p>85?"var(--soon)":"inherit"}">${p}%</b>`:""}</div>${e.budget?`<div class="dbar"><i style="width:${Math.min(100,p)}%;background:${p>100?"var(--late)":"var(--pri)"}"></i></div>`:""}</div>`}
function evHtml(){const L=[...S.evts].sort((a,b)=>(b.from||"").localeCompare(a.from||"")),open=L.filter(e=>!e.closed),old=L.filter(e=>e.closed);
  return `<h2>Trips & events</h2>${open.length?open.map(evCard).join(""):`<div class="empty">Plan a budget for an India trip, a wedding or a festival. Expenses on those dates are added to it by themselves.</div>`}${old.length?`<details><summary>Finished (${old.length})</summary>${old.map(evCard).join("")}</details>`:""}<div class="acts"><button class="btn ghost" data-act="evEdit">+ Trip or event</button></div>`}
function evForm(e){e=e||{};sheet(`<h2>${e.id?"Edit trip or event":"New trip or event"}</h2>${F("f_evn","Name",e.name,"text",'placeholder="India trip Dec, Cousin’s wedding, Pongal"')}
  <div class="two"><div>${F("f_evf","From",e.from||today(),"date")}</div><div>${F("f_evt","To",e.to||"","date")}</div></div>
  <div class="two"><div>${F("f_evb","Budget (optional)",e.budget||"","number")}</div><div>${SEL("f_evc","Currency",CURS,e.cur||"INR")}</div></div>
  <p class="note">Expenses you add between these dates are counted here. You can also add past entries from these dates.</p>
  <div class="acts"><button class="btn" data-act="evSave" data-id="${e.id||""}">Save</button>${e.id?`<button class="btn ghost" data-act="evPull" data-id="${e.id}">Add entries from these dates</button><button class="btn ghost" data-act="evClose" data-id="${e.id}">${e.closed?"Reopen":"Mark finished"}</button><button class="btn del" data-act="evDel" data-id="${e.id}">Delete</button>`:""}</div>`)}
function evSheet(id){const e=S.evts.find(x=>x.id==id);if(!e)return;const T=evTx(e).sort((a,b)=>b.date.localeCompare(a.date)),C={};T.filter(x=>x.kind=="out").forEach(x=>{const k=x.cat||"Other";C[k]=(C[k]||0)+cv(x.amt,x.cur,e.cur||V())});
  sheet(`<h2>${esc(e.name)}</h2><p class="sub">${fmt(e.from)}${e.to?" – "+fmt(e.to):""}</p>${evCard(e).replace('data-act="evOpen"','')}
  ${Object.keys(C).length?`<h3>By category</h3>${Object.entries(C).sort((a,b)=>b[1]-a[1]).map(([k,a])=>`<div class="hbl" style="margin:6px 0"><span>${esc(k)}</span><b>${fmx(Math.round(a),e.cur||V())}</b></div>`).join("")}`:""}
  <h3>Entries (${T.length})</h3>${T.length?T.slice(0,80).map(x=>txRow(x)).join(""):`<div class="empty">No entries yet.</div>`}<div class="acts"><button class="btn ghost" data-act="evEdit" data-id="${e.id}">Edit</button><button class="btn ghost" data-act="evShare" data-id="${e.id}">Share on WhatsApp</button></div>`)}
{const _vs=vSpend;vSpend=function(...a){let h=_vs(...a);const add=taHtml(evHtml()+`<h2>Tidy up</h2><div class="acts"><button class="btn ghost" data-act="uncatOpen">Fix entries without a category${(()=>{const n=S.tx.filter(x=>(x.kind=="out"||x.kind=="in")&&!x.cat).length;return n?" ("+n+")":""})()}</button><button class="btn ghost" data-act="bulkOpen">Change several entries</button></div><div class="acts"><button class="btn ghost" data-act="affordOpen">Can I afford it?</button><button class="btn ghost" data-act="calcOpen">Calculators</button></div>`),m=h.search(/<h2>(Entries|பதிவுகள்)<\/h2>/);return m>=0?h.slice(0,m)+add+h.slice(m):h+add}}

/* ---------- 3. shopping list (shared through sync) ---------- */
function shopSheet(){const L=[...S.shop].sort((a,b)=>(a.done?1:0)-(b.done?1:0)||(b.ct||0)-(a.ct||0)),n=L.filter(x=>!x.done).length;
  sheet(`<h2>Shopping list</h2><p class="sub">Shared with your family through sync. Tick items as you buy them.</p>
  <div class="lineq"><input id="f_shop" placeholder="Add an item, e.g. Milk 2" autocomplete="off" aria-label="Add an item"><button class="btn" data-act="shopAdd">Add</button></div>
  ${L.length?L.map(x=>`<label class="hbl shop${x.done?" done":""}" style="margin:8px 0;justify-content:flex-start;gap:10px"><input type="checkbox" data-shop="${x.id}" ${x.done?"checked":""} style="width:auto"><span style="flex:1;${x.done?"text-decoration:line-through;color:var(--mute)":""}">${esc(x.name)}</span>${x.by&&x.by!=whoAmI()?`<small style="color:var(--mute)">${esc(byName(x.by))}</small>`:""}</label>`).join(""):`<div class="empty">The list is empty.</div>`}
  <div class="acts">${L.some(x=>x.done)?`<button class="btn" data-act="shopBought">Bought: add the bill</button><button class="btn ghost" data-act="shopClear">Clear ticked</button>`:""}</div>`);
  if(taOn())taNode($("#over"));return n}
document.addEventListener("keydown",ev=>{if(ev.key=="Enter"&&ev.target&&ev.target.id=="f_shop"){ev.preventDefault();ACT.shopAdd()}});
document.addEventListener("change",e=>{const id=e.target&&e.target.dataset&&e.target.dataset.shop;if(!id)return;const x=S.shop.find(s=>s.id==id);if(!x)return;put("shop",stamp({...x,done:e.target.checked},x));save();shopSheet()});

/* ---------- 4. calculators ---------- */
const pmt=(P,ra,n)=>{const r=ra/1200;return r?P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1):P/n};
function calcRun(k){const g=i=>+v(i)||0,o=$("#calc_out");if(!o)return;let h="";
  if(k=="emi"){const P=g("c1"),R=g("c2"),N=g("c3")*12;if(P&&N){const e=pmt(P,R,N);h=`EMI <b>${fmr2(e)}</b> a month<br>Total interest ${fmr2(e*N-P)} · Total paid ${fmr2(e*N)}`}}
  else if(k=="sip"){const A=g("c1"),R=g("c2")/1200,Y=g("c3"),S2=g("c4")/100;let fv=0,inv=0,a=A;for(let m=1;m<=Y*12;m++){fv=(fv+a)*(1+R);inv+=a;if(m%12==0)a*=1+S2}if(A&&Y)h=`Value after ${Y} years <b>${fmr2(fv)}</b><br>You put in ${fmr2(inv)} · Gain ${fmr2(fv-inv)}`}
  else if(k=="fd"){const P=g("c1"),R=g("c2")/100,Y=g("c3");if(P&&Y){const fd=P*Math.pow(1+R/4,4*Y);let rd=0;const n=Math.round(Y*12);for(let i=1;i<=n;i++)rd+=P*Math.pow(1+R/4,4*(n-i+1)/12);h=`FD of ${fmr2(P)} once: matures to <b>${fmr2(fd)}</b><br>RD of ${fmr2(P)} every month: matures to <b>${fmr2(rd)}</b> (you put in ${fmr2(P*n)})`}}
  else if(k=="inf"){const C=g("c1"),I=g("c2")/100,Y=g("c3");if(C&&Y){const f=C*Math.pow(1+I,Y);h=`Something that costs ${fmr2(C)} today will cost about <b>${fmr2(f)}</b> in ${Y} years<br>${fmr2(C)} in ${Y} years will be worth about ${fmr2(C/Math.pow(1+I,Y))} in today’s money`}}
  else if(k=="fx"){const A=g("c1"),r=fx();if(A)h=`${A} QAR = <b>₹${(A*r).toLocaleString("en-IN",{maximumFractionDigits:2})}</b><br>₹${A.toLocaleString("en-IN")} = <b>QAR ${(A/r).toFixed(2)}</b><br><small>Rate 1 QAR = ₹${r}</small>`}
  o.innerHTML=h||"Fill in the numbers"}
const fmr2=n=>Math.round(n).toLocaleString("en-IN");
const CALCS={emi:["Loan EMI",[["Loan amount",500000],["Interest % a year",9],["Years",5]]],sip:["SIP with step-up",[["Monthly SIP",5000],["Expected return % a year",12],["Years",15],["Increase SIP each year %",10]]],fd:["FD and RD",[["Amount",100000],["Interest % a year",7],["Years",5]]],inf:["Future cost (inflation)",[["Cost today",100000],["Inflation % a year",6],["Years",10]]],fx:["Currency (QAR ↔ ₹)",[["Amount",1000]]]};
function calcSheet(k){k=k||"emi";const C=CALCS[k];sheet(`<h2>Calculators</h2><div class="segs" style="flex-wrap:wrap;gap:6px;display:flex">${Object.entries(CALCS).map(([id,c])=>`<button class="btn sm ${id==k?"":"ghost"}" data-act="calcOpen" data-id="${id}">${c[0]}</button>`).join("")}</div>
  ${C[1].map((f,i)=>F("c"+(i+1),f[0],f[1],"number",'inputmode="decimal" data-calc="'+k+'"')).join("")}<div class="card" id="calc_out" style="margin-top:10px;line-height:1.6"></div><p class="note">Amounts use the same currency you type. Results are estimates.</p>`);calcRun(k)}
document.addEventListener("input",e=>{const k=e.target&&e.target.dataset&&e.target.dataset.calc;if(k)calcRun(k)});

/* ---------- 5. can I afford it? ---------- */
function affordRun(){const o=$("#af_out");if(!o)return;const amt=+v("af_amt")||0,cur=v("af_cur")||"QAR",cat=v("af_cat").trim();if(!amt){o.innerHTML="";return}
  const a=cv(amt,cur,V()),P=payPlan(),have=tot(V()),M=[1,2,3].map(i=>mSum(addMon(today().slice(0,7),-i),"out")),usual=M.reduce((s,x)=>s+x,0)/3||0,cushion=usual?(have-a)/usual:0,pts=[];
  let score=0;if(P){const left=P.left-a;pts.push(`Until payday (${fmt(P.np)}): ${left<0?"short by "+fmr(-left):fmr(left)+" left"}${P.days>0&&left>0?", about "+fmr(left/P.days)+" a day":""}`);score+=left<0?2:left<usual*0.15?1:0}
  else{pts.push(`In accounts after this: ${fmr(have-a)}`);score+=have-a<0?2:0}
  if(usual)pts.push(`Money in accounts would cover about ${Math.max(0,cushion).toFixed(1)} months of your usual spending`);if(usual&&cushion<3)score+=1;
  if(cat){const B=S.bud.find(b=>(b.cat||"").toLowerCase()==cat.toLowerCase());if(B){const u=budUse(today().slice(0,7)).find(x=>x.b.id==B.id),used=u?u.s:0,p=Math.round((used+cv(amt,cur,B.cur||"INR"))/B.lim*100);pts.push(`${esc(B.cat)} budget would be at ${p}%`);if(p>100)score+=1}}
  const G=(S.goals||[]).filter(g=>!g.done&&+g.target>+(g.saved||0));if(G.length)pts.push(`Your goal “${esc(G[0].name)}” still needs ${fmx(Math.round(+G[0].target-+(G[0].saved||0)),G[0].cur||"INR")}`);
  const v0=score>=2?["Better to wait","var(--late)"]:score==1?["Possible, but tight","var(--soon)"]:["Yes, comfortably","var(--good,var(--pri))"];
  o.innerHTML=`<b style="font-size:20px;color:${v0[1]}">${v0[0]}</b>${pts.map(p=>`<div style="margin-top:6px">• ${p}</div>`).join("")}`}
function affordSheet(){sheet(`<h2>Can I afford it?</h2><p class="sub">Checks a purchase against your money until payday, your usual spending, budgets and goals.</p>
  <div class="two"><div>${F("af_amt","Price","","number",'inputmode="decimal"')}</div><div>${SEL("af_cur","Currency",CURS,S.acc.some(a=>a.cur=="QAR")?"QAR":"INR")}</div></div>${F("af_cat","Category (optional)","","text",'list="catlist" placeholder="Shopping"')}
  <div class="card" id="af_out" style="margin-top:10px;line-height:1.5"></div>`)}
document.addEventListener("input",e=>{if(e.target&&/^af_/.test(e.target.id))affordRun()});document.addEventListener("change",e=>{if(e.target&&/^af_/.test(e.target.id))affordRun()});

/* ---------- 6. important yearly dates ---------- */
const nextOn=(md)=>{const y=+today().slice(0,4),d=y+"-"+md;return d>=today()?d:(y+1)+"-"+md};
const YDATES=[["itr","ITR filing in India (for the last financial year)","07-31",0,"File by 31 July if you need to file. Check with your tax adviser."],["ppf","PPF minimum yearly deposit (₹500)","03-31",500,"Deposit at least ₹500 before 31 March or the account becomes inactive."],["ssy","SSY minimum yearly deposit (₹250)","03-31",250,"Deposit at least ₹250 before 31 March or a penalty applies."],["tax80c","Tax-saving deposits and proofs (80C)","03-15",0,"Finish PPF, SSY, ELSS or insurance payments before the year ends on 31 March."],["ais","Check AIS / Form 26AS for TDS","06-15",0,"Download AIS from the income tax site and check the TDS your bank deducted."]];
function ydSheet(){const have=n=>S.dates.some(d=>d.yd==n);sheet(`<h2>Important yearly dates</h2><p class="sub">Tick the ones you want. Each becomes a yearly due with reminders.</p>
  ${YDATES.map(([k,n,md,a,why])=>`<label class="hbl" style="margin:10px 0;gap:10px;justify-content:flex-start;align-items:flex-start"><input type="checkbox" data-yd="${k}" ${have(k)?"checked disabled":""} style="width:auto;margin-top:4px"><span>${esc(n)}<small style="display:block;color:var(--mute)">${fmt(nextOn(md))} · ${esc(why)}</small></span></label>`).join("")}
  <div class="acts"><button class="btn" data-act="ydAdd">Add selected</button></div>`)}

/* ---------- 7. pay link on dues ---------- */
{const _df=dForm;dForm=function(i,...a){const r=_df(i,...a);try{const nm=$("#f_name");if(nm){const box=$('#over [data-act="saveDate"]');const acts=box&&box.closest(".acts");if(acts)acts.insertAdjacentHTML("beforebegin",F("f_plink","Payment website or app link (optional)",i&&i.plink||"","url",'placeholder="https://… where you pay this"'));
  if(i&&i.plink){const h=$("#over h2");if(h)h.insertAdjacentHTML("afterend",`<div class="acts"><button class="btn" data-act="payOpen" data-id="${i.id}">Pay now ↗</button></div>`)}}}catch(e){console.warn(e)}return r}}
{const _sd=ACT.saveDate;ACT.saveDate=function(id,...a){const pl=$("#f_plink")?v("f_plink").trim():null,before=new Set(S.dates.map(d=>d.id)),r=_sd.call(this,id,...a);
  if(pl!==null){const d=id?S.dates.find(x=>x.id==id):S.dates.find(x=>!before.has(x.id));if(d&&(d.plink||"")!=pl){put("dates",stamp({...d,plink:/^https?:\/\//i.test(pl)||!pl?pl:"https://"+pl},d));save();render()}}return r}}

/* ---------- 8. fingerprint for documents ---------- */
let docOkUntil=0;
const docAtt=id=>S.docs.some(d=>(d.att||[]).some(a=>a.id==id));
{const _va=viewAtt;viewAtt=async function(id,...a){if(S.cfg.docLock&&isApp()&&docAtt(id)&&Date.now()>docOkUntil){try{const c=await NP("DueNative","canAuth");if(c&&c.ok){await NP("DueNative","auth",{});docOkUntil=Date.now()+120000}}catch(e){return toast("Fingerprint wasn’t confirmed")}}return _va(id,...a)}}

/* ---------- 9. text size (per phone) ---------- */
function tzApply(){const z=+tzLS("tz")||100;if(isApp())NP("DueNative","textZoom",{zoom:z}).catch(()=>{try{document.body.style.zoom=z/100}catch(e){}});else try{document.body.style.zoom=z==100?"":z/100}catch(e){}}

/* ---------- 10. live Google Sheet in Drive ---------- */
const TXK={out:"Expense",in:"Income",tr:"Transfer",save:"Saving",adj:"Balance correction"};
function txCsv(){const q=s=>{s=String(s==null?"":s);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
  return ["Date,Type,Amount,Currency,Account,To account,Category,Payee,Note,Added by",...[...S.tx].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>[x.date,TXK[x.kind]||x.kind,x.amt,x.cur,ac(x.acc).name||"",x.to?ac(x.to).name||"":"",x.cat||"",x.payee||"",x.note||"",x.by?byName(x.by):""].map(q).join(","))].join("\n")}
async function gdSheetUp(ask){const csv=new Blob(["﻿"+txCsv()],{type:"text/csv"});let id=gdLS("sheet");
  if(id){try{await gdFetch(GD.up+"/files/"+id+"?uploadType=media",{method:"PATCH",headers:{"Content-Type":"text/csv"},body:csv},ask);gdLS("sheetAt",new Date().toISOString());return id}catch(e){if(!/404|not found/i.test(String(e.message||e)))throw e;gdLS("sheet",null)}}
  const dir=await gdFolder(ask),B="pds"+Date.now(),meta={name:"Personal Diary entries",mimeType:"application/vnd.google-apps.spreadsheet",parents:[dir]};
  const body=new Blob([`--${B}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${B}\r\nContent-Type: text/csv\r\n\r\n`,csv,`\r\n--${B}--`]);
  const j=await (await gdFetch(GD.up+"/files?uploadType=multipart&fields=id",{method:"POST",headers:{"Content-Type":"multipart/related; boundary="+B},body},ask)).json();gdLS("sheet",j.id);gdLS("sheetAt",new Date().toISOString());return j.id}
{const _gb=gdBackup;gdBackup=async function(ask,why){const r=await _gb(ask,why);if(r&&gdLS("sheetOn")=="1"){try{await gdSheetUp(ask)}catch(e){console.warn("sheet",e)}}return r}}
{const _gs=gdSheet;gdSheet=function(){_gs();try{const c=$("#over .card");if(c&&isApp()&&gdOn())c.insertAdjacentHTML("beforeend",`<div class="hbl" style="margin-top:10px"><span>Google Sheet of all entries, updated daily</span><span style="display:flex;gap:6px">${gdLS("sheet")?`<button class="btn sm ghost" data-act="sheetOpen">Open</button>`:""}<button class="btn sm ${gdLS("sheetOn")=="1"?"":"ghost"}" data-act="sheetT">${gdLS("sheetOn")=="1"?"On":"Off"}</button></span></div>`)}catch(e){}}}

/* ---------- 11. family activity ---------- */
function actNew(){const me=whoAmI(),seen=+tzLS("actSeen")||0;if(!me)return [];if(!seen){tzLS("actSeen",String(Date.now()));return []}
  return [...S.tx.filter(x=>x.by&&x.by!=me&&(x.ct||0)>seen).map(x=>({t:x.ct,by:x.by,tx:x})),...S.shop.filter(x=>x.by&&x.by!=me&&(x.ct||0)>seen).map(x=>({t:x.ct,by:x.by,shop:x}))].sort((a,b)=>b.t-a.t)}
function actSheet(){const L=actNew();sheet(`<h2>While you were away</h2>${L.length?L.slice(0,60).map(a=>a.tx?`<div style="margin:2px 0"><small style="color:var(--mute)">${esc(byName(a.by))} · ${tAgo(a.t)}</small>${txRow(a.tx)}</div>`:`<div class="hbl" style="margin:8px 0"><span>🛒 ${esc(a.shop.name)}</span><small>${esc(byName(a.by))} · ${tAgo(a.t)}</small></div>`).join(""):`<div class="empty">Nothing new from your family.</div>`}<div class="acts"><button class="btn" data-act="actSeen">Got it</button></div>`)}

/* ---------- 12. bulk fixes ---------- */
function uncatSheet(){const T=S.tx.filter(x=>(x.kind=="out"||x.kind=="in")&&!x.cat),G={};T.forEach(x=>{const k=(x.payee||"").trim()||"(no payee)";(G[k]=G[k]||[]).push(x)});const L=Object.entries(G).sort((a,b)=>b[1].length-a[1].length).slice(0,40);window.__uc=L;
  sheet(`<h2>Entries without a category</h2><p class="sub">${T.length} entries. Give each shop a category once; the app also learns it for next time.</p>${L.length?L.map(([k,xs],i)=>`<div class="card" style="margin-bottom:8px"><div class="hbl"><b>${esc(k)}</b><small>${xs.length} · ${fmr(xs.reduce((s,x)=>s+ca(x),0))}</small></div><div class="lineq"><input id="uc_${i}" list="catlist" placeholder="Category" value="${esc(catFor(k)||catGuess(k)||"")}"><button class="btn sm" data-act="uncatSet" data-id="${i}">Apply</button></div></div>`).join("")+`<datalist id="catlist">${lineCats().map(c=>`<option value="${esc(c)}">`).join("")}</datalist>`:`<div class="empty">Every entry has a category.</div>`}`)}
function bulkList(){const m=v("bk_m"),q=v("bk_q").trim().toLowerCase();return S.tx.filter(x=>x.kind!="adj"&&(!m||x.date.startsWith(m))&&(!q||[x.payee,x.cat,x.note,ac(x.acc).name].join(" ").toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,150)}
function bulkRender(){const o=$("#bk_list");if(!o)return;const L=bulkList();o.innerHTML=L.length?L.map(x=>`<label class="hbl" style="margin:6px 0;gap:8px;justify-content:flex-start"><input type="checkbox" data-bk="${x.id}" style="width:auto"><span style="flex:1">${esc(x.payee||x.cat||TXK[x.kind]||"")}<small style="display:block;color:var(--mute)">${fmt(x.date)} · ${esc(x.cat||"no category")} · ${esc(ac(x.acc).name||"")}</small></span><b>${fmx(x.amt,x.cur)}</b></label>`).join(""):`<div class="empty">No entries match.</div>`}
function bulkSheet(){const ms=[...new Set(S.tx.map(x=>x.date.slice(0,7)))].sort().reverse().slice(0,24);
  sheet(`<h2>Change several entries</h2><div class="two"><div>${SEL("bk_m","Month",[["","All months"],...ms.map(m=>[m,mlong(m)])],today().slice(0,7))}</div><div>${F("bk_q","Contains","","text",'placeholder="Shop, category or note"')}</div></div>
  <div class="acts"><button class="btn sm ghost" data-act="bkAll">Select all shown</button></div><div id="bk_list"></div>
  <h3>With the selected entries</h3><div class="lineq"><input id="bk_cat" list="catlist" placeholder="New category"><button class="btn sm" data-act="bkCat">Set category</button></div>
  <div class="lineq" style="margin-top:8px"><select id="bk_acc">${ACCS().map(([k,t])=>`<option value="${k}">${esc(t)}</option>`).join("")}</select><button class="btn sm" data-act="bkAcc">Move to account</button></div>
  <div class="acts"><button class="btn del" data-act="bkDel">Delete selected</button></div><datalist id="catlist">${lineCats().map(c=>`<option value="${esc(c)}">`).join("")}</datalist>`);bulkRender()}
document.addEventListener("input",e=>{if(e.target&&e.target.id=="bk_q")bulkRender()});document.addEventListener("change",e=>{if(e.target&&e.target.id=="bk_m")bulkRender()});
const bkSel=()=>[...$$("#bk_list [data-bk]")].filter(c=>c.checked).map(c=>c.dataset.bk);

/* ---------- 13. last month's summary, once ---------- */
function monthSum(force){const pm=addMon(today().slice(0,7),-1);if(!force&&(+today().slice(8)>7||tzLS("msum")==pm||!S.tx.some(x=>x.date.startsWith(pm))))return;if(!force&&($("#over").innerHTML||$("#lock").innerHTML))return;tzLS("msum",pm);
  let lines=[];try{lines=monthText(pm).split("\n")}catch(e){lines=[mlong(pm)]}
  sheet(`<h2>${mlong(pm)} in short</h2>${lines.slice(1).map(l=>`<p style="margin:6px 0">${esc(l)}</p>`).join("")}<div class="acts"><button class="btn" data-act="closeX">Got it</button><button class="btn ghost" data-act="shareWa" data-id="${pm}">Share on WhatsApp</button></div>`)}

/* ---------- wiring: Home, Wealth, Family, Settings ---------- */
{const _ti=todoItems;todoItems=function(){const L=_ti();const A=actNew();if(A.length){const ppl=[...new Set(A.map(a=>byName(a.by)))].join(" and "),n=A.filter(a=>a.tx).length,s=A.filter(a=>a.shop).length;
    L.push({k:-260,ic:"👪",tx:ppl+(n?" added "+n+(n==1?" entry":" entries"):"")+(s?(n?" and ":" added ")+s+" to the shopping list":""),sub:"While you were away · tap to see",act:"actOpen",tone:""})}
  const sh=S.shop.filter(x=>!x.done).length;if(sh)L.push({k:400,ic:"🛒",tx:"Shopping list: "+sh+(sh==1?" item":" items"),sub:S.shop.filter(x=>!x.done).slice(0,3).map(x=>x.name).join(", "),act:"shopOpen",tone:""});
  evActive(today()).forEach(e=>{if(!e.budget)return;const sp=evSpent(e),p=Math.round(sp/e.budget*100);if(p>=80)L.push({k:-450,ic:"🧳",tx:e.name+": "+p+"% of budget used",sub:fmx(Math.round(sp),e.cur||V())+" of "+fmx(e.budget,e.cur||V()),act:"evOpen",id:e.id,tone:p>100?"late":"soon"})});
  return L.sort((a,b)=>a.k-b.k)}}
{const _gc=gratCard;gratCard=function(...a){return _gc(...a)+`<h2>Planning tools</h2><div class="acts"><button class="btn ghost" data-act="calcOpen">Calculators</button><button class="btn ghost" data-act="affordOpen">Can I afford it?</button><button class="btn ghost" data-act="ydOpen">Important yearly dates</button></div>`}}
{const _vf=vFam;vFam=function(...a){let h=_vf(...a);const seg=S.cfg.famSeg||"people";h=h.replace(/(data-act="famSeg" data-id="split">[^<]*<\/button>)/,`$1<button class="btn sm ${seg=="shop"?"":"ghost"}" data-act="famSeg" data-id="shop">${esc(taStr("Shopping list"))}</button>`);
  if(seg=="shop"){const mk='<div style="height:10px"></div>',cut=h.indexOf(mk);h=(cut>0?h.slice(0,cut+mk.length):h)+`<div class="card" data-act="shopOpen" style="cursor:pointer"><div class="hbl"><b>${S.shop.filter(x=>!x.done).length} to buy</b><span class="chip">Open list</span></div><small style="color:var(--mute)">${esc(S.shop.filter(x=>!x.done).slice(0,6).map(x=>x.name).join(", ")||"Nothing yet")}</small></div>`}return h}}
{const _st=settings;settings=function(...a){const r=_st(...a);try{const box=$("#set_more");if(box&&!$("#set_tz")){const z=+tzLS("tz")||100;box.insertAdjacentHTML("beforeend",`<button id="set_tz" data-act="tzT">Text size: ${z>=130?"Extra large":z>=115?"Large":"Normal"}</button><button data-act="docLockT">${S.cfg.docLock?"🔒 Documents: fingerprint":"Documents: no fingerprint"}</button><button data-act="ydOpen">Yearly dates</button><button data-act="calcOpen">Calculators</button>`);if(taOn())taNode(box)}}catch(e){}return r}}
{const _s=start;start=function(...a){const r=_s(...a);try{tzApply()}catch(e){}setTimeout(()=>{try{monthSum()}catch(e){}},6500);return r}}
Object.assign(TA,{"Trips & events":"பயணங்கள் & நிகழ்வுகள்","+ Trip or event":"+ பயணம் அல்லது நிகழ்வு","Shopping list":"ஷாப்பிங் பட்டியல்","Calculators":"கணக்கீடுகள்","Can I afford it?":"வாங்க முடியுமா?","Important yearly dates":"முக்கிய ஆண்டு தேதிகள்","Tidy up":"ஒழுங்குபடுத்து","Change several entries":"பல பதிவுகளை மாற்று","Planning tools":"திட்டமிடல் கருவிகள்","Pay now ↗":"இப்போது செலுத்து ↗","Got it":"சரி","Add selected":"தேர்ந்தவற்றைச் சேர்","While you were away":"நீங்கள் இல்லாதபோது"});
NEW27.splice(0,NEW27.length,"Receipt photo now fills in the amount, shop and date","Trips & events with their own budget (Spend)","Shared shopping list (Family → Shopping list)","Calculators: EMI, SIP, FD/RD, inflation, currency","Can I afford it? (Spend or Wealth → Plans)","Important yearly dates: ITR, PPF/SSY minimum (Wealth → Plans)","Pay link on dues, fingerprint for documents, text size (Settings)","Live Google Sheet of all entries in Drive","See what your family added while you were away","Fix uncategorised entries and change several entries at once","Last month in short, on the 1st");

Object.assign(ACT,{
  evEdit(id){evForm(S.evts.find(e=>e.id==id))},
  evOpen(id){evSheet(id)},
  evSave(id){const n=v("f_evn").trim(),f=v("f_evf"),t=v("f_evt");if(!n||!f)return toast("Add a name and a start date");if(t&&t<f)return toast("The end date is before the start");const old=S.evts.find(e=>e.id==id);
    const e=stamp({...(old||{}),id:id||uid(),name:n,from:f,to:t,budget:+v("f_evb")||0,cur:v("f_evc")},old);put("evts",e);save();if(!old&&f<=today())ACT.evPull(e.id,null,true);sheet("");render();toast("Saved")},
  evPull(id,el,quiet){const e=S.evts.find(x=>x.id==id);if(!e)return;let n=0;S.tx.forEach(x=>{if(x.kind=="out"&&inRange(x.date,e.from,e.to||today())&&!(x.tags||[]).includes(TAG_EV(e.id))){put("tx",stamp({...x,tags:[...(x.tags||[]),TAG_EV(e.id)]},x));n++}});save();if(quiet!==true){toast(n+(n==1?" entry added":" entries added"));evSheet(id)}},
  evClose(id){const e=S.evts.find(x=>x.id==id);if(!e)return;put("evts",stamp({...e,closed:!e.closed},e));save();sheet("");render()},
  evDel(id){S.tx.forEach(x=>{if((x.tags||[]).includes(TAG_EV(id)))put("tx",stamp({...x,tags:x.tags.filter(t=>t!=TAG_EV(id))},x))});trash("evts",id);save();sheet("");render()},
  evShare(id){const e=S.evts.find(x=>x.id==id);if(!e)return;const sp=evSpent(e);openExt("https://wa.me/?text="+encodeURIComponent(`${e.name}: spent ${fmx(Math.round(sp),e.cur||V())}${e.budget?" of "+fmx(e.budget,e.cur||V())+" budget":""} (${fmt(e.from)}${e.to?" – "+fmt(e.to):""})`))},
  shopOpen(){shopSheet()},
  shopAdd(){const n=v("f_shop").trim();if(!n)return;put("shop",stamp({id:uid(),name:n.slice(0,60),done:false,ct:Date.now(),by:whoAmI()}));save();shopSheet();const e=$("#f_shop");if(e)e.focus()},
  shopClear(){S.shop.filter(x=>x.done).forEach(x=>trash("shop",x.id));save();shopSheet();render()},
  shopBought(){const items=S.shop.filter(x=>x.done).map(x=>x.name);qForm("out",{cat:lineCats().find(c=>/grocer/i.test(c))||"Groceries",note:items.join(", ").slice(0,200)});const e=$("#f_note");if(e&&!e.value)e.value=items.join(", ").slice(0,200)},
  calcOpen(k){calcSheet(k&&CALCS[k]?k:"emi")},
  affordOpen(){affordSheet()},
  ydOpen(){ydSheet()},
  ydAdd(){let n=0;$$("#over [data-yd]").forEach(c=>{if(!c.checked||c.disabled)return;const y=YDATES.find(x=>x[0]==c.dataset.yd);const d=nextOn(y[2]);put("dates",stamp({id:uid(),name:y[1],type:"renewal",date:d,day:+d.slice(8),amt:y[3],cur:"INR",rep:"yearly",no:"",pay:"",note:y[4],yd:y[0],att:[]}));n++});save();sheet("");render();toast(n?n+(n==1?" date added":" dates added"):"Nothing selected")},
  payOpen(id){const d=S.dates.find(x=>x.id==id);if(d&&d.plink)openExt(d.plink)},
  docLockT(){S.cfg.docLock=!S.cfg.docLock;save();settings();toast(S.cfg.docLock?"Documents now need your fingerprint":"Documents open without fingerprint")},
  tzT(){const z=+tzLS("tz")||100,n=z>=130?100:z>=115?130:115;tzLS("tz",String(n));tzApply();settings()},
  sheetT(){const on=gdLS("sheetOn")=="1";gdLS("sheetOn",on?null:"1");if(!on){toast("Making the Google Sheet…");gdSheetUp(true).then(()=>{toast("Google Sheet ready in your Drive");gdSheet()}).catch(e=>toast(String(e.message||e)))}else gdSheet()},
  sheetOpen(){const id=gdLS("sheet");if(id)openExt("https://docs.google.com/spreadsheets/d/"+id)},
  actOpen(){actSheet()},
  actSeen(){tzLS("actSeen",String(Date.now()));sheet("");render()},
  uncatOpen(){uncatSheet()},
  uncatSet(i){const g=(window.__uc||[])[+i],c=v("uc_"+i).trim();if(!g||!c)return toast("Type a category");g[1].forEach(x=>{const t=S.tx.find(y=>y.id==x.id);if(t)put("tx",stamp({...t,cat:c},t))});save();render();toast(g[1].length+(g[1].length==1?" entry":" entries")+" set to "+c);uncatSheet()},
  bulkOpen(){bulkSheet()},
  bkAll(){const all=[...$$("#bk_list [data-bk]")],on=all.some(c=>!c.checked);all.forEach(c=>c.checked=on)},
  bkCat(){const ids=bkSel(),c=v("bk_cat").trim();if(!ids.length||!c)return toast(ids.length?"Type a category":"Select entries first");ids.forEach(id=>{const t=S.tx.find(x=>x.id==id);if(t)put("tx",stamp({...t,cat:c},t))});save();render();bulkRender();toast(ids.length+" changed")},
  bkAcc(){const ids=bkSel(),a=v("bk_acc"),A=ac(a);if(!ids.length)return toast("Select entries first");let n=0,skip=0;ids.forEach(id=>{const t=S.tx.find(x=>x.id==id);if(!t)return;if(t.kind=="tr"||ac(t.acc).cur!=A.cur){skip++;return}put("tx",stamp({...t,acc:a,cur:A.cur},t));n++});save();render();bulkRender();toast(n+" moved"+(skip?" · "+skip+" skipped (transfer or other currency)":""))},
  bkDel(){const ids=bkSel();if(!ids.length)return toast("Select entries first");if(!confirm("Delete "+ids.length+" entries? They go to the recycle bin."))return;ids.forEach(id=>trash("tx",id));save();render();bulkRender();toast(ids.length+" deleted")}
});
