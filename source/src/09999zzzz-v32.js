/* ===== Version 32: gifts & moi, cleaner Settings and tools, password vault ===== */

/* ---------- 1. gifts: build on the moi register ---------- */
const PDK=[["birthday","Birthday","🎂"],["anniv","Wedding anniversary","💍"],["other","Other yearly day","📅"]];
const gkey=s=>String(s||"").trim().toLowerCase();
const giftVal=m=>cv(+m.cash||0,m.cur||"INR","INR")+(+m.gold?Math.round(+m.gold*(goldGram("INR",22)||0)):0)+cv(+m.ival||0,m.cur||"INR","INR");
const pdNextSafe=d=>{const n=nextOn(d.md||"01-01"),y=+n.slice(0,4);if(d.md=="02-29"&&new Date(y,1,29).getMonth()!=1)return y+"-02-28";return n};
/* totals now count gold at today's rate and the value of gift items */
moiPeople=function(){const P={};S.moi.forEach(m=>{const k=gkey(m.person);if(!k)return;const p=P[k]=P[k]||{name:m.person,place:m.place,gave:0,got:0,L:[]};p.L.push(m);if(m.place)p.place=m.place;if(m.date<=today()){if(m.dir=="gave")p.gave+=giftVal(m);else p.got+=giftVal(m)}});
  S.pdays.forEach(d=>{const k=gkey(d.person);if(k&&!P[k])P[k]={name:d.person,place:"",gave:0,got:0,L:[]}});
  return Object.values(P).map(p=>({...p,L:p.L.sort((a,b)=>b.date.localeCompare(a.date)),last:p.L.map(m=>m.date).sort().pop()||"0000"})).sort((a,b)=>b.last.localeCompare(a.last))};
/* amounts people usually give back end in 1: 1,001 · 2,501 · 5,001 */
function moiRound(n){n=Math.max(1,Math.round(+n||0));if(n%10==1)return n;const step=n<1000?100:n<10000?500:1000;return Math.ceil((n-1)/step)*step+1}
function giftSuggest(p){const got=p.L.find(m=>m.dir=="got"&&m.date<=today()&&(+m.cash||+m.gold||m.gift)),gave=p.L.find(m=>m.dir=="gave"&&m.date<=today());if(!got&&!gave)return "";const out=[],gg=goldGram("INR",22)||0;
  if(got)out.push(`They gave ${[got.cash?fmx(got.cash,got.cur):"",got.gold?got.gold+" g gold"+(gg?" (about "+inr(Math.round(+got.gold*gg))+" today)":""):"",got.gift?esc(got.gift):""].filter(Boolean).join(" + ")} at your ${esc(got.occ||"function").toLowerCase()} (${fmt(got.date)})`);
  if(got&&+got.cash){const same=moiRound(got.cash),more=same+(same<10000?100:same<50000?500:1000);out.push(`To give back: <b>${fmx(same,got.cur)}</b>, or a little more: <b>${fmx(more,got.cur)}</b>`)}
  if(gave)out.push(`Your last gift: ${[gave.cash?fmx(gave.cash,gave.cur):"",gave.gold?gave.gold+" g gold":"",gave.gift?esc(gave.gift):""].filter(Boolean).join(" + ")} (${fmt(gave.date)}, ${esc(gave.occ||"").toLowerCase()})`);
  const items=p.L.filter(m=>m.dir=="gave"&&m.gift).map(m=>m.gift);if(items.length)out.push(`Items you gave before: ${esc([...new Set(items)].slice(0,6).join(", "))}. Pick something different.`);
  return `<div class="card" data-gs="1" style="margin:6px 0"><b>${got?"When they invite you":"Before you buy"}</b>${out.map(x=>`<p class="note" style="margin:4px 0 0">${x}</p>`).join("")}</div>`}
{const _mp=moiPerson;moiPerson=function(k){_mp(k);const p=moiPeople().find(x=>gkey(x.name)==k);if(!p)return;try{const D0=S.pdays.filter(d=>gkey(d.person)==k),I=S.gideas.filter(i=>i.person==k);
  $$("#over .card").forEach(c=>{const b=c.querySelector("b");if(b&&!c.dataset.gs&&(b.textContent=="When they invite you"||b.textContent==taStr("When they invite you")))c.remove()});
  const h=$("#over h2");if(h)h.insertAdjacentHTML("afterend",`${D0.map(d=>{const n=pdNextSafe(d);return `<div class="row" data-act="pdEdit" data-id="${d.id}"><div><b>${(PDK.find(x=>x[0]==d.kind)||PDK[2])[2]} ${esc((PDK.find(x=>x[0]==d.kind)||PDK[2])[1])}</b><small>${fmt(n)} · ${when(dl(n))}${d.year?" · "+(+n.slice(0,4)-d.year)+(d.kind=="anniv"?" years":" years old"):""}</small></div></div>`}).join("")}${giftSuggest(p)}`);
  const box=$("#over .sheet");if(box)box.insertAdjacentHTML("beforeend",`<h3>Gift ideas</h3>${I.map(i=>`<label class="hbl" style="margin:6px 0;gap:8px;justify-content:flex-start"><input type="checkbox" data-gi="${i.id}" ${i.done?"checked":""} style="width:auto"><span style="${i.done?"text-decoration:line-through;color:var(--mute)":""}">${esc(i.idea)}</span></label>`).join("")||`<p class="note">Note things they’d like, so you remember when the day comes.</p>`}
    <div class="lineq"><input id="f_gi" placeholder="Likes books, needs a new watch…" autocomplete="off" aria-label="Gift idea"><button class="btn sm" data-act="giAdd" data-id="${esc(k)}">Add</button></div><div class="acts"><button class="btn ghost" data-act="pdAdd" data-id="${esc(p.name)}">+ Birthday or anniversary</button></div>`);if(taOn())taNode($("#over"))}catch(e){console.warn(e)}}}
document.addEventListener("change",e=>{const id=e.target&&e.target.dataset&&e.target.dataset.gi;if(!id)return;const x=S.gideas.find(i=>i.id==id);if(x){put("gideas",stamp({...x,done:e.target.checked},x));save()}});
/* the gift form: value of the item, who gave it, a photo */
{const _mf=moiForm;moiForm=function(x,pre){_mf(x,pre);try{const a=$('#over [data-act="moiSave"]'),box=a&&a.closest(".acts");if(!box)return;attInit(x&&x.att);
  box.insertAdjacentHTML("beforebegin",`${F("m_ival","Value of the gift item (optional)",x&&x.ival||"","number",'placeholder="For a saree, watch, lamp…"')}${S.fam.length?SEL("m_by","Given by",[["","—"],...S.fam.map(m=>[m.id,m.name])],x&&x.by2||""):""}<div class="rcpt"><div id="attlist">${attList()}</div><label class="btn ghost sm" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer">📷 Photo of the gift<input id="f_file" type="file" accept="image/*" capture="environment" data-file="1" style="display:none"></label></div>`);if(taOn())taNode($("#over"))}catch(e){console.warn(e)}}}
{const _ms=ACT.moiSave;ACT.moiSave=function(id,...a){const has=!!$("#m_ival"),ex=has?{ival:+v("m_ival")||0,by2:$("#m_by")?v("m_by"):"",att:[...pend]}:null,before=new Set(S.moi.map(m=>m.id));const r=_ms.call(this,id,...a);
  if(ex){const m=id?S.moi.find(x=>x.id==id):S.moi.find(x=>!before.has(x.id));if(m){put("moi",stamp({...m,...ex},m));save();attDone(true);render()}}return r}}
/* birthdays and anniversaries */
function pdForm(d,name){d=d||{};const ppl=[...new Set([...S.moi.map(m=>m.person),...S.fam.map(m=>m.name),...S.pdays.map(x=>x.person)].filter(Boolean))];
  sheet(`<h2>${d.id?"Edit date":"Birthday or anniversary"}</h2>${F("pd_who","Person or couple",d.person||name||"","text",'list="dl_pd"')}${DL("dl_pd",ppl)}
  <div class="two"><div>${SEL("pd_k","What",PDK.map(x=>[x[0],x[1]]),d.kind||"birthday")}</div><div>${F("pd_d","Date (year optional)",d.year?d.year+"-"+d.md:d.md?today().slice(0,4)+"-"+d.md:"","date")}</div></div>
  <label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" id="pd_y" ${d.id&&!d.year?"":"checked"} style="width:auto"> I know the year (to show the age or years married)</label>
  ${SEL("pd_r","Remind me",[["1","1 day before"],["3","3 days before"],["7","A week before"],["14","Two weeks before"]],String(d.remind||7))}${F("pd_n","Note (optional)",d.note||"")}
  ${btns("pdSave",d.id,"pdDel")}`)}
const pdSoon=(days)=>S.pdays.map(d=>({d,n:pdNextSafe(d)})).filter(o=>dl(o.n)>=0&&dl(o.n)<=(days==null?+(o.d.remind||7):days)).sort((a,b)=>a.n.localeCompare(b.n));
{const _vf=vFam;vFam=function(...a){let h=_vf(...a);const seg=S.cfg.famSeg||"people";
  h=h.replace('<div class="seg" style="flex-wrap:wrap">','<div class="seg segx">').replace(/(data-act="famSeg" data-id="moi">)[^<]*(<\/button>)/,`$1${esc(taStr("Gifts & moi"))}$2`);
  if(seg=="moi"){const U=pdSoon(60);const add=`${U.length?`<h2>${esc(taStr("Birthdays & anniversaries"))}</h2>${U.map(({d,n})=>`<div class="row" data-act="moiPerson" data-id="${esc(gkey(d.person))}"><div><b>${(PDK.find(x=>x[0]==d.kind)||PDK[2])[2]} ${esc(d.person)}</b><small>${esc((PDK.find(x=>x[0]==d.kind)||PDK[2])[1])} · ${fmt(n)} · ${when(dl(n))}</small></div></div>`).join("")}`:""}<div class="acts"><button class="btn ghost" data-act="pdAdd">+ Birthday or anniversary</button></div>`;
    const i=h.indexOf('<label for="moi_q">');h=i>=0?h.slice(0,i)+add+h.slice(i):h+add}
  return h}}
/* reminders */
{const _nn=nativeNotify;nativeNotify=async function(...a){const r=await _nn(...a);try{if(!isApp())return r;const N=[],now=Date.now();
  S.pdays.slice(0,40).forEach((d,i)=>{const n=pdNextSafe(d),at=D(n);at.setDate(at.getDate()-(+d.remind||7));at.setHours(9,15,0,0);const k=(PDK.find(x=>x[0]==d.kind)||PDK[2])[1];
    if(at.getTime()>now)N.push({id:6500+i,title:`${d.person}: ${k.toLowerCase()} ${(+d.remind||7)==1?"tomorrow":"in "+(+d.remind||7)+" days"}`,body:"Tap to see what you gave before and your gift ideas.",schedule:{at:at.toISOString(),allowWhileIdle:true}})});
  if(N.length)await NP("LocalNotifications","schedule",{notifications:N})}catch(e){console.warn("gift reminders",e)}return r}}

/* ---------- 2. cleaner Settings: grouped list instead of a wall of buttons ---------- */
const SETG=[["Connections",["gmSheet","msSheet","gdSheet"]],["Look and language",["theme","tzT","lang","vlangT"]],["Privacy and security",["vaultOpen","hide","docLockT","shakeT","cardSos"]],["Tools",["dupSheet","homeEdit","calAll","taxPack","ydOpen","calcOpen","spikeT"]],["Help",["guideOpen","whatsNew"]]];
const SETI={gmSheet:"📧",msSheet:"📨",gdSheet:"☁️",theme:"🎨",tzT:"🔠",lang:"🌐",vlangT:"🎤",vaultOpen:"🔑",hide:"🙈",docLockT:"🪪",shakeT:"📳",cardSos:"🆘",dupSheet:"🔁",homeEdit:"🏠",calAll:"📆",taxPack:"🧾",ydOpen:"⭐",calcOpen:"🧮",spikeT:"📈",guideOpen:"📖",whatsNew:"✨"};
function setRegroup(){const box=$("#set_more");if(!box||box.dataset.g)return;if(!box.querySelector('[data-act="vaultOpen"]'))box.insertAdjacentHTML("beforeend",`<button id="set_vault" data-act="vaultOpen">Passwords: ${vRaw()?(VLT.key?"open":"locked"):"set up"}</button>`);
  const B=[...box.querySelectorAll("button")],used=new Set();
  const row=b=>{used.add(b);let t=b.textContent.replace(/^[^\p{L}\p{N}]+/u,"").trim(),lab=t,val="";const m=t.match(/^(.+?):\s*(.+)$/);if(m){lab=m[1];val=m[2]}
    const a=b.dataset.act;if(a=="hide"){lab=taStr("Hide amounts");val=taStr(S.cfg.hide?"on":"off")}if(a=="docLockT"){lab=taStr("Fingerprint for documents");val=taStr(S.cfg.docLock?"on":"off")}
    b.className="srow";b.innerHTML=`<span class="sr-i" aria-hidden="true">${SETI[a]||"•"}</span><span class="sr-l">${esc(lab)}</span>${val?`<span class="sr-v">${esc(val)}</span>`:""}<span class="sr-c" aria-hidden="true">›</span>`;return b};
  const wrap=document.createElement("div");wrap.id="set_more";wrap.dataset.g="1";
  const group=(g,L)=>{if(!L.length)return;const sec=document.createElement("div");sec.className="sgrp";sec.innerHTML=`<h3>${esc(taStr(g))}</h3>`;const card=document.createElement("div");card.className="scard";L.forEach(b=>card.appendChild(row(b)));sec.appendChild(card);wrap.appendChild(sec)};
  SETG.forEach(([g,acts])=>group(g,acts.map(a=>B.find(b=>b.dataset.act==a&&!used.has(b))).filter(Boolean)));group("More",B.filter(b=>!used.has(b)));box.replaceWith(wrap)}
{const _st=settings;settings=function(...a){const r=_st(...a);try{setRegroup()}catch(e){console.warn(e)}return r}}

/* ---------- 3. password vault (on this phone only, locked with your master password) ---------- */
const VLT={key:null,items:null,salt:null,iter:310000,timer:0,hid:0,sec:false,ct:0};
const VCAT=[["bank","🏦","Bank"],["gov","🏛️","Government"],["email","📧","Email"],["shop","🛍️","Shopping"],["social","💬","Social"],["wifi","📶","Wi-Fi"],["work","💼","Work"],["other","🔑","Other"]];
const b64e=u=>{u=new Uint8Array(u);let s="";for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s)};
const b64d=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const vRaw=()=>{try{return JSON.parse(localStorage.getItem("ds-vault")||"null")}catch(e){return null}};
const vBio=()=>{try{return localStorage.getItem("ds-vault-bio")=="1"}catch(e){return false}};
async function vDerive(pw,salt,iter){const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:iter,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function vSave(){const iv=crypto.getRandomValues(new Uint8Array(12)),ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},VLT.key,new TextEncoder().encode(JSON.stringify({items:VLT.items})));
  localStorage.setItem("ds-vault",JSON.stringify({v:1,salt:b64e(VLT.salt),iter:VLT.iter,iv:b64e(iv),ct:b64e(ct),at:Date.now()}))}
async function vCreate(pw){VLT.salt=crypto.getRandomValues(new Uint8Array(16));VLT.iter=310000;VLT.key=await vDerive(pw,VLT.salt,VLT.iter);VLT.items=VLT.items||[];await vSave();vTouch()}
async function vUnlock(pw){const r=vRaw();if(!r)throw new Error("No vault");const salt=b64d(r.salt),key=await vDerive(pw,salt,r.iter||310000);
  const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64d(r.iv)},key,b64d(r.ct));VLT.key=key;VLT.salt=salt;VLT.iter=r.iter||310000;VLT.items=JSON.parse(new TextDecoder().decode(pt)).items||[];vTouch()}
function vLock(){VLT.key=null;VLT.items=null;clearTimeout(VLT.timer);if($("#over [data-vault]"))sheet("")}
function vTouch(){clearTimeout(VLT.timer);VLT.timer=setTimeout(vLock,180000)}
document.addEventListener("visibilitychange",()=>{if(!VLT.key)return;if(document.visibilityState=="hidden")VLT.hid=setTimeout(vLock,30000);else clearTimeout(VLT.hid)});
/* no screenshots or recent-apps preview while the vault is on screen */
{const _sh=sheet;sheet=function(h,...a){const r=_sh(h,...a);try{const on=typeof h=="string"&&h.includes('data-vault="1"');if(on!=VLT.sec){VLT.sec=on;if(isApp())NP("DueNative","secure",{on}).catch(()=>{})}}catch(e){}return r}}
/* strength, generator, health */
const VCOMMON=/^(password|passw0rd|123456|12345678|qwerty|abc123|111111|iloveyou|admin|welcome|letmein)/i;
function vScore(p,ctx){p=String(p||"");if(!p)return 0;let s=0;const cls=[/[a-z]/,/[A-Z]/,/\d/,/[^A-Za-z0-9]/].filter(r=>r.test(p)).length;if(p.length>=10)s++;if(p.length>=14)s++;if(cls>=3)s++;if(cls==4&&p.length>=12)s++;
  if(VCOMMON.test(p)||/(.)\1{2,}/.test(p)||/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer)/i.test(p)||(ctx&&ctx.length>=4&&p.toLowerCase().includes(ctx.toLowerCase())))s=Math.min(s,1);if(p.length<8)s=0;return Math.min(4,s)}
const VLBL=[["Very weak","var(--late)"],["Weak","var(--late)"],["Fair","var(--soon)"],["Good","var(--pri)"],["Strong","var(--good,var(--pri))"]];
function vGen(n,sym){n=Math.max(8,Math.min(40,+n||16));const L="abcdefghijkmnpqrstuvwxyz",U="ABCDEFGHJKLMNPQRSTUVWXYZ",N="23456789",Y="!@#$%&*-_=+?",all=L+U+N+(sym?Y:""),r=k=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%k};
  const out=[L[r(L.length)],U[r(U.length)],N[r(N.length)],...(sym?[Y[r(Y.length)]]:[])];while(out.length<n)out.push(all[r(all.length)]);for(let i=out.length-1;i>0;i--){const j=r(i+1);[out[i],out[j]]=[out[j],out[i]]}return out.join("")}
function vHealth(){const I=VLT.items||[],cnt={};I.forEach(x=>{if(x.pass)cnt[x.pass]=(cnt[x.pass]||0)+1});return {weak:I.filter(x=>x.pass&&vScore(x.pass,x.title)<=1),reused:I.filter(x=>x.pass&&cnt[x.pass]>1),old:I.filter(x=>x.pass&&Date.now()-(x.pc||x.ut||0)>365*864e5)}}
async function vCopy(text,what){try{if(isApp())await NP("DueNative","clipSet",{text,sensitive:true});else await navigator.clipboard.writeText(text);toast(what+" copied. The clipboard clears in 30 seconds");
  clearTimeout(VLT.ct);VLT.ct=setTimeout(()=>{if(isApp())NP("DueNative","clipSet",{text:""}).catch(()=>{});else navigator.clipboard.writeText("").catch(()=>{})},30000)}catch(e){toast("Couldn’t copy")}vTouch()}
/* screens */
function vaultOpen(){if(!vRaw())return vSetup();if(!VLT.key)return vUnlockSheet();vList()}
function vSetup(){sheet(`<div data-vault="1"></div><h2>Passwords</h2><p class="sub">Keep your bank, Metrash, email and Wi-Fi passwords locked in the app. Choose one master password to open them.</p>
  ${F("v_p1","Master password","","password",'autocomplete="new-password"')}${F("v_p2","Type it again","","password",'autocomplete="new-password"')}
  <div class="card" style="margin-top:8px;border-color:var(--soon)"><b>Remember this password</b><p class="note" style="margin:4px 0 0">It’s never sent anywhere and can’t be reset. If you forget it, the saved passwords can’t be opened, not even by us. You can turn on fingerprint after this.</p></div>
  <div class="acts"><button class="btn" data-act="vMake">Create the vault</button></div>`)}
function vUnlockSheet(err){sheet(`<div data-vault="1"></div><h2>Passwords</h2><p class="sub">Locked.</p>${vBio()&&isApp()?`<div class="acts"><button class="btn" data-act="vBioIn">Unlock with fingerprint</button></div>`:""}
  ${F("v_pw","Master password","","password",'autocomplete="current-password"')}${err?`<p class="note" style="color:var(--late)">${esc(err)}</p>`:""}<div class="acts"><button class="btn ${vBio()&&isApp()?"ghost":""}" data-act="vOpen">Unlock</button></div>`);
  if(vBio()&&isApp()&&!err)setTimeout(()=>{if($("#over [data-vault]")&&!VLT.key)ACT.vBioIn()},300)}
function vRow(x){const c=VCAT.find(k=>k[0]==x.cat)||VCAT[7];return `<div class="row" data-act="vItem" data-id="${x.id}"><div style="display:flex;gap:10px;align-items:center"><span style="font-size:20px">${c[1]}</span><div><b>${esc(x.title||"Untitled")}${x.fav?" ★":""}</b><small>${esc(x.user||c[2])}</small></div></div><span class="dots">›</span></div>`}
function vList(q,cat){vTouch();q=String(q||"").toLowerCase();const H=vHealth(),I=[...VLT.items].sort((a,b)=>(b.fav?1:0)-(a.fav?1:0)||String(a.title).localeCompare(String(b.title))).filter(x=>(!cat||x.cat==cat)&&(!q||[x.title,x.user,x.url,x.note].join(" ").toLowerCase().includes(q)));
  sheet(`<div data-vault="1"></div><h2>Passwords</h2><p class="sub">${VLT.items.length} saved · on this phone only · locks by itself after 3 minutes</p>
  ${H.weak.length||H.reused.length||H.old.length?`<div class="card" data-act="vHealth" style="cursor:pointer;margin-bottom:8px"><b>Password check</b><p class="note" style="margin:4px 0 0">${[H.weak.length&&H.weak.length+" weak",H.reused.length&&H.reused.length+" used more than once",H.old.length&&H.old.length+" older than a year"].filter(Boolean).join(" · ")}. Tap to see them.</p></div>`:VLT.items.length?`<p class="note">✓ No weak or repeated passwords.</p>`:""}
  <input id="v_q" type="search" value="${esc(q)}" placeholder="Search passwords" aria-label="Search passwords" style="margin:0 0 8px">
  <div class="seg segx" style="margin-bottom:8px"><button class="btn sm ${cat?"ghost":""}" data-act="vCat" data-id="">All</button>${VCAT.filter(c=>VLT.items.some(x=>x.cat==c[0])).map(c=>`<button class="btn sm ${cat==c[0]?"":"ghost"}" data-act="vCat" data-id="${c[0]}">${c[1]} ${esc(c[2])}</button>`).join("")}</div>
  <div id="v_list">${I.map(vRow).join("")||`<div class="empty">${VLT.items.length?"Nothing matches.":"No passwords yet. Add your first one."}</div>`}</div>
  <div class="acts"><button class="btn" data-act="vEdit">+ Add password</button></div><div class="acts"><button class="btn ghost sm" data-act="vLock">🔒 Lock now</button><button class="btn ghost sm" data-act="vSet">⚙️ Vault settings</button></div>`);VLT.cat=cat||""}
function vItemSheet(id){vTouch();const x=VLT.items.find(i=>i.id==id);if(!x)return vList();const c=VCAT.find(k=>k[0]==x.cat)||VCAT[7],s=vScore(x.pass,x.title);
  sheet(`<div data-vault="1"></div><h2>${c[1]} ${esc(x.title||"Untitled")}</h2><p class="sub">${esc(c[2])} · changed ${fmt(iso(new Date(x.pc||x.ut||Date.now())))}</p>
  ${x.user?`<div class="lineq"><input value="${esc(x.user)}" readonly aria-label="Username"><button class="btn sm" data-act="vCopyU" data-id="${x.id}">Copy</button></div>`:""}
  <div class="lineq" style="margin-top:8px"><input id="v_show" type="password" value="${esc(x.pass||"")}" readonly aria-label="Password"><button class="ib" data-act="vEye" aria-label="Show password" style="border:1px solid var(--line);border-radius:12px;width:44px;height:44px">👁</button><button class="btn sm" data-act="vCopyP" data-id="${x.id}">Copy</button></div>
  ${x.pass?`<p class="note" style="color:${VLBL[s][1]}">${VLBL[s][0]} password</p>`:""}${x.url?`<div class="acts"><button class="btn ghost" data-act="vUrl" data-id="${x.id}">Open ${esc(x.url.replace(/^https?:\/\//,"").slice(0,30))} ↗</button></div>`:""}
  ${x.note?`<div class="card" style="margin-top:8px;white-space:pre-wrap">${esc(x.note)}</div>`:""}
  <div class="acts"><button class="btn" data-act="vEdit" data-id="${x.id}">Edit</button><button class="btn ghost" data-act="vBack">Back</button><button class="btn del" data-act="vDel" data-id="${x.id}">Delete</button></div>`)}
function vEditSheet(id){vTouch();const x=VLT.items.find(i=>i.id==id)||{cat:"other"};
  sheet(`<div data-vault="1"></div><h2>${x.id?"Edit password":"New password"}</h2>${F("v_t","Name",x.title||"","text",'placeholder="QNB mobile banking, Metrash2, Home Wi-Fi"')}${SEL("v_c","Kind",VCAT.map(c=>[c[0],c[1]+" "+c[2]]),x.cat||"other")}
  ${F("v_u","Username, email or ID",x.user||"","text",'autocomplete="off" autocapitalize="off"')}
  <label for="v_p">Password</label><div class="lineq" style="margin:0"><input id="v_p" type="password" value="${esc(x.pass||"")}" autocomplete="new-password" aria-label="Password"><button class="ib" data-act="vEye2" aria-label="Show password" style="border:1px solid var(--line);border-radius:12px;width:44px;height:44px">👁</button><button class="btn sm ghost" data-act="vGen">Make one</button></div>
  <div id="v_str" class="note" style="min-height:1.2em"></div>${F("v_url","Website (optional)",x.url||"","url",'placeholder="https://…"')}
  <label for="v_n">Notes (optional)</label><textarea id="v_n" rows="3" placeholder="PIN hint, security questions…" style="width:100%">${esc(x.note||"")}</textarea>
  <label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" id="v_f" ${x.fav?"checked":""} style="width:auto"> Show at the top</label>
  <div class="acts"><button class="btn" data-act="vSave" data-id="${x.id||""}">Save</button><button class="btn ghost" data-act="vBack">Cancel</button></div>`);vStr()}
function vStr(){const o=$("#v_str"),p=v("v_p");if(!o)return;if(!p){o.textContent="";return}const s=vScore(p,v("v_t")),dup=(VLT.items||[]).some(x=>x.pass==p&&x.id!=($('#over [data-act="vSave"]')||{dataset:{}}).dataset.id);
  o.innerHTML=`<span style="color:${VLBL[s][1]}">${VLBL[s][0]}</span>${dup?` · <span style="color:var(--late)">already used for another login</span>`:""}`}
document.addEventListener("input",e=>{const id=e.target&&e.target.id;if(id=="v_p"||id=="v_t")vStr();if(id=="v_q"){const L=$("#v_list");if(L&&VLT.items){vTouch();const q=e.target.value.toLowerCase(),I=[...VLT.items].sort((a,b)=>(b.fav?1:0)-(a.fav?1:0)||String(a.title).localeCompare(String(b.title))).filter(x=>(!VLT.cat||x.cat==VLT.cat)&&(!q||[x.title,x.user,x.url,x.note].join(" ").toLowerCase().includes(q)));L.innerHTML=I.map(vRow).join("")||`<div class="empty">Nothing matches.</div>`}}});
function vSetSheet(){vTouch();sheet(`<div data-vault="1"></div><h2>Vault settings</h2>
  ${isApp()?(vBio()?`<div class="hbl" style="margin:10px 0"><span>Unlock with fingerprint</span><button class="btn sm" data-act="vBioT">On</button></div>`:`<h3>Unlock with fingerprint</h3>${F("v_bp","Master password, to confirm","","password",'autocomplete="current-password"')}<div class="acts"><button class="btn ghost" data-act="vBioT">Turn on fingerprint</button></div>`):""}
  <h3>Change master password</h3>${F("v_n1","New master password","","password",'autocomplete="new-password"')}${F("v_n2","Type it again","","password",'autocomplete="new-password"')}<div class="acts"><button class="btn ghost" data-act="vChange">Change</button></div>
  <p class="note">Your passwords stay on this phone. They’re saved, still locked, inside your Drive backup and “Backup with files”, so you can restore them on a new phone with the master password. They are never shared through family sync.</p>
  <div class="acts"><button class="btn ghost" data-act="vBack">Back</button></div>`)}
/* locked copy in backups (never in family sync) */
{const _bs=bkSync;bkSync=function(){const s=_bs(),r=vRaw();if(!r)return s;try{const o=JSON.parse(s);o.__vault=r;return JSON.stringify(o)}catch(e){return s}}}
{const _bf=bkFull;bkFull=async function(...a){const s=await _bf(...a),r=vRaw();if(!r)return s;try{const o=JSON.parse(s);o.__vault=r;return JSON.stringify(o)}catch(e){return s}}}
{const _rf=restoreFrom;restoreFrom=async function(txt,...a){try{const o=JSON.parse(txt);if(o&&o.__vault&&o.__vault.ct&&!vRaw())localStorage.setItem("ds-vault",JSON.stringify(o.__vault))}catch(e){}return _rf(txt,...a)}}

/* ---------- guide, Needs attention, Tamil, what's new ---------- */
GUIDE.find(g=>g[0]=="Family")[1].splice(1,0,["🎁","Gifts and moi","Gifts given and received, birthdays and anniversaries, what to give back.","gifts"]);
GUIDE.find(g=>g[0]=="Safety, backup and settings")[1].unshift(["🔑","Passwords","A locked vault for bank, Metrash, email and Wi-Fi passwords.","vault"]);
Object.assign(GO,{gifts:()=>{S.cfg.famSeg="moi";ACT.tab("fam")},vault:()=>vaultOpen()});
{const _ti=todoItems;todoItems=function(){const L=_ti();pdSoon().forEach(({d,n})=>{const k=(PDK.find(x=>x[0]==d.kind)||PDK[2]),last=S.moi.filter(m=>gkey(m.person)==gkey(d.person)&&m.dir=="gave").sort((a,b)=>b.date.localeCompare(a.date))[0];
  L.push({k:-200+dl(n),ic:k[2],tx:`${d.person}: ${k[1].toLowerCase()} ${when(dl(n))}`,sub:last?`Last gift: ${last.gift||""}${last.cash?" "+fmx(last.cash,last.cur):""}${last.gold?" "+last.gold+" g gold":""} (${fmt(last.date)})`:"Tap for gift ideas",act:"moiPerson",id:gkey(d.person),tone:dl(n)<=2?"soon":""})});return L.sort((a,b)=>a.k-b.k)}}
Object.assign(TA,{"Gifts & moi":"பரிசுகள் & மொய்","Birthdays & anniversaries":"பிறந்தநாள் & திருமண நாள்","+ Birthday or anniversary":"+ பிறந்தநாள் அல்லது திருமண நாள்","Gift ideas":"பரிசு யோசனைகள்","Passwords":"கடவுச்சொற்கள்","Tools":"கருவிகள்","Connections":"இணைப்புகள்","Look and language":"தோற்றம் மற்றும் மொழி","Privacy and security":"தனியுரிமை மற்றும் பாதுகாப்பு","Help":"உதவி","More":"மேலும்","on":"இயக்கம்","off":"நிறுத்தம்","Fix categories":"வகைகளைச் சரிசெய்","Change many":"பலவற்றை மாற்று","Yearly dates":"ஆண்டு தேதிகள்","Money calendar":"பண நாள்காட்டி","Round-up jar":"சில்லறை சேமிப்பு","Insights":"நுண்ணறிவுகள்","Price watch":"விலை கண்காணிப்பு","Hide amounts":"தொகைகளை மறை","Fingerprint for documents":"ஆவணங்களுக்கு கைரேகை"});
NEW27.splice(0,NEW27.length,"🔑 Passwords: a locked vault with fingerprint, a password maker and a weak-password check (Settings → Privacy)","🎁 Gifts & moi: gifts given and received with photos, birthdays and anniversaries, what to give back (Family)","A cleaner Settings screen in sections, and tools as tiles on Spend and Plans");

Object.assign(ACT,{
  pdAdd(name){pdForm(null,name)},pdEdit(id){pdForm(S.pdays.find(x=>x.id==id))},
  pdSave(id){const who=v("pd_who").trim(),d=v("pd_d");if(!who||!d)return toast("Add the person and the date");const old=S.pdays.find(x=>x.id==id);
    put("pdays",stamp({...(old||{}),id:id||uid(),person:who,kind:v("pd_k"),md:d.slice(5),year:$("#pd_y").checked?+d.slice(0,4):0,remind:+v("pd_r")||7,note:v("pd_n").trim()},old));save();sheet("");render();toast("Saved. You’ll get a reminder before the day.")},
  pdDel(id){trash("pdays",id);save();sheet("");render()},
  giAdd(k){const t=v("f_gi").trim();if(!t)return;put("gideas",stamp({id:uid(),person:k,idea:t.slice(0,80),done:false}));save();moiPerson(k)},
  vaultOpen(){vaultOpen()},
  async vMake(){const a=v("v_p1"),b=v("v_p2");if(a.length<8)return toast("Use at least 8 characters");if(a!=b)return toast("The two passwords don’t match");toast("Locking the vault…");await vCreate(a);vList();if(isApp()&&!vBio())setTimeout(()=>toast("Tip: turn on fingerprint in Vault settings"),1200)},
  async vOpen(){const pw=v("v_pw");if(!pw)return;try{await vUnlock(pw);vList()}catch(e){vUnlockSheet("That password didn’t open the vault")}},
  async vBioIn(){try{const r=await NP("DueNative","vaultBioGet",{});if(r&&r.secret){await vUnlock(r.secret);vList()}}catch(e){const m=String(e&&e.message||e);if(/changed/.test(m)){try{localStorage.removeItem("ds-vault-bio")}catch(x){}vUnlockSheet("Fingerprints changed on this phone. Unlock with the master password, then turn fingerprint on again.")}else if(!/cancel/i.test(m))vUnlockSheet("Fingerprint didn’t work. Use the master password.")}},
  async vBioT(){if(vBio()){await NP("DueNative","vaultBioClear",{}).catch(()=>{});localStorage.removeItem("ds-vault-bio");return vSetSheet()}
    const pw=v("v_bp");if(!pw)return toast("Type your master password first");try{const r=vRaw(),k=await vDerive(pw,b64d(r.salt),r.iter||310000);await crypto.subtle.decrypt({name:"AES-GCM",iv:b64d(r.iv)},k,b64d(r.ct))}catch(e){return toast("That isn’t the master password")}
    try{await NP("DueNative","vaultBioSet",{secret:pw});localStorage.setItem("ds-vault-bio","1");toast("Fingerprint unlock is on");vSetSheet()}catch(e){toast(String(e&&e.message||e).replace(/^cancelled:?\s*/,"")||"Fingerprint wasn’t set up")}},
  async vChange(){const a=v("v_n1"),b=v("v_n2");if(a.length<8)return toast("Use at least 8 characters");if(a!=b)return toast("The two passwords don’t match");await vCreate(a);if(vBio()){await NP("DueNative","vaultBioClear",{}).catch(()=>{});localStorage.removeItem("ds-vault-bio")}toast("Master password changed"+(isApp()?". Turn fingerprint on again":""));vSetSheet()},
  vLock(){vLock();toast("Passwords locked")},vSet(){vSetSheet()},vBack(){VLT.key?vList("",VLT.cat):vaultOpen()},vCat(c){vList(v("v_q"),c)},
  vItem(id){vItemSheet(id)},vEdit(id){vEditSheet(id)},
  vEye(){const e=$("#v_show");if(e){e.type=e.type=="password"?"text":"password";vTouch()}},vEye2(){const e=$("#v_p");if(e)e.type=e.type=="password"?"text":"password"},
  vGen(){const e=$("#v_p");if(!e)return;e.value=vGen(16,true);e.type="text";vStr()},
  vCopyU(id){const x=VLT.items.find(i=>i.id==id);if(x)vCopy(x.user,"Username")},vCopyP(id){const x=VLT.items.find(i=>i.id==id);if(x&&x.pass)vCopy(x.pass,"Password")},
  vUrl(id){const x=VLT.items.find(i=>i.id==id);if(x&&x.url)openExt(/^https?:/i.test(x.url)?x.url:"https://"+x.url)},
  async vSave(id){if(!VLT.key)return vaultOpen();const t=v("v_t").trim();if(!t)return toast("Give it a name");const old=VLT.items.find(i=>i.id==id),p=v("v_p");
    const o={...(old||{}),id:id||uid(),title:t.slice(0,60),cat:v("v_c"),user:v("v_u").trim(),pass:p,url:v("v_url").trim(),note:v("v_n").slice(0,1000),fav:$("#v_f").checked,ut:Date.now(),pc:old&&old.pass==p?(old.pc||old.ut):Date.now()};
    if(old)Object.assign(old,o);else VLT.items.push(o);await vSave();toast("Saved and locked");vItemSheet(o.id)},
  async vDel(id,t){if(t&&t.getAttribute("data-ok")!="1"){t.setAttribute("data-ok","1");t.textContent="Tap again to delete";return}VLT.items=VLT.items.filter(i=>i.id!=id);await vSave();vList()},
  vHealth(){const H=vHealth(),sec=(t,L)=>L.length?`<h3>${t} (${L.length})</h3>${L.map(vRow).join("")}`:"";sheet(`<div data-vault="1"></div><h2>Password check</h2><p class="sub">Change these to stronger, different passwords. “Make one” in the editor creates a strong one.</p>${sec("Weak",H.weak)}${sec("Used more than once",H.reused)}${sec("Older than a year",H.old)}<div class="acts"><button class="btn ghost" data-act="vBack">Back</button></div>`)}
});
/* typing or tapping inside the vault keeps it open; the 3-minute lock only counts idle time */
["input","click","keydown"].forEach(t=>document.addEventListener(t,()=>{if(VLT.key&&$("#over [data-vault]"))vTouch()},true));
