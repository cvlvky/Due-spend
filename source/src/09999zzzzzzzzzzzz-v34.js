/* ===== Version 34: one Payment review page, password import from CSV, a day calendar, entry filters, insights, a cleaner password list ===== */

/* ---------- Payment review: Waiting, Approved and Ignored on one page ---------- */
const PROK=/^(add|auto|transfer|same)$/;
function prCount(){const L=S.cfg.payLog||[],m0=today().slice(0,7),mo=L.filter(x=>iso(new Date(x.t)).slice(0,7)==m0);
  return {wait:(S.cfg.smsq||[]).length,ok:L.filter(x=>PROK.test(x.act)).length,no:L.filter(x=>x.act=="skip").length,okM:mo.filter(x=>PROK.test(x.act)).length,noM:mo.filter(x=>x.act=="skip").length}}
function prTabs(cur){const c=prCount();return `<div class="segs prtabs">${[["wait","Waiting",c.wait],["ok","Approved",c.ok],["no","Ignored",c.no]].map(([k,l,n])=>`<button class="${k==cur?"on":""}" data-act="prTab" data-id="${k}">${l} <span class="cnt">${n}</span></button>`).join("")}</div>`}
function payReview(tab){tab=tab||((S.cfg.smsq||[]).length?"wait":"ok");if(tab=="wait")smsReview();else revSheet(tab=="no"?"skip":"add")}
const prOn=()=>!!(S.cfg.smsAuto||S.cfg.ntfAuto||gmOn()||msOn()||(S.cfg.payLog||[]).length||(S.cfg.smsq||[]).length);
function prCard(){const c=prCount(),t=c.wait+c.okM+c.noM;return `<div class="card prcard" data-act="payReview" role="button"><div class="prh"><span class="prico" aria-hidden="true">🧾</span><div class="prt"><b>Payment review</b><small>${c.wait?`<span style="color:var(--soon);font-weight:700">${c.wait} waiting</span> · `:"Nothing waiting · "}${c.okM} approved · ${c.noM} ignored this month</small></div><span class="chev" aria-hidden="true">›</span></div>
  ${t?`<div class="prbar" aria-hidden="true">${c.wait?`<i style="flex:${c.wait};background:var(--soon)"></i>`:""}${c.okM?`<i style="flex:${c.okM};background:${GOOD}"></i>`:""}${c.noM?`<i style="flex:${c.noM};background:#9aa6a0"></i>`:""}</div>`:""}</div>`}
/* the waiting list gets the tabs */
{const _sr3=smsReview;smsReview=function(...a){const r=_sr3.apply(this,a);try{const h=$("#over h2");if(h&&!$("#over .prtabs")){h.textContent="Payment review";h.insertAdjacentHTML("afterend",prTabs("wait"));
  const rb=$('#over [data-act="revSheet"]');if(rb&&rb.closest(".acts"))rb.closest(".acts").remove();
  if(!(S.cfg.smsq||[]).length){const em=$("#over .empty");if(em)em.textContent="No payments waiting. Approved and ignored payments are in the tabs above."}}}catch(e){console.warn(e)}return r}}
/* the history becomes the Approved and Ignored tabs */
{const _rv=revSheet;revSheet=function(f,...a){f=f=="skip"?"skip":"add";const r=_rv.call(this,f,...a);try{const h=$("#over h2");if(h){h.textContent="Payment review";const c=prCount();
  const st=$("#over .stats");if(st)st.remove();const sg=$("#over .segs:not(.prtabs)");if(sg)sg.outerHTML=prTabs(f=="skip"?"no":"ok")+`<p class="note" style="margin:0 0 8px">This month: ${c.okM} approved · ${c.noM} ignored. ${f=="skip"?"Tap Add it to bring one back.":"Tap Open to see the entry."}</p>`;
  const sub=$("#over .sub");if(sub)sub.textContent="Payments found in your SMS, bank apps, wallets and email, and what you decided."}}catch(e){console.warn(e)}return r}}
Object.assign(ACT,{prTab(k){payReview(k)},payReview(k){payReview(k||"")},revSheet(){payReview("ok")}});
/* Home: always there once payment reading is on */
{const _vh4=vHome;vHome=function(...a){let h=_vh4(...a);try{if(prOn()&&!homeOff("pay")){const i=h.indexOf("<h2>This month</h2>"),card=prCard();h=i>=0?h.slice(0,i)+card+h.slice(i):h.replace('<div class="short3"',card+'<div class="short3"')}
  if(!homeOff("ins")){const ins=insightsCard();if(ins){const j=h.indexOf("<h2>Coming up");h=j>=0?h.slice(0,j)+ins+h.slice(j):h.replace('<div class="short3"',ins+'<div class="short3"')}}}catch(e){console.warn(e)}return h}}
{const _he=ACT.homeEdit;ACT.homeEdit=function(...a){const r=_he.apply(this,a);try{const L=$$("#over label.hbl"),last=L[L.length-1];if(last&&!$('#over [data-home="pay"]'))last.insertAdjacentHTML("afterend",[["pay","Payment review"],["ins","Insights"]].map(([k,l])=>`<label class="hbl" style="margin:10px 0;justify-content:flex-start;gap:10px"><input type="checkbox" data-home="${k}" style="width:auto;margin:0"${homeOff(k)?"":" checked"}> ${l}</label>`).join(""))}catch(e){}return r}}
/* Settings: both payment screens right at the top */
{const _st5=settings;settings=function(...a){const r=_st5.apply(this,a);try{const h=$("#over h2");if(h&&!$("#over .setpay"))h.insertAdjacentHTML("afterend",`<div class="setpay"><button class="card" data-act="payReview"><span>🧾</span><b>Payment review</b><small>${prCount().wait?prCount().wait+" waiting":"Approved and ignored"}</small></button><button class="card" data-act="trackHub"><span>📬</span><b>Payment tracking</b><small>SMS, apps and email</small></button></div>`)}catch(e){}return r}}

/* ---------- Spending: a day calendar, filters for entries ---------- */
const fmk=n=>{n=Math.round(Math.abs(+n||0));return V()=="INR"&&n>=1e5?(n/1e5).toFixed(n>=1e6?0:1).replace(/\.0$/,"")+"L":n>=1e3?(n/1e3).toFixed(n>=1e4?0:1).replace(/\.0$/,"")+"k":String(n)};
let calDay="",entF={k:"",c:""};
const monTx=()=>S.tx.filter(x=>x.date.startsWith(mon)&&(x.kind=="out"||x.kind=="in"||x.kind=="save")&&(!S.cfg.fa||x.acc==S.cfg.fa));
function calHtml(all){const y=+mon.slice(0,4),m=+mon.slice(5),n=dim(mon),off=(new Date(y,m-1,1).getDay()+6)%7,O={},I={};
  all.forEach(x=>{const d=+x.date.slice(8);if(x.kind=="out")O[d]=(O[d]||0)+ca(x);else if(x.kind=="in")I[d]=(I[d]||0)+ca(x)});
  const due={};try{upcoming(mon+"-01",mon+"-"+String(n).padStart(2,"0"),false).filter(u=>u.t=="due"||u.t=="emi").forEach(u=>{const d=+u.d.slice(8);(due[d]=due[d]||[]).push(u)})}catch(e){}
  const mx=Math.max(1,...Object.values(O)),td=today(),sel=calDay&&calDay.startsWith(mon)?calDay:"",dd=d=>mon+"-"+String(d).padStart(2,"0");
  const cells=Array.from({length:n},(_,k)=>{const d=k+1,ds=dd(d),o=O[d]||0,i=I[d]||0,lv=o?Math.min(4,1+Math.floor(o/mx*3.999)):0;
    return `<button class="cday l${lv}${ds==td?" today":""}${ds==sel?" sel":""}${ds>td?" fut":""}" data-act="calDay" data-id="${ds}" aria-label="${fmt(ds)}${o?", spent "+fm(o):""}${i?", income "+fm(i):""}${due[d]?", bill due":""}"><b>${d}</b>${o?`<span class="co">${fmk(o)}</span>`:""}${i?`<span class="cin">+${fmk(i)}</span>`:""}${due[d]?`<em class="cdue"></em>`:""}</button>`}).join("");
  const days=Object.keys(O).length,upto=mon==td.slice(0,7)?+td.slice(8):mon<td.slice(0,7)?n:0,zero=Math.max(0,upto-Object.keys(O).filter(d=>+d<=upto).length);
  let det="";if(sel){const L=all.filter(x=>x.date==sel).sort((a,b)=>(b.ct||0)-(a.ct||0)),o=sumV(L.filter(x=>x.kind=="out")),D=due[+sel.slice(8)]||[];
    det=`<div class="cdet"><div class="hbl"><b>${dl(sel)==0?"Today":dl(sel)==-1?"Yesterday":fmt(sel)}</b><span>${L.length?(o?"Spent "+fm(o)+" · ":"")+L.length+(L.length==1?" entry":" entries"):"No entries"}</span></div>
    ${D.map(u=>`<p class="note" style="margin:4px 0">📅 ${esc(u.n)} due${u.a?" · "+fmx(u.a,u.c):""}</p>`).join("")}${L.map(txRow).join("")}<div class="acts"><button class="btn sm ghost" data-act="calAdd" data-id="${sel}">+ Add for this day</button></div></div>`}
  return `<div class="cal">${["M","T","W","T","F","S","S"].map(c=>`<i class="cdh">${c}</i>`).join("")}${Array(off).fill("<i></i>").join("")}${cells}</div>
  <div class="cleg"><span>Less <i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> more spending</span><span><em class="cdue"></em> bill due</span></div>
  <p class="note" style="margin:6px 0 0">${days} spending ${days==1?"day":"days"} · ${zero} no-spend ${zero==1?"day":"days"} · tap a day to see it</p>${det}`}
function entChips(all){const by={};all.filter(x=>x.kind=="out"&&x.cat).forEach(x=>{by[x.cat]=(by[x.cat]||0)+ca(x)});const cats=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0]);
  return `<div class="fchips" role="group" aria-label="Show entries">${[["","All"],["out","Spent"],["in","Income"],["save","Saved"]].map(([k,l])=>`<button class="fchip${entF.k==k&&!entF.c?" on":""}" data-act="entK" data-id="${k}">${l}</button>`).join("")}${cats.map(c=>`<button class="fchip${entF.c==c?" on":""}" data-act="entC" data-id="${esc(c)}">${catIcon({cat:c,kind:"out"})} ${esc(c)}</button>`).join("")}</div>`}
{const _vs5=vSpend;vSpend=function(...a){const h=_vs5(...a);try{const T=document.createElement("template");T.innerHTML=h;const C=T.content,all=monTx();
  /* the heatmap becomes a calendar with the amount on each day */
  const H=[...C.querySelectorAll("h2")].find(x=>/^(Daily heatmap|Calendar)$/.test(x.textContent.trim()));if(H){H.textContent="Calendar";const card=H.nextElementSibling;if(card&&card.classList.contains("card"))card.innerHTML=calHtml(all)}
  /* filters above the entries */
  const q=C.querySelector("input[data-q]");if(q){let n=q.nextSibling;while(n&&!(n.nodeType==1&&n.tagName=="H2")){const nx=n.nextSibling;n.remove();n=nx}
    const s=(typeof qs=="string"?qs:"").trim().toLowerCase(),t=all.filter(x=>(!s||[x.cat,x.sub,x.payee,x.note,an(x.acc),...(x.tags||[])].join(" ").toLowerCase().includes(s))&&(!entF.k||x.kind==entF.k)&&(!entF.c||x.cat==entF.c)).sort((a,b)=>b.date.localeCompare(a.date)||(b.ct||0)-(a.ct||0));
    const tot=sumV(t.filter(x=>x.kind=="out")),box=document.createElement("template");
    box.innerHTML=entChips(all)+(entF.k||entF.c?`<p class="note" style="margin:0 0 6px">${t.length} ${t.length==1?"entry":"entries"}${tot?" · spent "+fm(tot):""} · <button class="lnk" data-act="entK" data-id="">Show all</button></p>`:"")+(t.length?dayGroups(t):`<div class="empty">${s||entF.k||entF.c?"Nothing matches.":"No entries this month. Tap + Add entry."}</div>`);
    q.after(box.content)}
  /* payment review right at the top */
  const h1=C.querySelector("h1");if(h1&&prOn())h1.insertAdjacentHTML("afterend",prCard());
  const d=document.createElement("div");d.appendChild(C);return d.innerHTML}catch(e){console.warn("spending",e);return h}}}
Object.assign(ACT,{
  calDay(ds){calDay=calDay==ds?"":ds;render();setTimeout(()=>{const e=$(".cdet")||$(".cal");if(e&&e.scrollIntoView)e.scrollIntoView({block:"nearest",behavior:"smooth"})},60)},
  calAdd(ds){qForm("out",{date:ds||today()})},
  entK(k){entF={k:k||"",c:""};render()},entC(c){entF={k:"",c:entF.c==c?"":c};render()}
});

/* ---------- Insights on Home ---------- */
function insights(){const td=today(),cm=td.slice(0,7),d=+td.slice(8),pm=addMon(cm,-1),cur=S.tx.filter(x=>x.kind=="out"&&x.date.startsWith(cm)),prev=S.tx.filter(x=>x.kind=="out"&&x.date.startsWith(pm)&&+x.date.slice(8)<=d);if(cur.length<4)return [];
  const by=L=>{const o={};L.forEach(x=>{const k=x.cat||"Other";o[k]=(o[k]||0)+ca(x)});return o},A=by(cur),B=by(prev),I=[];
  const ch=Object.keys({...A,...B}).map(k=>[k,(A[k]||0)-(B[k]||0),A[k]||0,B[k]||0]).filter(x=>Math.abs(x[1])>=1).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
  const up=ch.find(x=>x[1]>0&&x[3]>0),dn=ch.find(x=>x[1]<0&&x[3]>0);
  if(up)I.push({ic:catIcon({cat:up[0],kind:"out"}),t:up[0]+" is up "+fm(up[1]),s:fm(up[2])+" so far, against "+fm(up[3])+" by this day last month",c:"warn",go:"spend"});
  if(dn)I.push({ic:catIcon({cat:dn[0],kind:"out"}),t:dn[0]+" is down "+fm(-dn[1]),s:fm(dn[2])+" so far, against "+fm(dn[3])+" by this day last month",c:"good",go:"spend"});
  const P={};cur.forEach(x=>{if(!x.payee)return;const p=P[x.payee]=P[x.payee]||{a:0,n:0};p.a+=ca(x);p.n++});const top=Object.entries(P).sort((a,b)=>b[1].a-a[1].a)[0];
  if(top&&top[1].n>=2)I.push({ic:"🏪",t:"Most spent at "+top[0],s:fm(top[1].a)+" over "+top[1].n+" payments this month",c:"info",go:"spend"});
  const zero=d-new Set(cur.map(x=>x.date)).size;if(zero>0)I.push({ic:"🌿",t:zero+" no-spend "+(zero==1?"day":"days"),s:"out of "+d+" days so far this month",c:"good",go:"spend"});
  const big=[...cur].sort((a,b)=>ca(b)-ca(a))[0];if(big)I.push({ic:catIcon(big),t:"Biggest: "+fm(ca(big)),s:(big.payee||big.cat||"An expense")+" on "+fmt(big.date),c:"info",id:big.id});
  const wk=cur.filter(x=>dl(x.date)>-7),wkp=S.tx.filter(x=>x.kind=="out"&&dl(x.date)<=-7&&dl(x.date)>-14),a7=sumV(wk),b7=sumV(wkp);
  if(a7&&b7){const p=Math.round((a7/b7-1)*100);if(Math.abs(p)>=10)I.push({ic:p>0?"📈":"📉",t:"This week "+(p>0?"up ":"down ")+Math.abs(p)+"%",s:fm(a7)+" in the last 7 days, against "+fm(b7)+" the week before",c:p>0?"warn":"good",go:"spend"})}
  return I.slice(0,6)}
function insightsCard(){const I=insights();if(!I.length)return "";return `<h2>Insights</h2><div class="ins" role="list">${I.map(x=>`<div class="insc ${x.c}" role="listitem" ${x.id?`data-act="editTx" data-id="${x.id}"`:`data-act="tab" data-id="${x.go||"spend"}"`}><span class="insi" aria-hidden="true">${x.ic}</span><b>${esc(x.t)}</b><small>${esc(x.s)}</small></div>`).join("")}</div>`}

/* ---------- Passwords: a clearer list, a checkup, and import from a CSV file ---------- */
const VCOL=["#1f9d6b","#2f6fdf","#b5502f","#7b4fc9","#c28a12","#16808f","#c2417a","#4d6b2f"];
const vHost=u=>{u=String(u||"").trim();if(!u)return "";try{const x=new URL(/^[a-z][\w+.-]*:\/\//i.test(u)?u:"https://"+u);return (x.hostname||"").replace(/^www\./,"")}catch(e){return ""}};
const vInit=x=>{const t=String(x.title||vHost(x.url)||x.user||"?").trim();return (t.match(/[A-Za-z0-9஀-௿]/)||["?"])[0].toUpperCase()};
const vColor=x=>{const t=String(x.title||x.url||"").toLowerCase();let h=0;for(const ch of t)h=(h*31+ch.charCodeAt(0))>>>0;return VCOL[h%VCOL.length]};
function vRow(x){const c=VCAT.find(k=>k[0]==x.cat)||VCAT[7],host=vHost(x.url),s=x.pass?vScore(x.pass,x.title):4;
  return `<div class="row vrow" data-act="vItem" data-id="${x.id}"><span class="vav" style="background:${vColor(x)}" aria-hidden="true">${esc(vInit(x))}<i>${c[1]}</i></span><div class="vmain"><b>${esc(x.title||host||"Untitled")}${x.fav?" ★":""}</b><small>${esc([x.user,host&&host!=String(x.title||"").toLowerCase()?host:""].filter(Boolean).join(" · ")||c[2])}</small></div>${x.pass&&s<=1?`<span class="vwk" title="Weak password">Weak</span>`:""}<span class="dots" aria-hidden="true">›</span></div>`}
function vGrouped(I){const fav=I.filter(x=>x.fav),rest=I.filter(x=>!x.fav),out=[];if(fav.length)out.push(`<div class="vhdr">★ Favourites</div>`+fav.map(vRow).join(""));let L="";
  rest.forEach(x=>{const k=vInit(x),key=/[A-Z]/.test(k)?k:"#";if(key!=L){L=key;out.push(`<div class="vhdr">${key}</div>`)}out.push(vRow(x))});return out.join("")}
{const _vl=vList;vList=function(q,cat,...a){const r=_vl.call(this,q,cat,...a);try{const L=$("#v_list"),qq=String(q||"").toLowerCase();if(L&&VLT.items&&!qq){const I=[...VLT.items].sort((a,b)=>String(a.title||vHost(a.url)).localeCompare(String(b.title||vHost(b.url)))).filter(x=>!cat||x.cat==cat);if(I.length)L.innerHTML=vGrouped(I)}
  const H=vHealth(),ck=$('#over [data-act="vHealth"]')||[...$$("#over p.note")].find(p=>/No weak or repeated/.test(p.textContent));
  if(ck&&VLT.items.length){const t=(n,l,col,on)=>`<button class="vck${n?" on":""}" data-act="vHealth" style="--c:${col}"><b>${n}</b><small>${l}</small></button>`;
    ck.outerHTML=`<div class="vcks">${t(H.weak.length,"Weak","var(--late)")}${t(H.reused.length,"Used twice","var(--soon)")}${t(H.old.length,"Over a year old","#7a8a83")}</div>${H.weak.length||H.reused.length||H.old.length?"":`<p class="note" style="color:${GOOD};margin:-2px 0 8px">✓ All your passwords look good.</p>`}`}
  const acts=$$('#over .acts'),la=acts[acts.length-1];if(la&&!$('#over [data-act="vImp"]'))la.insertAdjacentHTML("afterbegin",`<button class="btn ghost sm" data-act="vImp">⬇️ Import from CSV</button>`)}catch(e){console.warn("vault list",e)}return r}}
{const _vs6=vSetSheet;vSetSheet=function(...a){const r=_vs6.apply(this,a);try{const h=$("#over h2");if(h&&!$('#over [data-act="vImp"]'))h.insertAdjacentHTML("afterend",`<div class="acts"><button class="btn ghost" data-act="vImp">⬇️ Import passwords from a CSV file</button></div>`)}catch(e){}return r}}
/* CSV import: Google Password Manager, Chrome, Samsung Internet, Edge, Firefox, Bitwarden, LastPass, 1Password, Dashlane, Proton Pass, KeePass, Apple Passwords */
const VHDR={title:["name","title","account","site name","item name","entry","display name"],url:["url","login_uri","website","web site","login url","uri","site","origin","hostname","address"],
  user:["username","login_username","user name","login name","login","user","user id","email","e-mail","email address"],pass:["password","login_password","pass","pwd","passwd"],
  note:["note","notes","extra","comments","comment","description"],totp:["totp","login_totp","otp","otpauth","otp secret","otpsecret","one-time password"],folder:["folder","grouping","group","category","collections","collection","vault","tags"],type:["type","item type","kind"]};
function vGuess(s){s=String(s||"").toLowerCase();return /bank|qnb|cbq|sbi|hdfc|icici|axis|kotak|federal|paypal|paytm|phonepe|gpay|amex|visa|mastercard|wallet|finance|invest|zerodha|groww|upstox|card/.test(s)?"bank"
  :/\bgov|gov\.|metrash|moi\.|hukoomi|passport|uidai|aadhaar|incometax|epfo|digilocker|ministry|kahramaa|qatar\.qa/.test(s)?"gov":/mail|outlook|yahoo|proton|hotmail|icloud/.test(s)?"email"
  :/amazon|noon|flipkart|talabat|carrefour|lulu|myntra|ajio|shop|store|ebay|aliexpress|snoonu|zomato|swiggy|ikea/.test(s)?"shop":/facebook|instagram|twitter|x\.com|linkedin|telegram|whatsapp|snapchat|tiktok|reddit|youtube|discord|pinterest|threads/.test(s)?"social"
  :/wi-?fi|wlan|router|ssid/.test(s)?"wifi":/slack|jira|atlassian|teams|office|zoom|github|gitlab|notion|company|corp|work/.test(s)?"work":"other"}
function vCsv(text){const R=csvRows(String(text||"").replace(/^﻿/,"")).filter(r=>r.some(c=>String(c).trim()));const norm=c=>String(c||"").trim().toLowerCase().replace(/\s+/g," ");
  let hi=R.slice(0,5).findIndex(r=>r.map(norm).some(c=>VHDR.pass.includes(c)));if(hi<0)return {err:"This file has no password column. Export it again as a CSV file with passwords."};
  const H=R[hi].map(norm),col=k=>{for(const n of VHDR[k]){const i=H.indexOf(n);if(i>=0)return i}return -1},C={};Object.keys(VHDR).forEach(k=>C[k]=col(k));
  const ix={};(VLT.items||[]).forEach(x=>{ix[vHost(x.url)+"|"+String(x.user||"").toLowerCase()]=x});
  const add=[],diff=[],seen=new Set();let same=0,bad=0;
  R.slice(hi+1).forEach(r=>{const g=k=>C[k]>=0?String(r[C[k]]||"").trim():"",type=g("type").toLowerCase();if(type&&!/^(login|password|account|web|1|)$/.test(type)&&!g("pass")){bad++;return}
    let user=g("user"),pass=g("pass"),url=g("url"),title=g("title");if(!user&&C.user>=0){const e=H.indexOf("email");if(e>=0)user=String(r[e]||"").trim()}
    if(!pass&&!user){bad++;return}const host=vHost(url);if(!title)title=host||user||"Imported";
    const k=host+"|"+user.toLowerCase(),dk=k+"|"+pass;if(seen.has(dk)){same++;return}seen.add(dk);const old=ix[k];
    if(old&&old.pass==pass){same++;return}const note=[g("note"),g("totp")?"2-step key: "+g("totp"):""].filter(Boolean).join("\n");
    const it={title:title.slice(0,80),url,user,pass,note,cat:vGuess([g("folder"),title,url].join(" "))};if(old)diff.push({old,it});else add.push(it)});
  return {add,diff,same,bad}}
function vImpSheet(){vTouch();VLT.imp=null;sheet(`<div data-vault="1"></div><h2>Import passwords</h2><p class="sub">From a CSV file exported by another password manager. The passwords are locked in your vault on this phone.</p>
  <div class="card"><b>Get the file first</b><ol class="steps" style="margin:6px 0 0"><li><b>Google Password Manager or Chrome:</b> its Settings → Export passwords.</li><li><b>Bitwarden, LastPass, 1Password, Proton Pass, Dashlane, Firefox, Edge or KeePass:</b> its Export option, as a CSV file.</li></ol></div>
  <label for="v_csv" style="margin-top:10px">CSV file</label><input id="v_csv" type="file" accept=".csv,text/csv,text/comma-separated-values,text/plain" data-vcsv="1"><div id="v_impout"></div>
  <div class="card" style="margin-top:10px;border-color:var(--late)"><b>Delete the file after importing</b><p class="note" style="margin:4px 0 0">A CSV file isn’t locked: anyone who opens it can read every password.</p></div>
  <div class="acts"><button class="btn ghost" data-act="vBack">Back</button></div>`)}
function vImpShow(){const o=$("#v_impout"),P=VLT.imp;if(!o||!P)return;if(P.err){o.innerHTML=`<p class="note" style="color:var(--late)">${esc(P.err)}</p>`;return}
  const n=P.add.length;o.innerHTML=`<div class="card" style="margin-top:10px"><div class="vcks" style="margin:0 0 8px"><div class="vck on" style="--c:${GOOD}"><b>${n}</b><small>New</small></div><div class="vck" style="--c:var(--soon)"><b>${P.diff.length}</b><small>Different password</small></div><div class="vck"><b>${P.same}</b><small>Already saved</small></div></div>
  ${P.add.slice(0,6).map(x=>`<div class="hbl" style="margin:4px 0"><span>${esc(x.title)}</span><small style="color:var(--mute)">${esc(x.user||"")}</small></div>`).join("")}${n>6?`<p class="note">and ${n-6} more</p>`:""}${P.bad?`<p class="note">${P.bad} rows had no login and were left out.</p>`:""}
  ${P.diff.length?`<label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="v_rep" style="width:auto"> Use the file’s password for the ${P.diff.length} ${P.diff.length==1?"login":"logins"} you already have</label>`:""}</div>
  ${n||P.diff.length?`<div class="acts"><button class="btn" data-act="vImpGo">Import ${n} ${n==1?"password":"passwords"}</button></div>`:`<p class="note">Nothing new in this file.</p>`}`}
document.addEventListener("change",async e=>{const t=e.target;if(!t||!t.dataset||!t.dataset.vcsv)return;const f=t.files&&t.files[0];if(!f||!VLT.key)return;vTouch();
  try{VLT.imp=vCsv(await f.text())}catch(x){VLT.imp={err:"That file couldn’t be read."}}vImpShow()});
Object.assign(ACT,{
  vImp(){if(!VLT.key)return vaultOpen();vImpSheet()},
  async vImpGo(){const P=VLT.imp;if(!P||!VLT.key)return;const rep=!!($("#v_rep")&&$("#v_rep").checked),now=Date.now();
    P.add.forEach(x=>VLT.items.push({id:uid(),...x,fav:false,ut:now,pc:now}));let up=0;if(rep)P.diff.forEach(({old,it})=>{old.pass=it.pass;old.pc=now;old.ut=now;if(it.note&&!String(old.note||"").includes(it.note))old.note=[old.note,it.note].filter(Boolean).join("\n");up++});
    await vSave();VLT.imp=null;vList();toast(P.add.length+(P.add.length==1?" password":" passwords")+" imported"+(up?", "+up+" updated":"")+". Now delete the CSV file.")}
});

NEW27.splice(0,NEW27.length,"🧾 Payment review: Waiting, Approved and Ignored on one page (Home, Spending and Settings)","⬇️ Passwords: import from a CSV file from Google Password Manager, Chrome, Bitwarden, LastPass, 1Password and more","🔑 Passwords: A to Z list with letters, weak ones marked, and a checkup with weak, repeated and old passwords","📅 Spending: a calendar with the amount on each day and bills due; tap a day to see it","🏷️ Spending: filter entries by spent, income, saved or category","💡 Insights on Home: what's up or down against last month, your top shop, no-spend days","🚫 Only payment apps, email and bank SMS are read; Telegram and WhatsApp never","⇄ A card bill paid from savings is a transfer, and a “Not paid yet” alert after a due date");
