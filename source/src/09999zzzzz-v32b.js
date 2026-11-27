/* ===== Version 32.2: credit cards show limit, used and available to spend, like the bank app ===== */
const cardLim=k=>k&&k.type=="card"?Math.abs(+k.lim||0):0;
const cardOwe=k=>Math.max(0,-Math.round(bal(k)*100)/100);
const cardAv=k=>Math.round((cardLim(k)+bal(k))*100)/100;
function cardBar(k){const L=cardLim(k);if(!L)return "";const p=Math.max(0,Math.min(100,Math.round(cardOwe(k)/L*100)));return `<div class="cbar" role="img" aria-label="${p}% of the limit used"><i style="width:${p}%;background:${p>=90?"var(--late)":p>=70?"var(--soon)":"var(--pri)"}"></i></div>`}
const cardUsed=k=>{const L=cardLim(k),b=Math.round(bal(k)*100)/100;return L?`Used ${fmx(cardOwe(k),k.cur)} of ${fmx(L,k.cur)}`:(b<0?"You owe "+fmx(-b,k.cur):b>0?fmx(b,k.cur)+" in credit":"Nothing owed")};

/* the limit in the account form, shown only for credit cards */
{const _af=accForm;accForm=function(k){_af(k);try{const t=$("#f_type"),row=t&&t.closest(".two");if(!row)return;const w=document.createElement("div");w.id="f_limw";
  w.innerHTML=F("f_lim","Card limit (as the bank app shows)",k&&k.lim||"","number",'placeholder="Credit limit"')+`<p class="note" style="margin-top:4px">The card then shows what’s left to spend: limit minus what you owe.</p>`;row.insertAdjacentElement("afterend",w);
  const sync=()=>{w.style.display=t.value=="card"?"":"none"};sync();t.addEventListener("change",sync);if(taOn())taNode(w)}catch(e){console.warn(e)}}}
{const _sa=ACT.saveAcc;ACT.saveAcc=function(id,...a){const has=!!$("#f_lim"),lim=has?Math.abs(num(v("f_lim")))||0:0,ty=has?v("f_type"):"",before=new Set(S.acc.map(k=>k.id));const r=_sa.call(this,id,...a);
  if(has){const k=id?S.acc.find(x=>x.id==id):S.acc.find(x=>!before.has(x.id));const nv=ty=="card"?Math.round(lim*100)/100:0;if(k&&(+k.lim||0)!=nv){put("acc",stamp({...k,lim:nv},k));save();render()}}return r}}

/* Accounts list: a card shows what's left to spend, with a bar for what's used */
{const _va=vAcc;vAcc=function(...a){let h=_va(...a);try{S.acc.filter(k=>k.type=="card").forEach(k=>{const L=cardLim(k),b=bal(k);
    const re=new RegExp('(<div class="arow" data-act="accMenu" data-id="'+k.id+'">[\\s\\S]*?<div class="an"><b>[^<]*</b><small>)([^<]*)(</small>)(</div>)<b class="ab[^"]*">[^<]*</b>');
    h=h.replace(re,(m0,a1,sm,c1,c2)=>a1+esc(L?"Used "+nf(cardOwe(k),2)+" of "+nf(L,2):cardUsed(k))+c1+cardBar(k)+c2+(L?`<b class="ab${cardAv(k)<0?" neg":""}">${fmx(cardAv(k),k.cur)}<small class="abl">available</small></b>`:`<b class="ab${b<0?" neg":""}">${fmx(b,k.cur)}<small class="abl">${b<0?"owed":"balance"}</small></b>`))});
    if(S.acc.some(k=>k.type=="card"))h=h.replace('<p class="note" style="margin-top:6px">Tap an account','<p class="note" style="margin-top:6px">Card totals count what you owe. Tap an account')}catch(e){console.warn(e)}return h}}

/* the card's own sheet */
{const _am=accMenu;accMenu=function(id){_am(id);try{const k=ac(id);if(!k||k.type!="card")return;const big=$("#over .big");if(!big)return;const L=cardLim(k),b=bal(k);
  big.style.color=L?(cardAv(k)<0?"var(--late)":"inherit"):(b<0?"var(--late)":"inherit");
  big.innerHTML=L?`${fmx(cardAv(k),k.cur)} <small style="font-size:14px;font-weight:600;color:var(--mute)">available to spend</small>`:`${b<0?fmx(-b,k.cur)+' <small style="font-size:14px;font-weight:600;color:var(--mute)">owed</small>':fmx(b,k.cur)}`;
  big.insertAdjacentHTML("afterend",L?`${cardBar(k)}<div class="cgrid"><div><small>Card limit</small><b>${fmx(L,k.cur)}</b></div><div><small>You owe</small><b>${fmx(cardOwe(k),k.cur)}</b></div><div><small>Available</small><b>${fmx(cardAv(k),k.cur)}</b></div></div>`
    :`<div class="card" style="margin:8px 0"><b>Add the card limit</b><p class="note" style="margin:4px 0 0">Then the card shows what’s left to spend, like the bank app.</p><div class="acts"><button class="btn sm" data-act="editAcc" data-id="${id}">Add card limit</button></div></div>`);if(taOn())taNode($("#over"))}catch(e){console.warn(e)}}}
/* statement sheet header */
{const _sm=stmt;stmt=function(k,...a){const r=_sm(k,...a);try{if(k&&k.type=="card"){const s=$("#over .sub");if(s)s.textContent=cardLim(k)?`Limit ${fmx(cardLim(k),k.cur)} · used ${fmx(cardOwe(k),k.cur)} · available ${fmx(cardAv(k),k.cur)}`:cardUsed(k)}}catch(e){}return r}}

/* Correct balance, card version: type what the bank app shows */
{const _ff=fixForm;fixForm=function(id){const k=ac(id);if(!k||k.type!="card")return _ff(id);const L=cardLim(k);
  sheet(`<h2>Correct card balance</h2><p class="sub">${esc(k.name)}: the app shows ${esc(L?cardUsed(k)+" · available "+fmx(cardAv(k),k.cur):cardUsed(k))}. Type what the bank app shows now.</p>
  ${L?"":F("f_lim2","Card limit","","number",'placeholder="Credit limit"')}${F("f_avl","Available to spend now ("+k.cur+")","","number")}
  <p class="note" style="margin:2px 0 8px">or</p>${F("f_owe2","Amount you owe now ("+k.cur+")","","number")}
  <div class="acts"><button class="btn" data-act="saveFix" data-id="${id}">Save</button><button class="btn ghost" data-act="okBal" data-id="${id}">It matches</button></div>${k.rcd?`<p class="note">Last checked ${fmt(k.rcd)}</p>`:""}`)}}
function cardTarget(k,avlS,oweS,limS){let L=cardLim(k);const nl=limS!=null&&String(limS).trim()!==""?Math.abs(num(limS)):0;if(nl)L=nl;
  if(String(avlS||"").trim()!==""){if(!L)return {err:"Add the card limit first, or type what you owe"};return {T:Math.round((Math.abs(num(avlS))-L)*100)/100,L:nl||0}}
  if(String(oweS||"").trim()!=="")return {T:-Math.abs(Math.round(num(oweS)*100)/100),L:nl||0};return {err:"Type the amount available or what you owe"}}
{const _sf=ACT.saveFix;ACT.saveFix=function(id,...a){const k=ac(id);if(!k||k.type!="card"||!$("#f_avl"))return _sf.call(this,id,...a);
  const r=cardTarget(k,v("f_avl"),v("f_owe2"),$("#f_lim2")?v("f_lim2"):null);if(r.err)return toast(r.err);if(r.L){k.lim=r.L;k.ut=Date.now()}
  const d=Math.round((r.T-bal(k))*100)/100;if(Math.abs(d)>=.005)addTx({kind:"adj",acc:id,amt:d,cur:k.cur,date:today(),cat:"Balance correction",note:"Matched to the bank app"});
  const W={...(S.cfg.balWarn||{})};delete W[id];S.cfg.balWarn=W;k.rcd=today();k.ut=Date.now();done();toast(cardLim(k)?"Available to spend: "+fmx(cardAv(k),k.cur):"You owe "+fmx(cardOwe(k),k.cur))}}
{const _bf=ACT.balFix;ACT.balFix=function(id,...a){const k=ac(id),w=(S.cfg.balWarn||{})[id];if(!k||k.type!="card")return _bf.call(this,id,...a);fixForm(id);const e=$("#f_avl");if(e&&w&&w.avl!=null)e.value=w.avl}}

/* card alerts: "Available Limit: QAR 3,193.00" keeps the card right */
function cardAvl(text){const s=String(text||"").replace(/\s+/g," "),m=s.match(/(?:avl\.?|avail\.?|available)\s*(?:cr\.?\s*|credit\s+)?(?:lmt|limit|balance|bal\.?)\s*(?:is|:|-|of)?\s*(?:INR|Rs\.?|₹|QAR|QR)?\s*([\d,]+(?:\.\d{1,2})?)/i);return m?BNUM(m[1]):null}
function cardCheck(acc,text){const A=ac(acc);if(!A||!A.id||A.type!="card"||!cardLim(A))return;const avl=cardAvl(text);if(avl==null||!isFinite(avl))return;
  const bank=Math.round((avl-cardLim(A))*100)/100,app=Math.round(bal(A)*100)/100,W={...(S.cfg.balWarn||{})};if(Math.abs(app-bank)>=1)W[acc]={bank,app,avl,at:today(),t:Date.now()};else delete W[acc];S.cfg.balWarn=W}
{const _qs=quickSave;quickSave=function(m,...a){const t=_qs(m,...a);try{if(t&&t.acc)cardCheck(t.acc,m.body)}catch(e){}return t}}
let cardPend=null;
{const _sa2=ACT.smsAdd;ACT.smsAdd=function(id,...a){const m=(S.cfg.smsq||[]).find(x=>String(x.id)==id);cardPend=m&&m.p&&cardAvl(m.body)!=null?{acc:m.p.acc,body:m.body,n:S.tx.length}:null;return _sa2.call(this,id,...a)}}
{const _st2=ACT.saveTx;ACT.saveTx=function(...a){const r=_st2.apply(this,a);try{if(cardPend&&S.tx.length>cardPend.n){const t=S.tx[S.tx.length-1];if(t&&t.acc){cardCheck(t.acc,cardPend.body);save()}}}catch(e){}cardPend=null;return r}}
{const _ti2=todoItems;todoItems=function(){const L=_ti2();L.forEach(it=>{if(it.act!="balFix")return;const A=ac(it.id),w=(S.cfg.balWarn||{})[it.id];if(!A||A.type!="card"||!w||w.avl==null)return;
  const appAv=Math.round((cardLim(A)+w.app)*100)/100,d=appAv-w.avl;it.tx=A.name+": bank says "+fmx(w.avl,A.cur)+" available";it.sub="The app showed "+fmx(appAv,A.cur)+" ("+(d>0?"higher":"lower")+" by "+fmx(Math.abs(d),A.cur)+") · tap to correct"});return L}}

Object.assign(TA,{"available":"கிடைக்கும்","Card limit":"கார்டு வரம்பு","You owe":"நீங்கள் செலுத்த வேண்டியது","Available":"கிடைக்கும் தொகை","Add card limit":"கார்டு வரம்பைச் சேர்","Add the card limit":"கார்டு வரம்பைச் சேர்க்கவும்","available to spend":"செலவழிக்கக் கிடைக்கும்","owed":"செலுத்த வேண்டியது"});
