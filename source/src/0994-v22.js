/* ===== Version 22: monthly verdict, money-flow chart, return-to-India plan ===== */
PREFX.push("ret");
/* ---------- monthly verdict ---------- */
function verdict(m){m=m||today().slice(0,7);const cm=today().slice(0,7),part=m==cm,R=rep(m),p=addMon(m,-1),pts=[],why=[],tips=[];let sc=50;
  const r=R.rate.cur;if(r!=null){sc+=r>=30?25:r>=20?18:r>=10?8:r>=0?0:-20;pts.push(["Savings rate",Math.round(r)+"% of income kept",r>=20?"good":r>=10?"warn":"bad"])}
  /* part month: compare with what was spent by the same day in earlier months, not a share of their totals */
  const day=part?+today().slice(8):31,upTo=(mm,k)=>sumV(mTx(mm,k||"out").filter(x=>+x.date.slice(8)<=day)),H=histMonths(m,3),avg=H.length?H.reduce((s_,x)=>s_+upTo(x),0)/H.length:null;
  if(avg){const d=(R.out.cur-avg)/avg*100;sc+=d<=-10?10:d<=5?5:d<=15?0:-10;pts.push(["Spending",(d>=0?"+":"−")+Math.abs(Math.round(d))+"% vs usual"+(part?" so far":""),d<=5?"good":d<=15?"warn":"bad"])}
  const B=budUse(m),over=B.filter(x=>x.p>100);sc-=Math.min(15,over.length*5);if(B.length)pts.push(["Budgets",over.length?over.length+" over the limit":"All within limits",over.length?"bad":"good"]);
  const t=today(),late=part?upcoming(t,t,true).filter(u=>(u.t=="due"||u.t=="emi")&&u.d<t).length:0;if(late){sc-=10;pts.push(["Payments",late+" overdue","bad"])}
  const need=R.out.avg||R.out.cur,liq=liquid();if(need>0){const mo=liq/need;sc+=mo>=6?10:mo>=3?5:mo<1?-10:0;pts.push(["Emergency cover",mo.toFixed(1)+" months of spending",mo>=6?"good":mo>=3?"warn":"bad"])}
  sc=Math.max(0,Math.min(100,Math.round(sc)));
  const catUp=mm=>{const o={};mTx(mm,"out").filter(x=>+x.date.slice(8)<=day).forEach(x=>{const c=x.cat||"Uncategorised";o[c]=(o[c]||0)+ca(x)});return o};
  const C=Object.fromEntries(catTotals(m)),P=part?catUp(p):Object.fromEntries(catTotals(p)),floor=Math.max(1,(R.out.avg||R.out.cur||1)*.03);
  const ch=[...new Set([...Object.keys(C),...Object.keys(P)])].map(k=>({k,c:C[k]||0,p:P[k]||0,d:(C[k]||0)-(P[k]||0)})).filter(x=>Math.abs(x.d)>=floor).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d)).slice(0,3);
  ch.forEach(x=>why.push(`${x.k} ${x.d>0?"up":"down"} ${fmr(Math.abs(x.d))}${x.p>0?" ("+(x.d>0?"+":"−")+Math.abs(Math.round(x.d/x.p*100))+"%)":""}${part?" compared with the same days last month":" compared with last month"}`));
  const U=upcoming(t,plus(30),true).filter(u=>u.t!="fd"&&u.t!="recin"&&+u.a),cs=U.reduce((s,u)=>s+iv(u.a,u.c),0),big=U.slice().sort((a,b)=>iv(b.a,b.c)-iv(a.a,a.c)).slice(0,3),rad=radar(30).filter(x=>x.need>0);
  if(rad.length)tips.push({t:`Send ${fmx(rad[0].need,rad[0].a.cur)} to ${rad[0].a.name} by ${fmt(rad[0].by)} for ${rad[0].first.n}.`,a:"radar"});
  const up=ch.find(x=>x.d>0&&x.p>0&&x.d/x.p>.25&&!S.bud.some(b=>String(b.cat).toLowerCase()==x.k.toLowerCase()));if(up)tips.push({t:`${up.k} is up ${Math.round(up.d/up.p*100)}%. A monthly budget would warn you before it runs over.`,a:"vBud",id:up.k});
  if(r!=null&&r<10)tips.push({t:`Only ${Math.max(0,Math.round(r))}% of income was kept${part?" so far":""}. Setting money aside on salary day, before spending, makes this easier.`});
  if(!tips.length&&r!=null&&r>=20)tips.push({t:"On track. Put the surplus into SSY, PPF, an FD or a goal before it gets spent.",a:"fab"});
  return {m,part,sc,label:sc>=70?"Good month":sc>=45?"OK month":"Tough month",pts,why,cs,big,tips,R}}
const vCol=s=>s>=70?"var(--pri)":s>=45?"var(--soon)":"var(--late)",lCol=l=>l=="good"?"var(--pri)":l=="warn"?"var(--soon)":l=="bad"?"var(--late)":"var(--mute)";
function verdictCard(m,small){if(!S.tx.length)return "";const X=verdict(m);return `<div class="card" style="margin:0 0 12px;cursor:pointer;border-left:5px solid ${vCol(X.sc)}" data-act="verdict" data-id="${X.m}"><div class="hbl"><b>${mlong(X.m)}${X.part?" so far":""}: ${X.label}</b><span class="chip">${X.sc}/100</span></div>
  <small style="color:var(--mute)">${esc(X.why[0]||X.pts.slice(0,2).map(p=>p[0]+": "+p[1]).join(" · "))}${small?"":""}</small></div>`}
function verdictSheet(m){const X=verdict(m),F_=flowHtml(X.m);sheet(`<h2>${mlong(X.m)}${X.part?" so far":""}</h2><div class="hbl" style="margin:4px 0 10px"><b style="font-size:22px;color:${vCol(X.sc)}">${X.label}</b><span class="chip">${X.sc}/100</span></div>
  <h3>How it went</h3>${X.pts.map(p=>`<div class="hbl" style="margin:6px 0"><span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${lCol(p[2])};margin-right:6px"></span>${esc(p[0])}</span><b>${esc(p[1])}</b></div>`).join("")||`<p class="note">Add income and spending entries to see this.</p>`}
  ${X.why.length?`<h3>What changed</h3>${X.why.map(w=>`<p style="margin:5px 0">${esc(w)}</p>`).join("")}`:""}
  <h3>Coming up in 30 days</h3><p style="margin:5px 0"><b>${fmr(X.cs)}</b> in dues, EMIs, deposits and bills${X.big.length?": "+X.big.map(u=>esc(u.n)+" "+fmx(u.a,u.c)).join(", "):""}.</p>
  ${X.tips.length?`<h3>One thing to do</h3>${X.tips.slice(0,2).map(t=>`<div class="card" style="margin:6px 0"><p style="margin:0">${esc(t.t)}</p>${t.a?`<div class="acts"><button class="btn sm" data-act="${t.a}" data-id="${esc(t.id||"")}">${t.a=="radar"?"Open top-up radar":t.a=="vBud"?"Set a budget":"Add"}</button></div>`:""}</div>`).join("")}`:""}
  ${F_?`<h3>Where the money went</h3>${F_}`:""}
  <div class="acts"><button class="btn sm ghost" data-act="verdict" data-id="${addMon(X.m,-1)}">← ${mlab(addMon(X.m,-1))}</button>${X.m<today().slice(0,7)?`<button class="btn sm ghost" data-act="verdict" data-id="${addMon(X.m,1)}">${mlab(addMon(X.m,1))} →</button>`:""}</div>`)}
/* ---------- money-flow chart ---------- */
function flowData(m){const cu=V(),g={incQ:0,incI:0,spQ:0,spI:0,svQ:0,svI:0,emQ:0,emI:0,sent:0,cost:0,svIc:{},spIc:{},spQc:{}};const qa=id=>ac(id).cur!="INR";
  S.tx.forEach(x=>{if(!x.date||!x.date.startsWith(m))return;const c=x.cur||ac(x.acc).cur,a=cv(+x.amt,c,cu);
    if(x.kind=="in"){if(qa(x.acc))g.incQ+=a;else g.incI+=a}
    else if(x.kind=="out"){const emi=!!(x.link&&x.link.t=="loan"),k=x.cat||"Other";if(qa(x.acc)){if(emi)g.emQ+=a;else{g.spQ+=a;g.spQc[k]=(g.spQc[k]||0)+a}}else{if(emi)g.emI+=a;else{g.spI+=a;g.spIc[k]=(g.spIc[k]||0)+a}}}
    else if(x.kind=="save"){if(qa(x.acc))g.svQ+=a;else{g.svI+=a;const k=x.cat||"Savings";g.svIc[k]=(g.svIc[k]||0)+a}}
    else if(x.kind=="tr"){const A=ac(x.acc),B=ac(x.to);if(A.cur!="INR"&&B.cur=="INR"){const s=cv(+x.amt+(+x.fee||0),A.cur,cu),r=cv(+x.got,"INR",cu);g.sent+=r;g.cost+=Math.max(0,s-r)}}});return g}
const FC={inc:"#2a9d8f",live:"#e9a23b",save:"#3c8d5a",emi:"#c0504d",sent:"#4a7fd6",cost:"#9aa4ad",left:"#7c8b96",ind:"#8a6fd1"};
function flowGraph(g){const N=[],L=[],add=(id,label,col,color)=>{if(!N.some(n=>n.id==id))N.push({id,label,col,color})},share=(src,uses)=>{const tot=src.reduce((s,x)=>s+x[2],0);if(tot>0)src.forEach(s=>uses.forEach(u=>{const v=s[2]*u[2]/tot;if(v>0.5)L.push({s:s[0],t:u[0],v})}))};
  const hasQ=g.incQ+g.spQ+g.svQ+g.emQ+g.sent>0.5,hasI=g.incI+g.spI+g.svI+g.emI+g.sent>0.5;
  if(hasQ){const U=[["q_live","Living in Qatar",g.spQ,FC.live],["q_save","Saved in Qatar",g.svQ,FC.save],["q_emi","EMIs in Qatar",g.emQ,FC.emi],["q_cost","Fees and rate",g.cost,FC.cost],["q_sent","Sent to India",g.sent,FC.sent]].filter(u=>u[2]>0.5);
    const left=g.incQ-U.reduce((s,u)=>s+u[2],0);if(left>0.5)U.push(["q_left","Left in Qatar",left,FC.left]);const Sr=[];if(g.incQ>0.5)Sr.push(["q_inc","Income in Qatar",g.incQ,FC.inc]);if(left<-0.5)Sr.push(["q_draw","From Qatar savings",-left,FC.left]);
    Sr.forEach(s=>add(s[0],s[1],0,s[3]));U.forEach(u=>add(u[0],u[1],1,u[3]));share(Sr,U)}
  if(hasI){const sv=Object.entries(g.svIc).sort((a,b)=>b[1]-a[1]),U=[["i_live","Spent in India",g.spI,FC.live],...sv.slice(0,3).map(([k,v],j)=>["i_s"+j,k,v,FC.save]),["i_sr","Other savings",sv.slice(3).reduce((s,x)=>s+x[1],0),FC.save],["i_emi","EMIs in India",g.emI,FC.emi]].filter(u=>u[2]>0.5);
    const inI=g.sent+g.incI,left=inI-U.reduce((s,u)=>s+u[2],0);if(left>0.5)U.push(["i_left","Kept in India",left,FC.left]);
    const col=hasQ?2:1,Sr=[];if(g.sent>0.5)Sr.push(["q_sent","Sent to India",g.sent,FC.sent]);if(g.incI>0.5)Sr.push(["i_inc","Income in India",g.incI,FC.inc]);if(left<-0.5)Sr.push(["i_draw","From India savings",-left,FC.left]);
    Sr.forEach(s=>add(s[0],s[1],col-1,s[3]));U.forEach(u=>add(u[0],u[1],col,u[3]));share(Sr,U)}
  return {N,L}}
function sankeySvg(G){const cols=Math.max(...G.N.map(n=>n.col))+1;if(cols<2||!G.L.length)return "";const W=cols==3?620:420,nw=10,gap=12,val=n=>Math.max(G.L.filter(l=>l.t==n.id).reduce((s,l)=>s+l.v,0),G.L.filter(l=>l.s==n.id).reduce((s,l)=>s+l.v,0));
  G.N.forEach(n=>n.v=val(n));const C=[...Array(cols)].map((_,c)=>G.N.filter(n=>n.col==c&&n.v>0)),maxN=Math.max(...C.map(L=>L.length)),H=Math.max(200,maxN*38+20),pad=10,maxT=Math.max(...C.map(L=>L.reduce((s,n)=>s+n.v,0))),k=(H-pad*2-gap*(maxN-1))/maxT;
  C.forEach((L,c)=>{const x=c*(W-nw-150)/(cols-1)+(c==cols-1?0:0),tot=L.reduce((s,n)=>s+Math.max(2,n.v*k),0)+gap*(L.length-1);let y=pad+(H-pad*2-tot)/2;L.forEach(n=>{n.x=x;n.y=y;n.h=Math.max(2,n.v*k);n.oo=0;n.io=0;y+=n.h+gap})});
  const B=Object.fromEntries(G.N.map(n=>[n.id,n]));let ps="";
  G.L.filter(l=>B[l.s].x!=null&&B[l.t].x!=null).sort((a,b)=>B[a.s].y-B[b.s].y||B[a.t].y-B[b.t].y).forEach(l=>{const s=B[l.s],t=B[l.t],w=Math.max(1,l.v*k),x0=s.x+nw,x1=t.x,y0=s.y+s.oo,y1=t.y+t.io,xm=(x0+x1)/2;s.oo+=w;t.io+=w;
    ps+=`<path d="M${x0.toFixed(1)},${y0.toFixed(1)}C${xm.toFixed(1)},${y0.toFixed(1)} ${xm.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}L${x1.toFixed(1)},${(y1+w).toFixed(1)}C${xm.toFixed(1)},${(y1+w).toFixed(1)} ${xm.toFixed(1)},${(y0+w).toFixed(1)} ${x0.toFixed(1)},${(y0+w).toFixed(1)}Z" fill="${s.color}" opacity=".3"><title>${esc(s.label)} → ${esc(t.label)}: ${esc(fmr(l.v))}</title></path>`});
  const nodes=G.N.filter(n=>n.x!=null).map(n=>`<rect x="${n.x.toFixed(1)}" y="${n.y.toFixed(1)}" width="${nw}" height="${n.h.toFixed(1)}" rx="2" fill="${n.color}"><title>${esc(n.label)}: ${esc(fmr(n.v))}</title></rect><text x="${(n.x+nw+4).toFixed(1)}" y="${(n.y+n.h/2).toFixed(1)}" dy=".35em" font-size="11" fill="var(--ink)" stroke="var(--bg)" stroke-width="3" paint-order="stroke">${esc(n.label)} · ${esc(V()=="QAR"?"QAR ":"₹")}${sh(n.v)}</text>`).join("");
  return `<div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Where the money went">${ps}${nodes}</svg></div>`}
function flowHtml(m){const g=flowData(m),G=flowGraph(g),svg=sankeySvg(G);if(!svg)return "";const tot=g.incQ+g.incI;
  const L=[["Income",g.incQ+g.incI],["Living in Qatar",g.spQ],["Sent to India",g.sent],["Spent in India",g.spI],["Saved",g.svQ+g.svI],["EMIs",g.emQ+g.emI],["Fees and rate",g.cost]].filter(x=>x[1]>0.5);
  return svg+`<p class="note">${G.N.some(n=>n.col==2)?"Swipe sideways to see the India side. ":""}${L.map(([k,v])=>k+" "+fmr(v)+(tot&&k!="Income"?" ("+Math.round(v/tot*100)+"%)":"")).join(" · ")}</p>`}
/* ---------- return-to-India plan ---------- */
function retP(){const R=S.cfg.ret||{};return {when:R.when||"",exp:+R.exp||0,infl:R.infl??6,yrs:R.yrs??30,r1:R.r1??8,r2:R.r2??7,save:R.save===""||R.save==null?null:+R.save,big:Array.isArray(R.big)?R.big.filter(b=>b&&+b.a>0):[]}}
function avgSaveINR(){const cm=today().slice(0,7),M=[1,2,3,4,5,6].map(j=>addMon(cm,-j)).filter(m=>S.tx.some(x=>x.date&&x.date.startsWith(m)&&(x.kind=="in"||x.kind=="out")));if(!M.length)return 0;return M.reduce((s,m)=>s+cv(mSum(m,"in")-mSum(m,"out"),V(),"INR"),0)/M.length}
function retPlan(){const P=retP();if(!P.exp)return null;const now=nwv("INR"),s=P.save!=null?P.save:Math.max(0,avgSaveINR()),r1=P.r1/100/12,r2=P.r2/100,i=P.infl/100,G=S.cfg.grat,gOn=G&&G.on!==false&&G.join,g0=gOn&&gratCalc()?cv(gratCalc().amt,"QAR","INR"):0;
  const needAt=n=>{const y=n/12,E=P.exp*12*Math.pow(1+i,y);let pv=0;for(let k=0;k<P.yrs;k++)pv+=E*Math.pow(1+i,k)/Math.pow(1+r2,k);return pv+P.big.reduce((t,b)=>t+(+b.a)*Math.pow(1+i,y),0)};
  const W=[now];for(let n=1;n<=480;n++)W[n]=W[n-1]*(1+r1)+s;const gEx=n=>{if(!gOn)return 0;const ex=G.exit&&G.exit>today()?G.exit:"",d=ex&&addM(today(),n)>ex?ex:addM(today(),n),c=gratCalc(d);return c?Math.max(0,cv(c.amt,"QAR","INR")-g0):0};
  const wealthAt=n=>W[Math.min(n,480)]+gEx(n);let can=null;for(let n=0;n<=480;n++)if(wealthAt(n)>=needAt(n)){can=n;break}
  const tgt=P.when&&P.when>today()?Math.max(1,mdiff(today(),P.when)):null;let gap=null,extra=null;
  if(tgt!=null){gap=needAt(tgt)-wealthAt(tgt);if(gap>0){let f=0;for(let k=0;k<tgt;k++)f=f*(1+r1)+1;extra=f?gap/f:null}}
  const span=Math.min(40,Math.max(8,Math.ceil(Math.max(can??0,tgt??0)/12)+3)),pts=[];for(let y=0;y<=span;y++)pts.push({y,w:wealthAt(y*12),n:needAt(y*12)});
  return {P,now,s,can,canDate:can!=null?addM(today(),can):null,tgt,gap,extra,pts,needNow:needAt(0)}}
const ym=n=>{const y=Math.floor(n/12),m=n%12;return (y?y+(y==1?" year":" years"):"")+(y&&m?" ":"")+(m?m+(m==1?" month":" months"):"")||"now"};
function lines2(pts){const W=320,H=140,P=24,mx=Math.max(...pts.map(p=>Math.max(p.w,p.n)))||1,X=i=>P+i*(W-P-6)/(pts.length-1),Y=v=>H-18-(v/mx)*(H-28);
  const pl=k=>pts.map((p,i)=>X(i).toFixed(1)+","+Y(p[k]).toFixed(1)).join(" ");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Projected wealth and money needed"><polyline points="${pl("n")}" fill="none" stroke="var(--late)" stroke-width="2" stroke-dasharray="5 4"/><polyline points="${pl("w")}" fill="none" stroke="var(--pri)" stroke-width="2.5"/>
  ${pts.filter((p,i)=>i%Math.ceil(pts.length/6)==0||i==pts.length-1).map(p=>`<text x="${X(pts.indexOf(p)).toFixed(1)}" y="${H-4}" font-size="9" text-anchor="middle" fill="var(--mute)">${+today().slice(0,4)+p.y}</text>`).join("")}</svg>
  <p class="note"><span style="color:var(--pri)">━</span> what you’ll have &nbsp; <span style="color:var(--late)">╍</span> what you’d need to stop working</p>`}
function retCard(){const X=retPlan();if(!X)return `<h2>Return to India</h2><div class="card" style="cursor:pointer" data-act="retForm"><b>Return-to-India plan</b><p class="note">How much you need to settle back home, and how many more years that takes at your current savings.</p></div>`;
  return `<h2>Return to India</h2><div class="card" style="cursor:pointer" data-act="retForm"><div class="hbl"><b>Return-to-India plan</b><span class="chip">${X.can!=null?(X.can==0?"Ready":ym(X.can)):"40+ years"}</span></div>
  <p style="margin:6px 0 0">${X.can==0?"Your savings already cover the plan.":X.can!=null?`At this pace you could return around <b>${mlong(X.canDate.slice(0,7))}</b>.`:"At this pace the plan isn’t reached within 40 years."}${X.tgt!=null?(X.gap>0?` For ${mlong(X.P.when.slice(0,7))}, save about <b>${inr(Math.round(X.extra/100)*100)}</b> more a month.`:` Your ${mlong(X.P.when.slice(0,7))} target is covered.`):""}</p></div>`}
function retForm(){const P=retP(),X=retPlan(),bg=[...P.big,{},{},{}].slice(0,Math.max(3,P.big.length+1));
  sheet(`<h2>Return-to-India plan</h2><p class="sub">In today’s rupees. The app grows your savings at the return you choose and raises costs with inflation.</p>
  <div class="two"><div>${F("r_exp","Monthly cost of living in India (₹)",P.exp||"","number",'placeholder="60000"')}</div><div>${F("r_when","Target return date (optional)",P.when,"date")}</div></div>
  <div class="two"><div>${F("r_save","Saved each month (₹)",P.save??"","number",'placeholder="Auto: '+Math.round(avgSaveINR())+'"')}</div><div>${F("r_yrs","Years the money must last",P.yrs,"number")}</div></div>
  <div class="two"><div>${F("r_infl","Inflation (% a year)",P.infl,"number")}</div><div>${F("r_r1","Return before (% a year)",P.r1,"number")}</div></div>${F("r_r2","Return after you stop working (% a year)",P.r2,"number")}
  <h3>Big one-time needs</h3>${bg.map((b,j)=>`<div class="two"><div>${F("rb_n"+j,j?"":"What",b.n||"","text",'placeholder="'+(["House","Children’s education","Wedding"][j]||"Other")+'"')}</div><div>${F("rb_a"+j,j?"":"Amount today (₹)",b.a||"","number")}</div></div>`).join("")}
  ${X?`<div class="card" style="margin-top:10px"><b>${X.can==0?"Your savings already cover it.":X.can!=null?"Possible around "+mlong(X.canDate.slice(0,7))+" ("+ym(X.can)+")":"Not within 40 years at this pace"}</b>
  <p class="note">Today: ${inr(Math.round(X.now))} (net worth${S.cfg.grat&&S.cfg.grat.on!==false?", with gratuity":""}). Saving ${inr(Math.round(X.s))} a month. Needed if you stopped today: ${inr(Math.round(X.needNow))}.${X.tgt!=null?(X.gap>0?` For your target, about ${inr(Math.round(X.extra))} more a month.`:" Your target date is covered."):""}</p>${lines2(X.pts)}</div>`:""}
  <p class="note">Estimate only. It counts your whole net worth, including your home if you added it, so leave out what you won’t sell.</p>${btns("retSave",S.cfg.ret?"r":"",S.cfg.ret?"retDel":"")}`)}
Object.assign(ACT,{
  verdict(m){verdictSheet(m||today().slice(0,7))},
  vBud(cat){bForm(null);setVal("f_cat",cat)},
  retForm(){retForm()},
  retSave(){const exp=+v("r_exp");if(!(exp>0))return toast("Add your monthly cost of living in India");const big=[];for(let j=0;j<8;j++){if(!$("#rb_a"+j))break;const a=+v("rb_a"+j);if(a>0)big.push({n:v("rb_n"+j).trim()||"Other",a})}
    S.cfg.ret={exp,when:v("r_when"),save:v("r_save")===""?null:+v("r_save"),yrs:+v("r_yrs")||30,infl:v("r_infl")===""?6:+v("r_infl"),r1:v("r_r1")===""?8:+v("r_r1"),r2:v("r_r2")===""?7:+v("r_r2"),big};save();render();retForm();toast("Plan updated")},
  retDel(){S.cfg.ret=null;save();done()}
});
{const _vR=vRep;vRep=function(){const h=_vR(),c=verdictCard(mon),f=flowHtml(mon),blk=c+(f?`<h2>Where the money went</h2><div class="card">${f}</div>`:"");const k=h.indexOf('<div class="mon">');if(k<0)return blk+h;const e=h.indexOf("</div>",k)+6;return h.slice(0,e)+blk+h.slice(e)}}
{const _vW=vWealth;vWealth=function(){const h=_vW(),k="<h2>Gratuity</h2>";return h.includes(k)?h.replace(k,retCard()+k):h+retCard()}}
{const _sc=smsCard;smsCard=()=>_sc()+verdictCard(today().slice(0,7),true)}
