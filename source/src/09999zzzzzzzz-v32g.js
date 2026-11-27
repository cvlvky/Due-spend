/* ===== Version 32.7: deposits work out their maturity (bank FDs and post office schemes), or use the amount on the certificate ===== */
const DK={bank:"Bank FD: interest added to it",bankp:"Bank FD: interest paid out",potd:"Post office Time Deposit (1, 2, 3 or 5 years)",nsc:"NSC: National Savings Certificate (5 years)",kvp:"Kisan Vikas Patra (doubles your money)",mis:"Post office Monthly Income Scheme (5 years)",scss:"Senior Citizens Savings Scheme (5 years)"};
const DK_PO=new Set(["potd","nsc","kvp","mis","scss"]);
/* the rates the government set for each quarter; a deposit keeps the rate of the day it was opened */
const PORATE=[["2020-04-01",{td1:5.5,td2:5.5,td3:5.5,td5:6.7,nsc:6.8,kvp:6.9,kvpm:124,mis:6.6,scss:7.4}],
  ["2022-10-01",{td1:5.5,td2:5.7,td3:5.8,td5:6.7,nsc:6.8,kvp:7.0,kvpm:123,mis:6.7,scss:7.6}],
  ["2023-01-01",{td1:6.6,td2:6.8,td3:6.9,td5:7.0,nsc:7.0,kvp:7.2,kvpm:120,mis:7.1,scss:8.0}],
  ["2023-04-01",{td1:6.8,td2:6.9,td3:7.0,td5:7.5,nsc:7.7,kvp:7.5,kvpm:115,mis:7.4,scss:8.2}],
  ["2023-07-01",{td1:6.9,td2:7.0,td3:7.0,td5:7.5,nsc:7.7,kvp:7.5,kvpm:115,mis:7.4,scss:8.2}],
  ["2024-01-01",{td1:6.9,td2:7.0,td3:7.1,td5:7.5,nsc:7.7,kvp:7.5,kvpm:115,mis:7.4,scss:8.2}]];
const poRow=sd=>{if(!sd||sd<PORATE[0][0])return null;let r=null;for(const [d,v] of PORATE)if(d<=sd)r=v;return r};
const tdYears=(sd,md)=>{if(!sd||!md)return 0;const y=(D(md)-D(sd))/31557600000;return [1,2,3,5].find(n=>Math.abs(y-n)<0.08)||0};
function poRate(dk,sd,md){const R=poRow(sd);if(!R)return 0;if(dk=="potd"){const n=tdYears(sd,md)||(!md?5:0);return n?R["td"+n]:0}return R[dk]||0}
function poMature(dk,sd,md){if(!sd)return "";if(dk=="potd")return addM(sd,12*(tdYears(sd,md)||5));if(dk=="kvp"){const R=poRow(sd);return R?addM(sd,R.kvpm):""}return addM(sd,60)}
/* a deposit named as a post office one ("Post office 5 year", "NSC", "KVP") is worked out without asking */
function dkGuess(name){const n=name||"";if(/\b(RD|PPF|SSY)\b|recurring|sukanya/i.test(n))return "";
  if(/\bNSC\b|national\s+savings/i.test(n))return "nsc";if(/\bKVP\b|kisan\s+vikas/i.test(n))return "kvp";
  if(/\bSCSS\b|senior\s+citizen/i.test(n))return "scss";if(/\bMIS\b|monthly\s+income/i.test(n))return "mis";
  if(/post\s*office|\bP\.?\s?O\.?\s+(FD|TD|deposit)\b|time\s+deposit|\bPOTD\b/i.test(n))return "potd";return ""}
const dkOf=x=>!x||x.kind!="fd"?"":x.dk||dkGuess(x.name)||(x.rt?"bank":"");
const yrsBetween=(a,b)=>(D(b)-D(a))/31557600000;
/* what a deposit pays, and what it is worth on a date */
function depInfo(x){if(!x||x.kind!="fd")return null;const P=+x.inv||0,dk=dkOf(x)||"bank",sd=x.sd||"",md=x.mdate||"",r=+x.rt||(DK_PO.has(dk)?poRate(dk,sd,md):0),T0=sd&&md?yrsBetween(sd,md):0,T=Math.abs(T0-Math.round(T0*4)/4)<0.01?Math.round(T0*4)/4:T0,o={dk,P,r,sd,md,T,mamt:+x.mamt||0};if(!P)return o;
  if(dk=="kvp"){o.mat=2*P;o.total=P;o.cum=true}
  else if(!(r>0&&T>0))return o;
  else if(dk=="bank"){o.mat=P*Math.pow(1+r/400,4*T);o.total=o.mat-P;o.cum=true}
  else if(dk=="nsc"){o.mat=P*Math.pow(1+r/100,T);o.total=o.mat-P;o.cum=true}
  else if(dk=="potd"){const a=P*(Math.pow(1+r/400,4)-1),n=Math.round(T);o.pay={every:"year",amt:a,n};o.total=a*n;o.mat=P+a}
  else if(dk=="mis"){const a=P*r/1200,n=Math.round(T*12);o.pay={every:"month",amt:a,n};o.total=a*n;o.mat=P}
  else if(dk=="scss"||dk=="bankp"){const a=P*r/400,n=Math.round(T*4);o.pay={every:"quarter",amt:a,n};o.total=a*n;o.mat=P}
  if(o.mamt&&o.cum){o.calc=o.mat;o.mat=o.mamt;o.total=o.mamt-P}return o}
/* value today: grows to the maturity amount; for schemes that pay interest out, the money plus the interest since the last payment */
function depNow(x,on){const o=depInfo(x);if(!o||!o.P||!o.sd||x.closed)return 0;const d=on||today();if(d<o.sd)return 0;const t=Math.min(yrsBetween(o.sd,d),o.T||yrsBetween(o.sd,d));
  if(o.cum&&o.mat&&o.T>0)return Math.round(o.P*Math.pow(o.mat/o.P,Math.max(0,t)/o.T));
  if(o.pay&&o.r){const per=o.pay.every=="year"?1:o.pay.every=="quarter"?0.25:1/12,f=(t%per)/per;return Math.round(o.P+o.pay.amt*f)}return 0}
const EVERY={year:"a year",quarter:"a quarter",month:"a month"};
function depSay(x,form){const o=depInfo(x);if(!o||!o.P)return "";const cur=x.cur||"INR",m=v=>fmx(Math.round(v),cur);
  if(!o.sd)return "Add the start date to work out the maturity.";if(!o.mat){if(o.r)return "Add the maturity date to work out the maturity amount.";
    if(DK_PO.has(o.dk)&&o.sd<PORATE[0][0])return "The rate for a deposit opened before April 2020 isn’t in the app. Type the rate from your certificate.";
    if(o.dk=="potd"&&o.md&&!tdYears(o.sd,o.md))return "A post office Time Deposit runs for 1, 2, 3 or 5 years. Check the maturity date, or type the rate from your certificate.";
    return "Add the interest rate to work out the maturity amount."}
  const now=depNow(x),L=[];
  if(o.pay){L.push(`Interest of <b>${m(o.pay.amt)}</b> ${EVERY[o.pay.every]}, ${o.pay.n} times (${m(o.total)} in all).`);L.push(`On ${fmt(o.md)} you get <b>${m(o.P)}</b> back${o.dk=="potd"?", with the last year’s interest":""}.`);
    if(o.dk=="potd")L.push(`The post office works out the interest every quarter and pays it once a year. Interest you don’t collect earns nothing more, so have it paid into your savings account.`)}
  else L.push(`Maturity amount: <b>${m(o.mat)}</b> on ${fmt(o.md)} (${m(o.total)} interest).${o.mamt&&o.calc?` From your certificate; the app works out ${m(o.calc)}.`:""}`);
  if(now&&!x.val)L.push(`Worth about ${m(now)} today.`);
  return L.join(" ")}
/* the form: what kind of deposit, the official rate, the maturity date and amount */
{const _if=iForm;iForm=function(x){_if(x);try{const rt=$("#f_rt"),row=rt&&rt.closest(".two");if(!row)return;const dk=dkOf(x),guessed=!!(x&&!x.dk&&dk&&dk!="bank");
  const k2=$("#f_kind2"),trow=k2&&k2.closest(".two");
  (trow||row).insertAdjacentHTML("afterend",`<div id="f_dkw">${SEL("f_dk","Kind of deposit",[["","Choose…"],...Object.entries(DK)],dk)}</div>`);
  row.insertAdjacentHTML("afterend",`<div id="f_depw">${F("f_mamt","Maturity amount, if your certificate shows it (optional)",x&&x.mamt||"","number")}<p class="note" id="f_depsum" style="margin-top:4px"></p></div>`);
  const w=$("#f_depw"),wk=$("#f_dkw"),sync=()=>{w.style.display=wk.style.display=k2.value=="fd"?"":"none";$("#f_rt").closest("div").querySelector("label")&&($("#f_rt").closest("div").querySelector("label").textContent=k2.value=="fd"?"Interest % per year":"Interest % per year (FDs)");depLive()};
  if(guessed)$("#f_dk").dataset.auto="1";k2.addEventListener("change",sync);sync();if(DK_PO.has(dk)&&!$("#f_rt").value)depLive("open")}catch(e){console.warn(e)}}}
function depForm(){const g=id=>{const e=$("#"+id);return e?e.value:""};return {kind:g("f_kind2"),dk:g("f_dk"),inv:+g("f_inv")||0,sd:g("f_sd"),mdate:g("f_md"),rt:+g("f_rt")||0,mamt:+g("f_mamt")||0,cur:g("f_cur")||"INR",val:+g("f_val")||0}}
/* fill the official rate and the maturity date when they are empty or were filled by the app */
function depAuto(changed){const f=depForm(),rt=$("#f_rt"),md=$("#f_md");if(f.kind=="fd"&&!DK_PO.has(f.dk)&&rt&&rt.dataset.auto=="1"){rt.value="";rt.dataset.auto=""}
  if(f.kind!="fd"||!DK_PO.has(f.dk)||!f.sd)return;
  if(md&&(!md.value||md.dataset.auto=="1")&&(changed=="f_dk"||changed=="f_sd"||!md.value)){const d=poMature(f.dk,f.sd,f.dk=="potd"?md.value:"");if(d){md.value=d;md.dataset.auto="1"}}
  if(rt&&(!rt.value||rt.dataset.auto=="1")){const r=poRate(f.dk,f.sd,$("#f_md").value);if(r){rt.value=r;rt.dataset.auto="1"}}}
function depLive(changed){if(!$("#f_depsum"))return;if(changed)depAuto(changed);const f=depForm(),s=$("#f_depsum");
  const k=$("#f_dk"),note=k&&k.dataset.auto=="1"&&f.dk?" <i>Kind picked from the name. Change it if your certificate shows another scheme.</i>":"";
  s.innerHTML=f.kind!="fd"?"":!f.dk?(f.inv?"Choose the kind of deposit, and the app works out the maturity amount.":""):(depSay(f,true)||"")+note}
document.addEventListener("change",e=>{const id=e.target&&e.target.id;if(["f_dk","f_sd","f_md","f_rt","f_inv","f_mamt","f_cur"].includes(id)){if(id=="f_rt"||id=="f_md"||id=="f_dk"){e.target.dataset.auto=""}depLive(id)}});
/* typing the name picks the kind, until you choose one yourself */
document.addEventListener("input",e=>{if(!e.target||e.target.id!="f_name")return;const k=$("#f_dk"),k2=$("#f_kind2");if(!k||!k2||k2.value!="fd"||(k.value&&k.dataset.auto!="1"))return;
  const g=dkGuess(e.target.value);if(g==k.value)return;
  if(g){k.value=g;k.dataset.auto="1"}else{k.value="";k.dataset.auto="";["f_rt","f_md"].forEach(id=>{const q=$("#"+id);if(q&&q.dataset.auto=="1"){q.value="";q.dataset.auto=""}})}depLive("f_dk")});
document.addEventListener("input",e=>{const id=e.target&&e.target.id;if(["f_inv","f_rt","f_mamt"].includes(id)){if(id=="f_rt")e.target.dataset.auto="";depLive()}});
{const _si=ACT.saveInv;ACT.saveInv=function(id,...a){const has=!!$("#f_dk"),dk=has?v("f_dk"):"",mamt=has?+v("f_mamt")||0:0,before=new Set(S.inv.map(x=>x.id));const r=_si.call(this,id,...a);
  if(has){const x=id?S.inv.find(q=>q.id==id):S.inv.find(q=>!before.has(q.id));if(x&&((x.dk||"")!==dk||(+x.mamt||0)!==mamt)){put("inv",stamp({...x,dk,mamt},x));save();render()}}return r}}
/* the list: what it pays, not a compounded guess */
{const _ir=iRow;iRow=function(x){let h=_ir(x);try{const o=depInfo(x);if(o&&o.mat&&!x.closed){const m=v=>fmx(Math.round(v),x.cur);h=h.replace(/ · est\. [^<·]*/,"");
  const lab=o.pay?` · ${m(o.pay.amt)} ${EVERY[o.pay.every]}`:` · ${m(o.mat)} at maturity`;h=h.replace(/(<small>[^<]*?matures [^<·]*)/,"$1"+lab)}}catch(e){}return h}}
