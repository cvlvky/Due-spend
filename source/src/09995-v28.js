/* ===== Version 28: receipts, shared expenses, grace periods, tax pack, spending alerts, more Tamil, speed ===== */

/* ---------- speed: balances are worked out once per change, not on every row ---------- */
{const _bal=bal;let BC=new Map(),BK="";
  const key=()=>S.tx.length+"|"+(S.tx.length?(S.tx[S.tx.length-1].id+(S.tx[S.tx.length-1].u||"")):"")+"|"+S.acc.length;
  bal=function(k){if(!k||!k.id)return _bal(k);const kk=key();if(kk!==BK){BC=new Map();BK=kk}const c=BC.get(k.id);if(c&&c.o===k.open)return c.b;const b=_bal(k);BC.set(k.id,{b,o:k.open});return b};
  window.balReset=()=>{BC=new Map();BK=""}}
{const _sv=save;save=function(...a){balReset();return _sv(...a)}}
{const _pu=put;put=function(...a){balReset();return _pu(...a)}}
{const _rn=renderNow;renderNow=function(...a){balReset();return _rn(...a)}}

/* ---------- receipt photos on expenses ---------- */
async function shrinkImg(f){if(!/^image\/(jpeg|png|webp)/.test(f.type)||f.size<350000)return f;
  try{const url=URL.createObjectURL(f),img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url}),s=Math.min(1,1600/Math.max(img.width,img.height)),c=document.createElement("canvas");
    c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
    const b=await new Promise(ok=>c.toBlob(ok,"image/jpeg",0.72));if(!b||b.size>=f.size)return f;return new File([b],f.name.replace(/\.\w+$/,"")+".jpg",{type:"image/jpeg"})}catch(e){return f}}
{const _af=addFiles;addFiles=async function(fs){const out=[];for(const f of fs)out.push(await shrinkImg(f));return _af(out)}}
function rcptHtml(){return `<div class="rcpt"><div id="attlist">${attList()}</div><label class="btn ghost sm" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer">📷 Receipt photo<input id="f_file" type="file" accept="image/*,application/pdf" capture="environment" data-file="1" style="display:none"></label></div>`}
/* shared expenses: who paid, split half each */
const famPair=()=>S.fam.length>=2?[S.fam[0],S.fam[1]]:null;
function splitHtml(x){const P=famPair();if(!P)return "";x=x||{};
  return `<div class="two"><div>${SEL("f_by","Paid by",[["","—"],...S.fam.map(m=>[m.id,m.name])],x.pb||S.cfg.mePb||"")}</div><div><label style="display:flex;gap:8px;align-items:center;margin-top:26px"><input type="checkbox" id="f_sh" ${x.shared?"checked":""} style="width:auto"> Shared, half each</label></div></div>`}
function txExtras(x){const b=$('#over [data-act="saveTx"]'),box=b&&b.closest(".acts");if(!box||$("#over .rcpt"))return;const k=v("f_k")||(x&&x.kind)||"out";
  attInit(x&&x.att);box.insertAdjacentHTML("beforebegin",(k=="out"?splitHtml(x):"")+rcptHtml())}
{const _q=qForm;qForm=function(...a){const r=_q(...a);try{txExtras(null)}catch(e){console.warn(e)}return r}}
{const _t=tForm;tForm=function(x,...a){const r=_t(x,...a);try{txExtras(x)}catch(e){console.warn(e)}return r}}
{const _s=ACT.saveTx;ACT.saveTx=function(id,...a){const had=!!$("#over .rcpt"),ex=had?{att:[...pend],pb:$("#f_by")?v("f_by"):undefined,shared:$("#f_sh")?$("#f_sh").checked:undefined}:null,before=new Set(S.tx.map(t=>t.id));
  const r=_s.call(this,id,...a);
  if(ex){const t=id?S.tx.find(q=>q.id==id):S.tx.find(q=>!before.has(q.id));
    if(t){const o={...t};if(ex.att.length||t.att)o.att=ex.att;if(ex.pb!==undefined){o.pb=ex.pb||"";if(ex.pb)S.cfg.mePb=ex.pb}if(ex.shared!==undefined)o.shared=!!ex.shared;
      if(JSON.stringify(o)!==JSON.stringify(t)){put("tx",stamp(o,t));save();render()}attDone(true)}}
  return r}}

/* who owes whom this month */
function splitMonth(m){const P=famPair();if(!P)return null;const T=S.tx.filter(x=>x.shared&&x.kind=="out"&&x.date.startsWith(m)&&x.pb),paid={};P.forEach(p=>paid[p.id]=0);
  T.forEach(x=>{if(paid[x.pb]!=null)paid[x.pb]+=ca(x)});const a=P[0],b=P[1],d=(paid[a.id]-paid[b.id])/2;const st=(S.cfg.settled||{})[m];
  return {T,P,paid,owe:d>0?{from:b,to:a,amt:d}:d<0?{from:a,to:b,amt:-d}:null,settled:st}}
function splitHtmlFam(){const P=famPair(),m=S.cfg.splitM||today().slice(0,7);if(!P)return `<div class="empty">Add two people under People first (for example you and your wife). Then mark expenses as shared when you add them.</div>`;
  const R=splitMonth(m),[y,mo]=m.split("-");const pm=addMon(m,-1),nm=addMon(m,1);
  return `<div class="hbl" style="margin:4px 0 10px"><button class="btn sm ghost" data-act="splitM" data-id="${pm}">‹</button><b>${mlong(m)}</b><button class="btn sm ghost" data-act="splitM" data-id="${nm}" ${nm>today().slice(0,7)?"disabled":""}>›</button></div>
  <div class="card"><div class="mini3"><div><small>${esc(P[0].name)} paid</small><b>${fmr(R.paid[P[0].id])}</b></div><div><small>${esc(P[1].name)} paid</small><b>${fmr(R.paid[P[1].id])}</b></div><div><small>Shared total</small><b>${fmr(R.paid[P[0].id]+R.paid[P[1].id])}</b></div></div>
  <p style="margin:10px 0 0;font-weight:600">${R.owe?`${esc(R.owe.from.name)} owes ${esc(R.owe.to.name)} ${fmr(R.owe.amt)}`:"All even this month"}${R.settled?` <span class="note">· settled ${fmt(R.settled)}</span>`:""}</p>
  ${R.owe?`<div class="acts">${R.settled?`<button class="btn ghost sm" data-act="splitUnsettle" data-id="${m}">Undo settled</button>`:`<button class="btn sm" data-act="splitSettle" data-id="${m}">Mark settled</button>`}<button class="btn ghost sm" data-act="splitShare" data-id="${m}">Share on WhatsApp</button></div>`:""}</div>
  <h2>Shared expenses (${R.T.length})</h2>${R.T.length?R.T.sort((a,b)=>b.date.localeCompare(a.date)).map(x=>txRow(x)).join(""):`<div class="empty">No shared expenses this month. When adding an expense, choose who paid and tick “Shared, half each”.</div>`}`}
{const _vf=vFam;vFam=function(...a){let h=_vf(...a);const seg=S.cfg.famSeg||"people";
  h=h.replace(`data-id="ep">Emergency pack</button>`,`data-id="ep">Emergency pack</button><button class="btn sm ${seg=="split"?"":"ghost"}" data-act="famSeg" data-id="split">Shared costs</button>`);
  if(seg=="split"){const mk='<div style="height:10px"></div>',cut=h.indexOf(mk);h=(cut>0?h.slice(0,cut+mk.length):h)+splitHtmlFam()}return h}}

/* ---------- insurance grace period ---------- */
function graceLeft(d){if(!d||d.type!="premium"||!d.date||d.date>=today())return null;const g=d.rep=="monthly"?15:30;return g-(-dl(d.date))}
{const _ti=todoItems;todoItems=function(){const L=_ti();
  S.dates.forEach(d=>{const g=graceLeft(d);if(g==null)return;const it=L.find(x=>x.id==d.id);const txt=g>0?"grace period ends "+when(g):"grace period over: the policy may lapse";
    if(it){it.sub=(it.sub?it.sub+" · ":"")+txt;it.tone="late";if(g<=0)it.k=Math.min(it.k,-1800)}else L.push({k:g<=0?-1800:-1400,ic:"🛡️",tx:d.name+" premium unpaid",sub:txt,act:"editDate",id:d.id,tone:"late"})});
  /* spending alerts */
  spikes().slice(0,2).forEach(s=>L.push({k:-300,ic:"📈",tx:s.cat+": "+s.p+"% more than usual this week",sub:fmr(s.now)+" in 7 days, usually about "+fmr(s.avg),act:"spikeView",id:s.cat,tone:"soon"}));
  return L.sort((a,b)=>a.k-b.k)}}
/* grace reminders on the phone */
{const _nn=nativeNotify;nativeNotify=async function(...a){const r=await _nn(...a);try{if(!isApp())return r;const N=[],now=Date.now();
  S.dates.filter(d=>d.type=="premium"&&d.date).slice(0,30).forEach((d,i)=>{const g=d.rep=="monthly"?15:30,at=D(d.date);at.setDate(at.getDate()+g-5);at.setHours(9,30,0,0);if(at.getTime()>now)N.push({id:6200+i,title:d.name+": grace period ends in 5 days",body:"Pay the premium so the policy doesn’t lapse.",actionTypeId:"DUE",extra:{due:d.id,loan:"",sub:"",sch:""},schedule:{at:at.toISOString(),allowWhileIdle:true}})});
  if(N.length)await NP("LocalNotifications","schedule",{notifications:N})}catch(e){console.warn("grace reminders",e)}return r}}

/* ---------- spending alerts: this week vs the usual week ---------- */
function spikes(){if(S.cfg.noSpike)return [];const t=today(),w0=plus(-6),from=plus(-62),C={},B={};
  S.tx.forEach(x=>{if(x.kind!="out"||x.date>t||x.date<from||!x.cat)return;const a=ca(x);if(x.date>=w0)C[x.cat]=(C[x.cat]||0)+a;else B[x.cat]=(B[x.cat]||0)+a});
  const mute=S.cfg.spikeMute||{};return Object.entries(C).map(([cat,now])=>{const avg=(B[cat]||0)/8;return {cat,now,avg,p:avg?Math.round((now/avg-1)*100):0}})
    .filter(s=>s.avg>0&&s.p>=40&&s.now-s.avg>=cv(100,"QAR",V())&&!(mute[s.cat]&&mute[s.cat]>=w0)).sort((a,b)=>b.now-b.avg-(a.now-a.avg))}

/* ---------- India tax pack for the CA (financial year) ---------- */
function taxPack(fs){fs=fs||fyStart();const fe=(+fs.slice(0,4)+1)+"-03-31",inFy=d=>d>=fs&&d<=fe,yl=fs.slice(0,4)+"-"+String(+fs.slice(0,4)+1).slice(2);
  const L=[["Personal Diary - India tax summary",19,1],["Financial year "+yl+" (1 Apr "+fs.slice(0,4)+" to 31 Mar "+(+fs.slice(0,4)+1)+") - made on "+fmt(today()),10,0],["For your tax adviser. Check each figure against bank and scheme statements.",9,0]];
  const sc=S.sacc||[];let c80=0;if(sc.length){L.push(["Savings schemes (deposits this year)",14,1,14]);sc.forEach(x=>{const s=saState(x);L.push([(x.name||x.type)+" ("+String(x.type||"").toUpperCase()+"): deposited "+inr(Math.round(s.fyDep||0))+", balance now "+inr(Math.round(s.now||0)),11]);if(x.type!="rd")c80+=s.fyDep||0})}
  const prem=S.tx.filter(x=>x.kind=="out"&&inFy(x.date)&&(/insur|lic|premium/i.test((x.cat||"")+" "+(x.payee||"")+" "+(x.note||""))||(x.link&&x.link.t=="date"&&(S.dates.find(d=>d.id==x.link.id)||{}).type=="premium")));
  const premT=prem.reduce((s,x)=>s+cv(x.amt,x.cur,"INR"),0);if(prem.length){L.push(["Insurance premiums paid",14,1,14]);prem.forEach(x=>L.push([fmt(x.date)+" - "+(x.payee||x.cat||"Premium")+" - "+fmx(x.amt,x.cur),11]))}
  L.push(["Deductions to check ("+TAXSEC(fs)+")",14,1,14],["PPF and SSY deposits: "+inr(Math.round(c80)),11],["Life insurance premiums: "+inr(Math.round(premT)),11],["Total to check: "+inr(Math.round(c80+premT))+" (limit 1,50,000 under the old regime)",11,1]);
  const intr=S.tx.filter(x=>x.kind=="in"&&inFy(x.date)&&/interest/i.test((x.cat||"")+" "+(x.payee||"")+" "+(x.note||"")));
  if(intr.length){const by={};intr.forEach(x=>{const n=ac(x.acc).name||"Other";by[n]=(by[n]||0)+cv(x.amt,x.cur,"INR")});L.push(["Interest received",14,1,14]);
    Object.entries(by).forEach(([n,a])=>L.push([n+": "+inr(Math.round(a))+(/\bnre\b/i.test(n)?" (NRE: usually tax-free)":/\bnro\b/i.test(n)?" (NRO: taxable, TDS usually cut)":""),11]))}
  const fd=S.inv.filter(x=>x.kind=="fd"&&x.mdate&&inFy(x.mdate));if(fd.length){L.push(["FDs that matured this year",14,1,14]);fd.forEach(x=>L.push([x.name+" - matured "+fmt(x.mdate)+" - value "+fmx(x.val||x.inv,x.cur),11]))}
  const R=remits().filter(r=>inFy(r.x.date));if(R.length)L.push(["Money sent to India",14,1,14],[R.length+" transfers, "+inr(Math.round(R.reduce((s,r)=>s+r.inr,0)))+" received in India",11]);
  const dI=indiaDays(fs);L.push(["Residential status",14,1,14],["Days in India this year (from trips in the app): "+dI,11],[dI>=182?"182 days or more: resident for this year.":dI>=120?"120 days or more: may be resident if Indian income is over 15 lakh. Check with your adviser.":"Under 120 days: NRI on days alone.",11]);
  L.push(["Figures come from entries in the app and may be incomplete.",9,0,16]);return mkPdf(L)}

/* ---------- Tamil: more of the app ---------- */
Object.assign(TA,{"Shared costs":"பகிர்ந்த செலவுகள்","Paid by":"செலுத்தியவர்","Shared, half each":"பகிர்வு, பாதி பாதி","📷 Receipt photo":"📷 ரசீது புகைப்படம்","Mark settled":"தீர்ந்தது எனக் குறி","Undo settled":"தீர்வை நீக்கு","All even this month":"இந்த மாதம் சமம்","Shared total":"பகிர்ந்த மொத்தம்",
 "People":"நபர்கள்","Moi register":"மொய் பதிவு","Hand loans":"கைமாற்று கடன்கள்","Emergency pack":"அவசரத் தொகுப்பு","Family / joint":"குடும்பம் / கூட்டு","Tax pack for your CA":"CA-க்கான வரி தொகுப்பு","India tax summary":"இந்திய வரி சுருக்கம்",
 "Settings":"அமைப்புகள்","Theme":"தீம்","Sync":"ஒத்திசைவு","Family sync":"குடும்ப ஒத்திசைவு","App updates":"செயலி புதுப்பிப்புகள்","Security":"பாதுகாப்பு","App lock":"செயலி பூட்டு","Notifications":"அறிவிப்புகள்","Currency":"நாணயம்","Exchange rate":"மாற்று விகிதம்","Export":"ஏற்றுமதி","Import":"இறக்குமதி","Restore":"மீட்டெடு","Search":"தேடு","Filter":"வடிகட்டு","All":"அனைத்தும்","None":"எதுவும் இல்லை",
 "Name":"பெயர்","Type":"வகை","Notes":"குறிப்புகள்","Payee":"யாருக்கு","Tags":"குறிச்சொற்கள்","Sub-category":"துணை வகை","Repeat":"மீண்டும்","Does not repeat":"மீண்டும் இல்லை","Every month":"ஒவ்வொரு மாதமும்","Every 3 months":"3 மாதத்துக்கு ஒருமுறை","Every 6 months":"6 மாதத்துக்கு ஒருமுறை","Every year":"ஒவ்வொரு ஆண்டும்",
 "Premium":"பிரீமியம்","FD maturity":"FD முதிர்வு","EMI":"EMI","Renewal":"புதுப்பித்தல்","New due date":"புதிய கட்டண தேதி","Edit due date":"கட்டண தேதியைத் திருத்து","Mark paid":"செலுத்தியதாகக் குறி","Attachments":"இணைப்புகள்",
 "Expense":"செலவு","Transfer ":"மாற்று ","Saving":"சேமிப்பு","Add":"சேர்","Bank account":"வங்கிக் கணக்கு","Cash":"ரொக்கம்","Credit card":"கடன் அட்டை","Wallet":"பணப்பை","Loan":"கடன்",
 "Investments ":"முதலீடுகள் ","Fixed deposit":"நிலை வைப்பு","Mutual fund":"பரஸ்பர நிதி","Stocks":"பங்குகள்","Gold":"தங்கம்","Goals":"இலக்குகள்","Budget":"பட்ஜெட்","Recurring":"தொடர்","Report":"அறிக்கை","Month":"மாதம்","Year":"ஆண்டு","Week":"வாரம்","Today":"இன்று","Yesterday":"நேற்று","Tomorrow":"நாளை"});
TARX.push([/^(.+) owes (.+?) (QAR|₹)\s?([\d,.]+)$/,"$1, $2-க்கு $3 $4 தர வேண்டும்"],[/^Shared expenses \((\d+)\)$/,"பகிர்ந்த செலவுகள் ($1)"],[/^(\d+) payments? before salary/,"சம்பளத்துக்கு முன் $1 கட்டணம்"]);
{const _vf2=vFam;vFam=function(...a){return taHtml(_vf2(...a))}}

/* settings: tax pack and alert switch */
{const _st=settings;settings=function(...a){const r=_st(...a);try{const box=$("#set_more");if(box&&!$("#set_tax")){box.insertAdjacentHTML("beforeend",`<button id="set_tax" data-act="taxPack">Tax pack for your CA</button><button data-act="spikeT">${S.cfg.noSpike?"Spending alerts: off":"Spending alerts: on"}</button>`);if(taOn())taNode(box)}}catch(e){console.warn(e)}return r}}

NEW27.splice(0,NEW27.length,"Receipt photo on any expense (📷 in the add form)","Shared costs: mark who paid, see who owes whom each month (Family → Shared costs)","Insurance grace period: warning and reminder before a policy lapses","Spending alerts when a category jumps this week","Tax pack PDF for your CA (Settings)","More of the app in Tamil","Faster with years of entries");

Object.assign(ACT,{
  splitM(m){S.cfg.splitM=m;render()},
  splitSettle(m){S.cfg.settled={...(S.cfg.settled||{}),[m]:today()};save();render();toast("Marked settled")},
  splitUnsettle(m){const s={...(S.cfg.settled||{})};delete s[m];S.cfg.settled=s;save();render()},
  splitShare(m){const R=splitMonth(m);if(!R||!R.owe)return;const t=`Shared costs for ${mlong(m)}:\n${R.P.map(p=>p.name+" paid "+fmr(R.paid[p.id])).join("\n")}\n${R.owe.from.name} owes ${R.owe.to.name} ${fmr(R.owe.amt)}.`;openExt("https://wa.me/?text="+encodeURIComponent(t))},
  spikeView(cat){sheet(`<h2>${esc(cat)} this week</h2>${S.tx.filter(x=>x.kind=="out"&&x.cat==cat&&x.date>=plus(-6)).sort((a,b)=>b.date.localeCompare(a.date)).map(x=>txRow(x)).join("")}<div class="acts"><button class="btn ghost" data-act="spikeMute" data-id="${esc(cat)}">Don’t warn about this for a week</button></div>`)},
  spikeMute(cat){S.cfg.spikeMute={...(S.cfg.spikeMute||{}),[cat]:today()};save();sheet("");render()},
  spikeT(){S.cfg.noSpike=!S.cfg.noSpike;save();settings();toast(S.cfg.noSpike?"Spending alerts off":"Spending alerts on")},
  taxPack(){const fs=fyStart(),prev=(+fs.slice(0,4)-1)+"-04-01",lab=s=>s.slice(0,4)+"-"+String(+s.slice(0,4)+1).slice(2);
    sheet(`<h2>Tax pack for your CA</h2><p class="sub">A PDF with scheme deposits, insurance premiums, interest, FDs, money sent home and your days in India for one financial year.</p><div class="acts"><button class="btn" data-act="taxGo" data-id="${fs}">This year (${lab(fs)})</button><button class="btn ghost" data-act="taxGo" data-id="${prev}">Last year (${lab(prev)})</button></div>`)},
  taxGo(fs){return saveFile("india-tax-summary-"+fs.slice(0,4)+".pdf",taxPack(fs),"application/pdf")}
});
