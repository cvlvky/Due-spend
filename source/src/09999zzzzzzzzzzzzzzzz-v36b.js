/* ===== Version 36: Quick review — one payment at a time, swipe right to approve, left to ignore ===== */
let RV={ids:[],i:0,ok:0,no:0,last:null};
const rvItem=()=>{const q=S.cfg.smsq||[];while(RV.i<RV.ids.length){const m=q.find(x=>String(x.id)==String(RV.ids[RV.i]));if(m)return m;RV.i++}return null};
function rvOpen(){RV={ids:(S.cfg.smsq||[]).map(m=>m.id),i:0,ok:0,no:0,last:null};rvShow()}
function rvSrc(m){const pk=pkgOf(m),f=String(m.from||"").replace(/^(Email|SMS)\s*·\s*/i,"");return (String(m.id).startsWith("m:")?"✉️ ":SMSPK.has(pk)||m.src=="s"||/^s\d|^sms/i.test(String(m.id))?"💬 ":"🔔 ")+esc(f||"Message")}
function rvShow(){const m=rvItem();if(!m)return rvDoneSheet();const p=m.p||{},n=RV.ids.length,cc=!!p.cc,xf=p.xf||null,tr=cc||!!xf,from=cc?p.ccFrom:xf?xf.from:p.acc,to=cc?p.ccTo:xf?xf.to:"";
  const accO=(sel,ex)=>S.acc.filter(a=>!a.closed||a.id==sel).map(a=>`<option value="${a.id}"${a.id==sel?" selected":""}${a.id==ex?" disabled":""}>${esc(a.name)} (${a.cur})</option>`).join("");
  const cats=[...new Set([p.cat||catFor(p.payee||"")||catGuess((p.payee||"")+" "+(m.body||"")),...S.tx.filter(x=>x.kind==(p.kind||"out")&&x.cat).slice(-60).reverse().map(x=>x.cat),...CATS].filter(Boolean))].slice(0,7),c0=cats[0]||"";
  sheet(`<div class="rvwrap" id="rv_sheet"><div class="rvtop"><b>Quick review</b><span>${RV.i+1} of ${n}</span></div><div class="rvprog"><i style="width:${Math.round(RV.i/n*100)}%"></i></div>
  <div class="rvcard" id="rvcard" data-id="${esc(m.id)}"><div class="rvstamp ok">APPROVE</div><div class="rvstamp no">IGNORE</div>
    <div class="rvsrc">${rvSrc(m)}${m.p&&m.p.date?" · "+(dl(p.date)==0?"Today":dl(p.date)==-1?"Yesterday":fmt(p.date)):""}</div>
    <div class="rvamt ${tr?"tr":p.kind=="in"?"in":"out"}">${tr?"⇄ ":p.kind=="in"?"+":"−"}${fmx(p.amt,p.cur||ac(from).cur||"INR")}</div>
    <div class="rvpay">${esc(cc?"Card bill payment":p.payee||(p.kind=="in"?"Money received":"Payment"))}${p.l4?` <small>· ending ${esc(p.l4)}</small>`:""}</div>
    ${m.yes?`<p class="note" style="color:var(--pri);margin:6px 0 0"><b>You tapped Add on the phone.</b></p>`:""}
    <label for="rv_acc">${tr?"From":p.kind=="in"?"Into":"From"}</label><select id="rv_acc">${accO(from)}</select>
    <label class="rvtr"><input type="checkbox" id="rv_tr"${tr?" checked":""}> It went to my own account (a transfer)</label>
    <div id="rv_tobox"${tr?"":" hidden"}><label for="rv_to">To</label><select id="rv_to"><option value="">Choose…</option>${accO(to,from)}</select></div>
    <div id="rv_catbox"${tr?" hidden":""}><label>Category</label><div class="fchips rvcats">${cats.map(c=>`<button class="fchip${c==c0?" on":""}" data-act="rvCat" data-id="${esc(c)}">${catIcon({cat:c,kind:p.kind||"out"})} ${esc(c)}</button>`).join("")}</div></div>
    <details class="rvmsg"><summary>Message</summary><p class="note">${esc(String(m.body||"").slice(0,400))}</p></details></div>
  <div class="rvbtns"><button class="rvno" data-act="rvNo" aria-label="Ignore"><span>✕</span><small>Ignore</small></button><button class="rved" data-act="rvEdit" aria-label="Edit"><span>✎</span><small>Edit</small></button><button class="rvok" data-act="rvOk" aria-label="Approve"><span>✓</span><small>Approve</small></button></div>
  <p class="note rvhint">Swipe right to approve, left to ignore</p></div>`);
  const card=$("#rvcard");if(card){card.dataset.cat=c0;rvSwipe(card)}}
function rvSwipe(el){let x0=0,y0=0,dx=0,on=false,lock="";
  el.addEventListener("pointerdown",e=>{if(e.target.closest("select,input,button,summary,label,details,a"))return;on=true;lock="";x0=e.clientX;y0=e.clientY;dx=0;el.style.transition="none"});
  el.addEventListener("pointermove",e=>{if(!on)return;const ddx=e.clientX-x0,ddy=e.clientY-y0;if(!lock){if(Math.abs(ddx)>8||Math.abs(ddy)>8){lock=Math.abs(ddx)>Math.abs(ddy)?"x":"y";if(lock=="x")try{el.setPointerCapture(e.pointerId)}catch(_){}}else return}if(lock!="x")return;dx=ddx;el.style.transform=`translateX(${dx}px) rotate(${dx/22}deg)`;el.dataset.dir=dx>50?"ok":dx<-50?"no":""});
  const end=()=>{if(!on)return;on=false;el.style.transition="";if(lock=="x"&&dx>100){el.style.transform="translateX(130%) rotate(14deg)";setTimeout(()=>ACT.rvOk(),170)}else if(lock=="x"&&dx<-100){el.style.transform="translateX(-130%) rotate(-14deg)";setTimeout(()=>ACT.rvNo(),170)}else{el.style.transform="";el.dataset.dir=""}dx=0};
  el.addEventListener("pointerup",end);el.addEventListener("pointercancel",end)}
document.addEventListener("change",e=>{const t=e.target;if(!t)return;if(t.id=="rv_tr"){const on=t.checked;const a=$("#rv_tobox"),b=$("#rv_catbox");if(a)a.hidden=!on;if(b)b.hidden=on}
  if(t.id=="rv_acc"){const to=$("#rv_to");if(to)[...to.options].forEach(o=>{o.disabled=o.value&&o.value==t.value;if(o.selected&&o.disabled)to.value=""})}});
function rvDoneSheet(){const n=RV.ok+RV.no;sheet(`<div class="rvwrap"><div class="rvdone"><span aria-hidden="true">🎉</span><b>${n?"All done":"Nothing to review"}</b><small>${n?`${RV.ok} approved · ${RV.no} ignored`:"New payments show up here as they come in."}</small></div>
  <div class="acts"><button class="btn" data-act="prTab" data-id="ok">See Approved</button><button class="btn ghost" data-act="closeX">Close</button></div></div>`);if(n)render()}
function rvNext(){RV.i++;rvShow()}
Object.assign(ACT,{
  rvOpen(){rvOpen()},
  rvCat(c,el){const card=$("#rvcard");if(card)card.dataset.cat=c;$$("#over .rvcats .fchip").forEach(b=>b.classList.toggle("on",b.dataset.id==c))},
  rvOk(){const m=rvItem();if(!m)return rvDoneSheet();const p=m.p,accId=($("#rv_acc")||{}).value||p.acc,trOn=!!($("#rv_tr")||{}).checked,to=($("#rv_to")||{}).value||"",A=ac(accId),cat=(($("#rvcard")||{}).dataset||{}).cat||p.cat||"",keep=JSON.parse(JSON.stringify(m));
    if(!A.id)return toast("Choose the account");let tx=null;
    if(trOn){const T=ac(to);if(!T.id||T.id==A.id)return toast("Choose the account it went to");if(T.cur!=A.cur)return ACT.rvEdit();
      tx=addTx(stamp({kind:"tr",acc:A.id,to:T.id,amt:+p.amt,got:+p.amt,fee:0,date:p.date||today(),cur:A.cur,note:p.cc?"Card bill payment":p.payee||"Transfer",via:""}));
      S.cfg.smsq=(S.cfg.smsq||[]).filter(x=>x!==m&&String(x.id)!=String(m.id));revLog(m,"transfer","app",tx);if(p.cc)S.cfg.ccFrom=payTrim({...(S.cfg.ccFrom||{}),[T.id]:A.id},20);payClear([m.id])}
    else{if(p.cur&&A.cur!=p.cur){m.p={...p,amt:Math.round(cv(p.amt,p.cur,A.cur)*100)/100,cur:A.cur}}m.p.acc=A.id;m.p.cat=cat;m.p.cc=0;m.p.xf=null;const v=payVia;payVia=m.yes?"phone":"app";try{tx=quickSave(m)}finally{payVia=v}payClear([m.id])}
    save();RV.ok++;const tid=tx&&tx.id;RV.last={type:"ok",m:keep,tx:tid};toast("Approved"+(tx?": "+fmx(tx.amt,tx.cur||A.cur):""),()=>rvUndo());rvNext()},
  rvNo(){const m=rvItem();if(!m)return rvDoneSheet();const keep=JSON.parse(JSON.stringify(m));ACT.smsSkip(m.id);save();RV.no++;RV.last={type:"no",m:keep};toast("Ignored",()=>rvUndo());rvNext()},
  rvEdit(){const m=rvItem();if(!m)return;RV.i++;ACT.smsAdd(m.id)}
});
function rvUndo(){const L=RV.last;if(!L)return;RV.last=null;if(L.type=="ok"){if(L.tx)removeTx(L.tx);RV.ok=Math.max(0,RV.ok-1)}else RV.no=Math.max(0,RV.no-1);
  const q=S.cfg.smsq=S.cfg.smsq||[];if(!q.some(x=>String(x.id)==String(L.m.id)))q.unshift(L.m);const lg=S.cfg.payLog||[];for(let i=lg.length-1;i>=0;i--){if(String(lg[i].id)==String(L.m.id)){lg.splice(i,1);break}}
  save();render();const k=RV.ids.lastIndexOf(L.m.id,RV.i);RV.i=k>=0?k:Math.max(0,RV.i-1);if(k<0)RV.ids.splice(RV.i,0,L.m.id);rvShow();toast("Taken back")}
/* Waiting offers Quick review at the top */
{const _sr6=smsReview;smsReview=function(...a){const r=_sr6.apply(this,a);try{const n=(S.cfg.smsq||[]).length,tb=$("#over .prtabs");if(n&&tb&&!$("#over .rvgo"))tb.insertAdjacentHTML("afterend",`<button class="card rvgo" data-act="rvOpen"><span aria-hidden="true">⚡</span><div><b>Quick review</b><small>${n} ${n==1?"payment":"payments"} · swipe right to approve, left to ignore</small></div><span class="chev" aria-hidden="true">›</span></button>`)}catch(e){}return r}}

NEW27.splice(0,NEW27.length,"⚡ Quick review: one payment at a time — swipe right to approve, left to ignore, with Undo","✨ Type it: write “45 lulu” or “2000 from qnb to sbi” and it’s saved","🏠 Quick actions on Home: Expense, Income, Transfer, Review, Type it","☑️ Spending: Select many entries to change category, account or tag, or delete them","🎁 Month in review: your month in a few pictures","🎨 A fresher look: colour accents (Settings → Look), coloured category icons, smoother screens");
