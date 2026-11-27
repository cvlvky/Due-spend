/* ===== live prices: gold, silver, QAR rate, mutual fund NAVs; Indian small savings schemes ===== */
const OZ=31.1034768,PUR={24:1,22:.916,18:.75};
async function getJSON(url){
  if(isApp()){try{const r=await NP("CapacitorHttp","get",{url,responseType:"json",connectTimeout:15000,readTimeout:15000});if(r&&r.status>=400)throw new Error("HTTP "+r.status);let d=r&&r.data;if(typeof d=="string")d=JSON.parse(d);if(d!=null)return d}catch(e){}}
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),15000);try{const r=await fetch(url,{signal:ctl.signal});if(!r.ok)throw new Error("HTTP "+r.status);return await r.json()}finally{clearTimeout(t)}}
async function fxFile(c){let err;for(const u of [`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${c}.min.json`,`https://latest.currency-api.pages.dev/v1/currencies/${c}.min.json`]){try{const d=await getJSON(u);if(d&&d[c])return d}catch(e){err=e}}throw err||new Error("no data")}
/* India's cost on imported gold since 13 May 2026: 15% customs duty (10% basic + 5% cess), with 3% IGST on top = 18.45% */
const DUTY_IN=18.45;
const gp=()=>({IN:S.cfg.gpIN??DUTY_IN,QA:S.cfg.gpQA??0});
/* how far a country's shop rate is above the international price: matched to your jeweller for each purity, or the set percentage */
function gpk(c,pur){const K=S.cfg.gpk&&S.cfg.gpk[c],P=K&&K.p;if(P){if(P[pur]!=null)return P[pur];if(P[22]!=null)return P[22];const a=Object.values(P);if(a.length)return a[0]}return c=="QA"?gp().QA:gp().IN}
/* the old 6% duty (or 0) was set before India raised it; use the new figure once */
function mkMig(){if(S.cfg.gpMig)return false;if(S.cfg.gpIN===0||S.cfg.gpIN===6)delete S.cfg.gpIN;S.cfg.gpMig=1;return true}
/* price of one gram at a purity, in INR or QAR, as the shops charge it */
function goldGram(cur,pur){const k=S.mk;if(!k||!k.g)return 0;const base=cur=="QAR"?k.g.qar:k.g.inr;return base*(PUR[pur]||1)*(1+gpk(cur=="QAR"?"QA":"IN",+pur||24)/100)}
/* gold you hold, valued at today's shop rate from its grams */
function mkRevalue(){S.inv.forEach(x=>{if(x.kind=="gold"&&+x.gr&&!x.closed){const v=Math.round(+x.gr*goldGram(x.cur,+x.pur||24));if(v&&v!=+x.val){x.val=v;x.hist=[...(x.hist||[]).filter(h=>h.d!=today()),{d:today(),v}].slice(-36);x.ut=Date.now()}}})}
/* the international price right now; the daily rates file can be a day behind */
async function liveSpot(){try{const d=await Promise.race([getJSON("https://xaus.com/api/v1/spot?compact=1"),new Promise((_,j)=>setTimeout(()=>j(new Error("timeout")),8000))]),g=+(d&&d.spot_usd_oz),s=+(d&&d.silver_usd_oz);
  if(!(g>300&&g<50000))return null;const at=Date.parse(d.price_as_of||d.updated_at||"");return {g,s:s>3&&s<2000?s:0,at:at>0?at:Date.now()}}catch(e){return null}}
let mkBusy=false,mkErr="";
async function refreshMarket(force){if(mkBusy)return;if(inClaude()){mkErr="Live prices work in the phone app and the web app, not inside Claude.";return}mkMig();
  if(!force&&S.mk&&S.mk.at&&Date.now()-S.mk.at<(S.mk.live?30*6e4:6*36e5)){await refreshFunds(false);return}
  mkBusy=true;mkErr="";try{const [xau,xag,qar]=await Promise.all([fxFile("xau"),fxFile("xag").catch(()=>null),fxFile("qar").catch(()=>null)]);
    let g={inr:xau.xau.inr/OZ,qar:xau.xau.qar/OZ,usd:xau.xau.usd/OZ},s=xag?{inr:xag.xag.inr/OZ,qar:xag.xag.qar/OZ}:null;const qi=qar&&qar.qar&&qar.qar.inr||g.inr/g.qar;
    S.mk={at:Date.now(),date:xau.date||today(),g,s,qi,live:false};
    const L=await liveSpot();if(L&&xau.xau.usd>0){const ipu=xau.xau.inr/xau.xau.usd,qpu=xau.xau.qar/xau.xau.usd;g={inr:L.g*ipu/OZ,qar:L.g*qpu/OZ,usd:L.g/OZ};if(L.s)s={inr:L.s*ipu/OZ,qar:L.s*qpu/OZ};S.mk={...S.mk,date:today(),g,s,live:true,lat:L.at}}
    S.mkh=S.mkh||{};S.mkh[S.mk.date]={gi:g.inr,gq:g.qar,qi};Object.keys(S.mkh).sort().slice(0,-120).forEach(k=>delete S.mkh[k]);
    if(S.cfg.autoRate!==false&&qi>1){const r=Math.round(qi*100)/100;if(r!=S.cfg.rate){S.cfg.rate=r;S.cfg.rateAt=today()}}
    mkRevalue();save()}catch(e){mkErr="Couldn’t get today’s prices. Check the internet connection and tap Refresh."}finally{mkBusy=false}
  await refreshFunds(force);if(tab=="invest"||tab=="home")render()}
async function refreshFunds(force){const L=S.inv.filter(x=>x.kind=="mf"&&x.mf&&!x.closed&&(force||x.navAt!=today()));for(const x of L){try{const d=await getJSON(`https://api.mfapi.in/mf/${encodeURIComponent(x.mf)}/latest`),r=d&&d.data&&d.data[0];if(!r)continue;
    x.nav=+r.nav;x.navd=r.date;x.navAt=today();if(d.meta&&d.meta.scheme_name)x.mfn=d.meta.scheme_name;if(+x.units){const v=Math.round(+x.units*x.nav*100)/100;x.val=v;x.cur="INR";x.hist=[...(x.hist||[]).filter(h=>h.d!=today()),{d:today(),v}].slice(-36)}x.ut=Date.now()}catch(e){}}
  if(L.length)save()}
function marketCard(){const k=S.mk;if(!k||!k.g)return `<div class="card" style="margin-bottom:10px"><b>Gold and exchange rates</b><p class="note" style="margin:6px 0">${esc(mkErr||(inClaude()?"Live prices work in the phone app and the web app, not inside Claude.":"Getting today’s prices…"))}</p>${inClaude()?"":`<div class="acts"><button class="btn sm" data-act="mkRefresh">Refresh</button></div>`}</div>`;
  mkMig();const row=(l,a,b)=>`<tr><td>${l}</td><td>${a}</td><td>${b}</td></tr>`,i=n=>"₹"+nf(Math.round(n)),q=n=>"QAR "+nf(n,2),H=Object.keys(S.mkh||{}).sort().slice(-30),P=gp(),K=S.cfg.gpk||{},pc=n=>(+(+n).toFixed(2))+"%";
  const inNote=K.IN?`India: matched to your jeweller’s rates on ${fmt(K.IN.d)}, ${pc(gpk("IN",22))} above the international price for 22K.`:P.IN?`India: international price plus ${pc(P.IN)} for import duty and tax${P.IN==DUTY_IN?" (15% customs duty and 3% GST on imports, since May 2026)":""}.`:"India: international price, without India’s import duty.";
  const qaNote=K.QA?`Qatar: matched to your jeweller’s rates on ${fmt(K.QA.d)}, ${pc(gpk("QA",22))} above the international price for 22K.`:P.QA?`Qatar: international price plus ${pc(P.QA)}.`:"Qatar: international price; shops are usually a few percent higher.";
  return `<div class="card" style="margin-bottom:10px"><div class="hbl"><b>Gold and exchange rates</b><span class="note">${k.live?"Live":fmt(k.date)}</span></div>
  <table class="tbl" style="margin-top:6px"><tr><th>Per gram</th><th>India</th><th>Qatar</th></tr>${row("Gold 24K",i(goldGram("INR",24)),q(goldGram("QAR",24)))}${row("Gold 22K",i(goldGram("INR",22)),q(goldGram("QAR",22)))}${row("Gold 18K",i(goldGram("INR",18)),q(goldGram("QAR",18)))}
  ${row("Gold 24K, 10 g",i(goldGram("INR",24)*10),q(goldGram("QAR",24)*10))}${k.s?row("Silver, 1 kg",i(k.s.inr*1000*(1+P.IN/100)),q(k.s.qar*1000*(1+P.QA/100))):""}</table>
  <div class="hbl" style="margin-top:8px"><span>International gold</span><b>$${nf(Math.round(k.g.usd*OZ))} an ounce</b></div><small style="color:var(--mute);display:block">24K a gram before duty and shop margin: ₹${nf(Math.round(k.g.inr))} · QAR ${nf(k.g.qar,2)}</small>
  <div class="hbl" style="margin-top:8px"><span>1 QAR</span><b>₹${k.qi.toFixed(2)}</b></div>
  ${H.length>1?`<small style="color:var(--mute)">Gold 24K per gram in India, last ${H.length} days</small>${area(H.map(d=>({l:+d.slice(8)+" "+mlab(d.slice(0,7)),v:S.mkh[d].gi*(1+gpk("IN",24)/100)})),true,0)}`:""}
  <p class="note">${inNote} ${qaNote} Making charges, and GST in India, are added on the bill. ${k.live?"Live price, updated "+tstr(k.at):"Daily price for "+fmt(k.date)+"; the live price wasn’t available, so it can be a day behind"}.${S.cfg.autoRate!==false?" The app’s QAR rate follows this automatically.":""}${mkErr?" "+esc(mkErr):""}</p>
  <div class="acts"><button class="btn sm" data-act="mkRefresh">${mkBusy?"Refreshing…":"Refresh"}</button><button class="btn sm ghost" data-act="mkSet">Match my jeweller</button></div></div>`}
/* matching your jeweller: type today's rates, and the app keeps the same margin over the international price */
function mkSheet(){const k=S.mk,P=gp(),K=S.cfg.gpk||{},ph=(c,p)=>k&&k.g?(c=="QAR"?nf(goldGram("QAR",p),2):nf(Math.round(goldGram("INR",p)))):"",
    trio=c=>`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">${[24,22,18].map(p=>`<div>${F(`f_${c=="INR"?"in":"qa"}${p}`,p+"K","","number",`placeholder="${ph(c,p)}"`)}</div>`).join("")}</div>`;
  sheet(`<h2>Match my jeweller</h2><p class="sub">Type today’s rates for 1 gram from your jeweller’s board, app or website, such as Tanishq or Joyalukkas. Fill in any you have. The app works out how far they are above the international price and keeps following the market from there.</p>
  <h3>India (₹ for 1 gram)</h3>${trio("INR")}${K.IN?`<p class="note">Now matched to your jeweller’s rates from ${fmt(K.IN.d)}.</p>`:""}
  <h3>Qatar (QAR for 1 gram)</h3>${trio("QAR")}${K.QA?`<p class="note">Now matched to your jeweller’s rates from ${fmt(K.QA.d)}.</p>`:""}
  <p class="note">${k&&k.g?`International price used: $${nf(Math.round(k.g.usd*OZ))} an ounce, ${k.live?"live, "+tstr(k.at):"daily price for "+fmt(k.date)}. Match again when your jeweller changes the rate a lot more or less than the market.`:"Prices aren’t loaded yet. Tap Refresh on the card first."}</p>
  <details><summary>Use a percentage instead</summary><div class="two"><div>${F("f_gpin","India: add %",P.IN,"number")}</div><div>${F("f_gpqa","Qatar: add %",P.QA,"number")}</div></div><p class="note">India’s default is ${DUTY_IN}%: 15% customs duty and 3% GST on imports, since May 2026. Changing a percentage replaces the jeweller match for that country.</p></details>
  ${SEL("f_auto","Update the app’s QAR rate from live prices",[["1","Yes"],["0","No, I’ll set it myself"]],S.cfg.autoRate===false?"0":"1")}
  <div class="acts"><button class="btn" data-act="mkSave">Save</button>${K.IN||K.QA?`<button class="btn ghost" data-act="mkClear">Stop matching</button>`:""}</div>`)}
/* India small savings (post office) schemes: rates for 1 Oct to 31 Dec 2026 */
const SCH_Q={from:"2026-10-01",to:"2026-12-31",label:"1 Oct – 31 Dec 2026"};
const SCH=[["ppf","Public Provident Fund (PPF)",7.1,"ppf","15 years. ₹500 to ₹1.5 lakh a year. Tax-free interest.","Yearly deposit"],["ssy","Sukanya Samriddhi (SSY)",8.2,"ssy","For a girl under 10. Deposits for 15 years, matures at 21 years. Up to ₹1.5 lakh a year.","Yearly deposit"],
  ["scss","Senior Citizens Savings (SCSS)",8.2,"scss","Age 60+. 5 years, interest paid every quarter. Up to ₹30 lakh.","Amount"],["nsc","National Savings Certificate (NSC)",7.7,"nsc","5 years, interest added yearly and paid at maturity.","Amount"],
  ["kvp","Kisan Vikas Patra (KVP)",7.5,"kvp","Money doubles in 115 months.","Amount"],["mis","Monthly Income Scheme (MIS)",7.4,"mis","5 years, interest paid monthly. Up to ₹9 lakh (₹15 lakh joint).","Amount"],
  ["td1","Time Deposit, 1 year",6.9,"td","Interest compounded quarterly.","Amount",1],["td2","Time Deposit, 2 years",7.0,"td","Interest compounded quarterly.","Amount",2],["td3","Time Deposit, 3 years",7.1,"td","Interest compounded quarterly.","Amount",3],["td5","Time Deposit, 5 years",7.5,"td","Interest compounded quarterly.","Amount",5],
  ["rd","Recurring Deposit, 5 years",6.7,"rd","Monthly deposit for 5 years.","Monthly deposit"],["sb","Post Office Savings Account",4.0,"sb","Withdraw any time.","Amount"]].map(a=>({id:a[0],name:a[1],rate:a[2],calc:a[3],note:a[4],ask:a[5],yrs:a[6]||0}));
function schCalc(s,A){const r=s.rate/100,O=[];let inv=A,mat=0,mo=0;
  if(s.calc=="ppf"||s.calc=="ssy"){const f=A*((Math.pow(1+r,15)-1)/r)*(1+r);inv=A*15;mat=s.calc=="ssy"?f*Math.pow(1+r,6):f;mo=s.calc=="ssy"?252:180}
  else if(s.calc=="nsc"){mat=A*Math.pow(1+r,5);mo=60}else if(s.calc=="kvp"){mat=A*2;mo=115}
  else if(s.calc=="mis"){mat=A;mo=60;O.push(["Paid every month",A*r/12])}else if(s.calc=="scss"){mat=A;mo=60;O.push(["Paid every quarter",A*r/4])}
  else if(s.calc=="td"){mat=A*Math.pow(1+r/4,4*s.yrs);mo=12*s.yrs}else if(s.calc=="rd"){inv=A*60;for(let k=0;k<60;k++)mat+=A*Math.pow(1+r/4,(60-k)/3);mo=60}else{mat=A*(1+r);mo=12}
  const intr=s.calc=="mis"?A*r/12*60:s.calc=="scss"?A*r/4*20:mat-inv;O.unshift(["You put in",inv],["Interest earned",intr]);if(s.calc!="mis"&&s.calc!="scss")O.push(["You get at the end",mat]);return {O,mat,inv,mo}}
function schemesHtml(){const old=today()>SCH_Q.to;return `<h2>Post office schemes (India)</h2><div class="card">${SCH.map(s=>`<div class="hrow" data-act="schOpen" data-id="${s.id}" style="cursor:pointer"><div style="flex:1"><div class="hbl"><b>${esc(s.name)}</b><b>${s.rate.toFixed(1)}%</b></div><small>${esc(s.note)}</small></div></div>`).join("")}
  <p class="note" style="margin-top:8px">Rates for ${SCH_Q.label}, set by the Government of India each quarter.${old?" These may be out of date now; check India Post for the current quarter.":""} Tap a scheme for a calculator. Most of these can’t be opened by NRIs; an existing PPF can usually continue until it matures. Check the rules for your situation.</p></div>`}
function schSheet(id,amt){const s=SCH.find(x=>x.id==id);if(!s)return;const A=+amt||0,R=A?schCalc(s,A):null;
  sheet(`<h2>${esc(s.name)}</h2><p class="sub">${s.rate.toFixed(1)}% a year · ${esc(s.note)}</p>${F("sch_amt",s.ask+" (₹)",A||"","number")}<div class="acts"><button class="btn" data-act="schCalc" data-id="${id}">Calculate</button></div>
  ${R?`<div class="card">${R.O.map(([l,v])=>`<div class="hbl" style="margin:6px 0"><span>${l}</span><b>${inr(Math.round(v))}</b></div>`).join("")}<small style="color:var(--mute)">${R.mo?"Over "+(R.mo%12?R.mo+" months":R.mo/12+" years")+", ending around "+fmt(addM(today(),R.mo)):""}. Assumes today’s rate stays the same.</small></div><div class="acts"><button class="btn ghost" data-act="schAdd" data-id="${id}">Add as my investment</button></div>`:""}`)}
/* attachment opening that works inside the phone app */
viewAtt=async function(id){const m=pend.find(a=>a.id==id)||allAtt().find(a=>a.id==id)||{name:"File",type:""};let b=null;try{b=await fget(id)}catch(e){}
  if(!b){sheet(`<h2>File not on this phone</h2><p class="sub">“${esc(m.name)}” is listed, but the file itself isn’t stored on this phone. Attached files aren’t synced between phones and aren’t in the normal backup. To get it back, restore a “Backup with files” made on the phone where you attached it, or attach the file again.</p><div class="acts"><button class="btn" data-act="closeX">OK</button></div>`);return}
  const type=m.type||b.type||"";
  if(isApp()){try{await NP("DueNative","openFile",{name:m.name||"file",mime:type||"application/octet-stream",data:await b64(b)});return}catch(e){toast("No app found to open this file")}return}
  const u=URL.createObjectURL(b),im=type.startsWith("image/");
  $("#view").innerHTML=`<div class="back" data-act="vclose" style="z-index:40"><div class="sheet">${im?`<img src="${u}" style="width:100%;border-radius:12px" alt="${esc(m.name)}">`:`<iframe src="${u}" title="${esc(m.name)}" style="width:100%;height:60vh;border:0;border-radius:12px"></iframe>`}<p><a href="${u}" download="${esc(m.name)}" target="_blank" rel="noopener">Open or save the file</a></p><div class="acts"><button class="btn" data-act="vclose">Close</button></div></div></div>`};
/* live value fields on the investment form */
const liveFields=x=>{x=x||{};const on=+x.gr||x.mf;return `<details${on?" open":""}><summary>Live value (gold grams or mutual fund units)</summary><p class="note">Gold: enter grams and purity. Mutual fund: find the fund and enter your units. The value then updates each day.</p>
  <div class="two"><div>${F("f_gr","Gold weight (grams)",x.gr||"","number")}</div><div>${SEL("f_pur","Purity",[["24","24K"],["22","22K"],["18","18K"]],String(x.pur||22))}</div></div>
  <div class="two"><div>${F("f_mf","Fund scheme code",x.mf||"","text",'inputmode="numeric"')}</div><div>${F("f_units","Units held",x.units||"","number")}</div></div><input type="hidden" id="f_mfn" value="${esc(x.mfn||"")}">
  <p class="note" id="mf_name">${x.mfn?esc(x.mfn)+(x.nav?" · NAV ₹"+x.nav+" on "+esc(x.navd||""):""):""}</p><div class="acts"><button class="btn sm ghost" data-act="mfFind">Find fund by name</button></div><div id="mf_out"></div></details>`};
{const _vW=vWealth;vWealth=function(){let h=_vW();h=h.replace('<div style="height:10px"></div>','<div style="height:10px"></div>'+marketCard());const k='<div class="acts" style="margin-bottom:60px">';return h.includes(k)?h.replace(k,schemesHtml()+k):h+schemesHtml()}}
Object.assign(ACT,{
  async mkRefresh(){toast("Getting today’s prices…");await refreshMarket(true);render();toast(mkErr||"Prices updated")},
  async mkSet(){if(!inClaude()&&(!S.mk||!S.mk.at||Date.now()-S.mk.at>10*6e4)){toast("Getting the latest price…");await refreshMarket(true)}mkSheet()},
  mkSave(){const k=S.mk,cal={IN:{},QA:{}};
    if(k&&k.g)for(const [c,cur] of [["IN","inr"],["QA","qar"]])for(const p of [24,22,18]){const r=+v(`f_${c.toLowerCase()}${p}`)||0;if(!r)continue;const base=k.g[cur]*PUR[p],x=r/base,now=base*(1+gpk(c,p)/100);
      if(x>6&&x<15)return toast(`The ${p}K rate looks like the price of 10 grams. Type the rate for 1 gram.`);
      if(x<0.85||x>1.5)return toast(`Check the ${p}K rate. Today’s is about ${cur=="inr"?"₹"+nf(Math.round(now)):"QAR "+nf(now,2)} a gram.`);cal[c][p]=Math.round((x-1)*10000)/100}
    S.cfg.gpk=S.cfg.gpk||{};let n=0;
    for(const [c,key,def] of [["IN","gpIN",DUTY_IN],["QA","gpQA",0]]){const f=v(key=="gpIN"?"f_gpin":"f_gpqa");if(Object.keys(cal[c]).length){S.cfg.gpk[c]={d:today(),p:cal[c]};n++}
      else if(f!==""&&+f!==(S.cfg[key]??def)){S.cfg[key]=+f;delete S.cfg.gpk[c]}}
    S.cfg.autoRate=v("f_auto")=="1";mkRevalue();save();done();toast(n?"Rates matched to your jeweller":"Saved")},
  mkClear(){delete S.cfg.gpk;mkRevalue();save();done();toast("Back to the international price with duty")},
  schOpen(id){schSheet(id)},schCalc(id){schSheet(id,v("sch_amt"))},
  schAdd(id){const s=SCH.find(x=>x.id==id),A=+v("sch_amt")||0;if(!s)return;const R=schCalc(s,A);iForm();setTimeout(()=>{const set=(k,val)=>{const e=$("#"+k);if(e)e.value=val};set("f_name",s.name.replace(/ \(.*\)$/,""));set("f_kind2",s.calc=="ppf"||s.calc=="ssy"?"ppf":s.calc=="rd"||s.calc=="sb"?"other":"fd");set("f_cur","INR");set("f_inv",s.calc=="ppf"||s.calc=="ssy"||s.calc=="rd"?A:A);set("f_sd",today());if(R.mo)set("f_md",addM(today(),R.mo));set("f_rt",s.rate)},50)},
  async mfFind(){const q=(v("f_name")||"").trim(),o=$("#mf_out");if(!o)return;if(q.length<3)return toast("Type the fund name in Name first");if(inClaude())return toast("Fund search works in the phone app and the web app");o.innerHTML=`<p class="note">Searching…</p>`;
    try{const L=(await getJSON("https://api.mfapi.in/mf/search?q="+encodeURIComponent(q)))||[];o.innerHTML=L.length?L.slice(0,15).map(f=>`<div class="row" data-act="mfPick" data-id="${esc(f.schemeCode)}" style="cursor:pointer"><div><b style="font-weight:500">${esc(f.schemeName)}</b><small>Code ${esc(f.schemeCode)}</small></div></div>`).join(""):`<p class="note">No funds found. Try a shorter name, such as “Parag Parikh Flexi”.</p>`}catch(e){o.innerHTML=`<p class="note">Couldn’t search right now. Check the internet connection.</p>`}},
  async mfPick(id,t){const n=t.querySelector("b").textContent;$("#f_mf").value=id;$("#f_mfn").value=n;$("#mf_out").innerHTML="";$("#mf_name").textContent=n+" · getting NAV…";$("#f_cur").value="INR";$("#f_kind2").value="mf";
    try{const d=await getJSON(`https://api.mfapi.in/mf/${id}/latest`),r=d.data[0];$("#mf_name").textContent=n+" · NAV ₹"+r.nav+" on "+r.date;const u=+v("f_units");if(u)$("#f_val").value=Math.round(u*r.nav*100)/100}catch(e){$("#mf_name").textContent=n}}
});
{const _save=ACT.saveInv;ACT.saveInv=function(id){const n=v("f_name").trim(),gr=+v("f_gr")||0,pur=+v("f_pur")||22,mf=v("f_mf").trim(),units=+v("f_units")||0,mfn=v("f_mfn");
  if(gr&&!(+v("f_val"))&&S.mk&&S.mk.g){const e=$("#f_val");if(e)e.value=Math.round(gr*goldGram(v("f_cur"),pur))}
  const before=new Set(S.inv.map(x=>x.id));_save(id);const x=S.inv.find(q=>q.id==id)||S.inv.find(q=>!before.has(q.id)&&q.name==n);if(!x)return;
  Object.assign(x,{gr,pur,mf,units,mfn:mf?mfn||x.mfn||"":""});if(mf&&x.mf!==x.prevMf){x.navAt="";x.prevMf=mf}save();if(mf||gr)refreshMarket(false)}}
