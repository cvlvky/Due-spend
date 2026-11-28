/* ===== better reading of bank SMS, email alerts and copied text ===== */
const hsh=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return (h>>>0).toString(36)};
const PAYW=/debit|credit|spent|purchase|paid|payment|received|withdraw|used for|txn|transaction|transfer|refund|charged|deducted|deposited/i;
const l4Acc=l4=>l4?S.acc.find(a=>(a.l4&&l4.endsWith(String(a.l4)))||(a.l4s||[]).includes(l4)):null;
{const _ps=parseSms;parseSms=function(text){let s=String(text||"").replace(/\s+/g," ").trim();if(!s)return null;
  const ar=/ر\.?\s?ق|ريال/.test(s);
  s=s.replace(/(\d[\d,]*(?:\.\d+)?)\s*(?:ر\.?\s?ق\.?|ريال(?: قطري)?)/g,"QAR $1").replace(/(?:ر\.?\s?ق\.?|ريال(?: قطري)?)\s*(\d[\d,]*(?:\.\d+)?)/g,"QAR $1")
   .replace(/شراء|خصم|سحب/g," purchase ").replace(/إيداع|ايداع|تحويل وارد/g," credited ");
  const p=_ps(s);if(!p)return null;
  const lab=s.match(/amount\s+(debited|credited|paid|received|spent|withdrawn)\b/i);if(lab)p.kind=/credited|received/i.test(lab[1])?"in":"out";
  if(/\bused for\b|\btxn of\b|\bpurchase of\b/i.test(s)&&!/refund|reversal|credited/i.test(s))p.kind="out";
  /* payee from a UPI, IMPS or NEFT reference, else after "at" or "to" */
  const ref=s.match(/\b(?:UPI|IMPS|NEFT|RTGS|NACH|ACH|MMT)\/(?:[^\/\s]+\/)+([A-Za-z][A-Za-z .&'\-]{1,40}?)(?=\s+(?:If|For|Avl|Available|Bal|Ref|on|Thank|To|Please|Call|Not)\b|[.,;:|]|\s{2}|$)/i);
  if(ref)p.payee=ref[1].trim();
  else{const at=s.match(/\b(?:at|to)\s+([A-Za-z][A-Za-z0-9&.'\- ]{1,40}?)(?=\s+(?:at|on)\s+\d|\s+\d{1,2}[:\-\/]\d|\s+(?:on|avl|available|bal|ref|via|using|is|was)\b|[,;:]|\.\s|\.$|$)/i);
    if(at&&!/^(?:block|you|your|us|the|this|a\/c|ac|account|customer|bank|card|report)\b/i.test(at[1])&&(!p.payee||p.payee.length>at[1].length+3))p.payee=at[1].trim()}
  if(p.payee&&/^(?:block|you|your|us|the|this|a\/c|account|customer)\b/i.test(p.payee))p.payee="";
  if(!p.cur&&ar)p.cur="QAR";
  if(!p.l4){const m=s.match(/(?:المنتهية|المنتهيه|المنتهي|رقم)\s*(?:ب|في)?\s*[*xX]*\s*(\d{3,6})/);if(m)p.l4=m[1]}
  if(!p.payee){const m=s.match(/(?:لدى|عند|في)\s+([^\d.,،]{2,30}?)(?=\s+(?:في|بتاريخ|الساعة|الرصيد)\b|[.,،]|$)/);if(m)p.payee=m[1].trim()}
  const A=l4Acc(p.l4);if(A)p.acc=A.id;else if(p.l4){p.newL4=p.l4;if(p.cur){const c=S.acc.find(a=>a.cur==p.cur&&a.id==S.cfg.last)||S.acc.find(a=>a.cur==p.cur);p.acc=c?c.id:""}}
  p.cat=p.cat||catFor(p.payee);p.weak=!p.l4&&!PAYW.test(s);return p}}
/* the same payment often arrives by SMS, email and app alert: keep one */
function dedupeQ(){const q=S.cfg.smsq||[],out=[];
  q.forEach(m=>{if(!m.p||(m.src=="n"&&m.p.weak))return;const d=out.find(o=>o.p.kind==m.p.kind&&Math.abs(o.p.amt-m.p.amt)<.005&&Math.abs(dl(o.p.date)-dl(m.p.date))<=1&&(!o.p.l4||!m.p.l4||o.p.l4.slice(-4)==m.p.l4.slice(-4))&&pdShop(o.p.payee,m.p.payee)&&(pdKey(o)!=pdKey(m)||pdEcho(o,m)));
    if(d){if(!d.p.payee&&m.p.payee)d.p.payee=m.p.payee;return}out.push(m)});S.cfg.smsq=out}
function smsLog(m,why,p){const b=String(m.body||"");if(why=="nowords"&&!/(INR|Rs\.?|QAR|QR|₹|ر\.?\s?ق)\s?\d/i.test(b))return;
  const L=S.cfg.smsLog=S.cfg.smsLog||[];if(L.some(x=>x.id==m.id))return;L.push({id:m.id,t:+m.date||Date.now(),app:"SMS "+(m.address||""),body:b.slice(0,220),why});S.cfg.smsLog=L.slice(-30)}
function noAmt(m){const L=S.cfg.ntfNo=S.cfg.ntfNo||[],k=hsh(m.body);if(L.some(x=>x.k==k))return;L.push({id:m.id,k,from:m.app||m.pkg||"",body:String(m.body||"").slice(0,200),t:+m.time||Date.now()});S.cfg.ntfNo=L.slice(-10)}
/* a bank message copied anywhere is offered when the app opens */
async function clipCheck(){if(!isApp()||S.cfg.clipOff)return;try{const r=await NP("DueNative","readClip"),t=String(r&&r.text||"").trim();if(t.length<15)return;const k=hsh(t),seen=S.cfg.clipSeen=S.cfg.clipSeen||[];if(seen.includes(k))return;seen.push(k);S.cfg.clipSeen=seen.slice(-30);
  const p=parseSms(t);if(!p||p.weak){save();return}S.cfg.smsq=[...(S.cfg.smsq||[]),{id:"c"+k,from:"Copied text",body:t.slice(0,300),p,src:"c"}];dedupeQ();save();if(tab=="home")render();toast("Copied bank message found. It waits on Home to review.")}catch(e){}}
/* is alert reading still connected? */
const RD={on:null,conn:0,disc:0,seen:0,sms:null};
async function readStat(rebind){if(!isApp())return RD;try{const r=await NP("DueNative","notifStatus",{rebind:!!rebind});Object.assign(RD,{on:!!r.enabled,conn:+r.conn||0,disc:+r.disc||0,seen:+r.seen||0,sms:r.sms==null?null:!!r.sms})}catch(e){}return RD}
async function readWake(){if(!isApp()||!S.cfg.ntfAuto)return;const was=RD.on;await readStat(false);if(RD.on&&(!RD.conn||RD.disc>RD.conn))await readStat(true);if(was!==RD.on&&tab=="home")render()}
{const _sc=smsCard;smsCard=()=>{const n=(S.cfg.ntfNo||[]).length;let h=_sc();
  if(n&&!(S.cfg.smsq||[]).length)h=`<div class="card" style="margin:0 0 12px;cursor:pointer" data-act="smsReview"><div class="hbl"><b>${n} payment ${n==1?"email":"emails"} without an amount</b><span class="chip">Review</span></div></div>`;
  if(isApp()&&S.cfg.ntfAuto&&RD.on===false)h+=`<div class="card late" style="margin:0 0 12px;cursor:pointer" data-act="readCheck"><div class="hbl"><b>Payment alert reading has stopped</b><span class="chip">Fix</span></div><small style="color:var(--mute)">Notification access for Personal Diary is off.</small></div>`;return h}}
const tAgo=t=>{if(!t)return "never";const m=Math.round((Date.now()-t)/6e4);return m<1?"just now":m<60?m+" min ago":m<1440?Math.round(m/60)+" h ago":Math.round(m/1440)+" days ago"};
smsReview=function(){const q=S.cfg.smsq||[],N=S.cfg.ntfNo||[];
  const card=m=>{const A=ac(m.p.acc),dup=S.tx.some(x=>Math.abs(dl(x.date)-dl(m.p.date))<=1&&Math.abs(x.amt-m.p.amt)<.005&&x.kind==m.p.kind),nl=m.p.newL4&&!l4Acc(m.p.newL4);
    return `<div class="card" style="margin-bottom:8px"><div class="hbl"><b>${m.p.kind=="in"?"+":"−"}${fmx(m.p.amt,m.p.cur||(A&&A.cur)||"INR")}${m.p.payee?" · "+esc(m.p.payee):""}</b><span class="note">${fmt(m.p.date)}</span></div><small style="color:var(--mute)">${m.from?"<b>"+esc(m.from)+":</b> ":""}${esc(m.body)}</small>
    ${nl?`<label class="fl" style="margin-top:6px">Card or account ending ${esc(m.p.newL4)} is<select data-l4pick="${esc(m.p.newL4)}"><option value="">Choose once, the app remembers</option>${ACCS().map(([k,t])=>`<option value="${k}">${esc(t)}</option>`).join("")}</select></label>`:A?`<p class="note">Account: ${esc(A.name)}</p>`:""}
    ${dup?`<p class="note" style="color:var(--soon)">An entry with this amount already exists around this date.</p>`:""}<div class="acts"><button class="btn sm" data-act="smsAdd" data-id="${esc(m.id)}">Add</button><button class="btn sm ghost" data-act="smsSkip" data-id="${esc(m.id)}">Skip</button></div></div>`};
  sheet(`<h2>Payments to review</h2><p class="sub">Found in your bank SMS, email alerts and copied text. Tap Add to check and save, or Skip.</p>${q.length?q.map(card).join("")+`<div class="acts"><button class="btn ghost" data-act="smsSkipAll">Skip all</button></div>`:N.length?"":`<div class="empty">No payments waiting.</div>`}
  ${N.length?`<h3>Emails without an amount</h3><p class="note">The notification showed only the subject. Open the email, copy its text, come back and tap Paste.</p>${N.slice().reverse().map(m=>`<div class="card" style="margin-bottom:8px"><small style="color:var(--mute)"><b>${esc(m.from)}:</b> ${esc(m.body)} · ${tAgo(m.t)}</small><div class="acts"><button class="btn sm" data-act="clipAdd" data-id="${esc(m.k)}">Paste copied text</button><button class="btn sm ghost" data-act="ntfNoSkip" data-id="${esc(m.k)}">Skip</button></div></div>`).join("")}`:""}
  <div class="acts"><button class="btn ghost" data-act="readCheck">Something missing? Check reading</button></div>`)};
const WHY={kept:["Read","var(--pri)"],noamt:["No amount shown","var(--soon)"],noamt0:["Not a payment","var(--mute)"],nowords:["Amount, but no payment words","var(--soon)"],code:["Security code, ignored","var(--mute)"]};
async function readCheck(){const st=isApp()?await readStat(false):RD;let log=[];if(isApp()){try{log=JSON.parse(JSON.stringify((await NP("DueNative","notifLog")).items||[]))}catch(e){}}
  log=[...log.map(x=>({...x,t:+x.time})),...(S.cfg.smsLog||[])].sort((a,b)=>b.t-a.t).slice(0,30);
  const yes=(b,t)=>`<b style="color:${b?"var(--pri)":"var(--late)"}">${b?"✓":"✕"}</b> ${t}`;
  sheet(`<h2>SMS and alert reading</h2>${isApp()?`<div class="card" style="margin-bottom:8px">
  <p>${yes(st.sms!==false&&S.cfg.smsAuto,"Bank SMS: "+(S.cfg.smsAuto?"on":"off")+(st.sms===false?", permission not given":""))} · last check ${tAgo(S.cfg.smsLast)}</p>
  <p>${yes(st.on&&S.cfg.ntfAuto,"Email and app alerts: "+(S.cfg.ntfAuto?(st.on?"on":"access is off"):"off"))}${st.on?` · connected ${tAgo(st.conn)}${st.disc>st.conn?", then <b>disconnected</b>":""} · last money alert seen ${tAgo(st.seen)}`:""}</p>
  <div class="acts"><button class="btn sm" data-act="smsScan30">Read SMS from the last 30 days</button>${st.on?`<button class="btn sm ghost" data-act="readRebind">Reconnect alerts</button>`:`<button class="btn sm ghost" data-act="notifOpen">Turn on alert access</button>`}</div></div>`:`<p class="note">Automatic reading works in the phone app. Here you can test a message.</p>`}
  <h3>Test a message</h3><textarea id="f_rt" rows="3" placeholder="Paste a bank SMS or email text" aria-label="Message to test"></textarea><p class="note" id="rt_out"></p><div class="acts"><button class="btn ghost" data-act="readTest">Read it</button><button class="btn" data-act="readTestAdd">Add as entry</button></div>
  ${isApp()?`<h3>Last messages checked (${log.length})</h3>${log.length?log.map(x=>{const w=WHY[x.why]||[x.why,"var(--mute)"],p=x.why=="kept"?parseSms(x.body):null;return `<div class="row" style="cursor:default;align-items:flex-start"><div><b style="color:${w[1]}">${w[0]}</b><small>${esc(x.app||"")} · ${tAgo(x.t)}${p?" · "+(p.kind=="in"?"+":"−")+fmx(p.amt,p.cur||"INR")+(p.payee?" "+esc(p.payee):""):""}</small><small style="color:var(--mute)">${esc(String(x.body||"").slice(0,140))}</small></div></div>`}).join(""):`<div class="empty">Nothing yet. Alerts appear here as they arrive.</div>`}`:""}
  <h3>If emails are not read</h3><ol class="steps"><li><b>Outlook:</b> Settings → Notifications → Mail → <b>Focused and Other</b>. Or open a bank email → ⋮ → Move to Focused → Always.</li><li><b>Gmail:</b> Settings → your account → Notifications: <b>All</b>. Bank emails in the Updates tab don’t notify unless that label’s notifications are on.</li><li>Phone Settings → Apps → Personal Diary → Battery → <b>Unrestricted</b>, so Android doesn’t stop alert reading.</li><li>After each app update, if alerts stop, tap <b>Reconnect alerts</b>.</li><li>If an email notification has no amount, copy the email text. The app picks it up when you open it.</li></ol>`)}
Object.assign(ACT,{
  readCheck(){readCheck()},
  async readRebind(){await readStat(true);setTimeout(async()=>{await readStat(false);readCheck();toast(RD.on?"Alert reading reconnected":"Turn on alert access")},1200)},
  async smsScan30(){S.cfg.smsAuto=true;S.cfg.smsAt=Date.now()-30*864e5;S.cfg.smsMax=400;const before=(S.cfg.smsq||[]).length;await smsScan(true);S.cfg.smsMax=150;save();const n=(S.cfg.smsq||[]).length-before;toast(S.cfg.smsAuto?(n>0?n+" payments found. Check them on Home.":"No new payments found in SMS"):"Allow the SMS permission first");readCheck()},
  readTest(){const t=v("f_rt"),p=parseSms(t),o=$("#rt_out");if(o)o.innerHTML=!t.trim()?"Paste a message first.":!p?"No amount found in this message.":`Reads as: <b>${p.kind=="in"?"money in":"money out"} ${fmx(p.amt,p.cur||"INR")}</b>${p.payee?", "+esc(p.payee):""}, ${fmt(p.date)}${p.l4?", card or account ending "+esc(p.l4):""}${p.acc?" → "+esc(an(p.acc)):""}.`},
  readTestAdd(){const t=v("f_rt");if(!t.trim())return toast("Paste a message first");smsOpen(t)},
  async clipAdd(k){let t="";try{t=String((await NP("DueNative","readClip")).text||"")}catch(e){}if(!t&&navigator.clipboard){try{t=await navigator.clipboard.readText()}catch(e){}}
    if(!parseSms(t)){sheet(`<h2>Paste the email text</h2><textarea id="f_sms" rows="6" aria-label="Email text"></textarea><div class="acts"><button class="btn" data-act="clipAddTyped" data-id="${esc(k)}">Read it</button></div>`);return}
    S.cfg.ntfNo=(S.cfg.ntfNo||[]).filter(x=>x.k!=k);save();render();smsOpen(t)},
  clipAddTyped(k){const t=v("f_sms");if(!parseSms(t))return toast("Couldn’t find an amount in that text");S.cfg.ntfNo=(S.cfg.ntfNo||[]).filter(x=>x.k!=k);save();render();smsOpen(t)},
  ntfNoSkip(k){S.cfg.ntfNo=(S.cfg.ntfNo||[]).filter(x=>x.k!=k);save();render();smsReview()}
});
{const _sa=ACT.smsSkipAll;ACT.smsSkipAll=function(){S.cfg.ntfNo=[];return _sa()}}
document.addEventListener("change",e=>{const t=e.target;if(!t||!t.dataset||!t.dataset.l4pick||!t.value)return;const l4=t.dataset.l4pick,a=S.acc.find(x=>x.id==t.value);if(!a)return;
  a.l4s=[...new Set([...(a.l4s||[]),l4])];a.ut=Date.now();(S.cfg.smsq||[]).forEach(m=>{if(m.p&&m.p.newL4==l4){m.p.acc=a.id;m.p.cur=m.p.cur||a.cur;delete m.p.newL4}});save();smsReview();toast(`Ending ${l4} is now linked to ${a.name}`)});
{const _ns=nativeStart;nativeStart=function(){_ns();setTimeout(readWake,800);setTimeout(clipCheck,1500)}}
