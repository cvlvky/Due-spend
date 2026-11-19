/* ===== forms and sheets ===== */
const CATL=()=>DL("cats",[...S.tx.slice(-80).reverse().map(x=>x.cat),...CATS]);
const linkName=L=>{const m={sub:["subs","subscription"],due:["dates","due date"],loan:["loans","loan"],goal:["goals","goal"],inv:["inv","investment"]}[L.t];if(!m)return "another record";const r=S[m[0]].find(x=>x.id==L.id);return "the "+m[1]+(r?" “"+esc(r.name)+"”":"")};
/* payments recorded against a due date, loan, goal or investment */
function histHtml(t,id){const L=linked(t,id);if(!L.length)return "";const ins=L.filter(x=>x.kind!="adj"||t=="due"),outs=t=="inv"?L.filter(x=>x.kind=="adj"):[];
  return `<details><summary>${t=="goal"||t=="inv"?"Money put in":"Payments"}: ${fm(sumV(ins))} in ${ins.length} ${ins.length==1?"entry":"entries"}${outs.length?" · taken out "+fm(sumV(outs)):""}</summary>${L.slice(0,12).map(x=>`<div class="row" data-act="editTx" data-id="${x.id}"><div><b>${fmt(x.date)}</b><small>${esc(an(x.acc))} · ${esc(x.cat||KIND[x.kind])}</small></div><b>${fmx(x.amt,x.cur)}</b></div>`).join("")}</details>`}

/* ---------- attachments ---------- */
let pend=[],orig=[],added=[];
function attInit(a){orig=(a||[]).map(x=>x.id);pend=[...(a||[])];added=[]}
function attList(){return pend.length?pend.map(a=>`<div class="row" style="cursor:default;border-left-color:var(--line)"><div><b>${esc(a.name)}</b><small>${a.lab?esc(a.lab)+" · ":""}${Math.max(1,Math.round(a.size/1024))} KB</small></div><div><button class="btn sm ghost" data-act="vAtt" data-id="${a.id}">View</button> <button class="btn sm del" data-act="rAtt" data-id="${a.id}">Remove</button></div></div>`).join(""):`<p class="note">No files yet.</p>`}
function attHtml(){return `<label for="f_file">Attachments (photos or PDFs, up to 10 MB each)</label><div id="attlist">${attList()}</div><select id="f_dt" style="margin-bottom:6px" aria-label="Document type">${["Policy bond","Premium receipt","KYC document","Statement","Other"].map(x=>`<option>${x}</option>`).join("")}</select><input id="f_file" type="file" accept="image/*,application/pdf" multiple data-file="1">`}
async function addFiles(fs){for(const f of fs){if(f.size>10485760){toast(f.name+" is over 10 MB");continue}
    try{const id=uid();await fput(id,f);pend.push({id,name:f.name,type:f.type,size:f.size,lab:v("f_dt")});added.push(id)}catch(e){toast("Couldn’t store "+f.name+" on this device")}}
  const l=$("#attlist");if(l)l.innerHTML=attList()}
function attDone(saved){const keep=saved?pend.map(a=>a.id):orig;[...added,...orig].forEach(id=>{if(!keep.includes(id))fdel(id)});pend=[];added=[];orig=[]}
async function viewAtt(id){const m=pend.find(a=>a.id==id)||allAtt().find(a=>a.id==id)||{name:"File",type:""};
  try{const b=await fget(id);if(!b)throw 0;const u=URL.createObjectURL(b),im=(m.type||b.type||"").startsWith("image/");
    $("#view").innerHTML=`<div class="back" data-act="vclose" style="z-index:40"><div class="sheet">${im?`<img src="${u}" style="width:100%;border-radius:12px" alt="${esc(m.name)}">`:`<iframe src="${u}" title="${esc(m.name)}" style="width:100%;height:60vh;border:0;border-radius:12px"></iframe>`}<p><a href="${u}" target="_blank" rel="noopener">Open in a new tab</a></p><div class="acts"><button class="btn" data-act="vclose">Close</button></div></div></div>`}
  catch(e){toast("Couldn’t open that file")}}

/* ---------- due dates ---------- */
function calUrl(i){const s=i.date.replace(/-/g,""),e=D(i.date);e.setDate(e.getDate()+1);const st=REP[i.rep][1],r=!st?"":"&recur="+encodeURIComponent(st==12?"RRULE:FREQ=YEARLY":"RRULE:FREQ=MONTHLY;INTERVAL="+st);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(i.name+" ("+TYPES[i.type]+")")}&dates=${s}/${iso(e).replace(/-/g,"")}${r}`}
function info(i){const n=dl(i.date),st=REP[i.rep][1],a=+i.amt||0,nx=[1,2,3].map(k=>dueAt(i,k)),
  det=[i.sa&&"Sum assured "+fmx(i.sa,i.cur),i.mamt&&"Maturity "+fmx(i.mamt,i.cur),i.term&&i.term+" yr term",i.lpy&&"Last premium "+esc(i.lpy),i.nom&&"Nominee: "+esc(i.nom)].filter(Boolean).join(" · ");
  return `<div class="card" style="margin:8px 0"><b>${i.done?"Done":when(n)}</b> · ${fmt(i.date)}<small style="display:block;color:var(--mute)">${st?`Next dates: ${nx.map(fmt).join(", ")}${i.type!="fd"&&a?`<br>About ${fmx(a*12/st,i.cur)} a year`:""}`:"One-time item"}${det?`<br>${det}`:""}</small></div>${histHtml("due",i.id)}`}
function dForm(i){attInit(i&&i.att);i=i||null;const g=k=>i?i[k]:"";
  sheet(`<h2>${i?"Edit due date":"New due date"}</h2>${i?info(i):""}${F("f_name","Name",g("name"),"text",'placeholder="LIC policy, HDFC FD, car EMI"')}
  <div class="two"><div>${SEL("f_type","Type",Object.entries(TYPES),i?i.type:"premium")}</div><div>${F("f_date","Due date",i?i.date:today(),"date")}</div></div>
  <div class="two"><div>${F("f_amt","Amount",g("amt")||"","number")}</div><div>${SEL("f_cur","Currency",CURS,i?i.cur:"INR")}</div></div>
  <div class="two"><div>${SEL("f_rep","Repeats",Object.entries(REP).map(([k,x])=>[k,x[0]]),i?i.rep:"none")}</div><div>${F("f_no","Policy or account no.",g("no"))}</div></div>
  ${SEL("f_pay","Pay from account (used when you tap Paid)",[["","Last used account"],...ACCS()],g("pay")||"")}
  <details><summary>More policy details</summary><div class="two"><div>${F("f_sa","Sum assured",g("sa")||"","number")}</div><div>${F("f_term","Policy term (years)",g("term")||"","number")}</div></div><div class="two"><div>${F("f_lpy","Last premium year",g("lpy")||"","number")}</div><div>${F("f_mamt","Maturity amount",g("mamt")||"","number")}</div></div>${F("f_nom","Nominee",g("nom"))}</details>
  ${attHtml()}${stampNote(i)}<div class="acts"><button class="btn" data-act="saveDate" data-id="${i?i.id:""}">Save</button>${i?`<a class="btn ghost" style="text-align:center;text-decoration:none" href="${esc(calUrl(i))}" target="_blank" rel="noopener">Add to calendar</a><button class="btn del" data-act="delDate" data-id="${i.id}">Delete</button>`:""}</div>`)}

/* ---------- investments ---------- */
function iForm(x){attInit(x&&x.att);x=x||null;const g=k=>x?x[k]:"";
  sheet(`<h2>${x?"Edit investment":"New investment"}</h2>${F("f_name","Name",g("name"),"text",'placeholder="SBI FD, index fund"')}
  <div class="two"><div>${SEL("f_kind2","Type",Object.entries(IK),x?x.kind:"fd")}</div><div>${SEL("f_cur","Currency",CURS,x?x.cur:"INR")}</div></div>
  <div class="two"><div>${F("f_inv","Amount invested",g("inv")||"","number")}</div><div>${F("f_val","Current value",g("val")||"","number")}</div></div>
  <div class="two"><div>${F("f_sd","Start date (optional)",g("sd"),"date")}</div><div>${F("f_md","Maturity date (optional)",g("mdate"),"date")}</div></div>
  <div class="two"><div>${F("f_rt","Interest % per year (FDs)",g("rt")||"","number")}</div><div>${F("f_no","Account or folio no.",g("no"))}</div></div>
  ${x?`<div class="acts"><button class="btn ghost" data-act="invAdd" data-id="${x.id}">Add money</button><button class="btn ghost" data-act="invOut" data-id="${x.id}">Withdraw</button></div>${histHtml("inv",x.id)}`:SEL("f_from","Take this amount from an account",[["","No, just record it"],...ACCS()],"")}
  ${liveFields(x)}${attHtml()}${stampNote(x)}${btns("saveInv",x&&x.id,"delInv")}`)}
function invMoneyForm(id,mode){const x=S.inv.find(q=>q.id==id);if(!x)return;
  sheet(`<h2>${mode=="add"?"Add money to":"Withdraw from"} ${esc(x.name)}</h2><p class="sub">Current value ${fmx(invVal(x,true),x.cur)}.${mode=="out"?" A withdrawal lowers the value and the amount invested, and is not counted as income.":""}</p><input type="hidden" id="f_mode" value="${mode}">
  <div class="two"><div>${F("f_amt","Amount ("+x.cur+")","","number")}</div><div>${F("f_date","Date",today(),"date")}</div></div>
  ${SEL("f_acc",mode=="add"?"Take it from":"Pay it into",[["","Don’t change any balance"],...ACCS()],S.cfg.last||"")}${btns("saveInvMoney",id)}`)}

/* ---------- goals, loans, budgets, recurring ---------- */
function gForm(g){g=g||null;sheet(`<h2>${g?"Edit goal":"New goal"}</h2>${F("f_name","Goal name",g?g.name:"")}<div class="two"><div>${F("f_tg","Target amount",g?g.target:"","number")}</div><div>${SEL("f_cur","Currency",CURS,g?g.cur:"INR")}</div></div><div class="two"><div>${F("f_sv","Saved so far",g?g.saved:"","number")}</div><div>${F("f_date","Target date (optional)",g?g.date:"","date")}</div></div><p class="note">Money counted in a goal is separate from your account balances and is part of your net worth.</p>${g?histHtml("goal",g.id):""}${stampNote(g)}${btns("saveGoal",g&&g.id,"delGoal")}`)}
function goalAddForm(id){const g=S.goals.find(x=>x.id==id);if(!g)return;sheet(`<h2>Add to ${esc(g.name)}</h2><div class="two"><div>${F("f_amt","Amount ("+g.cur+")","","number")}</div><div>${F("f_date","Date",today(),"date")}</div></div>${SEL("f_acc","Take it from",[["","Don’t change any balance"],...ACCS()],S.cfg.last||"")}${btns("saveGoalAmt",id)}`)}
function lForm(l){l=l||null;const g=k=>l?l[k]:"";sheet(`<h2>${l?"Edit loan":"New loan or EMI"}</h2>${F("f_name","Name",g("name"))}<div class="two"><div>${F("f_emi","EMI amount",g("emi")||"","number")}</div><div>${SEL("f_cur","Currency",CURS,l?l.cur:"INR")}</div></div><div class="two"><div>${F("f_tot","Total installments",g("total")||"","number")}</div><div>${F("f_pd","Installments paid",l?l.paid:0,"number")}</div></div><div class="two"><div>${F("f_out","Outstanding (optional)",g("out")||"","number")}</div><div>${F("f_rate","Interest % per year (optional)",g("rate")||"","number")}</div></div><div class="two"><div>${F("f_next","Next EMI date",g("next"),"date")}</div><div>${SEL("f_acc","Pay from",ACCS(),l?l.acc:S.cfg.last)}</div></div>${l?histHtml("loan",l.id):""}${stampNote(l)}${btns("saveLoan",l&&l.id,"delLoan")}`)}
function bForm(b){b=b||null;sheet(`<h2>${b?"Edit budget":"New budget"}</h2>${F("f_cat","Category",b?b.cat:"","text",'list="cats"')}${CATL()}<div class="two"><div>${F("f_lim","Monthly limit",b?b.lim:"","number")}</div><div>${SEL("f_cur","Currency",CURS,b?b.cur:"INR")}</div></div>${btns("saveBud",b&&b.id,"delBud")}`)}
function rForm(r){r=r||null;sheet(`<h2>${r?"Edit recurring entry":"New recurring entry"}</h2>${SEL("f_k","Type",[["out","Spent"],["in","Income"],["save","Saved"]],r?r.kind:"out")}<div class="two"><div>${F("f_amt","Amount",r?r.amt:"","number")}</div><div>${SEL("f_acc","Account",ACCS(),r?r.acc:S.cfg.last)}</div></div><div class="two"><div>${F("f_cat","Category",r?r.cat:"","text",'list="cats"')}</div><div>${F("f_day","Day of month",r?r.day:1,"number")}</div></div>${CATL()}${F("f_note","Note (optional)",r?r.note:"")}<p class="note">Entries are added automatically from the next due day each month, and count as fixed costs.</p>${btns("saveRec",r&&r.id,"delRec")}`)}

/* ---------- accounts and transfers ---------- */
const accUsed=id=>S.tx.some(x=>x.acc==id||x.to==id);
function accForm(k){k=k||null;const used=k&&accUsed(k.id);
  sheet(`<h2>${k?"Edit account":"New account"}</h2>${F("f_name","Name",k?k.name:"","text",'placeholder="SBI Savings, QNB Salary"')}<div class="two"><div>${SEL("f_type","Type",Object.entries(ATYPE),k?k.type:"bank")}</div><div>${SEL("f_cur","Currency",CURS,k?k.cur:"INR",used?"disabled":"")}</div></div><div class="two"><div>${F("f_open","Opening balance",k?k.open:"","number")}</div><div>${F("f_l4","Last 4 digits (for SMS)",k&&k.l4||"","text",'inputmode="numeric" maxlength="6"')}</div></div>${used?`<p class="note">Currency can’t change once the account has entries.</p>`:""}${stampNote(k)}<div class="acts"><button class="btn" data-act="saveAcc" data-id="${k?k.id:""}">Save</button>${k&&S.acc.length>1?`<button class="btn del" data-act="delAcc" data-id="${k.id}">Delete</button>`:""}</div>`)}
function fixForm(id){const k=ac(id);sheet(`<h2>Correct balance</h2><p class="sub">${esc(k.name)}: the app shows ${fmx(bal(k),k.cur)}. Enter what your bank shows now, or confirm that it matches.</p>${F("f_bal","Actual balance ("+k.cur+")","","number")}<div class="acts"><button class="btn" data-act="saveFix" data-id="${id}">Save</button><button class="btn ghost" data-act="okBal" data-id="${id}">It matches</button></div>${k.rcd?`<p class="note">Last checked ${fmt(k.rcd)}</p>`:""}`)}
function trForm(t){t=t||null;const f=t?t.acc:(S.cfg.last&&ac(S.cfg.last).id||S.acc[0].id),to=t?t.to:(S.acc.find(k=>k.id!=f)||{}).id||"";
  sheet(`<h2>${t?"Edit transfer":"Transfer money"}</h2><div class="two"><div>${SEL("f_from","From",ACCS(),f,'data-trs="1"')}</div><div>${SEL("f_to","To",ACCS(),to,'data-trs="1"')}</div></div>
  <div class="two"><div><label id="l_amt" for="f_amt">Amount sent</label><input id="f_amt" type="number" inputmode="decimal" step="any" data-trs="1" value="${t?t.amt:""}"></div><div><label id="l_got" for="f_got">Amount received</label><input id="f_got" type="number" inputmode="decimal" step="any" value="${t?t.got:""}"></div></div>
  <div class="two"><div>${F("f_fee","Fee (optional)",t&&t.fee||"","number")}</div><div>${F("f_date","Date",t?t.date:today(),"date")}</div></div><div class="two"><div>${F("f_via","Sent through (optional)",t&&t.via||"","text",'list="dl_via" placeholder="Bank app, Al Zaman…"')}</div><div>${F("f_note","Note (optional)",t?t.note:"")}</div></div>${DL("dl_via",S.tx.filter(x=>x.via).map(x=>x.via).reverse())}<p class="note" id="trn"></p>${stampNote(t)}${btns("saveTr",t&&t.id,"delTx")}`);trSync(!!t)}
function trSync(keep){const A=ac(v("f_from")),B=ac(v("f_to")),s=+v("f_amt")||0,g=$("#f_got");if(!g)return;$("#l_amt").textContent="Amount sent ("+A.cur+")";$("#l_got").textContent="Amount received ("+B.cur+")";
  if(A.cur==B.cur){g.value=s||"";g.readOnly=true;$("#trn").textContent=""}else{g.readOnly=false;if(!keep&&s)g.value=cv(s,A.cur,B.cur).toFixed(2);$("#trn").textContent="Change the received amount to the real figure from your bank."}}
function stmt(k){const ev=[];S.tx.forEach(x=>{if(x.kind=="tr"){if(x.acc==k.id)ev.push([x,"Transfer to "+an(x.to),-((+x.amt||0)+(+x.fee||0))]);if(x.to==k.id)ev.push([x,"Transfer from "+an(x.acc),+x.got||0])}
    else if(x.acc==k.id)ev.push([x,(x.cat||KIND[x.kind])+(x.note?" · "+x.note:""),(x.kind=="in"||x.kind=="adj")?+x.amt:-x.amt])});
  ev.sort((a,b)=>a[0].date.localeCompare(b[0].date)||(a[0].ct||0)-(b[0].ct||0));let b=+k.open||0;const r=ev.map(e=>{b+=e[2];return [...e,b]}).reverse().slice(0,200);
  sheet(`<h2>${esc(k.name)} statement</h2><p class="sub">Opening ${fmx(k.open||0,k.cur)} · Balance ${fmx(bal(k),k.cur)}</p>${r.length?r.map(e=>`<div class="row" data-act="editTx" data-id="${e[0].id}"><div><b>${esc(e[1])}</b><small>${fmt(e[0].date)}</small></div><div class="r"><b style="color:${e[2]<0?"var(--late)":"var(--pri)"}">${e[2]<0?"−":"+"}${fmx(Math.abs(e[2]),k.cur)}</b><small>${fmx(e[3],k.cur)}</small></div></div>`).join(""):`<div class="empty">No entries yet.</div>`}`)}

/* ---------- entries ---------- */
const kindSeg=k=>`<div class="seg" id="q_k">${[["out","Spent"],["in","Income"],["save","Saved"]].map(([val,l])=>`<button class="btn ${k==val?"":"ghost"}" data-act="qk" data-id="${val}">${l}</button>`).join("")}</div><input type="hidden" id="f_k" value="${k}">`;
function moreFields(x,fold){x=x||{};const rec=S.tx.slice(-150).reverse();
  return `${fold?`<details${x.payee?" open":""}><summary>More details</summary>`:""}<div class="two"><div>${F("f_sub","Sub-category",x.sub,"text",'list="subs"')}</div><div>${F("f_payee","Paid to / from",x.payee,"text",'list="payees"')}</div></div>${F("f_tags","Tags (comma separated)",(x.tags||[]).join(", "),"text",'placeholder="qatar, family, trip"')}${S.goals.length?SEL("f_goal","Add to goal (Saved entries only)",[["","None"],...S.goals.map(g=>[g.id,g.name])],x.link&&x.link.t=="goal"?x.link.id:""):""}${F("f_note","Note (optional)",x.note)}${DL("subs",rec.map(q=>q.sub))}${DL("payees",rec.map(q=>q.payee))}${fold?"</details>":""}`}
function tForm(x){const k=x.kind;
  sheet(`<h2>Edit entry</h2>${kindSeg(k)}<div class="two"><div>${F("f_amt","Amount (account currency)",x.amt||"","number")}</div><div>${SEL("f_acc","Account",ACCS(),x.acc)}</div></div>
  <div class="two"><div>${F("f_date","Date",x.date,"date")}</div><div>${F("f_cat","Category",x.cat,"text",'list="cats"')}</div></div>${CATL()}${moreFields(x)}
  ${x.link?`<p class="note">Linked to ${linkName(x.link)}. Deleting this entry also takes the payment back there.</p>`:""}${x.rec?`<p class="note">Added by a recurring entry.</p>`:""}${stampNote(x)}${btns("saveTx",x.id,"delTx")}<div class="acts"><button class="btn ghost" data-act="repeatTx" data-id="${x.id}">Add again today</button></div>`)}
function qForm(k0,pre){const k=k0||"out",rc=[...new Set([...S.tx.filter(x=>x.kind==k&&x.cat&&!x.link).slice(-40).reverse().map(x=>x.cat),...CATS])].slice(0,8),a0=(pre&&pre.acc)||(S.cfg.last&&ac(S.cfg.last).id)||S.acc[0].id;
  sheet(`${kindSeg(k)}<input id="f_amt" class="amtbig" type="number" inputmode="decimal" step="any" placeholder="0" aria-label="Amount" value="${pre&&pre.amt||""}" style="margin:12px 0 6px;border:0;background:transparent">
  ${freqHtml(k)}<div class="chips" id="q_c">${rc.map(c=>`<button data-act="qc" data-id="${esc(c)}">${esc(c)}</button>`).join("")}</div><input id="f_cat" list="cats" placeholder="or type a category" aria-label="Category" value="${esc(pre&&pre.cat||"")}">${CATL()}
  <div class="two" style="margin-top:8px"><div>${SEL("f_acc","Account",ACCS(),a0)}</div><div>${F("f_date","Date",pre&&pre.date||today(),"date")}</div></div>${moreFields(pre||null,true)}
  <div class="acts"><button class="btn ghost sm" data-act="smsOpen">Paste bank SMS</button>${SMART.img?`<label class="btn ghost sm" style="text-align:center;cursor:pointer">📷 Receipt photo<input type="file" accept="image/*" hidden data-receipt="1"></label>`:""}</div>
  <div class="acts">${canVoice()?`<button class="btn ghost" data-act="voice">🎤 Voice</button>`:""}<button class="btn" data-act="saveTx" data-id="">Save</button></div>`);
  setTimeout(()=>{const a=$("#f_amt");a&&a.focus()},80)}
function adjForm(x){sheet(`<h2>${esc(x.cat||"Adjustment")}</h2><div class="card"><div class="hbl"><span>${fmt(x.date)} · ${esc(an(x.acc))}</span><b>${fmx(x.amt,x.cur)}</b></div>${x.note?`<small style="color:var(--mute)">${esc(x.note)}</small>`:""}</div><p class="note">This changes the account balance without counting as income or spending.${x.link?" Linked to "+linkName(x.link)+".":""}</p>${stampNote(x)}<div class="acts"><button class="btn del" data-act="delTx" data-id="${x.id}">Delete</button></div>`)}
const canVoice=()=>!inClaude()&&!!(window.SpeechRecognition||window.webkitSpeechRecognition);
function voice(){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){toast("Voice isn’t supported in this browser");return}const r=new R();r.lang="en-IN";r.onerror=()=>toast("Couldn’t hear that");
  r.onresult=e=>{const s=e.results[0][0].transcript.toLowerCase(),m=s.match(/(\d+(?:\.\d+)?)/);if(m)$("#f_amt").value=m[1];
    if(/(received|income|salary|credited|got )/.test(s))ACT.qk("in");
    const w=s.match(/(?:on|for)\s+([a-z ]+?)\s*$/),c=w?w[1].trim():"",hit=CATS.find(x=>c.includes(x.toLowerCase()))||(c?c.replace(/^./,z=>z.toUpperCase()):"");if(hit)$("#f_cat").value=hit;toast("Heard: "+s)};
  try{r.start()}catch(e){toast("Couldn’t start voice entry")}}

/* ---------- settings, backup, export ---------- */
function settings(){const cl=inClaude();
  sheet(`<h2>Settings and backup</h2><p class="sub">Your data is kept in the ${storeLabel()} on this device.${storeErr?" The last save failed: "+esc(storeErr)+".":""}</p>
  <h3>Backup</h3><div class="acts"><button class="btn ghost" data-act="safety">Data safety check</button></div><div class="acts"><button class="btn" data-act="shareBk">${cl?"Save backup file":"Share backup"}</button><button class="btn ghost" data-act="fullBk">Backup with files</button></div>
  <label for="f_rest">Restore from a backup file</label><input id="f_rest" type="file" accept=".json,application/json,text/plain" data-restore="1">
  <details><summary>Copy or paste backup text</summary><textarea id="f_bk" rows="5" aria-label="Backup text">${esc(bk())}</textarea><div class="acts"><button class="btn ghost" data-act="copy">Copy</button><button class="btn ghost" data-act="restoreText">Restore from this text</button></div></details>
  <div class="acts"><button class="btn ghost" data-act="csvOpen">Import bank statement</button><button class="btn ghost" data-act="smsOpen">Paste bank SMS</button></div>
  <div class="acts"><button class="btn ghost" data-act="snaps">Automatic backups</button><button class="btn ghost" data-act="bin">Recycle bin (${S.bin.length})</button></div>
  <h3>Export</h3><div class="acts">${cl?"":`<button class="btn ghost" data-act="ics">Calendar file</button>`}<button class="btn ghost" data-act="csv">Spending CSV</button></div>${cl?`<p class="note">For calendar reminders here, open a due date and tap Add to calendar. A calendar file for all dates is available in the installed app.</p>`:""}
  <h3>Security and sharing</h3><div class="acts"><button class="btn ghost" data-act="lock">App lock${META.enc?" (on)":""}</button>${cl?`<button class="btn ghost" data-act="cloudOpen">Claude account copy${CLS.on?" (on)":""}</button>`:`<button class="btn ghost" data-act="syncOpen">Google sync</button>`}</div>
  ${isApp()?`<h3>Phone app</h3><div class="acts"><button class="btn ghost" data-act="notifAuto">Read payment alerts (Gmail, Outlook, banks): ${S.cfg.ntfAuto?"On":"Off"}</button><button class="btn ghost" data-act="readCheck">Check SMS and alert reading</button></div><div class="acts"><button class="btn ghost" data-act="smsAuto">Read bank SMS automatically: ${S.cfg.smsAuto?"On":"Off"}</button></div><p class="note">When on, new payments wait on Home for you to approve. A backup file is saved to Downloads every week while app lock is off. To bring data from the web app, share its backup file to this app.</p>`:""}
  <h3>Reports</h3>${F("f_fixed","Fixed-cost categories (comma separated)",S.cfg.fixedCats)}<div class="acts"><button class="btn" data-act="saveCfg">Save settings</button></div>
  <p class="note">Backup files are not encrypted. Keep them somewhere safe.</p>`)}
/* hand a generated file to the person: Claude's download prompt, then the share sheet, then a browser download */
async function saveFile(name,text,mime){
  if(isApp()){try{await NP("DueNative","saveDownload",{name,text,mime});toast("Saved to Downloads/DueAndSpend");return true}catch(e){}}
  if(inClaude()){try{const dn=await claude.use("downloads");if(dn){await dn.save({filename:name,data:text});return true}}catch(e){if(e&&e.code=="declined")return false}
    try{await navigator.clipboard.writeText(text);toast("Copied instead. Paste it somewhere safe.")}catch(e){toast("Couldn’t save a file here. Use Copy under backup text.")}return false}
  const f=new File([text],name,{type:mime});
  try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:name});return true}}catch(e){if(e&&e.name=="AbortError")return false}
  try{const u=URL.createObjectURL(f),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();toast("Saving "+name+"…");return true}
  catch(e){try{await navigator.clipboard.writeText(text);toast("Copied to clipboard")}catch(x){toast("Couldn’t export here")}return false}}
function ics(){const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//DueSpend//EN"],d8=s=>s.replace(/-/g,""),nx=s=>{const e=D(s);e.setDate(e.getDate()+1);return d8(iso(e))};
  const ev=(id,t,d,rr)=>{L.push("BEGIN:VEVENT","UID:"+id+"@duespend","DTSTAMP:"+d8(today())+"T000000Z","DTSTART;VALUE=DATE:"+d8(d),"DTEND;VALUE=DATE:"+nx(d),"SUMMARY:"+String(t).replace(/[,;\r\n]/g," "));if(rr)L.push("RRULE:"+rr);L.push("BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:Due soon","TRIGGER:-P2D","END:VALARM","END:VEVENT")};
  activeDues().forEach(i=>{const s=REP[i.rep][1];ev(i.id,i.name+" ("+TYPES[i.type]+")"+(+i.amt?" "+(i.cur=="QAR"?"QAR ":"Rs ")+i.amt:""),i.date,s?(s==12?"FREQ=YEARLY":"FREQ=MONTHLY;INTERVAL="+s):"")});
  S.loans.forEach(l=>{if(l.next&&loanLeft(l))ev(l.id,"EMI: "+l.name,l.next,"FREQ=MONTHLY;COUNT="+loanLeft(l))});S.inv.forEach(x=>{if(x.mdate&&!x.closed)ev(x.id,"Matures: "+x.name,x.mdate)});
  L.push("END:VCALENDAR");return L.join("\r\n")}
function csv(){const r=[["Date","Type","Account","To account","Currency","Amount","Category","Sub-category","Paid to/from","Tags","Note","Linked to"]];
  [...S.tx].sort((a,b)=>a.date.localeCompare(b.date)).forEach(x=>r.push([x.date,KIND[x.kind]||x.kind,an(x.acc),x.kind=="tr"?an(x.to):"",x.cur||"INR",x.amt,x.cat||"",x.sub||"",x.payee||"",(x.tags||[]).join(" "),x.note||"",x.link?x.link.t:""]));
  return r.map(a=>a.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(",")).join("\n")}

/* ---------- app lock ---------- */
let lockMode="";
function lockForm(){const pf=t=>F("f_pin",t,"","password",'inputmode="numeric" maxlength="12" autocomplete="off"');
  if(useLS)return sheet(`<h2>App lock</h2><p class="sub">App lock needs the phone database, which isn’t available in this browser view.</p>`);
  sheet(`<h2>App lock</h2>`+(META.enc?`<p class="sub">App lock is on. Your data on this device is encrypted with your PIN, and the app locks when you come back after 30 seconds away.</p>${pf("Enter your PIN to change settings")}<div class="acts">${isApp()||(!inClaude()&&window.PublicKeyCredential)?`<button class="btn ghost" data-act="fpOn">Use fingerprint</button>`:""}<button class="btn del" data-act="pinOff">Turn off</button></div><p class="note">Fingerprint works when you return to the app. After the app is fully closed, enter the PIN.</p>`
  :`<p class="sub">Choose a PIN of 4 to 12 digits. Your data and attached files on this device are then encrypted with it. A forgotten PIN can’t be recovered, so keep a backup file. A longer PIN is harder to guess.</p>${pf("New PIN")}${btns("pinSet")}`))}
function showLock(mode){lockMode=mode;$("#lock").innerHTML=`<div class="lockscr"><div><h1>Personal Diary</h1><p class="sub">Enter your PIN</p><input id="f_lp" type="password" inputmode="numeric" maxlength="12" autocomplete="off" aria-label="PIN"><div class="acts"><button class="btn" data-act="unlock">Unlock</button>${(mode=="resume"&&S.cfg.cred)||nfp()?`<button class="btn ghost" data-act="fpIn">Fingerprint</button>`:""}</div><p class="note" id="lockmsg"></p></div></div>`;setTimeout(()=>{const e=$("#f_lp");e&&e.focus()},60);if(nfp())ACT.fpIn().catch(()=>{})}
const hideLock=()=>{$("#lock").innerHTML="";lockMode=""};
const b64s=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
async function enrollFP(){try{const c=await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:"Personal Diary"},user:{id:crypto.getRandomValues(new Uint8Array(16)),name:"owner",displayName:"Owner"},pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required"},timeout:60000}});S.cfg.cred=b64s(c.rawId);save();sheet("");toast("Fingerprint enabled")}catch(e){toast("Fingerprint isn’t available here")}}
async function fpUnlock(){try{await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:"public-key",id:unb64(S.cfg.cred)}],userVerification:"required",timeout:60000}});hideLock()}catch(e){toast("Fingerprint didn’t match")}}
