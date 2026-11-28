/* ===== Version 35: Payment review you can correct, and an app that learns from it ===== */
/* Waiting → Approved or Ignored. In Approved: change the account, make it a transfer, edit or undo.
   Every choice teaches the app: the account for each bank and card, transfers to your own accounts,
   and payments you always skip. Once a choice is the same 3 times, the app does it for you. */

const AUTO_N=3;
const LR=()=>{const L=S.cfg.learn=S.cfg.learn||{};L.acc=L.acc||{};L.tr=L.tr||{};L.skip=L.skip||{};return L};
/* who sent it: the bank's name, not the Messages app; Indian sender codes like AX-HDFCBK-S become hdfcbk */
function learnKey(m){if(!m)return "";const pk=pkgOf(m);let k=sendKey(m.from||"");
  if(SMSPK.has(pk)||/^(messages|messaging|truecaller|message)$/i.test(k)){const t=String(m.body||"").split(". ")[0].trim();k=t&&t.length<=40&&!AMTX.test(t)?sendKey(t):""}
  return k.replace(/^[a-z]{2}-(?=[a-z0-9]{3,})/,"").replace(/-[a-z]$/,"")}
const payeeKey=p=>String((p&&p.payee)||"").toLowerCase().replace(/[^a-z]+/g," ").trim().slice(0,30);
const accKey=m=>{const k=learnKey(m);return k?k+"|"+((m.p&&m.p.l4)||""):""};
const trKey=m=>{const k=accKey(m),pk=payeeKey(m.p);return k&&pk?k+"|"+pk:""};
function learnTrim(){const L=LR();["acc","tr","skip"].forEach(t=>{const E=Object.entries(L[t]).sort((a,b)=>(b[1].t||0)-(a[1].t||0)).slice(0,150);L[t]=Object.fromEntries(E)})}
/* learn from a choice you made (the app's own automatic saves don't count) */
function learnFrom(m,tx){if(!m||!m.p||!tx)return;const L=LR(),now=Date.now();
  if(tx.kind=="tr"){if(m.p.cc)return;const k=trKey(m);if(!k)return;const r=L.tr[k];L.tr[k]=r&&r.to==tx.to&&r.from==tx.acc?{...r,n:r.n+1,t:now}:{from:tx.acc,to:tx.to,n:1,t:now};delete L.skip[k]}
  else{const k=accKey(m);if(!k)return;const r=L.acc[k];L.acc[k]=r&&r.a==tx.acc?{...r,n:r.n+1,t:now}:{a:tx.acc,n:1,t:now};const t2=trKey(m);if(t2){delete L.skip[t2];if(L.tr[t2])delete L.tr[t2]}}
  learnTrim()}
function learnSkip(m){const k=m&&m.p&&trKey(m);if(!k)return;const L=LR(),r=L.skip[k];L.skip[k]={n:(r?r.n:0)+1,t:Date.now()}}
/* use what was learned on a new payment */
function learnApply(m){if(!m||!m.p||m.lr)return;m.lr=1;const L=LR(),p=m.p;if(p.cc)return;const tk=trKey(m),ak=accKey(m);
  const T=tk&&L.tr[tk];if(T&&ac(T.to).id&&ac(T.from).id&&ac(T.from).cur==ac(T.to).cur){p.xf={from:T.from,to:T.to,n:T.n};return}
  const A=ak&&L.acc[ak];if(A&&ac(A.a).id&&(!p.cur||ac(A.a).cur==p.cur)){p.acc=A.a;p.sure=1;p.lrn=A.n}
  const K=tk&&L.skip[tk];if(K&&K.n>=AUTO_N)p.lskip=K.n}
const learnAutoOn=()=>S.cfg.learnAuto!==false;
/* what the phone may save without asking: banks and cards you confirmed 3 times */
const learnSure=()=>Object.entries(LR().acc).filter(([k,r])=>r.n>=AUTO_N&&ac(r.a).id).map(([k])=>k);

/* every decision is logged with how to learn from it */
{const _rl=revLog;revLog=function(m,act,via,tx,...a){const r=_rl.call(this,m,act,via,tx,...a);try{const L=S.cfg.payLog||[],x=L[L.length-1];if(x){x.lid=x.lid||uid()}if(x&&m){x.lk=accKey(m);x.pk=payeeKey(m.p);x.p=x.p||(m.p?{...m.p}:undefined);x.body=x.body||String(m.body||"").slice(0,240);x.mf=String(m.from||"").slice(0,60)}
  const v=via||payVia;if(v!="auto"&&m){if(act=="add"||act=="transfer")learnFrom(m,tx);else if(act=="skip")learnSkip(m)}}catch(e){console.warn(e)}return r}}
/* a learned account counts as sure, so Add on the phone saves straight away */
{const _psu=paySure;paySure=function(p,...a){if(p&&p.sure&&ac(p.acc).id)return true;return _psu.call(this,p,...a)}}
/* learned transfers: Add on the phone saves the transfer */
function xfMake(m,via){const f=m.p.xf.from,t=m.p.xf.to,tx=addTx(stamp({kind:"tr",acc:f,to:t,amt:+m.p.amt,got:+m.p.amt,fee:0,date:m.p.date||today(),cur:ac(f).cur,note:m.p.payee||"Transfer",via:""}));
  S.cfg.smsq=(S.cfg.smsq||[]).filter(x=>x!==m&&String(x.id)!=String(m.id));revLog(m,"transfer",via,tx);payClear([m.id]);return tx}
{const _pa2=payApply;payApply=function(a){try{if(a&&a.act=="add"){const m=payFind(a);if(m&&m.p&&m.p.xf){const v=payVia;payVia="phone";try{const tx=xfMake(m,"phone"),T=S.cfg.payTx=S.cfg.payTx||{};T[a.id]=tx.id;T[m.id]=tx.id;return "add"}finally{payVia=v}}}}catch(e){console.warn(e)}return _pa2(a)}}
/* new payments: apply what was learned, then do the sure ones */
function learnRun(){if(!learnAutoOn())return 0;let n=0;const v=payVia;payVia="auto";try{[...(S.cfg.smsq||[])].forEach(m=>{if(!m.p||m.yes)return;
  if(m.p.xf&&m.p.xf.n>=AUTO_N&&!S.tx.some(x=>x.kind=="tr"&&Math.abs(x.amt-m.p.amt)<.005&&x.date==m.p.date&&x.to==m.p.xf.to)){xfMake(m,"auto");n++}
  else if(m.p.lskip>=AUTO_N){S.cfg.smsq=S.cfg.smsq.filter(x=>x!==m);revLog(m,"skip","auto");payClear([m.id]);n++}
  else if(m.p.sure&&m.p.lrn>=AUTO_N&&quickOk(m)&&!qDup(m)){quickSave(m);n++}})}finally{payVia=v}return n}
{const _dq2=dedupeQ;dedupeQ=function(...a){const r=_dq2.apply(this,a);try{(S.cfg.smsq||[]).forEach(learnApply);if(learnRun()){save();setTimeout(render,0)}}catch(e){console.warn("learning",e)}return r}}
/* the phone gets the banks and cards it may save without asking */
{const _pps=payPopSync;payPopSync=async function(...a){const r=await _pps.apply(this,a);try{if(isApp())await NP("DueNative","payLearn",{keys:learnAutoOn()?learnSure().slice(0,80):[]})}catch(e){}return r}}

/* ---------- Approved and Ignored: correct it right there ---------- */
const prTx=x=>x&&x.tx?S.tx.find(t=>t.id==x.tx):null;
const prLog=id=>[...(S.cfg.payLog||[])].reverse().find(y=>(y.lid||y.id)==id);
function prAccSel(x,t){const L=S.acc.filter(a=>!a.closed||a.id==t.acc);if(L.length<2)return `<small class="pracc">${esc(ac(t.acc).name||"")}</small>`;
  return `<label class="pracc"><span>${t.kind=="in"?"Into":"From"}</span><select data-pracc="${esc(x.lid||x.id)}" aria-label="Account">${L.map(a=>`<option value="${a.id}"${a.id==t.acc?" selected":""}>${esc(a.name)}${a.cur!=(t.cur||ac(t.acc).cur)?" ("+a.cur+")":""}</option>`).join("")}</select></label>`}
function prRow(x){const I=REVIC[x.act]||["•",x.act,"var(--mute)"],t=prTx(x),tm=new Date(x.t),hh=String(tm.getHours()).padStart(2,"0")+":"+String(tm.getMinutes()).padStart(2,"0"),auto=x.via=="auto";
  const lab=x.act=="skip"&&auto?"Ignored for you":x.act=="auto"?"Saved for you":I[1]+(REVVIA[x.via]?" "+REVVIA[x.via]:"");let acts="";
  if(/^(add|auto)$/.test(x.act)){acts=t?`<div class="pract">${t.kind=="tr"?`<small class="pracc">⇄ ${esc(ac(t.acc).name)} → ${esc(ac(t.to).name)}</small>`:prAccSel(x,t)}<div class="prbtns">${t.kind!="tr"&&t.kind!="in"?`<button class="btn sm ghost" data-act="prXfer" data-id="${esc(x.lid||x.id)}">⇄ Transfer</button>`:""}<button class="btn sm ghost" data-act="revOpen" data-id="${t.id}">Edit</button><button class="btn sm ghost" data-act="prUndo" data-id="${esc(x.lid||x.id)}">Undo</button></div></div>`:`<small class="pracc" style="color:var(--mute)">Entry deleted</small>`}
  else if(x.act=="transfer"){acts=t?`<div class="pract"><small class="pracc">⇄ ${esc(ac(t.acc).name)} → ${esc(ac(t.to).name)}</small><div class="prbtns"><button class="btn sm ghost" data-act="revOpen" data-id="${t.id}">Edit</button><button class="btn sm ghost" data-act="prUndo" data-id="${esc(x.lid||x.id)}">Undo</button></div></div>`:`<small class="pracc" style="color:var(--mute)">Entry deleted</small>`}
  else if(x.act=="skip"&&!x.re&&x.p&&+x.p.amt)acts=`<div class="pract"><div class="prbtns"><button class="btn sm" data-act="revAdd" data-id="${esc(x.id)}">Add it</button>${auto?`<button class="btn sm ghost" data-act="prForget" data-id="skip|${esc(x.lk+"|"+(x.pk||""))}">Stop ignoring these</button>`:""}</div></div>`;
  const amt=t&&/^(add|auto|transfer)$/.test(x.act)?t.amt:x.amt,cur=t&&/^(add|auto|transfer)$/.test(x.act)?(t.cur||ac(t.acc).cur):x.cur;
  return `<div class="trow prrow"><span class="rvic" style="background:${x.act=="skip"&&auto?"#b9a37a":I[2]}" aria-hidden="true">${I[0]}</span><div class="tmain"><b>${(t?t.kind:x.kind)=="in"?"+":(t?t.kind:x.kind)=="tr"?"⇄ ":"−"}${fmx(amt,cur||"INR")}${x.payee?" · "+esc(x.payee):""}</b><small>${lab} · ${hh}${x.from?" · "+esc(x.from):""}</small>${acts}</div></div>`}
function prList(tab){const ok=tab!="no",L=(S.cfg.payLog||[]).slice().reverse().filter(x=>ok?PROK.test(x.act):x.act=="skip").slice(0,150),G=[],c=prCount();
  L.forEach(x=>{const d=iso(new Date(x.t));let g=G.find(y=>y.d==d);if(!g)G.push(g={d,L:[]});g.L.push(x)});const nl=Object.keys(LR().acc).length+Object.keys(LR().tr).length+Object.values(LR().skip).filter(r=>r.n>=AUTO_N).length;
  sheet(`<h2 id="rev_sheet">Payment review</h2><p class="sub">Payments found in your SMS, bank apps, wallets and email, and what you decided.</p>${prTabs(ok?"ok":"no")}
  <p class="note" style="margin:0 0 8px">${ok?"Wrong account? Change it here, or tap Transfer if the money went to your own account. The app learns from it.":"Skipped payments. Tap Add it to put one in your entries."}</p>
  ${G.length?G.map(g=>`<h3>${g.d==today()?"Today":g.d==plus(-1)?"Yesterday":fmt(g.d)}</h3><div class="card">${g.L.map(prRow).join("")}</div>`).join(""):`<div class="empty">${ok?"Nothing approved yet. Payments you add from Waiting, or tap Add on the phone, show here.":"Nothing ignored yet. Payments you skip show here."}</div>`}
  <div class="card prlearn" data-act="learnSheet" role="button"><div class="hbl"><b>🧠 What the app has learned</b><span class="chip">${nl}</span></div><small style="color:var(--mute)">${learnAutoOn()?"Saves for you after the same choice 3 times":"Learning is on; saving for you is off"}</small></div>`)}
{const _pr=payReview;payReview=function(tab){tab=tab||((S.cfg.smsq||[]).length?"wait":"ok");if(tab=="wait")return smsReview();prList(tab)}}
/* change the account: the entry is fixed and the app remembers it for that bank and card */
document.addEventListener("change",e=>{const s=e.target;if(!s||!s.dataset||!s.dataset.pracc)return;const x=prLog(s.dataset.pracc),t=prTx(x);if(!t||!s.value||s.value==t.acc)return;
  const A=ac(s.value);if(!A.id)return;linkApply(t,-1);const c0=t.cur||ac(t.acc).cur||"INR";if(A.cur!=c0){t.note=[t.note,"Paid "+fmx(t.amt,c0)].filter(Boolean).join(" · ");t.amt=Math.round(cv(t.amt,c0,A.cur)*100)/100}t.acc=A.id;t.cur=A.cur;linkApply(t,1);t.ut=Date.now();if(x.lk){const L=LR();L.acc[x.lk]={a:A.id,n:1,t:Date.now(),fix:1}}save();payPopSync();render();toast("Moved to "+A.name+". Next time it goes there.")});
let xfPend=null;
Object.assign(ACT,{
  prXfer(id){const x=prLog(id),t=prTx(x);if(!t)return;xfPend={x:id,old:t.id,n:S.tx.length};
    trForm({acc:t.acc,to:"",amt:t.amt,got:t.amt,date:t.date,note:t.payee||"",via:""});const h=$("#over h2");if(h)h.textContent="Make it a transfer";
    const n=$("#trn");if(n)n.insertAdjacentHTML("beforebegin",`<p class="note" style="color:var(--pri)">Choose the account the money went to. The expense is replaced by this transfer, and next time a payment like this is saved as a transfer.</p>`)},
  prUndo(id){const x=prLog(id),t=prTx(x);if(t)removeTx(t.id);if(x){x.act="skip";x.via="app";x.t=Date.now();x.tx="";x.re=0;if(x.p)x.p={...x.p}}save();render();toast("Undone. It’s in Ignored if you need it again.");prList("ok")},
  learnSheet(){learnSheet()},
  learnAutoT(){S.cfg.learnAuto=!learnAutoOn();save();payPopSync();learnSheet();toast(learnAutoOn()?"The app saves for you once it’s sure":"The app only suggests now")},
  prForget(k){const [t,...rest]=String(k).split("|"),key=rest.join("|"),L=LR();if(L[t])delete L[t][key];save();payPopSync();if($("#learn_sheet"))learnSheet();else prList(t=="skip"?"no":"ok");toast("Forgotten")}
});
{const _str2=ACT.saveTr;ACT.saveTr=function(...a){const pend=xfPend;xfPend=null;const r=_str2.apply(this,a);try{if(pend&&S.tx.length>pend.n){const nt=S.tx[S.tx.length-1],x=prLog(pend.x);
  if(nt&&nt.kind=="tr"){removeTx(pend.old);if(x){x.act="transfer";x.tx=nt.id;x.kind="tr";if(x.lk&&x.pk){const L=LR(),k=x.lk+"|"+x.pk;L.tr[k]={from:nt.acc,to:nt.to,n:1,t:Date.now()}}}save();render();toast("Saved as a transfer. Next time it’s done the same way.")}}}catch(e){console.warn(e)}return r}}
/* editing an approved entry in the usual form teaches the app too */
{const _stx=ACT.saveTx;ACT.saveTx=function(id,...a){const old=id&&S.tx.find(t=>t.id==id),oa=old&&old.acc;const r=_stx.call(this,id,...a);try{if(old&&oa){const t=S.tx.find(q=>q.id==id),x=(S.cfg.payLog||[]).find(y=>y.tx==id&&y.lk);if(t&&x&&t.acc!=oa){LR().acc[x.lk]={a:t.acc,n:1,t:Date.now(),fix:1};save();payPopSync()}}}catch(e){}return r}}

/* ---------- what the app has learned ---------- */
function learnSheet(){const L=LR(),nm=k=>{const [s,l4]=k.split("|");return esc(s.toUpperCase())+(l4?" · ending "+esc(l4):"")};
  const A=Object.entries(L.acc).sort((a,b)=>b[1].t-a[1].t),T=Object.entries(L.tr).sort((a,b)=>b[1].t-a[1].t),K=Object.entries(L.skip).filter(([k,r])=>r.n>=2).sort((a,b)=>b[1].t-a[1].t);
  const st=n=>n>=AUTO_N?`<span class="lrok">Saved for you</span>`:`<span class="lrn">${n} of ${AUTO_N}</span>`;
  sheet(`<h2 id="learn_sheet">What the app has learned</h2><p class="sub">From the payments you approved, changed or skipped. After the same choice ${AUTO_N} times, the app does it for you, and the phone stops asking.</p>
  <div class="card"><div class="hbl"><span><b>Save for me when sure</b><small style="display:block;color:var(--mute)">Off: the app only fills in its guess, you still approve</small></span><button class="btn sm${learnAutoOn()?"":" ghost"}" data-act="learnAutoT">${learnAutoOn()?"On":"Off"}</button></div></div>
  <h3>Accounts</h3>${A.length?`<div class="card">${A.map(([k,r])=>`<div class="trow"><div class="tmain"><b>${nm(k)} → ${esc(ac(r.a).name||"?")}</b><small>${r.fix?"You corrected it · ":""}${st(r.n)}</small></div><button class="btn sm ghost" data-act="prForget" data-id="acc|${esc(k)}">Forget</button></div>`).join("")}</div>`:`<div class="empty">Nothing yet. Approve a few payments and it fills in.</div>`}
  ${T.length?`<h3>Transfers to your own accounts</h3><div class="card">${T.map(([k,r])=>{const p=k.split("|");return `<div class="trow"><div class="tmain"><b>${esc((p[2]||"").toUpperCase())} → ${esc(ac(r.to).name||"?")}</b><small>From ${esc(ac(r.from).name||"?")} · ${nm(p[0]+"|"+p[1])} · ${st(r.n)}</small></div><button class="btn sm ghost" data-act="prForget" data-id="tr|${esc(k)}">Forget</button></div>`}).join("")}</div>`:""}
  ${K.length?`<h3>Payments you skip</h3><div class="card">${K.map(([k,r])=>{const p=k.split("|");return `<div class="trow"><div class="tmain"><b>${esc((p[2]||"").toUpperCase())}</b><small>${nm(p[0]+"|"+p[1])} · skipped ${r.n} ${r.n==1?"time":"times"}${r.n>=AUTO_N?" · ignored for you":""}</small></div><button class="btn sm ghost" data-act="prForget" data-id="skip|${esc(k)}">Forget</button></div>`}).join("")}</div>`:""}
  <div class="acts"><button class="btn ghost" data-act="payReview">Back to Payment review</button></div>`)}

/* ---------- Waiting: learned guesses shown; when empty, show what is being read ---------- */
{const _sr4=smsReview;smsReview=function(...a){const r=_sr4.apply(this,a);try{(S.cfg.smsq||[]).forEach(m=>{const b=$(`#over [data-act="smsAdd"][data-id="${CSS.escape(String(m.id))}"]`),c=b&&b.closest(".card");if(!c||c.querySelector(".lrnote"))return;
  if(m.p&&m.p.xf){const F=ac(m.p.xf.from),T=ac(m.p.xf.to);const acts=b.closest(".acts");c.querySelectorAll('[data-act="smsQuick"]').forEach(x=>x.remove());acts.insertAdjacentHTML("beforebegin",`<p class="note lrnote" style="color:var(--pri)">🧠 Like before: a transfer ${esc(F.name)} → ${esc(T.name)}</p>`);acts.insertAdjacentHTML("afterbegin",`<button class="btn sm" data-act="xfSave" data-id="${esc(m.id)}">Save transfer</button>`);b.classList.add("ghost");b.textContent="Expense instead"}
  else if(m.p&&m.p.sure&&m.p.lrn)c.querySelector(".acts").insertAdjacentHTML("beforebegin",`<p class="note lrnote" style="color:var(--pri);margin:2px 0 6px">🧠 Learned: ${esc(ac(m.p.acc).name)} (${m.p.lrn} of ${AUTO_N})</p>`)});
  if(!(S.cfg.smsq||[]).length){const em=$("#over .empty");if(em&&!$("#over .prsrc"))em.insertAdjacentHTML("afterend",prSources())}}catch(e){console.warn(e)}return r}}
function prSources(){const app=isApp(),gm=gmOn(),ms=msOn(),r=(on,t,sub)=>`<div class="trow"><span class="tdot ${on===true?"good":on=="bad"?"bad":"na"}" aria-hidden="true"></span><div class="tmain"><b>${t}</b><small>${sub}</small></div></div>`;
  return `<div class="card prsrc"><b>Where the app looks</b>${r(app&&S.cfg.smsAuto?true:"off","Bank SMS",!app?"Works in the phone app":S.cfg.smsAuto?"On · last read "+tAgo(S.cfg.smsLast):"Off")}
  ${r(app&&S.cfg.ntfAuto?true:"off","Bank apps and wallets",!app?"Works in the phone app":S.cfg.ntfAuto?"On":"Off")}${r(gm||ms?true:"off","Email",gm&&ms?"Gmail and Outlook":gm?"Gmail":ms?"Outlook":"Not connected")}
  <div class="prsrcb">${app?`<button class="btn sm" data-act="prCheck">Check now</button><button class="btn sm ghost" data-act="smsScan30">Last 30 days</button>`:""}<button class="btn sm ghost" data-act="trackHub">Turn on or fix</button><button class="btn sm ghost" data-act="readCheck">Messages checked</button></div></div>`}
Object.assign(ACT,{
  xfSave(id){const m=(S.cfg.smsq||[]).find(x=>String(x.id)==String(id));if(!m||!m.p||!m.p.xf)return;const tx=xfMake(m,m.yes?"phone":"app");save();render();toast("Saved as a transfer to "+ac(tx.to).name);if((S.cfg.smsq||[]).length)smsReview();else payReview("ok")},
  async prCheck(){toast("Checking your messages…");const before=(S.cfg.smsq||[]).length,ok0=(S.cfg.payLog||[]).length;try{if(S.cfg.smsAuto)await smsScan();await payNow();const J=[];if(gmOn())J.push(gmScan(false).catch(()=>0));if(msOn())J.push(msScan().catch(()=>0));await Promise.all(J)}catch(e){console.warn(e)}
    save();render();const n=(S.cfg.smsq||[]).length-before,s=(S.cfg.payLog||[]).length-ok0;toast(n>0?n+" new "+(n==1?"payment":"payments")+" to review":s>0?s+" saved for you":"No new payments found");payReview((S.cfg.smsq||[]).length?"wait":"ok")}
});

NEW27.splice(0,NEW27.length,"🧾 Payment review: change the account or make it a transfer right in Approved; Undo moves it to Ignored","🧠 The app learns your choices: the account for each bank and card, transfers to your own accounts, payments you always skip","⚡ After the same choice 3 times it saves for you, and the phone stops asking (turn off in What the app has learned)","🔎 Waiting shows where the app looks, with Check now and Find payments from the last 30 days","⬇️ Passwords: import from CSV; 📅 Spending calendar; 💡 Insights on Home");
