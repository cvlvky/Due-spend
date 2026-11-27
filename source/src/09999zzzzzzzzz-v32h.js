/* ===== Version 32.8: post office schemes follow the post office rules (TD, NSC, KVP, MIS, SCSS, RD, SSY, PPF) ===== */
/* lump-sum schemes are kept with the investments (kind "fd" with a kind of deposit) and shown under Schemes */
const POS={potd:{n:"Time Deposit (TD)",min:1000,step:100},nsc:{n:"National Savings Certificate (NSC)",min:1000,step:100},kvp:{n:"Kisan Vikas Patra (KVP)",min:1000,step:100},
  mis:{n:"Monthly Income Scheme (MIS)",min:1000,step:1000,max:900000,maxj:1500000},scss:{n:"Senior Citizens Savings Scheme (SCSS)",min:1000,step:1000,max:3000000}};
const PORULE={potd:"Minimum ₹1,000, in multiples of ₹100, with no upper limit. Runs for 1, 2, 3 or 5 years. Interest is worked out every quarter and paid once a year; interest left in the account earns nothing more. It can’t be closed in the first 6 months. Closed before a year, it earns the savings account rate (4%); after a year, 2% less than the TD rate. The 5-year TD counts for Section 80C in the old tax regime.",
  nsc:"Minimum ₹1,000, in multiples of ₹100, with no upper limit. Runs for 5 years. Interest is added every year and paid with the money at maturity. It can’t be cashed early, except on the holder’s death or a court order. The deposit counts for Section 80C in the old tax regime, and so does the interest added in the first 4 years.",
  kvp:"Minimum ₹1,000, in multiples of ₹100, with no upper limit. The money doubles in the time fixed on the day you buy it: 115 months for deposits from April 2023. It can be cashed early after 2 years 6 months. There is no tax deduction, and the interest is taxable.",
  mis:"Minimum ₹1,000, in multiples of ₹1,000. Up to ₹9 lakh in a single account or ₹15 lakh in a joint one, and ₹9 lakh per person across all MIS accounts. Runs for 5 years and pays interest every month. It can’t be closed in the first year; 2% of the deposit is cut if it is closed before 3 years, and 1% after that.",
  scss:"For people aged 60 or more; retired employees can join from 55 (defence from 50). Minimum ₹1,000, in multiples of ₹1,000, up to ₹30 lakh per person. Runs for 5 years and can be extended by 3 years at a time. Interest is paid on the first working day of April, July, October and January. Closed before a year, the interest paid is taken back; 1.5% of the deposit is cut if it is closed before 2 years, and 1% after that. Counts for Section 80C in the old tax regime."};
const isPO=x=>!!(x&&x.kind=="fd"&&DK_PO.has(dkOf(x)));
const poShort=dk=>({potd:"TD",nsc:"NSC",kvp:"KVP",mis:"MIS",scss:"SCSS"})[dk]||"";
const poName=(dk,term,holder)=>(dk=="potd"?`Post office TD, ${term} ${term==1?"year":"years"}`:dk=="mis"?"Post office MIS":poShort(dk))+(holder?" – "+holder:"");
function poMat(dk,sd,term){if(!sd)return "";return dk=="potd"?addM(sd,12*(+term||5)):poMature(dk,sd,"")}
function poCheck(dk,amt,hold){const R=POS[dk];if(!R)return "";if(!amt)return "Enter the amount deposited.";if(amt<R.min)return `The smallest deposit is ${inr(R.min)}.`;
  if(amt%R.step)return `The amount must be in multiples of ${inr(R.step)}.`;const mx=hold=="j"&&R.maxj?R.maxj:R.max;
  if(mx&&amt>mx)return `The most this scheme takes is ${inr(mx)}${R.maxj?(hold=="j"?" in a joint account":" in a single account"):""}.`;return ""}
const poLimit=dk=>{const R=POS[dk];return R?`Minimum ${inr(R.min)}, in multiples of ${inr(R.step)}${R.maxj?`, up to ${inr(R.max)} single or ${inr(R.maxj)} joint`:R.max?`, up to ${inr(R.max)}`:", no upper limit"}.`:""};
/* the interest payments of a TD (every year), MIS (every month) and SCSS (1 April, July, October and January) */
const qStart=d=>{const m=+d.slice(5,7);return d.slice(0,4)+"-"+p2(m-((m-1)%3))+"-01"};
const daysB=(a,b)=>Math.round((D(b)-D(a))/864e5);
function poPays(x){const o=depInfo(x);if(!o||!o.pay||!o.sd||!o.md||!o.P||!o.r)return [];const L=[];
  if(o.dk=="potd")for(let k=1;k<=o.pay.n;k++)L.push({d:addM(o.sd,12*k),a:o.pay.amt});
  else if(o.dk=="mis")for(let k=1;k<=o.pay.n;k++)L.push({d:addM(o.sd,k),a:o.pay.amt});
  else if(o.dk=="bankp")for(let k=1;k<=o.pay.n;k++)L.push({d:addM(o.sd,3*k),a:o.pay.amt});
  else if(o.dk=="scss"){const q=o.P*o.r/400;let from=o.sd;for(let k=0;k<200;k++){const qs=qStart(from),b=addM(qs,3);if(b>o.md)break;L.push({d:b,a:q*daysB(from,b)/daysB(qs,b)});from=b}
    if(from<o.md){const qs=qStart(from);L.push({d:o.md,a:q*daysB(from,o.md)/daysB(qs,addM(qs,3))})}}
  return L}
const poNext=x=>{const t=today();return poPays(x).find(p=>p.d>=t)||null};
/* ---------- the form ---------- */
function poObj(){const g=id=>{const e=$("#"+id);return e?e.value:""};return {kind:"fd",dk:g("f_dk"),name:g("f_name"),inv:+g("f_inv")||0,sd:g("f_sd"),mdate:g("f_md"),rt:+g("f_rt")||0,mamt:+g("f_mamt")||0,cur:"INR",val:0,hold:g("f_hold")}}
function poForm(x,pre){x=x||null;pre=pre||{};if(!pre.keepAtt)attInit(x&&x.att);
  const has=k=>pre[k]!=null&&pre[k]!=="",val=k=>has(k)?pre[k]:x?x[k]??"":"",dk=pre.dk||(x?dkOf(x):"")||"potd",guessed=!!(x&&!x.dk&&!pre.dk),sd=val("sd")||today(),
    term=+pre.term||(x&&x.sd&&x.mdate?tdYears(x.sd,x.mdate)||5:5),autoName=!x&&!has("name"),name=autoName?poName(dk,term,val("holder")):val("name"),
    rt0=has("rt")?pre.rt:x?+x.rt||"":"",rtAuto=!rt0||(!has("rt")&&x&&Math.abs(+x.rt-poRate(dk,sd,x.mdate||poMat(dk,sd,term)))<0.001);
  sheet(`<h2>${x?"Post office deposit":"New post office deposit"}</h2><p class="sub">${x&&x.closed?"Closed"+(x.closedOn?" on "+fmt(x.closedOn):"")+". ":""}Fill it in from the passbook or certificate. The app follows the scheme’s rules for the rate, the interest and the maturity.</p>
  <input type="hidden" id="f_poform" value="1"><input type="hidden" id="f_kind2" value="fd"><input type="hidden" id="f_cur" value="INR"><input type="hidden" id="f_val" value="">
  <div class="two"><div>${SEL("f_dk","Scheme",Object.entries(POS).map(([k,o])=>[k,o.n]),dk)}</div><div id="f_termw">${SEL("f_term","Term",[["1","1 year"],["2","2 years"],["3","3 years"],["5","5 years"]],String(term))}</div></div>
  ${F("f_name","Name",name,"text",'placeholder="Post office TD for Amma"')}
  <div class="two"><div>${F("f_holder","Account holder",val("holder"))}</div><div>${SEL("f_hold","Account type",[["s","Single"],["j","Joint"]],val("hold")||"s")}</div></div>
  <div class="two"><div>${F("f_no","Account or certificate no.",val("no"))}</div><div>${F("f_po","Post office",val("po"),"text",'placeholder="Branch"')}</div></div>
  <div class="two"><div>${F("f_sd","Date of deposit",sd,"date")}</div><div>${F("f_inv","Amount deposited (₹)",val("inv")||"","number")}</div></div>
  <p class="note" id="f_porule" style="margin-top:4px"></p>
  <div class="two"><div>${F("f_rt","Interest % a year",rt0,"number")}</div><div id="f_paytow">${SEL("f_payto","Interest paid into",[["","Not tracked in the app"],...ACCS()],val("payto"))}</div><div id="f_mamtw">${F("f_mamt","Maturity amount (optional)",val("mamt")||"","number",'placeholder="From the certificate"')}</div></div>
  <div id="f_mdw">${F("f_md","Maturity date (from the certificate)",val("mdate")||"","date")}</div>
  <div class="card" id="f_depsum" style="margin:10px 0"></div>
  <details><summary>Scheme rules</summary><p class="note" id="f_porules"></p></details>
  ${x?(x.closed?`<div class="acts"><button class="btn ghost" data-act="poReopen" data-id="${x.id}">Reopen</button></div>`:`<div class="acts"><button class="btn ghost" data-act="poIntRec" data-id="${x.id}">Interest received</button><button class="btn ghost" data-act="poClose" data-id="${x.id}">Matured or closed</button></div>`)+histHtml("inv",x.id):SEL("f_from","Take this amount from an account",[["","No, just record it"],...ACCS()],pre.from||"")}
  ${attHtml()}${stampNote(x)}${btns("saveInv",x&&x.id,"delInv")}`);
  if(rtAuto)$("#f_rt").dataset.auto="1";if(autoName)$("#f_name").dataset.auto="1";if(guessed)$("#f_dk").dataset.auto="1";poSync("open")}
function poSync(changed){if(!$("#f_poform"))return;const dk=v("f_dk"),term=+v("f_term")||5,sd=v("f_sd"),md=$("#f_md"),rt=$("#f_rt"),nm=$("#f_name"),show=(id,on)=>{const e=$("#"+id);if(e)e.style.display=on?"":"none"};
  show("f_termw",dk=="potd");show("f_paytow",dk=="potd"||dk=="mis"||dk=="scss");show("f_mamtw",dk=="nsc"||dk=="kvp");
  const auto=poMat(dk,sd,term);if(auto){md.value=auto;md.dataset.auto="1"}else if(md.dataset.auto=="1")md.value="";show("f_mdw",!auto);
  if(rt.dataset.auto=="1"||!rt.value){const r=poRate(dk,sd,md.value);rt.value=r||"";rt.dataset.auto="1"}
  if(nm.dataset.auto=="1")nm.value=poName(dk,term,v("f_holder").trim());
  $("#f_porules").textContent=PORULE[dk]||"";
  const amt=+v("f_inv")||0,err=amt?poCheck(dk,amt,v("f_hold")):"",ru=$("#f_porule");ru.textContent=err||poLimit(dk);ru.style.color=err?"var(--late)":"";
  const k=$("#f_dk");$("#f_depsum").innerHTML=poSay(poObj())+(k.dataset.auto=="1"?`<p class="note" style="margin:6px 0 0"><i>Kind picked from the name. Change it if your certificate shows another scheme.</i></p>`:"")}
function poSay(x){const o=depInfo(x);if(!o)return "";const m=v=>inr(Math.round(v)),row=(l,v)=>`<div class="hbl" style="margin:4px 0"><span>${l}</span><b>${v}</b></div>`;
  if(!o.sd)return `<p class="note" style="margin:0">Add the date of deposit.</p>`;
  const gov=poRate(o.dk,o.sd,o.md),own=o.r&&gov&&Math.abs(o.r-gov)>0.001;
  let h=o.P?`<p style="margin:0 0 8px">${depSay(x)}</p>`:`<p class="note" style="margin:0 0 8px">Enter the amount to see what it pays.</p>`;
  h+=row("Interest rate",o.r?o.r+"% a year"+(own?` (government rate ${gov}%)`:""):"–");
  if(o.md)h+=row("Matures on",fmt(o.md)+(o.dk=="kvp"&&o.T?` (${Math.round(o.T*12)} months)`:""));
  if(o.P&&o.mat){const L=poPays(x),t=today();
    if(L.length){const nx=L.find(p=>p.d>=t);if(o.dk=="scss"&&Math.abs(L[0].a-o.pay.amt)>1)h+=row("First payment",m(L[0].a)+" on "+fmt(L[0].d));
      if(nx)h+=row("Next interest",m(nx.a)+" on "+fmt(nx.d));h+=row("Interest in all",m(L.reduce((s,p)=>s+p.a,0))+` (${L.length} ${L.length==1?"payment":"payments"})`);h+=row("Money back at the end",m(o.P))}
    else{h+=row("Maturity amount",m(o.mat));h+=row("Interest",m(o.mat-o.P))}
    if(o.dk=="nsc"&&o.r>0){let b=o.P;const y=[];for(let k=1;k<=5;k++){const i=b*o.r/100;y.push(`<tr><td>Year ${k}</td><td>${m(i)}</td><td>${k<5?"Yes":"No, taxed"}</td></tr>`);b+=i}
      h+=`<table class="tbl" style="margin-top:6px"><tr><th>Interest added</th><th>Amount</th><th>Counts for 80C</th></tr>${y.join("")}</table>`}}
  return h}
document.addEventListener("change",e=>{const id=e.target&&e.target.id;if(!$("#f_poform"))return;if(["f_dk","f_term","f_sd","f_hold","f_rt","f_md","f_mamt","f_inv"].includes(id)){if(id=="f_md")e.target.dataset.auto="";poSync(id)}});
document.addEventListener("input",e=>{const id=e.target&&e.target.id;if(!$("#f_poform"))return;if(id=="f_name")e.target.dataset.auto="";if(["f_inv","f_rt","f_mamt","f_holder"].includes(id))poSync(id)});
/* the general investment form: choosing "Post office scheme" opens this form with what was typed */
document.addEventListener("change",e=>{const t=e.target;if(!t||t.id!="f_dk"||$("#f_poform")||t.value!="po")return;ACT.poSwitch()});
{const _if=iForm;iForm=function(x){if(isPO(x))return poForm(x);return _if(x)}}
/* saving: the scheme’s limits are checked first, and the post office details are kept */
{const _si=ACT.saveInv;ACT.saveInv=async function(id,...a){if(!$("#f_poform"))return _si.call(this,id,...a);
  const dk=v("f_dk"),amt=+v("f_inv")||0,hold=v("f_hold"),err=poCheck(dk,amt,hold);if(!v("f_sd"))return toast("Add the date of deposit");if(err)return toast(err);
  const extra={holder:v("f_holder").trim(),hold,po:v("f_po").trim(),payto:$("#f_paytow").style.display=="none"?"":v("f_payto")},before=new Set(S.inv.map(x=>x.id)),r=await _si.call(this,id,...a);
  const x=id?S.inv.find(q=>q.id==id):S.inv.find(q=>!before.has(q.id));if(!x)return r;const h=x.hist||[],z=h.length&&h[h.length-1].d==today()&&!h[h.length-1].v;
  if(z||Object.keys(extra).some(k=>(x[k]||"")!==extra[k])){const o={...x,...extra};if(z)o.hist=h.slice(0,-1);put("inv",stamp(o,x));save();render()}return r}}
/* ---------- interest received, maturity and closing ---------- */
function poIntForm(id){const x=S.inv.find(q=>q.id==id);if(!x)return;const L=poPays(x),t=today(),paid=x.ipaid||[],due=L.filter(p=>p.d<=t&&!paid.includes(p.d)),p=due[0]||L.find(p=>p.d>t)||{d:t,a:0};
  sheet(`<h2>Interest received</h2><p class="sub">${esc(x.name)}${due.length>1?` · ${due.length} payments not added yet; this is the earliest`:""}</p>
  <div class="two"><div>${F("f_amt","Amount (₹)",Math.round(p.a)||"","number")}</div><div>${F("f_date","Date",p.d<=t?p.d:t,"date")}</div></div>
  ${SEL("f_acc","Paid into",ACCS(),x.payto||S.cfg.last||"")}<input type="hidden" id="f_due" value="${p.d}"><p class="note">This adds the interest as income to the account.</p>${btns("poIntSave",id)}`)}
function poIntAddTx(x,a,d,accId,due){const A=S.acc.find(q=>q.id==accId);if(!A||!a)return null;const t=addTx({kind:"in",acc:A.id,amt:cv(a,"INR",A.cur),cur:A.cur,cat:"Interest",payee:"Post office",note:x.name,date:d});
  if(due){x.ipaid=[...new Set([...(x.ipaid||[]),due])].sort();x.ut=Date.now()}return t}
function poCloseForm(id){const x=S.inv.find(q=>q.id==id);if(!x)return;const o=depInfo(x)||{},t=today(),done_=o.md&&t>=o.md,L=poPays(x),last=L.length?L[L.length-1]:null,
    exp=done_?(o.pay?o.P+(last&&last.d==o.md&&!(x.ipaid||[]).includes(last.d)?last.a:0):o.mat||o.P):invVal(x,true);
  sheet(`<h2>${done_?"Matured":"Closing early"}</h2><p class="sub">${esc(x.name)} · ${inr(o.P||+x.inv||0)} deposited${o.md?" · matures "+fmt(o.md):""}</p>
  <div class="two"><div>${F("f_amt","Amount received (₹)",Math.round(exp)||"","number")}</div><div>${F("f_date","Date",done_?o.md:t,"date")}</div></div>
  ${SEL("f_acc","Paid into",[["","Not into an account in the app"],...ACCS()],x.payto||"")}
  <p class="note">The deposit is marked closed. What comes back up to the amount deposited returns to the account; anything above it is added as interest income.${done_?"":" Closing early has a cut set by the scheme rules, so type the amount the post office paid."}</p>${btns("poCloseSave",id)}`)}
Object.assign(ACT,{
  poSwitch(){const b=$('#over [data-act="saveInv"]'),id=b&&b.getAttribute("data-id"),x=id?S.inv.find(q=>q.id==id):null,rt=$("#f_rt"),name=v("f_name").trim(),sd=v("f_sd"),md=v("f_md");
    poForm(x,{keepAtt:true,dk:dkGuess(name)||"potd",name,inv:+v("f_inv")||"",sd,term:tdYears(sd,md)||5,rt:rt&&rt.value&&rt.dataset.auto!="1"?+rt.value:"",no:v("f_no").trim(),from:v("f_from")})},
  poIntRec(id){poIntForm(id)},
  poIntSave(id){const x=S.inv.find(q=>q.id==id),a=+v("f_amt")||0,d=v("f_date")||today(),acc=v("f_acc");if(!x||!a)return toast("Enter the amount");if(!acc)return toast("Choose the account");
    poIntAddTx(x,a,d,acc,v("f_due"));S.cfg.last=acc;done();toast("Interest added")},
  poIntAdd(key){const [id,d]=String(key).split("|"),x=S.inv.find(q=>q.id==id);if(!x)return;const p=poPays(x).find(q=>q.d==d),A=S.acc.find(q=>q.id==x.payto);if(!p||!A)return poIntForm(id);
    poIntAddTx(x,Math.round(p.a),d,A.id,d);save();render();toast(`${inr(Math.round(p.a))} interest added to ${A.name}`)},
  poClose(id){poCloseForm(id)},
  poCloseSave(id){const x=S.inv.find(q=>q.id==id);if(!x)return;const a=+v("f_amt")||0,d=v("f_date")||today(),acc=v("f_acc"),P=+x.inv||0;
    if(acc&&a){const A=S.acc.find(q=>q.id==acc);if(A){const back=Math.min(a,P),intr=Math.max(0,a-P);
      if(back)addTx({kind:"adj",acc:A.id,amt:cv(back,"INR",A.cur),cur:A.cur,cat:"Investment withdrawal",note:x.name,date:d});
      if(intr)addTx({kind:"in",acc:A.id,amt:cv(intr,"INR",A.cur),cur:A.cur,cat:"Interest",payee:"Post office",note:x.name,date:d})}}
    const paid=poPays(x).filter(p=>p.d<=d).map(p=>p.d);put("inv",stamp({...x,closed:true,closedOn:d,ipaid:[...new Set([...(x.ipaid||[]),...paid])].sort()},x));done();toast(x.name+" closed")},
  poReopen(id){const x=S.inv.find(q=>q.id==id);if(!x)return;const o={...x,closed:false};delete o.closedOn;put("inv",stamp(o,x));done();toast(x.name+" reopened")}
});
/* Home: interest that has come in, with one tap to add it to the account it goes to */
{const _ti=todoItems;todoItems=function(){const L=_ti();try{let n0=0;S.inv.forEach(x=>{if(!isPO(x)||x.closed||!x.payto)return;const A=S.acc.find(a=>a.id==x.payto);if(!A)return;
  poPays(x).forEach(p=>{const n=dl(p.d);if(n>0||n<-10||(x.ipaid||[]).includes(p.d))return;n0++;L.push({k:n,ic:"🏤",tx:"Interest: "+x.name,sub:(n==0?"Today":`${-n} ${n==-1?"day":"days"} ago`)+" · "+inr(Math.round(p.a))+" into "+A.name,act:"editInv",id:x.id,bact:"poIntAdd",bid:x.id+"|"+p.d,bt:"Add",tone:"pri"})})});
  if(n0)L.sort((a,b)=>a.k-b.k)}catch(e){}return L}}
/* ---------- Schemes: all post office and savings schemes together ---------- */
function saLine(x,s){if(x.type=="rd"){const st=rdStatus(x);if(s.closed)return "";
    if(st.disc)return `<b style="color:var(--late)">${st.miss} instalments missed: the post office treats the account as discontinued. Pay them with the default fee within 2 months of the 4th missed month to revive it.</b>`;
    if(st.miss)return `<b style="color:var(--late)">${st.miss} ${st.miss==1?"instalment":"instalments"} missed · pay ${inr(st.inst*st.miss)} and a ${inr(st.fee)} default fee</b>`;
    return `${inr(st.inst)} a month, paid by ${st.rule} · ${st.paid} of 60 paid`}
  const min=x.type=="ssy"?250:500,t=today(),mo=+t.slice(5,7);if(s.closed||t>=saDepEnd(x))return x.type=="ssy"&&!s.closed?"Deposits have ended. Interest continues until it matures.":"";
  if(s.fyDep<min&&mo>=1&&mo<=3)return `<b style="color:var(--soon)">Put in at least ${inr(min)} by 31 March to keep it active</b>`;return ""}
function saCard(x){const s=saState(x),n=s.next?dl(s.next):null,ln=saLine(x,s);return `<div class="card ${n!==null&&n<0?"late":n!==null&&n<=7?"soon":""}" style="margin-bottom:8px"><div style="cursor:pointer" data-act="saInfo" data-id="${x.id}"><div class="hbl"><b>${esc(x.name)}</b>${s.closed?`<span class="chip">Matured</span>`:n!==null?`<span class="chip">${n<0?"Due "+fmt(s.next):when(n)}</span>`:""}</div>
  <small style="color:var(--mute);display:block">${SAS[x.type]}${x.holder?" · "+esc(x.holder):""}${x.no?" · "+esc(x.no):""} · opened ${fmt(x.open)} · ${saRate(x,today())}%</small>
  <div class="stats" style="margin:8px 0 0">${tile("Value now",inr(Math.round(s.now)))}${tile(s.since?"Put in since "+fmt(s.since):"You put in",inr(s.putIn))}${tile(s.since?"Interest since "+fmt(s.since):"Interest",inr(Math.round(s.intr)))}</div>${x.type!="rd"&&!s.closed&&s.R&&s.R.acc>0?`<small style="color:var(--mute);display:block;margin-top:6px">In the bank now: ${inr(Math.round(s.R.bal))} · ${inr(Math.round(s.R.acc))} interest building up, added on 31 March</small>`:""}
  ${ln?`<small style="color:var(--mute);display:block;margin-top:6px">${ln}</small>`:""}
  <small style="color:var(--mute);display:block;margin-top:6px">${s.closed?"Matured on "+fmt(s.mat):`Matures ${fmt(s.mat)} · about ${inr(Math.round(s.proj))}${s.fut?" if you keep paying "+inr(planAmt(x))+(x.type!="rd"&&x.plan&&x.plan.f=="y"?" a year":" a month"):" with no more deposits"}`}${x.type!="rd"&&s.fyDep>150000?` · <b style="color:var(--late)">over ₹1.5 lakh this year</b>`:""}</small></div>
  ${s.closed?"":`<div class="acts"><button class="btn sm" data-act="saDep" data-id="${x.id}">Deposit</button><button class="btn sm ghost" data-act="saPast" data-id="${x.id}">Past deposits</button></div>`}</div>`}
function poCard(x){const o=depInfo(x)||{},nx=x.closed?null:poNext(x),n=o.md&&!x.closed?dl(o.md):null,m=v=>inr(Math.round(v)),yrs=Math.round(o.T||0),
    chip=x.closed?`<span class="chip">Closed</span>`:n!==null&&n<=30?`<span class="chip">${n<0?"Matured "+fmt(o.md):when(n)}</span>`:nx&&dl(nx.d)<=7?`<span class="chip">Interest ${when(dl(nx.d)).toLowerCase()}</span>`:"";
  const info=x.closed?"Closed"+(x.closedOn?" on "+fmt(x.closedOn):""):[nx?`Next interest ${m(nx.a)} on ${fmt(nx.d)}`:"",o.md?`${nx?"matures":"Matures"} ${fmt(o.md)}${o.mat?" · "+(o.pay?m(o.P)+" back":m(o.mat)):""}`:""].filter(Boolean).join(" · ");
  return `<div class="card ${n!==null&&n<0?"late":n!==null&&n<=30?"soon":""}" style="margin-bottom:8px;cursor:pointer" data-act="editInv" data-id="${x.id}"><div class="hbl"><b>${esc(x.name)}</b>${chip}</div>
  <small style="color:var(--mute);display:block">${poShort(o.dk)}${o.dk=="potd"&&yrs?" "+yrs+(yrs==1?" year":" years"):""}${x.holder?" · "+esc(x.holder):""}${x.no?" · "+esc(x.no):""}${o.sd?" · opened "+fmt(o.sd):""}${o.r?" · "+o.r+"%":""}</small>
  <div class="stats" style="margin:8px 0 0">${tile("Deposited",m(o.P||+x.inv||0))}${o.pay?tile("Interest "+EVERY[o.pay.every],m(o.pay.amt)):tile("At maturity",o.mat?m(o.mat):"–")}${tile("Value now",x.closed?"–":m(invVal(x)))}</div>
  ${info?`<small style="color:var(--mute);display:block;margin-top:6px">${info}</small>`:""}</div>`}
saHtml=function(){const L=S.sacc,P=S.inv.filter(x=>isPO(x)&&!x.closed),PC=S.inv.filter(x=>isPO(x)&&x.closed);let h=`<h2>My savings schemes</h2>`;
  if(L.length||P.length){const tot=L.reduce((s,x)=>s+saState(x).now,0)+P.reduce((s,x)=>s+invVal(x),0),c80=L.filter(x=>x.type!="rd").reduce((s,x)=>s+saState(x).fyDep,0),pin=L.reduce((s,x)=>s+saState(x).putIn,0)+P.reduce((s,x)=>s+(+x.inv||0),0);
    h+=`<div class="stats" style="grid-template-columns:1fr 1fr;margin:0 0 8px">${tile("Value today",inr(Math.round(tot)))}${L.some(x=>x.type!="rd")?tile("SSY + PPF this year",inr(c80),"","for "+TAXSEC()+", since "+fmt(fyStart())):tile("You put in",inr(pin))}</div>`;
    h+=L.map(saCard).join("")+P.map(poCard).join("")}
  else h+=`<div class="empty">Add the post office schemes you have: SSY (Selvamagal), PPF, RD, Time Deposit, NSC, KVP, MIS or SCSS. The app follows each scheme’s rules for the rate, the interest, what is due and the maturity.</div>`;
  if(PC.length)h+=`<details><summary>Matured or closed deposits (${PC.length})</summary>${PC.map(poCard).join("")}</details>`;
  return h+`<div class="acts"><button class="btn ghost" data-act="saAdd">+ Add scheme account</button></div><p class="note">Balances are estimates from the rates in force when each deposit was made. Check them against your passbook, and correct them from the account details if needed.</p>`};
/* Investments: post office deposits move to Schemes, with a link */
invSection=function(){const A=S.inv.filter(x=>!isPO(x)),L=A.filter(x=>!x.closed),cl=A.filter(x=>x.closed),ti=L.reduce((s,x)=>s+iv(+x.inv||0,x.cur),0),tv=L.reduce((s,x)=>s+iv(invVal(x),x.cur),0),g=tv-ti,by={};L.forEach(x=>{by[IK[x.kind]]=(by[IK[x.kind]]||0)+iv(invVal(x),x.cur)});
  const P=S.inv.filter(x=>isPO(x)&&!x.closed),pv=P.reduce((s,x)=>s+iv(invVal(x),x.cur),0),
    link=P.length?`<div class="card" data-act="wSeg" data-id="sch" style="cursor:pointer;margin:8px 0"><div class="hbl"><b>Post office deposits (${P.length})</b><b>${fm(pv)}</b></div><small style="color:var(--mute)">${esc(P.slice(0,3).map(x=>x.name).join(", "))}${P.length>3?"…":""} · under Schemes, with your RD, SSY and PPF</small></div>`:"";
  return `<h2>Investments</h2>`+(L.length?`<div class="card"><div class="hbl"><span>Current value</span><b>${fm(tv)}</b></div><small style="color:var(--mute)">${g>=0?"Gain":"Loss"} of ${fm(Math.abs(g))}${ti?` (${(g/ti*100).toFixed(1)}%)`:""} on ${fm(ti)} invested</small><div style="height:8px"></div>${hbars(Object.entries(by).sort((a,b)=>b[1]-a[1]))}</div><div style="height:8px"></div>`+L.map(iRow).join(""):P.length?"":`<div class="empty">No investments yet. Add an FD, fund, PPF or gold.</div>`)+link+
  (cl.length?`<details><summary>Closed (${cl.length})</summary>${cl.map(iRow).join("")}</details>`:"")+`<div class="acts"><button class="btn" data-act="addInv">+ Investment</button><button class="btn ghost" data-act="casOpen">Import mutual fund statement</button></div>`};
/* Overview: post office deposits count as savings schemes */
{const _np=nwParts2;nwParts2=function(){const R=_np(),to=V(),po=S.inv.filter(x=>isPO(x)&&!x.closed).reduce((s,x)=>s+cv(invVal(x),x.cur||"INR",to),0);if(!po)return R;
  const a=R.find(r=>r[0]=="Investments"),b=R.find(r=>r[0]=="Savings schemes");if(a)a[1]-=po;if(b)b[1]+=po;else{const i=R.findIndex(r=>r[0]=="Investments");R.splice(i<0?R.length:i+1,0,["Savings schemes",po])}
  return R.filter(r=>Math.abs(r[1])>0.5)}}
/* ---------- RD, SSY and PPF: the scheme rules on the account form and deposits ---------- */
const nth=n=>n+(n%100>10&&n%100<14?"th":["th","st","nd","rd"][n%10]||"th");
function saRule(t,open,amt,f){if(t=="rd"){const late=open&&+open.slice(8)>15,e=amt&&(amt<100?"An RD needs at least ₹100 a month.":amt%10?"The monthly instalment must be in multiples of ₹10.":"");
    return (e?`<b style="color:var(--late)">${e}</b> `:"")+`Minimum ₹100 a month, in multiples of ₹10, for 60 months. ${open?`Opened on the ${nth(+open.slice(8))}, so each month’s instalment is due by ${late?"the last working day":"the 15th"}.`:"Opened on the 1st to 15th: pay by the 15th each month; opened later: by the last working day."} A late month costs ₹1 for every ₹100, for each month it is late. After 4 missed months the account is discontinued; it can be revived within 2 months. A loan of up to half the balance is allowed after 12 deposits, and closing early after 3 years, at the savings account rate.`}
  if(t!="ssy"&&t!="ppf")return "";const min=t=="ssy"?250:500,yr=f=="m"?amt*12:f=="y"?amt:0,e=amt&&amt%50?"Deposits must be in multiples of ₹50.":yr>150000?"That comes to more than ₹1.5 lakh a year, the most this account takes.":yr&&yr<min?`At least ${inr(min)} a year is needed to keep it active.`:"";
  return (e?`<b style="color:var(--late)">${e}</b> `:"")+(t=="ssy"?"For a girl under 10. ₹250 to ₹1.5 lakh in each financial year (April to March), in multiples of ₹50. Deposits for 15 years; it matures 21 years after opening. A year with less than ₹250 costs ₹50 to revive. Up to half can be taken out for her education after she turns 18 or passes 10th standard. Money paid in by the 5th earns interest for that month."
    :"₹500 to ₹1.5 lakh in each financial year (April to March), in multiples of ₹50. Matures on 1 April after 15 full financial years and can be extended by 5 years at a time. Part of it can be taken out from the 7th year. A year with less than ₹500 makes it inactive; reviving costs ₹50 for each year missed plus ₹500 for each of those years. Money paid in by the 5th earns interest for that month.")}
function saErr(t,open,amt,f,dob){if(t=="rd"){if(amt<100)return "An RD needs a monthly instalment of at least ₹100.";if(amt%10)return "The monthly instalment must be in multiples of ₹10."}
  if(t=="ssy"||t=="ppf"){const min=t=="ssy"?250:500,yr=f=="m"?amt*12:f=="y"?amt:0;if(amt%50)return "Deposits must be in multiples of ₹50.";if(yr>150000)return "That comes to more than ₹1.5 lakh a year, the most this account takes.";if(yr&&yr<min)return `At least ${inr(min)} a year is needed to keep the account active.`}
  if(t=="ssy"&&dob&&open){if(dob>open)return "The date of birth is after the opening date.";if(addM(dob,120)<=open)return "An SSY account can only be opened before the girl turns 10."}return ""}
{const _sf=saForm;saForm=function(x,pre){_sf(x,pre);try{const ty=$("#f_ty");if(!ty)return;if(!x)ty.insertAdjacentHTML("beforeend",Object.entries(POS).map(([k,o])=>`<option value="po:${k}">${esc(o.n)}</option>`).join(""));
  const hold=$("#f_holder").closest(".two"),plan=$("#f_plan"),prow=plan.closest(".two"),fq=$("#f_freq").closest("div"),dy=$("#f_day").closest("div"),gen=[...$("#over").querySelectorAll("p.note")].find(p=>/usual deposit is the monthly instalment/.test(p.textContent));
  hold.insertAdjacentHTML("afterend",`<div id="f_dobw">${F("f_dob","Girl’s date of birth (optional)",x&&x.dob||"","date")}</div>`);prow.insertAdjacentHTML("afterend",`<p class="note" id="f_sarule" style="margin-top:4px"></p>`);if(gen)gen.remove();
  const pc=$("#f_pay").closest("div"),drow=dy.parentElement,PH={ssy:["Selvamagal for Anika","Girl’s name"],ppf:["PPF for Arun","Holder’s name"],rd:["Post office RD","Name on the passbook"]};
  const sync=()=>{const t=ty.value;if(t.startsWith("po:"))return poForm(null,{dk:t.slice(3),holder:v("f_holder").trim(),no:v("f_no").trim(),po:v("f_po").trim(),sd:v("f_open"),inv:+v("f_plan")||""});
    const rd=t=="rd";fq.style.display=dy.style.display=rd?"none":"";(rd?prow:drow).appendChild(pc);const ph=PH[t];if(ph){$("#f_name").placeholder=ph[0];$("#f_holder").placeholder=ph[1]}plan.previousElementSibling.textContent=rd?"Monthly instalment (₹)":"Usual deposit (₹)";$("#f_dobw").style.display=t=="ssy"?"":"none";
    $("#f_sarule").innerHTML=saRule(t,v("f_open"),+v("f_plan")||0,v("f_freq"))};
  ty.addEventListener("change",sync);["f_open","f_plan","f_freq"].forEach(id=>{const e=$("#"+id);if(e){e.addEventListener("input",sync);e.addEventListener("change",sync)}});sync()}catch(e){console.warn(e)}}}
{const _ss=ACT.saSave;ACT.saSave=async function(id,...a){const old=S.sacc.find(q=>q.id==id),ty=old?old.type:v("f_ty"),dob=$("#f_dob")?v("f_dob"):null;if(String(ty).startsWith("po:"))return;
  const err=saErr(ty,v("f_open"),+v("f_plan")||0,v("f_freq"),dob);if(err)return toast(err);const before=new Set(S.sacc.map(q=>q.id)),r=await _ss.call(this,id,...a);
  if(dob!=null&&ty=="ssy"){const x=id?S.sacc.find(q=>q.id==id):S.sacc.find(q=>!before.has(q.id));if(x&&(x.dob||"")!=dob){x.dob=dob;x.ut=Date.now();save()}}return r}}
{const _sd=ACT.saDep;ACT.saDep=function(id,...a){const r=_sd.call(this,id,...a);try{const x=S.sacc.find(q=>q.id==id),amt=$("#f_amt"),row=amt&&amt.closest(".two");if(!x||!row)return r;
  if(x.type=="rd"){const st=rdStatus(x);if(st.miss&&st.inst)amt.value=st.inst*Math.min(st.miss,60-st.paid);
    row.insertAdjacentHTML("afterend",`<p class="note">${st.paid} of 60 instalments paid. ${st.miss?`<b style="color:var(--late)">${st.miss} missed${st.disc?"; the account counts as discontinued":""}.</b> Default fee ${inr(st.fee)}. `:st.next?`Next one due by ${fmt(st.next)}. `:""}Pay whole instalments of ${inr(st.inst)}.</p>${st.miss?F("f_fee","Default fee paid (₹)",st.fee,"number"):""}`)}
  else{const fs=fyOf(today())+"-04-01",fy=deps(x).filter(q=>q.d>=fs).reduce((s,q)=>s+ +q.a,0);row.insertAdjacentHTML("afterend",`<p class="note">${x.type=="ssy"?"₹250":"₹500"} to ₹1.5 lakh a year, in multiples of ₹50. ${inr(fy)} put in since ${fmt(fs)}.</p>`)}}catch(e){}return r}}
{const _ds=ACT.saDepSave;ACT.saDepSave=function(id,...a){const x=S.sacc.find(q=>q.id==id),amt=+v("f_amt")||0,fee=+v("f_fee")||0,acc=v("f_acc"),d=v("f_date")||today();
  if(x&&amt){if(x.type=="rd"){const i=+x.inst||0;if(i&&amt%i)return toast(`Pay whole instalments of ${inr(i)}.`)}
    else{if(amt%50)return toast(SAS[x.type]+" deposits are in multiples of ₹50.");const fs=fyOf(d)+"-04-01",fe=addM(fs,12),fy=deps(x).filter(q=>q.d>=fs&&q.d<fe).reduce((s,q)=>s+ +q.a,0);if(fy+amt>150000)return toast(`That takes ${fs.slice(0,4)}-${String(+fs.slice(0,4)+1).slice(2)} past ₹1.5 lakh, the most ${SAS[x.type]} takes in a year.`)}}
  const r=_ds.call(this,id,...a);if(fee>0&&acc&&x){const A=S.acc.find(q=>q.id==acc);if(A){addTx({kind:"out",acc:A.id,amt:cv(fee,"INR",A.cur),cur:A.cur,cat:"Charges",note:"RD default fee: "+x.name,date:d});save();render()}}return r}}
{const _si=saInfoSheet;saInfoSheet=function(id){_si(id);try{const x=S.sacc.find(q=>q.id==id),sub=$("#over p.sub");if(!x||!sub)return;const ln=saLine(x,saState(x)),dob=x.type=="ssy"&&x.dob?` She turns 18 on ${fmt(addM(x.dob,216))}; up to half can be taken out for her education after that.`:"";
  if(ln||dob)sub.insertAdjacentHTML("afterend",`<p class="note">${ln}${dob}</p>`)}catch(e){}}}
/* ---------- the scheme list and calculator ---------- */
{const N={ppf:"15 years. ₹500 to ₹1.5 lakh a year, in multiples of ₹50. Tax-free interest.",ssy:"For a girl under 10. ₹250 to ₹1.5 lakh a year, in multiples of ₹50. Deposits for 15 years, matures at 21 years.",
  scss:"Age 60+. 5 years, interest paid every quarter. ₹1,000 to ₹30 lakh, in multiples of ₹1,000.",nsc:"5 years, interest added yearly and paid at maturity. From ₹1,000, in multiples of ₹100.",
  kvp:"Money doubles in 115 months. From ₹1,000, in multiples of ₹100.",mis:"5 years, interest paid monthly. ₹1,000 to ₹9 lakh (₹15 lakh joint), in multiples of ₹1,000.",
  td1:"Interest paid every year. From ₹1,000, in multiples of ₹100.",td2:"Interest paid every year. From ₹1,000, in multiples of ₹100.",td3:"Interest paid every year. From ₹1,000, in multiples of ₹100.",td5:"Interest paid every year. From ₹1,000, in multiples of ₹100. Counts for 80C.",
  rd:"Monthly deposit for 5 years. From ₹100 a month, in multiples of ₹10.",sb:"Withdraw any time. Opens with ₹500."};SCH.forEach(s=>{if(N[s.id])s.note=N[s.id]})}
const schDk=s=>s.calc=="td"?"potd":["nsc","kvp","mis","scss"].includes(s.calc)?s.calc:"";
function schLimit(s,A){if(!A)return "";const dk=schDk(s);if(dk)return poCheck(dk,A,"s");if(s.calc=="rd")return A<100?"The smallest monthly deposit is ₹100.":A%10?"The monthly deposit must be in multiples of ₹10.":"";
  if(s.calc=="ppf"||s.calc=="ssy"){const min=s.calc=="ssy"?250:500;return A<min?`The smallest yearly deposit is ${inr(min)}.`:A>150000?"The most is ₹1.5 lakh a year.":A%50?"Deposits are in multiples of ₹50.":""}
  if(s.calc=="sb")return A<500?"A post office savings account opens with ₹500.":"";return ""}
{const _sc=schCalc;schCalc=function(s,A){if(s.calc!="td")return _sc(s,A);const a=A*(Math.pow(1+s.rate/400,4)-1),n=s.yrs;return {O:[["You put in",A],["Interest earned",a*n],["Paid every year",a],["Money back at the end",A]],mat:A,inv:A,mo:12*n}}}
schSheet=function(id,amt){const s=SCH.find(x=>x.id==id);if(!s)return;const A=+amt||0,R=A?schCalc(s,A):null,lim=schLimit(s,A),fixed=schDk(s)||s.calc=="rd";
  sheet(`<h2>${esc(s.name)}</h2><p class="sub">${s.rate.toFixed(1)}% a year · ${esc(s.note)}</p>${F("sch_amt",s.ask+" (₹)",A||"","number")}<div class="acts"><button class="btn" data-act="schCalc" data-id="${id}">Calculate</button></div>
  ${lim?`<p class="note" style="color:var(--late)">${esc(lim)}</p>`:""}
  ${R?`<div class="card">${R.O.map(([l,v])=>`<div class="hbl" style="margin:6px 0"><span>${l}</span><b>${inr(Math.round(v))}</b></div>`).join("")}<small style="color:var(--mute)">${R.mo?"Over "+(R.mo%12?R.mo+" months":R.mo/12+(R.mo==12?" year":" years"))+", ending around "+fmt(addM(today(),R.mo))+". ":""}${fixed?"The rate on the day you open it stays for the whole term.":"Assumes today’s rate stays the same."}</small></div><div class="acts"><button class="btn ghost" data-act="schAdd" data-id="${id}">${id=="sb"?"Add as my account":"Add to my schemes"}</button></div>`:""}`)};
{const _sa=ACT.schAdd;ACT.schAdd=function(id){const s=SCH.find(x=>x.id==id),A=+v("sch_amt")||0;if(!s)return _sa(id);const dk=schDk(s);
  if(dk)return poForm(null,{dk,term:s.yrs||5,inv:A||"",sd:today()});
  if(id=="sb"){accForm();setTimeout(()=>{const set=(k,val)=>{const e=$("#"+k);if(e)e.value=val};set("f_name","Post Office Savings");set("f_type","bank");set("f_cur","INR");if(A)set("f_open",A)},30);return}
  return _sa(id)}}
