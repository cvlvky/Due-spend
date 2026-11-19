/* ===== subscriptions tracker and fuller documents ===== */
const SUBCAT=["OTT and streaming","Music","Mobile and internet","Software and cloud","News and magazines","Gym and fitness","Gaming","Other"];
const CYC={monthly:["Every month",1],quarterly:["Every 3 months",3],half:["Every 6 months",6],yearly:["Every year",12],once:["One time",0]};
const subAct=()=>S.subs.filter(x=>!x.cancelled);
const subMon=x=>{const c=CYC[x.cyc]||CYC.monthly;return c[1]?iv(+x.price||0,x.cur)/c[1]:0};
const subPaid=x=>sumV(linked("sub",x.id))+(x.paidStart?iv(+x.price||0,x.cur):0);
const subIcon=x=>{const n=(x.name+" "+(x.cat||"")).toLowerCase();return /netflix|prime|hotstar|disney|osn|shahid|youtube|zee|sony|jio|ott|stream/.test(n)?"🎬":/spotify|anghami|music|gaana|wynk|apple music/.test(n)?"🎵":/ooredoo|vodafone|airtel|mobile|internet|broadband|fiber/.test(n)?"📶":/icloud|google one|drive|office|microsoft|adobe|software|cloud|chatgpt|claude/.test(n)?"☁️":/gym|fitness/.test(n)?"🏋️":/news|times|hindu|magazine/.test(n)?"📰":/game|playstation|xbox/.test(n)?"🎮":"🔁"};
/* renewal dates in a range: the end date and, for auto-renewing plans, every cycle after it */
function subOcc(x,from,to){const st=(CYC[x.cyc]||CYC.monthly)[1],out=[];if(!x.end)return out;let d=x.end;for(let k=0;k<400&&d<=to;k++){if(d>=from)out.push(d);if(!st||!x.auto)break;d=addM(x.end,st*(k+1))}return out}
{const _up=upcoming;upcoming=function(from,to,inc){const L=_up(from,to,inc);
  subAct().forEach(x=>{const f=inc&&x.end&&x.end<from?x.end:from;subOcc(x,f,to).forEach(d=>L.push({d,n:(x.auto?"":"Ends: ")+x.name,t:"due",src:"sub",a:x.auto?+x.price||0:0,c:x.cur,id:x.id}))});
  return L.sort((a,b)=>a.d.localeCompare(b.d))}}
/* a renewal payment moves the plan on one cycle; deleting the payment moves it back */
{const _la=linkApply;linkApply=function(x,s){if(!x.link||x.link.t!="sub")return _la(x,s);const p=S.subs.find(q=>q.id==x.link.id);if(!p)return;p.ut=Date.now();
  if(s>0){p.start=x.ns||p.start;p.end=x.ne||p.end;p.cancelled=false}else{if(x.ps!==undefined)p.start=x.ps;if(x.pe!==undefined)p.end=x.pe}}}
function renewSub(id,pay){const x=S.subs.find(q=>q.id==id);if(!x)return null;const st=(CYC[x.cyc]||CYC.monthly)[1],base=x.end||today(),ne=st?addM(base,st):"";
  const pa=payAcc(x.pay,x.cur),o={kind:"out",acc:pa.id,amt:cv(+x.price||0,x.cur,pa.cur),cur:pa.cur,cat:"Subscription",sub:x.cat||"",payee:x.name,note:x.plan||"",date:today(),link:{t:"sub",id},ps:x.start||"",pe:x.end||"",ns:base,ne};
  if(pay===false||!+x.price){x.start=base;x.end=ne;x.ut=Date.now();return {x,ne}}return {x,ne,tx:addTx(o)}}
function subsHtml(){const A=subAct(),C=S.subs.filter(x=>x.cancelled),mo=A.reduce((s,x)=>s+subMon(x),0),by={};A.forEach(x=>{const k=x.cat||"Other";by[k]=(by[k]||0)+subMon(x)*12});
  const card=x=>{const n=x.end?dl(x.end):null,c=CYC[x.cyc]||CYC.monthly,paid=subPaid(x);return `<div class="card sub ${x.cancelled?"":n!==null&&n<0?"late":n!==null&&n<=7?"soon":""}" style="margin-bottom:8px"><div style="display:flex;gap:10px;align-items:flex-start;cursor:pointer" data-act="editSub" data-id="${x.id}"><span class="ci">${subIcon(x)}</span><div style="flex:1;min-width:0"><div class="hbl"><b>${esc(x.name)}</b><b>${fmx(+x.price||0,x.cur)}<small style="color:var(--mute);font-weight:400">${c[1]?" / "+(c[1]==1?"month":c[1]==12?"year":c[1]+" months"):" once"}</small></b></div>
    <small style="color:var(--mute);display:block">${esc(x.cat||"Other")}${x.plan?" · "+esc(x.plan):""}${x.start?" · from "+fmt(x.start):""}${x.end?" · "+(x.cancelled?"ended ":x.auto?"renews ":"ends ")+fmt(x.end):""}</small>
    <small style="color:var(--mute);display:block">${paid?"Paid so far "+fmr(paid):"No payments recorded"}${c[1]?" · about "+fm(subMon(x)*12)+" a year":""}</small></div>${x.cancelled?`<span class="chip">Cancelled</span>`:n!==null?`<span class="chip">${n<0?(x.auto?"Due":"Ended"):when(n)}</span>`:""}</div>
    ${x.cancelled?"":`<div class="acts">${c[1]?`<button class="btn sm" data-act="subRenew" data-id="${x.id}">${x.auto?"Paid renewal":"Renew"}</button>`:""}<button class="btn sm ghost" data-act="subCancel" data-id="${x.id}">Cancel</button></div>`}</div>`};
  return `<div class="hero" style="margin-bottom:10px"><small>Active subscriptions</small><div class="big">${fm(mo)}<span style="font-size:15px;font-weight:600"> / month</span></div><small>${A.length} active · about ${fmr(mo*12)} a year</small></div>
  <div class="acts" style="margin:0 0 10px"><button class="btn" data-act="addSub">+ Add subscription</button></div>
  ${A.length?A.sort((a,b)=>(a.end||"9999").localeCompare(b.end||"9999")).map(card).join(""):`<div class="empty">Add Netflix, Prime, Spotify, mobile plans, iCloud and the like. You get a reminder before each renewal or end date.</div>`}
  ${Object.keys(by).length>1?`<h2>Yearly cost by type</h2><div class="card">${hbars(Object.entries(by).sort((a,b)=>b[1]-a[1]),fmr)}</div>`:""}
  ${C.length?`<details><summary>Cancelled (${C.length})</summary>${C.map(card).join("")}</details>`:""}`}
function subForm(x){attInit(x&&x.att);x=x||null;const g=k=>x?x[k]:"";
  sheet(`<h2>${x?"Edit subscription":"New subscription"}</h2>${F("f_name","Name",g("name"),"text",'placeholder="Netflix, Spotify, Ooredoo"')}
  <div class="two"><div>${SEL("f_cat","Type",SUBCAT.map(c=>[c,c]),x?x.cat:"OTT and streaming")}</div><div>${F("f_plan","Plan (optional)",g("plan"),"text",'placeholder="Premium 4K"')}</div></div>
  <div class="two"><div>${F("f_price","Price paid",g("price")||"","number")}</div><div>${SEL("f_cur","Currency",CURS,x?x.cur:"QAR")}</div></div>
  <div class="two"><div>${SEL("f_cyc","Billing",Object.entries(CYC).map(([k,c])=>[k,c[0]]),x?x.cyc:"monthly")}</div><div>${SEL("f_auto","Renews by itself?",[["1","Yes"],["0","No, it just ends"]],x?(x.auto?"1":"0"):"1")}</div></div>
  <div class="two"><div>${F("f_start","Start date",x?x.start:today(),"date")}</div><div>${F("f_end","End or next renewal",g("end"),"date")}</div></div>
  ${SEL("f_pay","Paid from",[["","Last used account"],...ACCS()],g("pay")||"")}
  ${x?"":SEL("f_rec","Record this payment now?",[["0","No, already in my entries"],["1","Yes, add it as spent on the start date"]],"0")}
  ${F("f_note","Note (optional)",g("note"),"text",'placeholder="Shared with family, login email…"')}${attHtml()}
  ${x?histHtml("sub",x.id):""}<p class="note">If you leave the end date empty, it is worked out from the start date and billing.</p>${stampNote(x)}${btns("saveSub",x&&x.id,"delSub")}`)}

/* documents with issue and expiry dates, fee paid and renewal history */
const DOCT2=["Passport","Visa","Qatar ID (QID)","Residence permit","Driving licence","Vehicle registration (Istimara)","Health card","Insurance card","Aadhaar / PAN","Warranty","Bill or receipt","Other"];
const docSpan=d=>{if(!d.issue||!d.exp)return "";const m=Math.round((D(d.exp)-D(d.issue))/2629800000);return m>=12&&m%12==0?m/12+(m==12?" year":" years"):m+(m==1?" month":" months")};
function docsView(){const L=[...S.docs].sort((a,b)=>(a.exp||"9999").localeCompare(b.exp||"9999")),soon=L.filter(d=>d.exp&&dl(d.exp)<=(+d.rem||30)).length,fees=L.reduce((s,d)=>s+iv(+d.fee||0,d.cur),0);
  return `<div class="stats" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:10px">${tile("Documents",L.length)}${tile("Expiring soon",soon)}${tile("Fees paid",fmr(fees))}</div><div class="acts" style="margin:0 0 10px"><button class="btn" data-act="addDoc">+ Add document</button></div>`+
  (L.length?L.map(d=>{const n=d.exp?dl(d.exp):null,lim=+d.rem||30;return `<div class="card ${n===null?"":n<0?"late":n<=lim?"soon":""}" style="margin-bottom:8px;cursor:pointer" data-act="editDoc" data-id="${d.id}"><div class="hbl"><b>${esc(d.name)}</b>${n===null?"":`<span class="chip">${n<0?"Expired":n>lim?"Valid":when(n)}</span>`}</div>
    <small style="color:var(--mute);display:block">${esc(d.type||"Document")}${d.holder?" · "+esc(d.holder):""}${d.no?" · "+esc(d.no):""}${d.by?" · "+esc(d.by):""}</small>
    <small style="color:var(--mute);display:block">${d.issue?"Issued "+fmt(d.issue):""}${d.issue&&d.exp?" → ":""}${d.exp?"expires "+fmt(d.exp):""}${docSpan(d)?" ("+docSpan(d)+")":""}${+d.fee?" · paid "+fmx(d.fee,d.cur):""}${d.att&&d.att.length?" · "+d.att.length+(d.att.length==1?" file":" files"):""}</small>
    ${d.hist&&d.hist.length?`<small style="color:var(--mute);display:block">Renewed ${d.hist.length} ${d.hist.length==1?"time":"times"} · total fees ${fm(d.hist.reduce((s,h)=>s+iv(+h.fee||0,h.cur),0)+iv(+d.fee||0,d.cur))}</small>`:""}</div>`}).join(""):`<div class="empty">Keep your passport, visa, QID, licence, warranties and bills here, with issue and expiry dates, the fee paid and a reminder before they expire.</div>`)}
docForm=function(d){attInit(d&&d.att);d=d||null;const g=k=>d?d[k]:"";
  sheet(`<h2>${d?"Edit document":"New document"}</h2>${F("f_name","Name",g("name"),"text",'placeholder="My visa, wife’s passport"')}
  <div class="two"><div>${SEL("f_type","Type",[...new Set([...DOCT2,...(d&&d.type?[d.type]:[])])].map(x=>[x,x]),d?d.type:"Passport")}</div><div>${F("f_holder","Holder",g("holder"),"text",'placeholder="Name"')}</div></div>
  <div class="two"><div>${F("f_no","Number",g("no"))}</div><div>${F("f_by","Issued by / country",g("by"),"text",'placeholder="Qatar MOI, India"')}</div></div>
  <div class="two"><div>${F("f_issue","Issue or start date",g("issue"),"date")}</div><div>${F("f_exp","Expiry or end date",g("exp"),"date")}</div></div>
  <div class="two"><div>${F("f_fee","Fee or price paid",g("fee")||"","number")}</div><div>${SEL("f_cur","Currency",CURS,d?d.cur||"QAR":"QAR")}</div></div>
  ${SEL("f_rem","Remind me before expiry",[["30","30 days"],["60","60 days"],["90","90 days"],["15","15 days"]],String(d&&d.rem||30))}
  ${d?"":SEL("f_rec","Record the fee as spent?",[["","No"],...ACCS().map(([k,l])=>[k,"Yes, from "+l])],"")}
  ${F("f_note","Note (optional)",g("note"))}${attHtml()}
  ${d&&d.hist&&d.hist.length?`<details><summary>Earlier periods (${d.hist.length})</summary>${d.hist.slice().reverse().map(h=>`<div class="hbl" style="margin:6px 0"><span>${h.issue?fmt(h.issue):"?"} → ${h.exp?fmt(h.exp):"?"}</span><b>${+h.fee?fmx(h.fee,h.cur):""}</b></div>`).join("")}</details>`:""}
  ${stampNote(d)}<div class="acts"><button class="btn" data-act="saveDoc" data-id="${d?d.id:""}">Save</button>${d?`<button class="btn ghost" data-act="docRenew" data-id="${d.id}">Renewed</button><button class="btn del" data-act="delDoc" data-id="${d.id}">Delete</button>`:""}</div>`)};
function docRenewForm(id){const d=S.docs.find(x=>x.id==id);if(!d)return;const yrs=docSpan(d);
  sheet(`<h2>Renewed: ${esc(d.name)}</h2><p class="sub">The current period (${d.issue?fmt(d.issue):"?"} → ${d.exp?fmt(d.exp):"?"}) is kept in the history.</p><div class="two"><div>${F("f_issue","New issue date",today(),"date")}</div><div>${F("f_exp","New expiry date",d.issue&&d.exp?addM(today(),Math.round((D(d.exp)-D(d.issue))/2629800000)):"","date")}</div></div>
  <div class="two"><div>${F("f_fee","Fee paid",d.fee||"","number")}</div><div>${SEL("f_cur","Currency",CURS,d.cur||"QAR")}</div></div>${F("f_no","New number (if it changed)",d.no)}${SEL("f_rec","Record the fee as spent?",[["","No"],...ACCS().map(([k,l])=>[k,"Yes, from "+l])],"")}${yrs?`<p class="note">The expiry is suggested from the last period of ${yrs}.</p>`:""}${btns("saveDocRenew",id)}`)}

{const _vD=vDates;let dview="dues";
vDates=function(){const seg=`<div class="seg" style="margin:0 0 12px">${[["dues","Dues"],["subs","Subscriptions"],["docs","Documents"]].map(([k,l])=>`<button class="btn sm ${dview==k?"":"ghost"}" data-act="dview" data-id="${k}">${l}</button>`).join("")}</div>`;
  return dview=="subs"?`<h1>Subscriptions</h1><p class="sub">OTT, music, mobile plans and other subscriptions. Tap one to edit it.</p>${seg}${subsHtml()}`:dview=="docs"?`<h1>Documents</h1><p class="sub">Passport, visa, QID, licences, warranties and bills. Tap one to edit it.</p>${seg}${docsView()}`:_vD().replace("</p>","</p>"+seg)};
ACT.dview=id=>{dview=id;render();scrollTo(0,0)};
ACT.showSubs=()=>{dview="subs";tab="dates";render();scrollTo(0,0)};ACT.showDocs=()=>{dview="docs";tab="dates";render();scrollTo(0,0)}}

Object.assign(ACT,{
  addSub(){subForm()},
  editSub(id){subForm(S.subs.find(x=>x.id==id))},
  saveSub(id){const n=v("f_name").trim(),pr=+v("f_price")||0;if(!n)return toast("Add a name");const old=S.subs.find(x=>x.id==id),cyc=v("f_cyc"),st=CYC[cyc][1],start=v("f_start");
    let end=v("f_end");if(!end&&start&&st){end=addM(start,st);while(end<today()&&v("f_auto")=="1")end=addM(end,st)}
    const o=stamp({...(old||{}),id:id||uid(),name:n,cat:v("f_cat"),plan:v("f_plan").trim(),price:pr,cur:v("f_cur"),cyc,auto:v("f_auto")=="1",start,end,pay:v("f_pay"),note:v("f_note").trim(),att:[...pend]},old);put("subs",o);
    if(!old&&v("f_rec")=="1"&&pr){const pa=payAcc(o.pay,o.cur);addTx({kind:"out",acc:pa.id,amt:cv(pr,o.cur,pa.cur),cur:pa.cur,cat:"Subscription",sub:o.cat,payee:n,note:o.plan,date:start||today(),link:{t:"sub",id:o.id},ps:o.start,pe:o.end,ns:o.start,ne:o.end})}
    attDone(true);done()},
  delSub(id){attDone(false);trash("subs",id);done();undoDel(id,"Subscription deleted")},
  subRenew(id){const r=renewSub(id);if(!r)return;save();render();toast(r.x.name+(r.ne?": next "+(r.x.auto?"renewal ":"end ")+fmt(r.ne):" renewed"),()=>{if(r.tx){removeTx(r.tx.id);S.bin=S.bin.filter(b=>b.r.id!=r.tx.id)}save();render()})},
  subCancel(id,t){const x=S.subs.find(q=>q.id==id);if(!x)return;if(t.getAttribute("data-ok")!="1"){t.setAttribute("data-ok","1");t.textContent="Tap again to cancel";return}
    const prev={c:x.cancelled,e:x.end};x.cancelled=true;if(!x.end||x.end>today())x.end=x.end||today();x.ut=Date.now();save();render();toast(x.name+" marked cancelled",()=>{x.cancelled=prev.c;x.end=prev.e;x.ut=Date.now();save();render()})},
  saveDoc(id){const n=v("f_name").trim();if(!n)return toast("Add a name");const old=S.docs.find(d=>d.id==id),fee=+v("f_fee")||0;
    const o=stamp({...(old||{}),id:id||uid(),name:n,type:v("f_type"),holder:v("f_holder").trim(),no:v("f_no").trim(),by:v("f_by").trim(),issue:v("f_issue"),exp:v("f_exp"),fee,cur:v("f_cur"),rem:+v("f_rem")||30,note:v("f_note").trim(),att:[...pend]},old);put("docs",o);
    const ra=!old&&v("f_rec");if(ra&&fee){const A=ac(ra);addTx({kind:"out",acc:A.id,amt:cv(fee,o.cur,A.cur),cur:A.cur,cat:"Documents",sub:o.type,payee:o.by||"",note:n,date:o.issue||today()});S.cfg.last=ra}
    attDone(true);done()},
  docRenew(id){attDone(false);docRenewForm(id)},
  saveDocRenew(id){const d=S.docs.find(x=>x.id==id);if(!d)return;const ex=v("f_exp");if(!ex)return toast("Add the new expiry date");const fee=+v("f_fee")||0,cur=v("f_cur"),ra=v("f_rec");
    d.hist=[...(d.hist||[]),{issue:d.issue||"",exp:d.exp||"",fee:+d.fee||0,cur:d.cur||"QAR",no:d.no||""}].slice(-20);d.issue=v("f_issue");d.exp=ex;d.fee=fee;d.cur=cur;if(v("f_no").trim())d.no=v("f_no").trim();d.ut=Date.now();
    if(ra&&fee){const A=ac(ra);addTx({kind:"out",acc:A.id,amt:cv(fee,cur,A.cur),cur:A.cur,cat:"Documents",sub:d.type,payee:d.by||"",note:d.name+" renewal",date:d.issue||today()});S.cfg.last=ra}
    done();toast(d.name+": valid until "+fmt(ex))}
});
