/* ===== the Android app build: widget, reminders, bank SMS, fingerprint, backups ===== */
const isApp=()=>{try{return !!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()&&Capacitor.nativePromise)}catch(e){return false}};
const NP=(plugin,method,opts)=>window.Capacitor.nativePromise(plugin,method,opts||{});
const nfp=()=>{try{return isApp()&&localStorage.getItem("ds-nfp")=="1"}catch(e){return false}};
let nnT=null,nActs=false;
function nativeNotifyLater(){if(!isApp())return;clearTimeout(nnT);nnT=setTimeout(()=>{nativeNotify();nativeWidget()},2500)}
/* reminders: 2 days before and on the day at 9am (with Mark paid), plus a 9pm summary for the next 7 days */
async function nativeNotify(){
  try{let p=await NP("LocalNotifications","checkPermissions");if(p.display!="granted")p=await NP("LocalNotifications","requestPermissions");if(p.display!="granted")return;
    if(!nActs){nActs=true;await NP("LocalNotifications","registerActionTypes",{types:[{id:"DUE",actions:[{id:"paid",title:"Mark paid"}]}]}).catch(()=>{})}
    const pend=await NP("LocalNotifications","getPending");if(pend&&pend.notifications&&pend.notifications.length)await NP("LocalNotifications","cancel",{notifications:pend.notifications.map(n=>({id:n.id}))});
    const t=today(),now=Date.now(),N=[],secret=!!META.enc;let id=1;
    upcoming(t,plus(90),false).filter(u=>u.t=="due"||u.t=="emi"||(u.t=="fd"&&u.a)).slice(0,25).forEach(u=>[[2,"in 2 days"],[0,"today"]].forEach(([b,w])=>{const at=D(u.d);at.setDate(at.getDate()-b);at.setHours(9,0,0,0);
      if(at.getTime()>now){const n={id:id++,title:u.n+" is due "+w,body:(u.a&&!secret?fmx(u.a,u.c)+" · ":"")+fmt(u.d),schedule:{at:at.toISOString(),allowWhileIdle:true},extra:{due:(u.t=="due"&&!u.src)||u.t=="fd"?u.id:"",loan:u.t=="emi"?u.id:"",sub:u.src=="sub"?u.id:"",sch:u.src=="sch"?u.id:""}};if(u.t!="fd")if(u.a)n.actionTypeId="DUE";N.push(n)}}));
    for(let j=0;j<7;j++){const at=D(plus(j));at.setHours(21,0,0,0);if(at.getTime()<=now)continue;const tm=plus(j+1),du=upcoming(tm,tm,false).filter(u=>u.t=="due"||u.t=="emi").map(u=>u.n).slice(0,3),sp=j==0?sumV(S.tx.filter(x=>x.kind=="out"&&x.date==t)):0;
      N.push({id:9000+j,title:"Today’s summary",body:(j==0&&sp&&!secret?"Spent today: "+fm(sp)+". ":"Add today’s spending. ")+(du.length?"Due tomorrow: "+du.join(", ")+".":"Nothing is due tomorrow."),schedule:{at:at.toISOString(),allowWhileIdle:true},extra:{add:"out"}})}
    S.docs.forEach((d,i)=>{if(!d.exp)return;[[+d.rem||30,"in "+(+d.rem||30)+" days"],[7,"in 7 days"]].forEach(([b,w],j)=>{const at=D(d.exp);at.setDate(at.getDate()-b);at.setHours(9,30,0,0);if(at.getTime()>now&&N.length<50)N.push({id:7000+i*2+j,title:d.name+" expires "+w,body:(d.type||"Document")+" · "+fmt(d.exp),schedule:{at:at.toISOString(),allowWhileIdle:true}})})});
    const cm=t.slice(0,7);let seen={};try{seen=JSON.parse(localStorage.getItem("ds-balert")||"{}")}catch(e){}
    budUse(cm).forEach((u,i)=>{const k=cm+":"+u.b.id;if(u.p>=90&&!seen[k]){seen[k]=1;N.push({id:8000+i,title:"Budget: "+u.b.cat+" is at "+u.p+"%",body:fmx(u.s,u.b.cur)+" of "+fmx(u.b.lim,u.b.cur)+" used this month",schedule:{at:new Date(now+3000).toISOString()}})}});
    try{localStorage.setItem("ds-balert",JSON.stringify(seen))}catch(e){}
    if(N.length)await NP("LocalNotifications","schedule",{notifications:N.slice(0,60)})}catch(e){console.warn("reminders",e)}}
function nativeWidget(){if(!isApp())return;try{const t=today(),U=upcoming(t,plus(30),true).filter(u=>u.t=="due"||u.t=="emi"),u=U[0],sf=safeSpend(),secret=!!META.enc||!!S.cfg.hide;
  NP("DueNative","setWidget",{line1:u?u.n+" · "+when(dl(u.d))+(u.a&&!secret?" · "+fmx(u.a,u.c):""):"Nothing due in the next 30 days",line2:secret?U.length+" due in 30 days":"Safe to spend "+(sf.safe<0?"short by "+fmr(-sf.safe):fmr(sf.safe))}).catch(()=>{})}catch(e){}}
/* what the app was opened with: a widget or shortcut button, shared text, or a shared backup file */
async function nativeLaunch(n){if(!isApp())return;n=n||0;if($("#lock").innerHTML){if(n<40)setTimeout(()=>nativeLaunch(n+1),1500);return}
  try{const r=await NP("DueNative","getLaunch"),raw=r&&r.data;if(!raw)return;const o=JSON.parse(raw),txt=o.file||o.text||"";
    if(txt&&/^\s*\{/.test(txt)&&txt.includes('"due-and-spend"')){window.__dsFile=txt;sheet(`<h2>Restore this backup?</h2><p class="sub">You shared a Personal Diary backup file. Restoring replaces what is in this app now. A copy of the current data is kept under Automatic backups.</p><div class="acts"><button class="btn" data-act="fileRestore">Restore</button></div>`);return}
    if(o.text&&readSetup(o.text)){syncForm();const f=$("#f_scode");if(f)f.value=o.text.trim();return}
    if(o.text){if(!smsOpen(o.text))qForm();return}
    if(o.payid&&typeof payOpen=="function"){payOpen(o.payid);return}
    if(o.add=="sms")smsForm();else if(o.add=="voice"){qForm("out");setTimeout(()=>voice(),500)}else if(o.add=="review"){if(typeof reviewLaunch=="function")reviewLaunch();else smsReview()}else if(o.add)qForm(o.add=="in"?"in":"out")}catch(e){console.warn("launch",e)}}
window.__dsLaunch=()=>nativeLaunch();
/* phone back button: close what is open, then go Home, then leave the app */
window.__dsBack=()=>{try{if($("#lock").innerHTML)return false;if($("#view").innerHTML){$("#view").innerHTML="";return true}if($("#over").innerHTML){ACT.closeX();return true}if(tab!="home"){tab="home";render();return true}}catch(e){}return false};
/* bank SMS waiting for approval */
const SMSRE=/debit|credit|spent|withdrawn|withdrawal|received|purchase|paid|payment|deposited|refund|used|txn|transaction|approved|charged|deducted|transferred|sent|شراء|خصم|سحب|إيداع|ايداع/i;
async function smsScan(ask){if(!isApp()||!S.cfg.smsAuto)return;
  try{const since=S.cfg.smsAt||Date.now()-3*864e5,r=await NP("DueNative","readSms",{since:String(since),max:S.cfg.smsMax||150}),L=(r&&r.messages)||[];if(!L.length)return;let mx=since;const q=S.cfg.smsq=S.cfg.smsq||[];
    L.forEach(m=>{mx=Math.max(mx,+m.date||0);if(typeof smsPerson=="function"&&smsPerson(m.address,m.body))return;const why=/\botp\b|one time password|verification code/i.test(m.body||"")?"code":!SMSRE.test(m.body||"")?"nowords":null,p=why?null:parseSms(m.body);smsLog(m,why||(p?"kept":"noamt"),p);if(!p||q.some(x=>x.id==m.id))return;
      if(!p.date||Math.abs(dl(p.date))>3||!pdHasDate(m.body))p.date=iso(new Date(+m.date||Date.now()));q.push({id:m.id,from:m.address||"",body:String(m.body).slice(0,300),p,src:"s",t:+m.date||Date.now()})});
    S.cfg.smsq=q.slice(-40);S.cfg.smsAt=mx;S.cfg.smsLast=Date.now();dedupeQ();save();if(tab=="home")render()}
  catch(e){if(ask)toast("Couldn’t read messages. Allow the SMS permission in phone settings.");if(ask){S.cfg.smsAuto=false;save();render()}}}
let smsCard=()=>{const q=S.cfg.smsq||[];return q.length?`<div class="card" style="margin:0 0 12px;cursor:pointer" data-act="smsReview"><div class="hbl"><b>${q.length} ${q.length==1?"payment":"payments"} to review</b><span class="chip">Review</span></div></div>`:""};
function smsReview(){const q=S.cfg.smsq||[];sheet(`<h2>Payments to review</h2><p class="sub">Found in your bank SMS and payment alerts. Tap Add to check and save an entry, or Skip to ignore it.</p>${q.length?q.map(m=>{const A=ac(m.p.acc),dup=S.tx.some(x=>x.date==m.p.date&&Math.abs(x.amt-m.p.amt)<.005&&x.kind==m.p.kind);return `<div class="card" style="margin-bottom:8px"><div class="hbl"><b>${m.p.kind=="in"?"+":"−"}${fmx(m.p.amt,m.p.cur||A.cur)}${m.p.payee?" · "+esc(m.p.payee):""}</b><span class="note">${fmt(m.p.date)}</span></div><small style="color:var(--mute)">${m.from?"<b>"+esc(m.from)+":</b> ":""}${esc(m.body)}</small>${dup?`<p class="note" style="color:var(--soon)">An entry with this date and amount already exists.</p>`:""}<div class="acts"><button class="btn sm" data-act="smsAdd" data-id="${esc(m.id)}">Add</button><button class="btn sm ghost" data-act="smsSkip" data-id="${esc(m.id)}">Skip</button></div></div>`}).join("")+`<div class="acts"><button class="btn ghost" data-act="smsSkipAll">Skip all</button></div>`:`<div class="empty">No messages waiting.</div>`}`)}
async function nativeBackup(){if(!isApp()||META.enc||!hasData()||(S.cfg.autoBk&&dl(S.cfg.autoBk)>-7))return;
  try{await NP("DueNative","saveDownload",{name:"personal-diary-backup-"+today()+".json",text:bk()});S.cfg.autoBk=today();S.cfg.lastBk=today();save()}catch(e){}}
function nativeStart(){if(!isApp())return;
  try{window.Capacitor.addListener("LocalNotifications","localNotificationActionPerformed",ev=>{try{const x=(ev.notification&&ev.notification.extra)||{};
    if(ev.actionId=="paid"){if(x.due){const r=payDue(x.due);if(r){save();render();toast(r.i.name+" marked paid")}}else if(x.loan){if(payEmi(x.loan)){save();render();toast("EMI recorded")}}else if(x.sub){const r=renewSub(x.sub);if(r){save();render();toast(r.x.name+" renewal recorded")}}else if(x.sch){const a=S.sacc.find(q=>q.id==x.sch);if(a&&planAmt(a)){saDeposit(a.id,planAmt(a),today(),a.pay||"");save();render();toast(a.name+" deposit recorded")}}}
    else if(x.add&&!$("#lock").innerHTML)qForm("out")}catch(e){console.warn(e)}})}catch(e){}
  nativeNotifyLater();nativeLaunch();smsScan();notifScan()}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&isApp()){nativeLaunch();smsScan();notifScan();setTimeout(clipCheck,600)}});
{const oldFpOn=ACT.fpOn,oldFpIn=ACT.fpIn,oldPinOff=ACT.pinOff;
Object.assign(ACT,{
  async fpOn(){if(!isApp())return oldFpOn();const pin=v("f_pin");if(!(await tryPin(pin)))return toast("Enter your PIN first");
    try{const c=await NP("DueNative","canAuth");if(!c.ok)return toast("Set up a fingerprint in your phone settings first");await NP("DueNative","auth",{});await NP("DueNative","setPin",{pin});localStorage.setItem("ds-nfp","1");sheet("");toast("Fingerprint unlock is on")}catch(e){toast("Fingerprint wasn’t confirmed")}},
  async fpIn(){if(!nfp())return oldFpIn();try{const r=await NP("DueNative","auth",{});if(r&&r.pin){const e=$("#f_lp");if(e){e.value=r.pin;await ACT.unlock()}}}catch(e){}},
  async pinOff(){await oldPinOff();if(isApp()&&!META.enc){try{await NP("DueNative","setPin",{pin:""});localStorage.removeItem("ds-nfp")}catch(e){}}},
  async smsAuto(){S.cfg.smsAuto=!S.cfg.smsAuto;if(S.cfg.smsAuto&&!S.cfg.smsAt)S.cfg.smsAt=Date.now()-3*864e5;save();settings();if(S.cfg.smsAuto){await smsScan(true);if(S.cfg.smsAuto)toast("New bank messages will wait on Home")}},
  smsReview(){smsReview()},
  smsAdd(id){const q=S.cfg.smsq||[],m=q.find(x=>String(x.id)==id);if(!m)return;S.cfg.smsq=q.filter(x=>x!==m);save();render();qForm(m.p.kind,{...m.p,cat:m.p.cat||catFor(m.p.payee)})},
  smsSkip(id){S.cfg.smsq=(S.cfg.smsq||[]).filter(x=>String(x.id)!=id);save();render();smsReview()},
  smsSkipAll(){S.cfg.smsq=[];save();sheet("");render()},
  async fileRestore(){const t=window.__dsFile;window.__dsFile="";if(!t)return;await restoreFrom(t);sheet("");render();toast("Restored")}
})}
