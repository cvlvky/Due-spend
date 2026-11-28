/* ===== Version 37: a bank statement makes the app match the bank exactly =====
   Every line read with its own description, transfers to your own accounts and cards, nothing counted twice, what the bank doesn't have,
   old corrections out, the opening balance from the bank (or the card's alert), all in one tap with Undo. */

/* the figure a statement without a running balance is checked against: what you typed for "now", else (cards) the bank's latest
   "Available Limit" alert inside the statement's time. The alert counts everything up to the end of its day. */
function stAnchor(p,A){if(!p||!p.M||!A||!p.P||!p.P.nobal||!p.M.from)return null;if(p.T!=null)return {kind:"now",T:p.T,d:today()};if(A.type!="card")return null;
  const b=(S.cfg.cardBank||{})[A.id],L=cardLim(A);if(!b||!L||b.avl==null)return null;const d=iso(new Date(b.t));if(d<p.M.from||d>today())return null;
  return {kind:"alert",T:Math.round((b.avl-L)*100)/100,d,b}}
const stTime=t=>new Date(t).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
/* old balance corrections in the statement's time: once every entry matches they only hide differences */
function stCorr(p,A){const M=p.M;if(!M||!M.day0)return [];const an=stAnchor(p,A);if(p.P.nobal&&!an)return [];const end=an&&an.d>M.to?an.d:M.to;
  return S.tx.filter(x=>x.kind=="adj"&&x.acc==A.id&&x.date>=M.day0&&x.date<=end).sort((a,b)=>a.date.localeCompare(b.date))}
/* payments still waiting in Payment review that this statement already has */
function stWaitRows(p,A){const R=p.M.res;return (S.cfg.smsq||[]).filter(m=>m&&m.p&&+m.p.amt>0&&m.p.date&&(m.p.acc==A.id||(m.p.cc&&(m.p.ccTo==A.id||m.p.ccFrom==A.id)))&&
  R.some(r=>Math.abs(r.amt-(+m.p.amt))<0.011&&Math.abs(dl(r.date)-dl(m.p.date))<=3&&(m.p.cc||(m.p.kind=="in")==(r.dir=="in"))))}
/* what to do with an entry the bank doesn't have: move it to the card or account its text names, else remove it, unless it is too new to be posted */
function stOnlyDef(x,p,A){const l4=stL4(String(x.raw||"")+" "+(x.note||"")+" "+(x.payee||"")),B=l4?acc4(l4,A.id):null;if(B&&x.kind!="tr"&&B.cur==A.cur)return "mv:"+B.id;return dl(x.date)<=dl(p.M.to)-3?"del":"keep"}
const stBankOf=A=>String((A&&(A.bank||A.name))||"Bank").split(/[\s·\-]+/)[0]||"Bank";
const stChip=(ic,n,t,cl)=>n?`<span class="stchip${cl?" "+cl:""}"><b>${ic} ${n}</b> ${t}</span>`:"";

/* ---------- the parts of the check ---------- */
function stNewList(p,A,nw){if(!nw.length)return `<p class="note">Everything in this statement is already in the app.</p>`;
  return `<div class="stsec"><b>${nw.length} new: not in the app yet</b>${nw.map(r=>`<label class="hbl" style="margin:8px 0;gap:8px;align-items:flex-start"><span style="display:flex;gap:8px"><input type="checkbox" data-sti="${p.M.res.indexOf(r)}" checked style="width:auto;margin-top:3px"><span>${fmt(r.date)} · ${esc(stmtClean(r.desc).payee||"No description")}<small style="display:block;color:var(--mute)">${esc(stRowLab(r,A))}</small></span></span><b>${r.dir=="out"?"−":"+"}${fmx(r.amt,A.cur)}</b></label>`).join("")}
  <div class="acts"><button class="btn ghost sm" data-act="stImportGo">Add the ticked ones</button></div></div>`}
function stMissRows(p,A){const G={};p.M.res.forEach(r=>{const k=stmtClean(r.desc);if(!(k.hint=="own"||k.hint=="card")||!k.l4||(r.dir=="in"&&A.type=="card"))return;if(r.dir=="out"?stmtTarget(k,A):stmtSource(k,A,r))return;
    const g=G[k.l4]=G[k.l4]||{l4:k.l4,hint:k.hint,n:0,s:0,now:{}};g.n++;g.s+=r.amt;const x=r.match&&S.tx.find(t=>t.id==r.match),w=!x?"":x.kind=="tr"?(x.acc==A.id?"a transfer to "+ac(x.to).name:"a transfer from "+ac(x.acc).name):x.kind=="out"?"spending":"money in";if(w)g.now[w]=(g.now[w]||0)+1});return Object.values(G)}
function stMissAcc(p,A){const L=stMissRows(p,A);
  const cash=p.M.res.some(r=>r.dir=="out"&&stmtClean(r.desc).hint=="atm")&&!S.acc.some(x=>x.type=="cash"&&x.cur==A.cur);if(!L.length&&!cash)return "";
  const others=S.acc.filter(x=>x.id!=A.id);
  return `<div class="stsec"><b>${L.length?"Your own account"+(L.length>1?"s":"")+" and cards to add":"Cash"}</b>${L.map(g=>`<div class="stmiss"><span>${g.hint=="card"?"Card":"Your own account"} ending <b>${esc(g.l4)}</b> · ${g.n} ${g.n==1?"payment":"payments"}, ${fmx(g.s,A.cur)}<small>It isn’t in the app, so this money can’t be a transfer yet${Object.keys(g.now).length?" (saved now as "+esc(Object.entries(g.now).map(([w,n])=>(n>1?n+" × ":"")+w).join(", "))+")":""}. Add it, or pick the account it is; the transfers are then put right here.</small></span>
    <div class="acts"><button class="btn sm" data-act="stAccAdd" data-id="${g.hint}:${esc(g.l4)}">Add ${g.hint=="card"?"the card":"the account"}</button><select data-stlk="${esc(g.l4)}" aria-label="Which account it is"><option value="">It is…</option>${others.filter(x=>g.hint=="card"?x.type=="card":x.type!="card").map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div></div>`).join("")}
  ${cash?`<div class="stmiss"><span>Cash withdrawals<small>Add a Cash wallet and they become transfers to it, so the cash you spend is tracked.</small></span><div class="acts"><button class="btn sm" data-act="stAccAdd" data-id="cash:">Add a Cash wallet</button></div></div>`:""}</div>`}
function stOnlyList(p,A){const L=p.M.only||[];if(!L.length)return "";const others=S.acc.filter(k=>k.id!=A.id&&k.cur==A.cur);
  return `<div class="stsec"><b>${L.length} in the app but not in the statement</b><p class="note" style="margin:2px 0 6px">The bank doesn’t show ${L.length==1?"this":"these"} for ${esc(A.name)}. Paid from another account or card? Move ${L.length==1?"it":"them"} there. Typed twice or wrong? Remove. Keep only what the bank hasn’t posted yet.</p>
  ${L.map(x=>{const d=stOnlyDef(x,p,A),v=sgn(x,A.id),O=others.filter(k=>x.kind!="tr"||(k.id!=x.acc&&k.id!=x.to));return `<div class="stonly"><div class="hbl"><span>${fmt(x.date)} · ${esc(x.payee||x.note||x.cat||KIND[x.kind])}<small style="display:block;color:var(--mute)">${esc(x.kind=="tr"?(x.acc==A.id?"Transfer to "+ac(x.to).name:"Transfer from "+ac(x.acc).name):(x.cat||KIND[x.kind]||""))}</small></span><b>${v<0?"−":"+"}${fmx(Math.abs(v),A.cur)}</b></div>
    <select data-sto="${esc(x.id)}" aria-label="What to do with it"><option value="keep"${d=="keep"?" selected":""}>Keep it here (the bank hasn’t posted it yet)</option><option value="del"${d=="del"?" selected":""}>Remove it (it goes to the bin)</option>${O.map(k=>`<option value="mv:${k.id}"${d=="mv:"+k.id?" selected":""}>Move it to ${esc(k.name)}</option>`).join("")}</select></div>`}).join("")}</div>`}
function stWaitList(p,A,W){if(!W.length)return "";return `<div class="stsec"><label class="hbl" style="gap:8px;align-items:flex-start"><span style="display:flex;gap:8px"><input type="checkbox" data-stw="all" checked style="width:auto;margin-top:3px"><span>${W.length} waiting in Payment review ${W.length==1?"is":"are"} already in this statement<small style="display:block;color:var(--mute)">${esc(W.slice(0,3).map(m=>(m.p.payee||"Payment")+" "+fmx(+m.p.amt,A.cur)).join(" · "))}. They are marked done, so they can’t be saved twice.</small></span></span></label></div>`}
function stCorrList(p,A,C){if(!C.length)return "";return `<div class="stsec"><b>${C.length} old balance ${C.length==1?"correction":"corrections"}</b><p class="note" style="margin:2px 0 6px">Added earlier to make the total come right. With every entry matching the bank they only hide differences, so they come out and the opening balance comes from the bank instead.</p>
  ${C.map(x=>`<label class="hbl" style="margin:6px 0;gap:8px"><span style="display:flex;gap:8px"><input type="checkbox" data-stc="${esc(x.id)}" checked style="width:auto"><span>${fmt(x.date)} · ${esc(x.note||x.cat||"Correction")}</span></span><b>${x.amt<0?"−":"+"}${fmx(Math.abs(x.amt),A.cur)}</b></label>`).join("")}</div>`}

/* ---------- what the balance will be after the ticked changes ---------- */
function stProj(p,A){const M=p.M;if(!M||!M.from)return null;const q=s=>$$("#csvout "+s),ch=[];/* [date, change for this account] */
  q("input[data-sti]").forEach(c=>{if(!c.checked)return;const r=M.res[+c.dataset.sti];if(r&&!r.match&&!r.flip)ch.push([r.date,r.dir=="in"?r.amt:-r.amt])});
  const on=new Set(q("input[data-stf]").filter(c=>c.checked).map(c=>c.dataset.stf));
  stFixRows(p,A).forEach((f,i)=>{if(!on.has(f.op=="name"?"names":String(i)))return;const s0=sgn(f.x,A.id);
    if(f.op=="dup"||f.op=="dup2")ch.push([f.x.date,-s0]);else if(f.op=="flip")ch.push([f.x.date,-2*s0]);else if(f.op=="amt")ch.push([f.x.date,(f.r.dir=="in"?f.r.amt:-f.r.amt)-s0])});
  q("select[data-sto]").forEach(s=>{if(s.value=="keep")return;const x=S.tx.find(t=>t.id==s.dataset.sto);if(x)ch.push([x.date,-sgn(x,A.id)])});
  q("input[data-stc]").forEach(c=>{if(!c.checked)return;const x=S.tx.find(t=>t.id==c.dataset.stc);if(x)ch.push([x.date,-(+x.amt||0)])});
  const at=d=>Math.round((balAt(A.id,d)+ch.filter(c=>c[0]<=d).reduce((s,c)=>s+c[1],0))*100)/100,an=stAnchor(p,A);let od=0;
  if(p.P.open!=null&&!p.P.nobal)od=p.P.open-at(M.day0);else if(an)od=an.T-at(an.d);
  const now=Math.round((bal(A)+ch.reduce((s,c)=>s+c[1],0)+od)*100)/100;return {close:Math.round((at(M.to)+od)*100)/100,now,an}}
function stProjHtml(p,A){const P=stProj(p,A);if(!P)return "";const card=A.type=="card"&&cardLim(A),nowT=card?`you’ll owe ${fmx(Math.max(0,-P.now),A.cur)} · ${fmx(cardLim(A)+P.now,A.cur)} available`:fmx(P.now,A.cur);
  if(p.P.close!=null&&!p.P.nobal){const d=Math.round((P.close-p.P.close)*100)/100;return `<p class="note stproj">After this, balance on ${fmt(p.M.to)}: ${fmx(P.close,A.cur)} · the bank says ${fmx(p.P.close,A.cur)}${Math.abs(d)<0.005?" ✓":`<span style="color:var(--late)"> · ${fmx(Math.abs(d),A.cur)} apart: what you keep that the bank doesn’t have</span>`}</p>`}
  if(P.an)return `<p class="note stproj">${P.an.kind=="alert"?`Set from the bank’s alert (${esc(P.an.b.src||"alert")}, ${fmt(P.an.d)} ${stTime(P.an.b.t)}): ${fmx(P.an.b.avl,A.cur)} available, so you owed ${fmx(Math.max(0,-P.an.T),A.cur)} then.`:`Set from what you typed for now.`} After this, now: ${nowT}.</p>`;
  return ""}

/* ---------- the statement check ---------- */
stmtShow=function(){const p=stPend,o=$("#csvout");if(!o||!p||!p.M)return;const A=ac(p.acc),M=p.M,nw=M.res.filter(r=>!r.match&&!r.flip),W4=p.P.l4?acc4(p.P.l4,null):null,F=stFixRows(p,A),C=stCorr(p,A),Wt=stWaitRows(p,A),
    app=p.P.close!=null&&!p.P.nobal?balAt(p.acc,M.to):null,dupN=F.filter(f=>f.op=="dup"||f.op=="dup2").length,todo=nw.length+F.length+(M.only||[]).length+C.length+Wt.length,h=stHistFor(p,A);
  o.innerHTML=`${p.P.l4&&W4&&W4.id!=A.id?`<div class="card" style="margin-top:10px;border-color:var(--late)"><b>This file is for the card ending ${esc(p.P.l4)}</b><p class="note" style="margin:4px 0 0">You chose ${esc(A.name)}. It belongs in ${esc(W4.name)}.</p><div class="acts"><button class="btn sm" data-act="stUseAcc" data-id="${W4.id}">Use ${esc(W4.name)}</button></div></div>`:""}
  ${p.done?stDoneCard(p,A):""}
  <div class="card" style="margin-top:10px"><b>${fmt(M.from)} to ${fmt(M.to)}: ${M.res.length} transactions</b><small style="display:block;color:var(--mute)">${M.res.length-nw.length} already in the app · ${nw.length} new · going into ${esc(A.name)}</small>
  ${h?`<p class="note" style="margin:4px 0 0">You checked this statement on ${fmt(iso(new Date(h.at)))}${h.ok?" ✓":""}.</p>`:""}
  <div class="stsum">${stChip("✓",M.res.length-nw.length,"in the app","ok")}${stChip("+",nw.length,"new")}${stChip("✎",F.length-dupN,"to fix")}${stChip("⧉",dupN,"saved twice","bad")}${stChip("?",(M.only||[]).length,"not in the statement","bad")}${stChip("⚖",C.length,"old corrections")}${stChip("⏳",Wt.length,"waiting")}</div>
  <div id="stproj"></div>
  ${todo?`<div class="acts"><button class="btn" data-act="stAll">Make it match the bank</button></div><p class="note" style="margin:2px 0 0">Does everything ticked below in one go. Untick anything you want left as it is. You can undo it.</p>`:""}</div>
  ${stNewList(p,A,nw)}${stMissAcc(p,A)}${stPeople(p,A)}${stFixList(p,A)}${stOnlyList(p,A)}${stWaitList(p,A,Wt)}${stCorrList(p,A,C)}
  ${app!=null?`<p class="note">Balance on ${fmt(M.to)}: statement ${fmx(p.P.close,A.cur)} · app ${fmx(app,A.cur)}${Math.abs(app-p.P.close)>0.009?(todo?" (put the lines above right first)":""):" ✓"}</p><div class="acts"><button class="btn ghost sm" data-act="stFixBal">Make the balance match the statement</button></div>${todo&&Math.abs(app-p.P.close)>0.009?`<p class="note" style="margin-top:0">That adds a correction for the difference. Use it only for what is left after the lines above are right, or it hides them.</p>`:""}`:""}
  ${p.P.nobal?stOweBox(p,A):""}`;
  {const P=$("#stproj");if(P)P.innerHTML=stProjHtml(p,A)}
  if(!o.dataset.stw){o.dataset.stw=1;o.addEventListener("change",e=>{if(e.target&&e.target.closest&&e.target.closest("[data-sti],[data-stf],[data-sto],[data-stc]")&&stPend){const P=$("#stproj");if(P)P.innerHTML=stProjHtml(stPend,ac(stPend.acc))}
    const lk=e.target&&e.target.dataset&&e.target.dataset.stlk;if(lk&&e.target.value)ACT.stAccLink(lk,e.target.value)})}}

/* the result, right after "Make it match the bank" */
function stDoneCard(p,A){const d=p.done,M=p.M,an=stAnchor(p,A),nw=M.res.filter(r=>!r.match&&!r.flip).length,F=stFixRows(p,A).filter(f=>f.op!="name").length,O=(M.only||[]).length,run=p.P.close!=null&&!p.P.nobal;
  const cl=run?Math.round(balAt(A.id,M.to)*100)/100:null,op=run?Math.round(balAt(A.id,M.day0)*100)/100:null,ab=an?Math.round((an.kind=="alert"?balAt(A.id,an.d):bal(A))*100)/100:null;
  const okBal=run?Math.abs(cl-p.P.close)<0.005&&(p.P.open==null||Math.abs(op-p.P.open)<0.005):an?Math.abs(ab-an.T)<0.005:false,ok=!nw&&!F&&!O&&okBal;
  const L=[d.add&&d.add+" added",d.fix&&d.fix+" put right",d.del&&d.del+" removed (in the bin)",d.mv&&d.mv+" moved",d.cor&&d.cor+" old "+(d.cor==1?"correction":"corrections")+" taken out",d.wt&&d.wt+" cleared from Payment review",d.op&&"opening balance set from the bank"].filter(Boolean).join(" · ");
  const card=A.type=="card"&&cardLim(A),nowT=card?`${cardOwe(A)>0?"you owe "+fmx(cardOwe(A),A.cur):bal(A)>0.004?fmx(bal(A),A.cur)+" in credit":"nothing owed"} · ${fmx(cardAv(A),A.cur)} available`:fmx(bal(A),A.cur);
  return `<div class="card stok${ok?"":" warn"}" style="margin-top:10px"><b>${ok?"✓ Matches the bank":!run&&!an?"Done. One more step":"Almost: not exact yet"}</b><p class="note" style="margin:4px 0 0">${esc(L||"Nothing needed changing")}.</p>
  ${run?`<p class="note">Balance on ${fmt(M.to)}: statement ${fmx(p.P.close,A.cur)} · app ${fmx(cl,A.cur)}${Math.abs(cl-p.P.close)<0.005?" ✓":""}</p>`:""}
  ${an?`<p class="note">${an.kind=="alert"?`Bank’s alert of ${fmt(an.d)} ${stTime(an.b.t)}: you owed ${fmx(Math.max(0,-an.T),A.cur)} · the app: ${fmx(Math.max(0,-ab),A.cur)}`:`You typed ${fmx(an.T,A.cur)} for now · the app: ${fmx(ab,A.cur)}`}${Math.abs(ab-an.T)<0.005?" ✓":""}</p>`:!run?`<p class="note">Type what the bank app shows now (below), so the balance is right too.</p>`:""}
  <p class="note"><b>Now: ${nowT}</b></p>${(()=>{const L=stMissRows(p,A);return L.length?`<p class="note">Next: add ${L.map(g=>(g.hint=="card"?"the card":"your own account")+" ending "+esc(g.l4)).join(" and ")} (below), so ${L.reduce((s,g)=>s+g.n,0)==1?"that payment counts as a transfer":"those payments count as transfers"}, not spending.</p>`:""})()}
  ${ok||(!run&&!an)?"":`<p class="note" style="color:var(--late)">${[nw&&nw+" new left unticked",F&&F+" left to fix",O&&O+" kept that the bank doesn’t show"].filter(Boolean).join(" · ")||"The balance still differs: check the lines below."}</p>`}
  <div class="acts"><button class="btn ghost sm" data-act="stUndoAll">Undo all of it</button></div></div>`}

/* the opening balance from the bank: the account's own opening when nothing in the app is older, else one entry the day before the statement */
function stOpenSet(A,day0,want,at,log,note){const d=Math.round((want-balAt(A.id,at))*100)/100;if(Math.abs(d)<0.005)return 0;
  const early=S.tx.some(x=>x.kind!="adj"&&(x.acc==A.id||x.to==A.id)&&x.date<=day0);
  if(!early){const K=ac(A.id);stAccMod(log,K);put("acc",stamp({...K,open:Math.round(((+K.open||0)+d)*100)/100},K))}
  else{const t=addTx({kind:"adj",acc:A.id,amt:d,cur:A.cur,date:day0,cat:"Balance correction",note});log.add.push(t.id)}return d}
/* the statements checked for each account, so you can see which months are done */
function stHistFor(p,A){const L=(S.cfg.stmts||[]).filter(h=>h.acc==A.id&&h.from<=p.M.to&&h.to>=p.M.from);return L.sort((a,b)=>b.at-a.at)[0]||null}
function stHistAdd(p,A,ok){const L=(S.cfg.stmts||[]).filter(h=>!(h.acc==A.id&&h.from==p.M.from&&h.to==p.M.to));L.push({acc:A.id,from:p.M.from,to:p.M.to,n:p.M.res.length,close:p.P.nobal?null:p.P.close,name:String((p.file&&p.file.name)||"").slice(0,60),at:Date.now(),ok:!!ok});S.cfg.stmts=L.slice(-60)}

Object.assign(ACT,{
  stAll(){const p=stPend;if(!p||!p.M)return;const A=ac(p.acc),M=p.M,log=stLogNew(),skip=new Set(),batch="imp_"+uid(),d={add:0,fix:0,del:0,mv:0,cor:0,wt:0,op:0};
    const rows=$$("#csvout input[data-sti]").filter(c=>c.checked).map(c=>M.res[+c.dataset.sti]).filter(r=>r&&!r.match&&!r.flip),
      on=new Set($$("#csvout input[data-stf]").filter(c=>c.checked).map(c=>c.dataset.stf)),F=stFixRows(p,A),
      O=$$("#csvout select[data-sto]").map(s=>({id:s.dataset.sto,v:s.value})),Cx=$$("#csvout input[data-stc]").filter(c=>c.checked).map(c=>c.dataset.stc),
      Wt=$("#csvout input[data-stw]")&&$("#csvout input[data-stw]").checked?stWaitRows(p,A):[];
    /* fixes first (they may merge an entry with its other side), then the new lines, then what the bank doesn't have, then old corrections */
    F.forEach((f,i)=>{if(on.has(f.op=="name"?"names":String(i))&&stFixOne(f,A,log)){if(f.op=="dup"||f.op=="dup2")d.del++;else d.fix++}});
    rows.forEach(r=>{stAddRow(p,A,r,batch,log,skip);d.add++});
    O.forEach(o=>{const x=S.tx.find(t=>t.id==o.id);if(!x||o.v=="keep")return;if(o.v=="del"){stDel(log,x.id);d.del++;return}const B=ac(o.v.slice(3));if(!B.id)return;stMod(log,x);const n={...x};
      if(n.kind=="tr"){if(n.acc==A.id)n.acc=B.id;else if(n.to==A.id)n.to=B.id;if(n.acc==n.to){stDel(log,x.id);d.del++;return}}else{n.acc=B.id;n.cur=B.cur}put("tx",stamp(n,x));d.mv++});
    Cx.forEach(id=>{if(S.tx.some(t=>t.id==id)){stDel(log,id);d.cor++}});
    if(Wt.length){log.smsq=JSON.parse(JSON.stringify(S.cfg.smsq||[]));const ids=Wt.map(m=>String(m.id));Wt.forEach(m=>{try{revLog(m,"add","statement")}catch(e){}});S.cfg.smsq=(S.cfg.smsq||[]).filter(m=>!ids.includes(String(m.id)));try{payClear(ids)}catch(e){}d.wt=Wt.length}
    /* the opening balance, from the statement itself or from the anchor */
    p.M=stmtMatch(p.P,p.acc);const an=stAnchor(p,A);
    if(p.P.open!=null&&!p.P.nobal){if(stOpenSet(A,p.M.day0,p.P.open,p.M.day0,log,"Opening balance from the bank statement"))d.op=1}
    else if(an){if(stOpenSet(A,p.M.day0,an.T,an.d,log,an.kind=="alert"?"Opening balance worked out from the bank’s alert":"Opening balance worked out from the balance now"))d.op=1}
    if(an&&A.type=="card"){const W={...(S.cfg.balWarn||{})};delete W[A.id];S.cfg.balWarn=W;const K=ac(A.id);if(K.id){K.rcd=today();if(an.kind=="alert")K.bankAt=an.d}}
    p.M=stmtMatch(p.P,p.acc);p.done={log,...d,at:Date.now()};
    const run=p.P.close!=null&&!p.P.nobal,ok=!p.M.res.some(r=>!r.match)&&!(p.M.only||[]).length&&(run?Math.abs(balAt(A.id,p.M.to)-p.P.close)<0.005:an?Math.abs((an.kind=="alert"?balAt(A.id,an.d):bal(A))-an.T)<0.005:false);
    stHistAdd(p,A,ok);save();render();stmtShow();const o=$("#csvout");if(o)o.scrollIntoView({block:"start"});
    toast(ok?"Matches the bank ✓":"Done. See what’s left",()=>ACT.stUndoAll())},
  stUndoAll(){const p=stPend;if(!p||!p.done)return;stUndoLog(p.done.log);if(p.done.log.smsq)S.cfg.smsq=p.done.log.smsq;p.done=null;p.M=stmtMatch(p.P,p.acc);save();render();stmtShow();toast("Put back as it was")},
  stAccAdd(id){const p=stPend;if(!p||!p.M)return;const A=ac(p.acc),[t,l4]=String(id||"").split(":"),b=stBankOf(A);let k;
    if(t=="cash"){k={id:uid(),name:"Cash"+(S.acc.some(x=>x.name=="Cash")?" "+A.cur:""),type:"cash",cur:A.cur,open:0}}
    else if(t=="card")k={id:uid(),name:b+" card ··"+l4,type:"card",cur:A.cur,open:0,l4};else k={id:uid(),name:b+" ··"+l4,type:"bank",cur:A.cur,open:0,l4,bank:A.bank||""};
    put("acc",stamp(k));save();p.M=stmtMatch(p.P,p.acc);stmtShow();render();toast(`${k.name} added.${t=="cash"?"":" Its own balance is set when you check its statement too."}`)},
  stAccLink(l4,accId){const p=stPend,k=ac(accId);if(!p||!k.id)return;const n={...k},z=String(n.l4||"").replace(/\D/g,"");if(!z)n.l4=l4;else if(z!=l4)n.l4s=[...new Set([...(n.l4s||[]).map(String),l4])];
    put("acc",stamp(n,k));save();p.M=stmtMatch(p.P,p.acc);stmtShow();toast(`${k.name} is the one ending ${l4} now`)}
});

/* money into this account from your own other account: a transfer, not income */
{const _rl=stRowLab;stRowLab=function(r,A){try{const c=stmtClean(r.desc);if(r.dir=="in"&&A.type!="card"&&c.hint=="own"){const S0=stmtSource(c,A,r);return S0?"Transfer from "+S0.name:"From your own account"+(c.l4?" ending "+c.l4:"")+" (add it to track transfers)"}}catch(e){}return _rl(r,A)}}
/* cards: say which alert the card is set from */
{const _ob=stOweBox;stOweBox=function(p,A){const base=_ob(p,A),an=stAnchor(p,A);if(!an||an.kind!="alert")return base;
  return `<div class="card" style="margin-top:10px"><b>Checked against the bank’s alert</b><p class="note" style="margin:4px 0 0">${esc(an.b.src||"Alert")}, ${fmt(an.d)} ${stTime(an.b.t)}: ${fmx(an.b.avl,A.cur)} available of ${fmx(cardLim(A),A.cur)}, so you owed ${fmx(Math.max(0,-an.T),A.cur)} then. “Make it match the bank” sets the card from it. If the bank app shows something else now, type it below instead.</p></div>${base}`}}
/* a new file starts a fresh check */
{const _sf=stmtFile;stmtFile=async function(...a){if(stPend)stPend.done=null;return _sf.apply(this,a)}}

/* ---------- cards: the latest alert box always fresh, and an alert in the middle of a day counts ---------- */
/* the alert came at a time of day: entries later that day are not in the bank's figure yet. If leaving some of that day's entries out explains the gap, it matches. */
function cardDayOK(k,diff){const b=(S.cfg.cardBank||{})[k.id];if(!b)return false;const d=iso(new Date(b.t)),L=S.tx.filter(x=>x.kind!="adj"&&x.date==d).map(x=>sgn(x,k.id)).filter(v=>Math.abs(v)>0.004);if(!L.length||L.length>14)return false;
  for(let m=1;m<(1<<L.length);m++){let s=0;for(let i=0;i<L.length;i++)if(m&(1<<i))s+=L[i];if(Math.abs(s+diff)<0.011)return true}return false}
{const _cr=cardRecon;cardRecon=function(k,...a){const r=_cr(k,...a);try{if(r!=null&&Math.abs(r)>=1&&cardDayOK(k,r)){const W={...(S.cfg.balWarn||{})};delete W[k.id];S.cfg.balWarn=W;return 0}}catch(e){}return r}}
{const _am=accMenu;accMenu=function(id,...a){try{const k=ac(id);if(k&&k.type=="card"&&cardLim(k)&&(S.cfg.cardBank||{})[id])cardRecon(k)}catch(e){}const r=_am(id,...a);
  try{const k=ac(id),g=$("#over .mgrid");if(!k||!k.id||!g)return r;let h="";
    if(k.type=="card"&&bal(k)>0.004)h+=`<div class="card" style="margin:0 0 12px;border-color:var(--soon)"><b>${fmx(bal(k),k.cur)} in credit on this card</b><p class="note" style="margin:4px 0 0">Unless the bank shows a credit too, a payment was saved twice or a correction is wrong.</p><div class="acts"><button class="btn sm" data-act="dupScan" data-id="${id}">Find entries saved twice</button><button class="btn sm ghost" data-act="stImport" data-id="${id}">Check a statement</button></div></div>`;
    const H=(S.cfg.stmts||[]).filter(s=>s.acc==id).sort((a,b)=>b.to.localeCompare(a.to)).slice(0,3);
    if(H.length)h+=`<div class="card" style="margin:0 0 12px"><b>Bank statements checked</b>${H.map(s=>`<div class="hbl" style="margin:6px 0"><span>${fmt(s.from)} – ${fmt(s.to)}<small style="display:block;color:var(--mute)">${s.n} lines · checked ${fmt(iso(new Date(s.at)))}</small></span><b style="color:${s.ok?"#1f9d6b":"var(--soon)"}">${s.ok?"✓ matches":"not exact"}</b></div>`).join("")}<div class="acts"><button class="btn sm ghost" data-act="stImport" data-id="${id}">Check a statement</button></div></div>`;
    if(h)g.insertAdjacentHTML("afterend",h)}catch(e){console.warn(e)}return r}}

/* ---------- entries saved twice, without a statement ---------- */
function dupPairs(id){const A=ac(id),from=plus(-120),L=S.tx.filter(x=>x.kind!="adj"&&x.date>=from&&(x.acc==id||x.to==id)).sort((a,b)=>a.date.localeCompare(b.date)),P=[],seen=new Set();
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],b=L[j];if(dl(b.date)-dl(a.date)>3)break;if(seen.has(a.id)||seen.has(b.id))continue;const va=sgn(a,id),vb=sgn(b,id);if(va*vb<=0)continue;
    const tr=a.kind=="tr"&&b.kind=="tr"&&(a.acc==id?a.to:a.acc)==(b.acc==id?b.to:b.acc),dv=Math.abs(va-vb),w=s=>String(s||"").toLowerCase().match(/[a-z]{4,}/g)||[],nm=w(a.payee+" "+a.note).some(t=>w(b.payee+" "+b.note).includes(t))||!a.payee||!b.payee;
    /* a transfer and an entry on its own for the same payment ("Payment received" on the card, "Card bill" spending on the bank account) */
    const one=a.kind=="tr"?b:b.kind=="tr"?a:null,mix=!!one&&one.kind!="tr"&&dv<=stTol(va)&&/card ?bill|card payment|credit card|own account|transfer|payment|paid using|bank ?direct/i.test([one.cat,one.payee,one.note,one.raw].join(" "));
    if((tr&&dv<=stTol(va))||mix||(a.kind==b.kind&&a.kind!="tr"&&dv<0.011&&dl(b.date)-dl(a.date)<=1&&nm)){P.push([a,b]);seen.add(a.id);seen.add(b.id)}}return P}
Object.assign(ACT,{
  dupScan(id){const A=ac(id),P=dupPairs(id),row=(x,o)=>`<div class="hbl" style="margin:6px 0;align-items:center"><span>${fmt(x.date)} · ${esc(x.kind=="tr"?(x.acc==id?"To "+ac(x.to).name:"From "+ac(x.acc).name):(x.payee||x.cat||KIND[x.kind]))}<small style="display:block;color:var(--mute)">${fmx(Math.abs(sgn(x,id)),A.cur)}${x.raw?" · from a statement":x.ct?" · added "+fmt(iso(new Date(x.ct))):""}</small></span><button class="btn sm ghost" data-act="dupDel" data-id="${x.id}" data-a="${id}">Remove</button></div>`;
    sheet(`<h2>Saved twice?</h2><p class="sub">${esc(A.name)}: entries of the same money within 3 days, in the last 4 months. Remove the extra one of each pair. Check a bank statement to be sure.</p>${P.length?P.map(([a,b])=>`<div class="card" style="margin:8px 0">${row(a)}${row(b)}</div>`).join(""):`<p class="note">Nothing looks saved twice.</p>`}<div class="acts"><button class="btn ghost" data-act="stImport" data-id="${id}">Check a statement</button></div>`)},
  dupDel(id,el){const a=el&&el.dataset&&el.dataset.a;const x=removeTx(id);if(!x)return;save();render();if(a)ACT.dupScan(a);toast("Removed",()=>{untrash(id);save();render();if(a)ACT.dupScan(a)})}
});

/* before typing a correction: entries saved twice would only be hidden by it */
const dupHint=id=>{try{const P=dupPairs(id);if(!P.length)return;const o=$("#over .sheet h2");if(!o)return;
  o.insertAdjacentHTML("afterend",`<div class="card" style="margin:6px 0 10px;border-color:var(--soon)"><b>${P.length} ${P.length==1?"payment looks":"payments look"} saved twice</b><p class="note" style="margin:4px 0 0">Check ${P.length==1?"it":"them"} first: a correction would only hide ${P.length==1?"it":"them"}.</p><div class="acts"><button class="btn sm" data-act="dupScan" data-id="${id}">Show them</button></div></div>`)}catch(e){}};
{const _ff=fixForm;fixForm=function(id,...a){const r=_ff(id,...a);dupHint(id);return r}}
{const _cr2=cardResult;cardResult=function(id,...a){const r=_cr2(id,...a);dupHint(id);return r}}
NEW27.splice(0,NEW27.length,"🏦 Bank statements now make the app match the bank exactly: one tap fixes everything, with Undo","🔁 Transfers to your own accounts and card bills are read from the account or card number in the bank’s text","⧉ Entries saved twice are found, even when the amount was typed a little differently","❓ What the bank doesn’t show for an account: move it to the right account or remove it","💳 Cards are set from the bank’s “Available Limit” alert; the card page warns about a credit that shouldn’t be there","📄 Each account shows the statements you checked and whether they matched");
