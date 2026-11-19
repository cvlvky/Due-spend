/* ===== actions: every button, by its data-act name ===== */
const undoDel=(id,msg)=>toast(msg||"Deleted",()=>{untrash(id);save();render()});
const ACT={
  tab(id){tab=id;render();scrollTo(0,0)},
  tip(id){toast(id)},
  undo(){const f=undoFn;undoFn=null;$("#toast").innerHTML="";if(f)f()},
  close(id,t,e){if(e.target!==t)return;attDone(false);sheet("")},
  closeX(){attDone(false);sheet("")},
  vclose(id,t,e){if(t.classList.contains("back")&&e.target!==t)return;$("#view").innerHTML=""},
  vAtt(id){return viewAtt(id)},
  rAtt(id){pend=pend.filter(a=>a.id!=id);$("#attlist").innerHTML=attList()},
  view(id){S.cfg.view=id=="QAR"?"QAR":"INR";save();render()},
  mon(id){mon=addMon(mon,+id);render()},
  theme(){S.cfg.theme=({"":"light",light:"dark",dark:""})[S.cfg.theme||""];save();render()},
  hide(){S.cfg.hide=!S.cfg.hide;save();render()},
  explain(id){const d=explainData(id);if(!d)return;
    sheet(`<h2>${esc(d.t)}</h2>${d.tot?`<div class="big" style="font-size:26px">${d.tot}</div>`:""}<p class="sub">${d.how}</p>${d.rows.length?d.rows.slice(0,200).map(r=>`<div class="row" ${r.id?`data-act="editTx" data-id="${r.id}"`:'style="cursor:default"'}><div><b>${esc(r.l)}</b>${r.s?`<small>${esc(r.s)}</small>`:""}</div><b>${r.v||""}</b></div>`).join(""):`<div class="empty">Nothing is counted here yet.</div>`}`)},

  /* due dates */
  addDate(){dForm()},
  editDate(id){dForm(S.dates.find(d=>d.id==id))},
  saveDate(id){const n=v("f_name").trim(),dt=v("f_date");if(!n||!dt)return toast("Add a name and a date");
    const old=S.dates.find(d=>d.id==id),o={...(old||{}),id:id||uid(),name:n,type:v("f_type"),date:dt,day:+dt.slice(8),amt:+v("f_amt")||0,cur:v("f_cur"),rep:v("f_rep"),no:v("f_no").trim(),pay:v("f_pay"),sa:+v("f_sa")||0,term:+v("f_term")||0,lpy:v("f_lpy"),mamt:+v("f_mamt")||0,nom:v("f_nom").trim(),att:[...pend]};
    if(old&&old.done&&old.date!=dt)o.done=false;stamp(o,old);put("dates",o);attDone(true);done()},
  delDate(id){attDone(false);trash("dates",id);done();undoDel(id,"Due date deleted")},
  paid(id){const r=payDue(id);if(!r)return;save();render();
    toast(r.nd?`${r.i.name}: next due ${fmt(r.nd)}`:"Marked done",()=>{if(r.tx){removeTx(r.tx.id);S.bin=S.bin.filter(b=>b.r.id!=r.tx.id)}else{r.i.date=r.prev.date;r.i.done=r.prev.done}save();render()})},

  /* investments */
  addInv(){iForm()},
  editInv(id){iForm(S.inv.find(x=>x.id==id))},
  saveInv(id){const n=v("f_name").trim(),amt=+v("f_inv")||0,val=+v("f_val")||0;if(!n||(!id&&!amt))return toast("Add a name and the amount invested");
    const old=S.inv.find(x=>x.id==id),o={...(old||{}),id:id||uid(),name:n,kind:v("f_kind2"),no:v("f_no").trim(),cur:old&&linked("inv",id).length?old.cur:v("f_cur"),inv:amt,val,sd:v("f_sd"),mdate:v("f_md"),rt:+v("f_rt")||0,att:[...pend]};
    if(old&&(+old.val||0)!=val)o.hist=[...(old.hist||[]),{d:today(),v:val}].slice(-36);if(old&&old.closed&&(amt||val))o.closed=false;
    const from=!old&&v("f_from");stamp(o,old);
    if(from){const A=ac(from);o.inv=0;o.val=0;put("inv",o);addTx({kind:"save",acc:A.id,amt:cv(amt,o.cur,A.cur),cur:A.cur,cat:"Investment",note:n,date:today(),link:{t:"inv",id:o.id},iv:amt});o.inv=amt;o.val=val}
    else put("inv",o);
    attDone(true);done();if(from&&bal(ac(from))<0)toast(an(from)+" balance is now below zero")},
  delInv(id){attDone(false);trash("inv",id);done();undoDel(id,"Investment deleted")},
  invAdd(id){invMoneyForm(id,"add")},
  invOut(id){invMoneyForm(id,"out")},
  saveInvMoney(id){const x=S.inv.find(q=>q.id==id),a=+v("f_amt")||0,mode=v("f_mode"),accId=v("f_acc"),dt=v("f_date")||today();if(!x||!a)return toast("Add an amount");
    if(mode=="out"&&a>invVal(x,true)+.005)return toast("That is more than the current value");
    const base={kind:mode=="add"?"save":"adj",cat:mode=="add"?"Investment":"Investment withdrawal",note:x.name,date:dt,link:{t:"inv",id},iv:a};
    if(accId){const A=ac(accId);addTx({...base,acc:A.id,amt:cv(a,x.cur,A.cur),cur:A.cur});S.cfg.last=accId}else linkApply({...base,amt:a,cur:x.cur},1);
    x.ut=Date.now();done();toast(mode=="add"?"Added to "+x.name:"Withdrawn from "+x.name)},

  /* goals */
  addGoal(){gForm()},
  editGoal(id){gForm(S.goals.find(x=>x.id==id))},
  saveGoal(id){const n=v("f_name").trim(),tg=+v("f_tg");if(!n||!tg)return toast("Add a name and a target");const old=S.goals.find(x=>x.id==id);
    put("goals",stamp({...(old||{}),id:id||uid(),name:n,target:tg,cur:old&&linked("goal",id).length?old.cur:v("f_cur"),saved:+v("f_sv")||0,date:v("f_date")},old));done()},
  delGoal(id){trash("goals",id);done();undoDel(id,"Goal deleted")},
  addGoalAmt(id){goalAddForm(id)},
  saveGoalAmt(id){const g=S.goals.find(x=>x.id==id),a=+v("f_amt")||0,accId=v("f_acc");if(!g||!a)return toast("Add an amount");
    if(accId){const A=ac(accId);addTx({kind:"save",acc:A.id,amt:cv(a,g.cur,A.cur),cur:A.cur,cat:"Goal",note:g.name,date:v("f_date")||today(),link:{t:"goal",id},gv:a});S.cfg.last=accId}else g.saved=(+g.saved||0)+a;
    g.ut=Date.now();done();if(accId&&bal(ac(accId))<0)toast(an(accId)+" balance is now below zero")},

  /* loans */
  addLoan(){lForm()},
  editLoan(id){lForm(S.loans.find(x=>x.id==id))},
  saveLoan(id){const n=v("f_name").trim(),em=+v("f_emi"),tt=+v("f_tot");if(!n||!em||!tt)return toast("Add a name, EMI and total installments");const old=S.loans.find(x=>x.id==id);
    put("loans",stamp({...(old||{}),id:id||uid(),name:n,cur:v("f_cur"),emi:em,total:tt,paid:Math.min(tt,+v("f_pd")||0),out:+v("f_out")||"",rate:+v("f_rate")||"",next:v("f_next"),acc:v("f_acc")},old));done()},
  delLoan(id){trash("loans",id);done();undoDel(id,"Loan deleted")},
  emiPaid(id){const x=payEmi(id);if(!x)return;const l=S.loans.find(q=>q.id==id);save();render();toast(loanLeft(l)?"EMI recorded":"Loan cleared",()=>{removeTx(x.id);S.bin=S.bin.filter(b=>b.r.id!=x.id);save();render()})},
  prepay(){const l=S.loans.find(x=>x.id==v("pp_loan")),ex=+v("pp_amt")||0,o=$("#pp_out");if(!l||!o)return;if(!ex){o.textContent="Enter an extra amount.";return}
    const P=loanOut(l),r=(+l.rate||0)/1200,left=loanLeft(l);if(ex>=P){o.textContent="That clears the loan now"+(r?", saving about "+fmx(Math.round(Math.max(0,left*l.emi-P)),l.cur)+" in interest.":".");return}
    if(!r){o.textContent=`Without an interest rate this is a rough count: about ${Math.floor(ex/l.emi)} fewer EMIs. Add the rate to the loan for interest savings.`;return}
    const n0=nper(P,l.emi,r),n1=nper(P-ex,l.emi,r);if(!isFinite(n0)){o.textContent="The EMI doesn’t cover the interest at this rate. Check the outstanding amount and rate.";return}
    const save_=Math.max(0,(n0*l.emi-P)-(n1*l.emi-(P-ex)));o.textContent=`Paying ${fmx(ex,l.cur)} extra now ends the loan about ${Math.max(0,Math.ceil(n0)-Math.ceil(n1))} months sooner and saves about ${fmx(Math.round(save_),l.cur)} in interest. This is an estimate; your bank’s figures may differ.`},

  /* budgets and recurring */
  addBud(){bForm()},
  editBud(id){bForm(S.bud.find(x=>x.id==id))},
  saveBud(id){const c=v("f_cat").trim(),lm=+v("f_lim");if(!c||!lm)return toast("Add a category and a limit");const old=S.bud.find(x=>x.id==id);put("bud",stamp({id:id||uid(),cat:c,lim:lm,cur:v("f_cur")},old));done()},
  delBud(id){trash("bud",id);done();undoDel(id,"Budget deleted")},
  addRec(){rForm()},
  editRec(id){rForm(S.rec.find(x=>x.id==id))},
  saveRec(id){const am=+v("f_amt"),dy=Math.min(31,Math.max(1,Math.round(+v("f_day"))||1));if(!am)return toast("Add an amount");
    const old=S.rec.find(x=>x.id==id),td=+today().slice(8),cm=today().slice(0,7);
    put("rec",stamp({id:id||uid(),kind:v("f_k"),amt:am,acc:v("f_acc"),cat:v("f_cat").trim(),note:v("f_note").trim(),day:dy,from:old?old.from:addMon(cm,dy<=td?1:0),last:old?old.last:""},old));done()},
  delRec(id){trash("rec",id);done();undoDel(id,"Recurring entry deleted")},

  /* accounts and transfers */
  addAcc(){accForm()},
  editAcc(id){accForm(S.acc.find(k=>k.id==id))},
  saveAcc(id){const n=v("f_name").trim();if(!n)return toast("Add a name");const old=S.acc.find(q=>q.id==id);
    put("acc",stamp({...(old||{}),id:id||uid(),name:n,type:v("f_type"),cur:old&&accUsed(id)?old.cur:v("f_cur"),open:+v("f_open")||0,l4:v("f_l4").replace(/\D/g,"")},old));done()},
  delAcc(id){if(accUsed(id))return toast("Delete or move this account’s entries first");trash("acc",id);done();undoDel(id,"Account deleted")},
  addMoney(id){qForm("in",{acc:id,cat:"Deposit"})},
  fixBal(id){fixForm(id)},
  saveFix(id){if(v("f_bal")==="")return toast("Enter the balance");const k=ac(id),d=+v("f_bal")-bal(k);if(Math.abs(d)>=.005)addTx({kind:"adj",acc:id,amt:d,cur:k.cur,date:today(),cat:"Balance correction",note:""});k.rcd=today();k.ut=Date.now();done()},
  okBal(id){const k=ac(id);k.rcd=today();k.ut=Date.now();done();toast("Marked as checked")},
  stmt(id){stmt(ac(id))},
  trf(){if(S.acc.length<2)return toast("Add a second account first");trForm()},
  saveTr(id){trSync(true);const old=S.tx.find(x=>x.id==id),o={...(old||{}),id:id||uid(),kind:"tr",acc:v("f_from"),to:v("f_to"),amt:+v("f_amt")||0,got:+v("f_got")||0,fee:+v("f_fee")||0,date:v("f_date")||today(),note:v("f_note").trim(),via:($("#f_via")?v("f_via").trim():(old&&old.via)||"")};
    if(!o.to||o.acc==o.to)return toast("Choose two different accounts");if(!o.amt||!o.got)return toast("Add the amounts");
    o.cur=ac(o.acc).cur;stamp(o,old);put("tx",o);S.cfg.last=o.acc;done();if(bal(ac(o.acc))<0)toast(an(o.acc)+" balance is now below zero")},

  /* entries */
  quick(){qForm()},
  addTx(){qForm()},
  editTx(id){const x=S.tx.find(q=>q.id==id);if(!x)return;attDone(false);if(x.kind=="tr")trForm(x);else if(x.kind=="adj")adjForm(x);else tForm(x)},
  qk(id){$("#f_k").value=id;$$("#q_k .btn").forEach(b=>b.classList.toggle("ghost",b.getAttribute("data-id")!=id))},
  qc(id){$("#f_cat").value=id;$$("#q_c button").forEach(b=>b.classList.toggle("on",b.getAttribute("data-id")==id))},
  voice(){voice()},
  saveTx(id){const m=+v("f_amt"),dt=v("f_date");if(!m||m<0||!dt)return toast("Add an amount and a date");
    const old=S.tx.find(y=>y.id==id),accId=v("f_acc"),A=ac(accId),kind=v("f_k");if(!A.id)return toast("Choose an account");
    const o={...(old||{}),id:id||uid(),kind,acc:accId,amt:m,cur:A.cur,fx:old&&old.cur==A.cur&&old.fx?old.fx:fx(),date:dt,cat:v("f_cat").trim(),sub:v("f_sub").trim(),payee:v("f_payee").trim(),tags:v("f_tags").split(",").map(s=>s.trim().replace(/^#/,"")).filter(Boolean),note:v("f_note").trim()};
    if($("#f_goal")&&(!o.link||o.link.t=="goal")){const g=v("f_goal");if(kind=="save"&&g)o.link={t:"goal",id:g};else delete o.link}
    delete o.gv;delete o.cap;if(old&&(old.amt!=m||old.cur!=A.cur))delete o.iv;
    if(old)linkApply(old,-1);stamp(o,old);put("tx",o);linkApply(o,1);
    mon=dt.slice(0,7);S.cfg.last=accId;done();if(kind!="in"&&bal(A)<0)toast(A.name+" balance is now below zero")},
  delTx(id){if(!removeTx(id))return;done();undoDel(id,"Entry deleted")},

  /* settings, backup, export */
  settings(){settings()},
  saveCfg(){S.cfg.fixedCats=v("f_fixed");done();toast("Settings saved")},
  copy(){const b=$("#f_bk");b.select();return (navigator.clipboard?navigator.clipboard.writeText(b.value):Promise.reject()).then(()=>toast("Copied"),()=>{try{document.execCommand("copy");toast("Copied")}catch(e){toast("Select the text and copy it")}})},
  async restoreText(){await restoreFrom(v("f_bk"));sheet("");render();toast("Restored")},
  async shareBk(){if(await saveFile("personal-diary-backup.json",bk(),"application/json")){S.cfg.lastBk=today();save()}},
  async fullBk(){toast("Preparing the backup…");const t=await bkFull();if(await saveFile("personal-diary-full-backup.json",t,"application/json")){S.cfg.lastBk=today();save()}},
  ics(){return saveFile("due-dates.ics",ics(),"text/calendar")},
  csv(){return saveFile("spending.csv",csv(),"text/csv")},
  async snaps(){if(useLS)return toast("Automatic backups need the phone database");const L=await snapList();
    sheet(`<h2>Automatic backups</h2><p class="sub">A copy is kept for each of the last 7 days you opened the app. Restoring one replaces what is on this device now.</p>${L.length?L.map(o=>`<div class="row" style="cursor:default"><div><b>${o.k=="before-restore"?"Before the last restore":/^\d{4}-/.test(o.k)?fmt(o.k):esc(o.k)}</b><small>${new Date(o.ts).toLocaleString("en-IN")}</small></div><button class="btn sm ghost" data-act="snapRestore" data-id="${esc(o.k)}">Restore</button></div>`).join(""):`<div class="empty">No copies yet. The first one is made once you have some entries.</div>`}`)},
  async snapRestore(id,t){if(t.getAttribute("data-ok")!="1"){t.setAttribute("data-ok","1");t.textContent="Tap again to confirm";return}await restoreFrom(await snapRead(id));sheet("");render();toast("Restored")},
  bin(){const nm=b=>b.r.name||b.r.cat||b.r.note||KIND[b.r.kind]||"Item",T={acc:"Account",tx:"Entry",dates:"Due date",inv:"Investment",loans:"Loan",goals:"Goal",bud:"Budget",rec:"Recurring entry",docs:"Document",subs:"Subscription",sacc:"Scheme account",tpl:"Message format",fam:"Family member",moi:"Gift",lend:"Hand loan"};
    sheet(`<h2>Recycle bin</h2><p class="sub">Deleted items stay here for 30 days.</p>${S.bin.length?[...S.bin].reverse().map(b=>`<div class="row" style="cursor:default"><div><b>${esc(nm(b))}</b><small>${T[b.c]||"Item"} · deleted ${fmt(iso(new Date(b.at)))}${+b.r.amt?" · "+fmx(b.r.amt,b.r.cur):""}</small></div><button class="btn sm ghost" data-act="binRestore" data-id="${b.r.id}">Restore</button></div>`).join("")+`<div class="acts"><button class="btn del" data-act="binEmpty">Empty the bin</button></div>`:`<div class="empty">Nothing here.</div>`}`)},
  binRestore(id){untrash(id);save();render();ACT.bin();toast("Restored")},
  binEmpty(id,t){if(t.getAttribute("data-ok")!="1"){t.setAttribute("data-ok","1");t.textContent="Tap again to delete for good";return}purgeBin(true);save();ACT.bin()},

  /* app lock */
  lock(){lockForm()},
  async pinSet(){const q=v("f_pin");if(!/^\d{4,12}$/.test(q))return toast("Use 4 to 12 digits");toast("Encrypting…");await lockOn(q);sheet("");render();toast("App lock is on. Your data is encrypted.")},
  async pinOff(){if(!(await tryPin(v("f_pin"))))return toast("Wrong PIN");await lockOff();sheet("");render();toast("App lock is off")},
  async fpOn(){if(!(await tryPin(v("f_pin"))))return toast("Enter your PIN first");return enrollFP()},
  async unlock(){const pin=v("f_lp"),msg=t=>{const e=$("#lockmsg");if(e)e.textContent=t},bad=()=>{msg("Wrong PIN");const e=$("#f_lp");if(e)e.value=""};if(!pin)return;msg("Checking…");
    if(lockMode=="legacy"){if(await sha(pin)!==S.cfg.pin)return bad();try{await lockOn(pin)}catch(e){}hideLock();start();return}
    const k=await tryPin(pin);if(!k)return bad();
    if(lockMode=="cold"){KEY=k;try{await readAll();mig()}catch(e){KEY=null;return msg("Couldn’t read your data on this device.")}hideLock();start()}else hideLock()},
  fpIn(){return fpUnlock()},

  /* Google sync (installed app) */
  syncOpen(){syncForm()},
  async syncSave(){const cfg={};[...v("f_cfg").matchAll(/(\w+)\s*:\s*["']([^"']+)["']/g)].forEach(m=>cfg[m[1]]=m[2]);const sp=v("f_sp").trim().replace(/[^\w-]/g,"");if(!cfg.apiKey||!cfg.projectId||!sp)return toast("Paste your Firebase config and a space ID");
    SY={...SY,cfg,space:sp,on:true,members:SY.members||[]};syv();toast("Saved. Now sign in with Google.");await syncStart();syncForm()},
  async syncIn(){try{await loadFB();if(!firebase.apps.length)firebase.initializeApp(SY.cfg);const pr=new firebase.auth.GoogleAuthProvider();try{await firebase.auth().signInWithPopup(pr)}catch(e){await firebase.auth().signInWithRedirect(pr)}}catch(e){toast("Sign-in isn’t available here")}},
  syncNow(){SY.dirty=true;try{if(me&&me.emailVerified)listen()}catch(e){}pushNow();toast("Syncing…")},
  syncOff(){if(unsub)unsub();try{firebase.auth().signOut()}catch(e){}SY={};syv();sset("Sync off");sheet("");render();toast("Sync is off. Your data stays on this device.")},
  async addMember(){const em=v("f_em").trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(em))return toast("Enter an email address");
    try{await fdb.collection("spaces").doc(SY.space).set({members:firebase.firestore.FieldValue.arrayUnion(em)},{merge:true});SY.members=[...new Set([...(SY.members||[]),em])];syv();syncForm();toast("Added "+em)}catch(e){toast("Couldn’t add. Sign in first; only members can invite.")}},

  /* copy in the Claude account (Claude link) */
  cloudOpen(){cloudForm()},
  cloudOn(){return cloudEnable()},
  cloudLater(){CLS.later=true;clv();render()},
  cloudNow(){return cloudCycle(true).then(()=>{cloudForm()})},
  cloudOff(){cloudDisable();sheet("");render();toast("The copy in your Claude account is no longer updated")},
  async cloudWipe(id,t){if(t.getAttribute("data-ok")!="1"){t.setAttribute("data-ok","1");t.textContent="Tap again to delete the copy";return}await cloudDelete();sheet("");render();toast("Copy deleted from your Claude account")}
};

document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-act]");if(!t)return;const a=t.getAttribute("data-act"),id=t.getAttribute("data-id")||"",f=ACT[a];if(!f)return;
  if(a!="tip"&&a!="close")try{navigator.vibrate&&navigator.vibrate(8)}catch(x){}
  try{await f(id,t,e)}catch(err){console.error(err);toast("Something went wrong: "+(err&&err.message||err))}});
document.addEventListener("change",async e=>{const t=e.target,has=k=>t.getAttribute&&t.getAttribute(k);
  try{
    if(has("data-q")){qs=t.value;render();return}
    if(has("data-trs")){trSync(false);return}
    if(has("data-fa")){S.cfg.fa=t.value;save();render();return}
    if(has("data-rate")){const r=+t.value;if(r>0){S.cfg.rate=r;S.cfg.rateAt=today();save();render()}return}
    if(has("data-file")){const fs=[...t.files];t.value="";await addFiles(fs);return}
    if(has("data-restore")){const f=t.files[0];if(!f)return;await restoreFrom(await f.text());sheet("");render();toast("Restored from "+f.name)}
  }catch(err){console.error(err);toast(String(err&&err.message||err))}});
document.addEventListener("keydown",e=>{if(e.key=="Enter"&&e.target&&e.target.id=="f_lp"){e.preventDefault();ACT.unlock().catch(()=>{})}});
/* swipe left or right to change tab */
let tx0=0,ty0=0;
document.addEventListener("touchstart",e=>{tx0=e.touches[0].clientX;ty0=e.touches[0].clientY},{passive:true});
document.addEventListener("touchend",e=>{if($("#over").innerHTML||$("#lock").innerHTML||$("#view").innerHTML)return;const dx=e.changedTouches[0].clientX-tx0,dy=e.changedTouches[0].clientY-ty0;
  if(Math.abs(dx)>90&&Math.abs(dy)<45&&!(e.target.closest&&e.target.closest("textarea,input,select,svg,table"))){const T=TABS.map(x=>x[0]),i=T.indexOf(tab)+(dx<0?1:-1);if(T[i]){tab=T[i];render();scrollTo(0,0)}}},{passive:true});
