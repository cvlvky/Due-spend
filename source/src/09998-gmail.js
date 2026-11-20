/* ===== Read bank emails straight from Gmail (Android app, read-only access) ===== */
const GM={tok:"",at:0,busy:false,api:"https://gmail.googleapis.com/gmail/v1/users/me",scope:"https://www.googleapis.com/auth/gmail.readonly"};
const gmLS=(k,v2)=>{try{if(v2===undefined)return localStorage.getItem("ds-gm-"+k)||"";if(v2===null)localStorage.removeItem("ds-gm-"+k);else localStorage.setItem("ds-gm-"+k,v2)}catch(e){return ""}};
const gmOn=()=>gmLS("on")=="1";
const GMQ='(debited OR credited OR spent OR "transaction" OR purchase OR "card ending" OR "a/c" OR "account no" OR "has been used" OR "payment of" OR transferred OR UPI OR IMPS OR NEFT) -category:promotions -category:social -subject:(statement OR newsletter OR offer)';
async function gmToken(ask){if(GM.tok&&Date.now()-GM.at<45*60e3)return GM.tok;if(!isApp())throw new Error("Reading Gmail works in the Android app");
  const r=await NP("DueNative","driveToken",{interactive:!!ask,scopes:[GM.scope]});if(!r||!r.token)throw new Error("No access to Gmail");GM.tok=r.token;GM.at=Date.now();gmLS("need",null);return GM.tok}
async function gmGet(path,ask){for(let i=0;i<2;i++){const t=await gmToken(ask),r=await fetch(GM.api+path,{headers:{Authorization:"Bearer "+t}});if(r.status==401&&i==0){GM.tok="";continue}
  if(!r.ok){let m="";try{m=(await r.json()).error.message}catch(e){}throw new Error("Gmail: "+(m||r.status))}return r.json()}}
const b64url=s=>{try{const b=atob(String(s||"").replace(/-/g,"+").replace(/_/g,"/")),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new TextDecoder().decode(u)}catch(e){return ""}};
const htmlTxt=h=>String(h||"").replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi," ").replace(/<br\s*\/?>|<\/(p|div|tr|td|li|h\d)>/gi,"\n").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#8377;|&#x20b9;/gi,"₹").replace(/&[a-z#0-9]+;/gi," ").replace(/[ \t]+/g," ").replace(/\s*\n\s*/g,"\n").trim();
function gmBody(p){let plain="",html="";(function walk(x){if(!x)return;if(x.mimeType=="text/plain"&&x.body&&x.body.data)plain+=b64url(x.body.data)+"\n";else if(x.mimeType=="text/html"&&x.body&&x.body.data)html+=b64url(x.body.data);(x.parts||[]).forEach(walk)})(p);
  return (plain.trim()||htmlTxt(html)).slice(0,3000)}
async function gmScan(ask,days){if(GM.busy)return 0;GM.busy=true;try{
  const since=gmLS("last")?Math.min(14,Math.max(1,Math.ceil((Date.now()-Date.parse(gmLS("last")))/864e5)+1)):(days||3);
  const L=(await gmGet("/messages?maxResults=60&q="+encodeURIComponent(GMQ+" newer_than:"+since+"d"),ask)).messages||[];
  const seen=new Set((S.cfg.mailSeen||[]).map(String)),items=[];
  for(const m of L){if(seen.has("g"+m.id))continue;try{const d=await gmGet("/messages/"+m.id+"?format=full",false),H={};(d.payload&&d.payload.headers||[]).forEach(h=>H[h.name.toLowerCase()]=h.value);
    items.push({id:"g"+m.id,from:H.from||"",subject:H.subject||"",body:gmBody(d.payload)||d.snippet||"",time:+d.internalDate||Date.now()})}catch(e){console.warn("gmail msg",e)}}
  const before=(S.cfg.smsq||[]).length;if(items.length)await mailTake({update:async()=>{}},{items});
  gmLS("last",new Date().toISOString());gmLS("err",null);return Math.max(0,(S.cfg.smsq||[]).length-before)}
  catch(e){const m=String(e&&e.message||e);gmLS("err",m);if(/needs-consent|cancel/i.test(m))gmLS("need","1");throw e}finally{GM.busy=false}}
async function gmAuto(){if(!gmOn()||!isApp()||GM.busy)return;const last=gmLS("last");if(last&&Date.now()-Date.parse(last)<20*60e3)return;try{await gmScan(false)}catch(e){console.warn("gmail scan",e)}}
function gmStatus(){if(!gmOn())return "Off";if(gmLS("need"))return "Needs you to sign in again";const l=gmLS("last");return l?"Checked "+fmt(l.slice(0,10))+", "+new Date(l).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"Not checked yet"}
function gmSheet(){if(!isApp())return sheet(`<h2>Read Gmail</h2><p class="sub">This works in the Android app.</p>`);
  sheet(`<h2>Read bank emails from Gmail</h2><p class="sub">The app looks only for payment emails (debited, credited, card used) from the last few days, every time you open it. They go to “Payments to review”, the same as bank SMS. Read-only: it can’t send, delete or change mail.</p>
  <div class="card"><div class="hbl"><span>Status</span><b>${esc(gmStatus())}</b></div>${gmLS("err")&&gmOn()?`<p class="note" style="color:var(--late);margin:6px 0 0">${esc(gmLS("err"))}</p>`:""}</div>
  <div class="acts">${gmOn()?`<button class="btn" data-act="gmNow">Check now</button><button class="btn ghost" data-act="gmOff">Turn off</button>`:`<button class="btn" data-act="gmStart">Connect Gmail</button>`}</div>
  <h3>Outlook emails</h3><p class="note">Forward bank emails from Outlook to this Gmail once, and the app reads them here too: on outlook.com open Settings → Mail → Forwarding → Enable forwarding, enter your Gmail, tick “Keep a copy”, Save.</p>
  <p class="note">If you also set up the Gmail script earlier, you can leave it; the same email is never added twice.</p>`)}
{const _ti=todoItems;todoItems=function(){const L=_ti();if(gmOn()&&gmLS("need"))L.push({k:-880,ic:"📧",tx:"Gmail reading needs you to sign in",sub:"Tap to reconnect",act:"gmNow",tone:"soon"});return L.sort((a,b)=>a.k-b.k)}}
{const _st=settings;settings=function(...a){const r=_st(...a);try{const box=$("#set_more");if(box&&!$("#set_gm")){box.insertAdjacentHTML("afterbegin",`<button id="set_gm" data-act="gmSheet">📧 Gmail: ${esc(gmOn()?(gmLS("need")?"sign in":"on"):"off")}</button>`);if(taOn())taNode(box)}}catch(e){}return r}}
{const _s=start;start=function(...a){const r=_s(...a);setTimeout(()=>gmAuto(),6000);return r}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState=="visible")setTimeout(()=>gmAuto(),1500)});
NEW27.unshift("Reads bank emails straight from Gmail (Settings → 📧 Gmail)");
Object.assign(ACT,{
  gmSheet(){gmSheet()},
  async gmStart(){const was=gmOn();toast("Opening Google sign-in…");try{gmLS("on","1");const n=await gmScan(true,7);toast(n?n+(n==1?" payment":" payments")+" found":"Connected. No new payment emails in the last 7 days");gmSheet()}
    catch(e){if(!was)gmLS("on",null);const m=String(e.message||e);toast(/cancel|needs-consent/i.test(m)?"Google sign-in was cancelled":/has not been used|disabled/i.test(m)?"Turn on the Gmail API in Google Cloud first":m);gmSheet()}},
  async gmNow(){toast("Checking Gmail…");try{const n=await gmScan(true);toast(n?n+(n==1?" payment":" payments")+" to review":"No new payment emails");if($("#over").innerHTML&&$("#over h2")&&/Gmail/.test($("#over h2").textContent))gmSheet();render()}catch(e){toast(String(e.message||e))}},
  gmOff(){gmLS("on",null);gmLS("need",null);GM.tok="";sheet("");toast("Gmail reading turned off")}
});
