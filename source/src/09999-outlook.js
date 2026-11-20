/* ===== Read bank emails straight from Outlook / Hotmail (Microsoft sign-in, read-only) ===== */
const MS_CLIENT_DEF="79f02921-9159-47a2-a1e9-80222b3e2eca";/* filled in once the Microsoft app registration exists */
const MS={tok:"",exp:0,busy:false,auth:"https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize",graph:"https://graph.microsoft.com/v1.0/me",redirect:"personaldiary://auth",scope:"offline_access Mail.Read"};
const msLS=(k,v2)=>{try{if(v2===undefined)return localStorage.getItem("ds-ms-"+k)||"";if(v2===null)localStorage.removeItem("ds-ms-"+k);else localStorage.setItem("ds-ms-"+k,v2)}catch(e){return ""}};
const msOn=()=>msLS("on")=="1"&&!!msLS("rt");
const msClient=()=>MS_CLIENT_DEF||msLS("client");
const b64urlB=u=>btoa(String.fromCharCode(...new Uint8Array(u))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const rnd=n=>b64urlB(crypto.getRandomValues(new Uint8Array(n)));
async function msPost(form){const body=Object.entries(form).map(([k,x])=>encodeURIComponent(k)+"="+encodeURIComponent(x)).join("&"),r=await NP("DueNative","msToken",{body});let j={};try{j=JSON.parse(r.body||"{}")}catch(e){}
  if(!r||r.status>=400||!j.access_token){const m=j.error_description||j.error||("status "+(r&&r.status));if(/invalid_grant|AADSTS700082|AADSTS70000/i.test(m))msLS("need","1");throw new Error("Microsoft: "+String(m).split("\n")[0].slice(0,160))}
  MS.tok=j.access_token;MS.exp=Date.now()+((+j.expires_in||3600)-120)*1000;if(j.refresh_token)msLS("rt",j.refresh_token);msLS("need",null);return MS.tok}
async function msFinish(url){const u=new URL(url.replace(/^personaldiary:/,"https:")),q=u.searchParams,st=JSON.parse(msLS("pk")||"{}");msLS("pk",null);
  if(q.get("error"))throw new Error(/access_denied/.test(q.get("error"))?"cancelled":"Microsoft: "+(q.get("error_description")||q.get("error")));
  if(!st.v||q.get("state")!=st.s)throw new Error("Sign-in didn’t match. Try again.");
  await msPost({client_id:msClient(),grant_type:"authorization_code",code:q.get("code"),redirect_uri:MS.redirect,code_verifier:st.v,scope:MS.scope});return true}
async function msSignIn(email){if(!isApp())throw new Error("Outlook reading works in the Android app");if(!msClient())throw new Error("The Microsoft app ID isn’t set yet");
  const v0=rnd(48),ch=b64urlB(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v0))),s0=rnd(16);msLS("pk",JSON.stringify({v:v0,s:s0}));
  const url=MS.auth+"?"+new URLSearchParams({client_id:msClient(),response_type:"code",redirect_uri:MS.redirect,response_mode:"query",scope:MS.scope,code_challenge:ch,code_challenge_method:"S256",state:s0,login_hint:email||"",prompt:"select_account"}).toString();
  const r=await NP("DueNative","webAuth",{url});return msFinish(r.url)}
async function msToken(){if(MS.tok&&Date.now()<MS.exp)return MS.tok;const rt=msLS("rt");if(!rt)throw new Error("needs-consent");return msPost({client_id:msClient(),grant_type:"refresh_token",refresh_token:rt,scope:MS.scope})}
async function msGet(path){for(let i=0;i<2;i++){const t=await msToken(),r=await fetch(MS.graph+path,{headers:{Authorization:"Bearer "+t,Prefer:'outlook.body-content-type="text"'}});if(r.status==401&&i==0){MS.tok="";continue}
  if(!r.ok){let m="";try{m=(await r.json()).error.message}catch(e){}throw new Error("Outlook: "+(m||r.status))}return r.json()}}
const MSPAYW=/debit|credit|spent|transaction|purchase|card ending|a\/c|account|used for|payment|transferred|upi|imps|neft|withdraw/i;
async function msScan(days){if(MS.busy)return 0;MS.busy=true;try{
  const last=msLS("last"),from=new Date(last?Math.max(Date.parse(last)-36e5,Date.now()-14*864e5):Date.now()-(days||3)*864e5).toISOString().slice(0,19)+"Z";
  const L=(await msGet("/messages?"+new URLSearchParams({"$filter":"receivedDateTime ge "+from,"$orderby":"receivedDateTime desc","$top":"60","$select":"id,subject,from,receivedDateTime,body,bodyPreview"}).toString())).value||[];
  const items=L.filter(m=>MSPAYW.test((m.subject||"")+" "+(m.bodyPreview||""))).map(m=>({id:"o"+m.id.slice(-40),from:((m.from||{}).emailAddress||{}).name||((m.from||{}).emailAddress||{}).address||"Outlook",subject:m.subject||"",body:String((m.body||{}).content||m.bodyPreview||"").slice(0,3000),time:Date.parse(m.receivedDateTime)||Date.now()}));
  const before=(S.cfg.smsq||[]).length;if(items.length)await mailTake({update:async()=>{}},{items});msLS("last",new Date().toISOString());msLS("err",null);return Math.max(0,(S.cfg.smsq||[]).length-before)}
  catch(e){msLS("err",String(e&&e.message||e));throw e}finally{MS.busy=false}}
async function msAuto(){if(!msOn()||!isApp()||MS.busy)return;const last=msLS("last");if(last&&Date.now()-Date.parse(last)<20*60e3)return;try{await msScan()}catch(e){console.warn("outlook scan",e)}}
function msStatus(){if(!msOn())return msLS("rt")?"Off":"Not connected";if(msLS("need"))return "Needs you to sign in again";const l=msLS("last");return (msLS("acct")?msLS("acct")+" · ":"")+(l?"checked "+fmt(l.slice(0,10))+", "+new Date(l).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"not checked yet")}
function msSheet(){if(!isApp())return sheet(`<h2>Read Outlook</h2><p class="sub">This works in the Android app.</p>`);
  sheet(`<h2>Read bank emails from Outlook</h2><p class="sub">For Outlook, Hotmail and Live addresses. The app looks only for payment emails from the last few days each time you open it, and puts them in “Payments to review”. Read-only.</p>
  <div class="card"><div class="hbl"><span>Status</span><b>${esc(msStatus())}</b></div>${msLS("err")&&msLS("on")?`<p class="note" style="color:var(--late);margin:6px 0 0">${esc(msLS("err"))}</p>`:""}</div>
  ${F("f_msa","Outlook email",msLS("acct"),"email",'placeholder="name@outlook.com" autocomplete="off"')}
  ${MS_CLIENT_DEF?"":`<details${msClient()?"":" open"}><summary>Microsoft app ID (one time)</summary>${F("f_msc","Application (client) ID",msLS("client"),"text",'placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autocomplete="off"')}</details>`}
  <div class="acts">${msOn()?`<button class="btn" data-act="msNow">Check now</button><button class="btn ghost" data-act="msStart">Sign in again</button><button class="btn ghost" data-act="msOff">Turn off</button>`:`<button class="btn" data-act="msStart">Connect Outlook</button>`}</div>`)}
{const _ti=todoItems;todoItems=function(){const L=_ti();if(msLS("on")&&msLS("need"))L.push({k:-870,ic:"📨",tx:"Outlook reading needs you to sign in",sub:"Tap to reconnect",act:"msSheet",tone:"soon"});return L.sort((a,b)=>a.k-b.k)}}
{const _st=settings;settings=function(...a){const r=_st(...a);try{const box=$("#set_more");if(box&&!$("#set_ms")){const g=$("#set_gm");(g||box.firstChild)?(g||box.firstElementChild).insertAdjacentHTML("afterend",`<button id="set_ms" data-act="msSheet">📨 Outlook: ${esc(msOn()?(msLS("need")?"sign in":"on"):"off")}</button>`):box.insertAdjacentHTML("afterbegin",`<button id="set_ms" data-act="msSheet">📨 Outlook</button>`);if(taOn())taNode(box)}}catch(e){}return r}}
{const _s=start;start=function(...a){const r=_s(...a);setTimeout(async()=>{try{if(isApp()&&msLS("pk")){const p=await NP("DueNative","webAuthPending",{});if(p&&p.url){await msFinish(p.url);msLS("on","1");toast("Outlook connected");await msScan(7);render()}}}catch(e){console.warn(e)}msAuto()},7000);return r}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState=="visible")setTimeout(()=>msAuto(),2000)});
NEW27.unshift("Reads bank emails straight from Outlook (Settings → 📨 Outlook)");
Object.assign(ACT,{
  msSheet(){msSheet()},
  async msStart(){const em=v("f_msa").trim().toLowerCase(),cid=$("#f_msc")?v("f_msc").trim():"";if(!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(em))return toast("Enter your Outlook email");
    if(!MS_CLIENT_DEF){if(!/^[0-9a-f-]{36}$/i.test(cid||msLS("client")))return toast("Enter the Microsoft app ID first");if(/^74658136-14ec-4630-ad9b-26e160ff0fc6$/i.test(cid||msLS("client"))){msLS("client",null);return toast("That ID is Microsoft’s admin website, not your app. Use the ID from your app registration.")}if(cid)msLS("client",cid)}
    if(em!=msLS("acct")){msLS("acct",em);msLS("last",null)}toast("Opening Microsoft sign-in…");
    try{await msSignIn(em);msLS("on","1");const n=await msScan(7);toast(n?n+(n==1?" payment":" payments")+" found in Outlook":"Outlook connected. No new payment emails in the last 7 days");msSheet()}
    catch(e){const m=String(e.message||e);toast(/cancel/i.test(m)?"Microsoft sign-in was cancelled":m);msSheet()}},
  async msNow(){toast("Checking Outlook…");try{const n=await msScan();toast(n?n+(n==1?" payment":" payments")+" to review":"No new payment emails in Outlook");if($("#over h2")&&/Outlook/.test($("#over h2").textContent))msSheet();render()}catch(e){toast(String(e.message||e))}},
  msOff(){msLS("on",null);msLS("rt",null);msLS("need",null);MS.tok="";sheet("");toast("Outlook reading turned off")}
});
