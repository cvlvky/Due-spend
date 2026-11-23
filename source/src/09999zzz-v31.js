/* ===== Version 31: ask your diary, 12-month money calendar, "was this you?", card emergency, price watch,
   round-up jar, mood diary, insights, challenges, cash counter, shake to hide, future net worth, all-features guide ===== */
const L31=(k,v2)=>tzLS(k,v2);
const wk=d=>D(d).getDay();

/* ---------- 1. ask your diary (works offline) ---------- */
const AMN=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
function askPeriod(q){const t=today(),y=+t.slice(0,4),m=t.slice(0,7),R=(a,b,label,fut)=>({a,b,label,fut:!!fut});let mm;
  if(/\btoday\b/.test(q))return R(t,t,"today");if(/\byesterday\b/.test(q))return R(plus(-1),plus(-1),"yesterday");
  if(/\bnext\s+week\b/.test(q))return R(t,plus(7),"the next 7 days",1);if(/\bnext\s+month\b/.test(q)){const n=addMon(m,1);return R(n+"-01",n+"-31",mlong(n),1)}
  if(/\blast\s+week\b/.test(q))return R(plus(-13),plus(-7),"last week");if(/\bthis\s+week\b|\blast\s+7\s+days\b/.test(q))return R(plus(-6),t,"the last 7 days");
  if((mm=q.match(/\blast\s+(\d+)\s+days?\b/)))return R(plus(-(+mm[1]-1)),t,"the last "+mm[1]+" days");
  if((mm=q.match(/\blast\s+(\d+)\s+months?\b/)))return R(addMon(m,-(+mm[1]-1))+"-01",t,"the last "+mm[1]+" months");
  if(/\blast\s+month\b/.test(q)){const p=addMon(m,-1);return R(p+"-01",p+"-31",mlong(p))}
  if(/\blast\s+year\b/.test(q))return R((y-1)+"-01-01",(y-1)+"-12-31",String(y-1));if(/\bthis\s+year\b/.test(q))return R(y+"-01-01",t,"this year");
  if((mm=q.match(/\b(jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b(?:\s+(\d{4}))?/)||q.match(/\b(may)\s+(\d{4})\b/))){const mo=AMN.indexOf(mm[1])+1;let yy=mm[2]?+mm[2]:y;if(!mm[2]&&yy+"-"+String(mo).padStart(2,"0")>m)yy--;const k=yy+"-"+String(mo).padStart(2,"0");return R(k+"-01",k+"-31",mlong(k))}
  if((mm=q.match(/\b(20\d\d)\b/)))return R(mm[1]+"-01-01",mm[1]+"-12-31",mm[1]);if(/\bever\b|\ball time\b|\bso far\b/.test(q))return R("1900-01-01",t,"all time");
  return R(m+"-01",t,"this month")}
const inL=l=>/^(this|last|today|yesterday|the )/.test(l)?l:"in "+l;
const whoMatch=(x,who)=>{const w=who.toLowerCase(),F=S.fam.find(m=>m.name.toLowerCase()==w);return (F&&x.pb==F.id)||byName(x.by).toLowerCase().includes(w)};
function askFilters(q){const f={},cats=lineCats();f.cat=cats.find(c=>c.length>2&&new RegExp("\\b"+escRe(c.toLowerCase())+"\\b").test(q))||"";
  const pay=[...new Set(S.tx.map(x=>x.payee).filter(Boolean))].sort((a,b)=>b.length-a.length);f.payee=pay.find(p=>p.length>=3&&q.includes(" "+p.toLowerCase()))||"";
  const A=S.acc.find(a=>q.includes(a.name.toLowerCase()))||S.acc.find(a=>a.name.toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>=3&&!/^(bank|account|savings?|salary|card|cash)$/.test(w)).some(w=>new RegExp("\\b"+escRe(w)+"\\b").test(q)));f.acc=A?A.id:"";
  const ppl=[...S.fam.map(m=>m.name),...new Set(S.tx.map(x=>x.by).filter(Boolean).map(byName))].filter(n=>n&&n.length>=3);f.who=ppl.find(n=>new RegExp("\\b"+escRe(n.toLowerCase())+"\\b").test(q))||"";
  if(/\b(qar|riyals?)\b/.test(q))f.cur="QAR";else if(/\b(rupees?|inr)\b|₹/.test(q))f.cur="INR";
  const mm=q.match(/(?:over|above|more than)\s*(\d+)/);if(mm)f.min=+mm[1];return f}
function askRun(raw){const q=" "+String(raw||"").toLowerCase().replace(/[?.!,]/g," ").replace(/\s+/g," ")+" ",P=askPeriod(q),f=askFilters(q),out=V(),c=f.cur||out,money=n=>fmx(Math.round(cv(n,out,c)),c);
  const inP=x=>x.date>=P.a&&x.date<=P.b,match=x=>(!f.cat||(x.cat||"").toLowerCase()==f.cat.toLowerCase())&&(!f.payee||(x.payee||"").toLowerCase()==f.payee.toLowerCase())&&(!f.acc||x.acc==f.acc||x.to==f.acc)&&(!f.who||whoMatch(x,f.who))&&(!f.min||ca(x)>=cv(f.min,f.cur||out,out));
  const what=[f.cat,f.payee&&"at "+f.payee,f.acc&&"from "+ac(f.acc).name,f.who&&"by "+f.who].filter(Boolean).join(" "),sum=L=>L.reduce((s,x)=>s+ca(x),0),pick=k=>S.tx.filter(x=>x.kind==k&&inP(x)&&match(x)).sort((a,b)=>b.date.localeCompare(a.date));
  if(/days? in india/.test(q))return {big:indiaDays()+" days",say:"in India this financial year (April to March)"};
  if(/net ?worth|how much am i worth|total wealth/.test(q))return {big:money(nwv(out)),say:"is your net worth today"};
  if(/sent home|send home|sent to india|remit/.test(q)){const R=remits().filter(r=>inP(r.x));return {big:"₹"+Math.round(R.reduce((s,r)=>s+r.inr,0)).toLocaleString("en-IN"),say:`sent to India ${inL(P.label)} (${R.length} ${R.length==1?"transfer":"transfers"})`,list:R.map(r=>r.x)}}
  if(/\bbalance\b|how much (money )?(do i have|have i got|is (there|left))|in (my )?accounts?\b/.test(q)){if(f.acc){const A=ac(f.acc);return {big:fmx(bal(A),A.cur),say:"in "+A.name+" now"}}
    return {big:money(tot(out)),say:"in all your accounts now",rows:S.acc.map(a=>[a.name,fmx(bal(a),a.cur)])}}
  if(/\b(due|dues|premium|premiums|emi|emis|bills?|pay next|upcoming|coming up|renewals?)\b/.test(q)&&!/\b(paid|spent|spend)\b/.test(q)){const a=P.fut?P.a:today(),b=P.fut?P.b:plus(30),U=upcoming(a,b,true).filter(u=>["due","emi","rec","sub","fd"].includes(u.t)||u.src);
    return {big:money(U.filter(u=>u.t!="fd").reduce((s,u)=>s+cv(+u.a||0,u.c||"INR",out),0)),say:`to pay ${P.fut?"in "+P.label:"in the next 30 days"} (${U.length} ${U.length==1?"item":"items"})`,rows:U.slice(0,15).map(u=>[u.n+" · "+fmt(u.d),u.a?fmx(u.a,u.c):""])}}
  if(/\b(income|earned|earn|received|salary|credited)\b/.test(q)){const L=pick("in");return {big:money(sum(L)),say:`income ${what?what+" ":""}${inL(P.label)}`,list:L}}
  if(/\bsav(e|ed|ing|ings)\b/.test(q)&&!/scheme|goal/.test(q)){const i=sum(pick("in")),o=sum(pick("out"));return {big:money(i-o),say:`left over ${inL(P.label)}${i>0?" · "+Math.round((i-o)/i*100)+"% of income":""}`,rows:[["Income",money(i)],["Spent",money(o)]]}}
  const L=pick("out");
  if(/\b(biggest|largest|highest|most expensive)\b/.test(q))return {big:L.length?money(Math.max(...L.map(ca))):"—",say:`biggest ${what?what+" ":""}expenses ${inL(P.label)}`,list:[...L].sort((a,b)=>ca(b)-ca(a)).slice(0,10)};
  if(/\b(where|which (shop|shops|store|place)|top (shops|places|payees)|most at)\b/.test(q)){const G={};L.forEach(x=>{const k=x.payee||"(no shop)";G[k]=(G[k]||0)+ca(x)});return {big:money(sum(L)),say:`spent ${what?what+" ":""}${inL(P.label)}, by shop`,rows:Object.entries(G).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v2])=>[k,money(v2)])}}
  if(/\b(which categor|categories|on what|breakdown)\b/.test(q)){const G={};L.forEach(x=>{const k=x.cat||"No category";G[k]=(G[k]||0)+ca(x)});return {big:money(sum(L)),say:`spent ${inL(P.label)}, by category`,rows:Object.entries(G).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v2])=>[k,money(v2)])}}
  if(/\b(how many times|how often|count)\b/.test(q))return {big:L.length+(L.length==1?" time":" times"),say:`${what||"expenses"} ${inL(P.label)}, ${money(sum(L))} in all`,list:L};
  if(/\b(average|avg|usually|per month|a month)\b/.test(q)){const M=[1,2,3,4,5,6].map(i=>addMon(today().slice(0,7),-i)),T=S.tx.filter(x=>x.kind=="out"&&match(x)&&M.includes(x.date.slice(0,7)));return {big:money(sum(T)/6),say:`a month on average ${what?"for "+what+" ":""}(last 6 months)`}}
  const days=Math.round((D(P.b>today()?today():P.b)-D(P.a))/864e5)+1,pa=iso(new Date(D(P.a).getTime()-days*864e5)),pb=iso(new Date(D(P.a).getTime()-864e5)),prev=S.tx.filter(x=>x.kind=="out"&&x.date>=pa&&x.date<=pb&&match(x));
  const now=sum(L),was=sum(prev),ch=was?Math.round((now/was-1)*100):0;
  return {big:money(now),say:`spent ${what?"on "+what+" ":""}${inL(P.label)}${was&&P.label!="all time"?` · ${ch>=0?ch+"% more":(-ch)+"% less"} than the ${days} days before`:""}`,list:L}}
const ASKEX=["How much on food this month?","Biggest expenses last month","What’s due next week?","How much did I send home this year?","Where did I spend most this month?","Balance in all accounts","How many times at Lulu this year?","Average groceries per month"];
function askSheet(q){sheet(`<h2>Ask your diary</h2><p class="sub">Type or say a question about your money. Answered on the phone from your entries.</p>
  <div class="lineq"><input id="f_ask" value="${esc(q||"")}" placeholder="How much on food this month?" autocomplete="off" aria-label="Your question"><button class="ib" data-act="askVoice" aria-label="Say it" style="border:1px solid var(--line);border-radius:12px;width:44px;height:44px">🎤</button></div>
  <div class="acts"><button class="btn" data-act="askGo">Ask</button></div><div id="ask_out"></div>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${ASKEX.map(x=>`<button class="btn sm ghost" data-act="askEx" data-id="${esc(x)}">${esc(x)}</button>`).join("")}</div>`);if(q)askShow(q)}
function askShow(q){const o=$("#ask_out");if(!o)return;const r=askRun(q);
  o.innerHTML=`<div class="card" style="margin-top:10px"><div class="big" style="font-size:28px;font-weight:700">${esc(r.big)}</div><p style="margin:4px 0 0">${esc(r.say)}</p></div>${(r.rows||[]).map(x=>`<div class="hbl" style="margin:8px 0"><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join("")}${(r.list||[]).slice(0,30).map(x=>txRow(x)).join("")}${r.list&&r.list.length>30?`<p class="note">and ${r.list.length-30} more</p>`:""}`}
document.addEventListener("keydown",ev=>{if(ev.key=="Enter"&&ev.target&&ev.target.id=="f_ask"){ev.preventDefault();askShow(v("f_ask"))}});
{const _vh=vHome;vHome=function(...a){const h=_vh(...a);return h.replace(/(<input data-gs="1"[^>]*>)/,`<div class="askrow">$1<button class="ib" data-act="askOpen" aria-label="Ask your diary" title="Ask your diary">💬</button></div>`)}}

/* ---------- 2. money calendar: the next 12 months ---------- */
function calYear(){const t=today(),m0=t.slice(0,7),M=[...Array(12)].map((_,i)=>addMon(m0,i)),U=upcoming(t,addMon(m0,12)+"-01",true).filter(u=>u.t!="fd"&&u.t!="recin"&&+u.a>0),out=V();
  const by=M.map(m=>{const L=U.filter(u=>u.d.startsWith(m));return {m,L,sum:L.reduce((s,u)=>s+cv(+u.a,u.c||"INR",out),0)}}),avg=by.reduce((s,x)=>s+x.sum,0)/12,heavy=by.filter(x=>x.sum>avg*1.4&&x.sum>0);
  const big=U.filter(u=>!["rec","sub"].includes(u.t)&&!/monthly/.test(u.rep||"")),setAside=big.reduce((s,u)=>s+cv(+u.a,u.c||"INR",out),0)/12;return {by,avg,heavy,setAside}}
function calSheet(){const C=calYear(),mx=Math.max(1,...C.by.map(x=>x.sum));
  sheet(`<h2>Money calendar</h2><p class="sub">What’s already due in the next 12 months: premiums, EMIs, fees, rent and subscriptions.</p>
  ${C.heavy.length?`<div class="card" style="border-color:var(--soon)"><b>Heavy months: ${C.heavy.map(x=>mlong(x.m).split(" ")[0]).join(", ")}</b><p class="note" style="margin:4px 0 0">Set aside about <b>${fmr(Math.ceil(C.setAside/50)*50)}</b> a month for the yearly and quarterly ones, so no month hurts.</p></div>`:""}
  ${C.by.map(x=>`<div style="margin:10px 0" data-act="calMon" data-id="${x.m}"><div class="hbl"><span>${mlong(x.m)}</span><b>${fmr(x.sum)}</b></div><div class="dbar"><i style="width:${x.sum/mx*100}%;background:${x.sum>C.avg*1.4?"var(--soon)":"var(--pri)"}"></i></div><small style="color:var(--mute)">${esc(x.L.slice(0,4).map(u=>u.n).join(", "))}${x.L.length>4?" +"+(x.L.length-4):""}</small></div>`).join("")}`)}

/* ---------- 3. "was this you?" and card emergency ---------- */
function wtyList(){const ok=S.cfg.wtyOk||{},since=Date.now()-3*864e5,L=[];
  S.tx.forEach(x=>{if(x.kind!="out"||ok[x.id]||(x.ct||0)<since)return;const A=ac(x.acc);if(!A.id||A.type=="cash")return;
    const prev=S.tx.filter(y=>y!==x&&y.acc==x.acc&&y.kind=="out"&&y.date<x.date),amts=prev.map(y=>+y.amt).sort((a,b)=>a-b),med=amts.length?amts[Math.floor(amts.length/2)]:0;
    const newShop=x.payee&&!prev.some(y=>(y.payee||"").toLowerCase()==x.payee.toLowerCase()),big=+x.amt>=Math.max(med*4,A.cur=="INR"?8000:300),night=(()=>{const h=new Date(x.ct||0).getHours();return h>=1&&h<5})();
    if(prev.length>=5&&((newShop&&big)||(big&&night)))L.push({x,why:night?"late at night":newShop?"a new shop, and more than usual":"more than usual"})});return L}
function cardSheet(id){const A=ac(id)||{},H=S.cfg.hot||{},cards=S.acc.filter(a=>a.type=="card"||a.type=="bank");const L=S.tx.filter(x=>x.acc==A.id&&x.kind=="out").sort((a,b)=>(b.ct||0)-(a.ct||0)).slice(0,5);
  sheet(`<h2>Card or account problem</h2><p class="sub">If a payment wasn’t you or your card is lost, call your bank straight away and ask them to block the card.</p>
  ${cards.map(a=>`<div class="card" style="margin-bottom:8px"><div class="hbl"><b>${esc(a.name)}</b>${H[a.id]?`<a class="btn sm" href="tel:${esc(H[a.id].replace(/[^\d+]/g,""))}">📞 Call bank</a>`:""}</div><div class="lineq"><input id="hot_${a.id}" value="${esc(H[a.id]||"")}" type="tel" placeholder="Bank’s card-block phone number" aria-label="Card block number for ${esc(a.name)}"><button class="btn sm ghost" data-act="hotSave" data-id="${a.id}">Save</button></div></div>`).join("")}
  <p class="note">Find the number on the back of your card or the bank’s website, and save it here once.</p>${A.id?`<h3>Last payments on ${esc(A.name)}</h3>${L.map(x=>txRow(x)).join("")}`:""}`)}

/* ---------- 4. price watch from receipt photos ---------- */
const itemKey=s=>String(s||"").toLowerCase().replace(/[^a-z ]/g," ").replace(/\b(pcs?|kg|gm?|ml|ltr?|x|pack|pkt|nos?)\b/g," ").replace(/\s+/g," ").trim();
function rcptItems(text){const L=String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean),out=[];
  L.forEach(l=>{if(/total|vat|tax|cash|change|card|balance|discount|saving|round|tel|invoice|date|time|qty|amount|visa|master/i.test(l))return;
    let m=l.match(/^([A-Za-z][A-Za-z .&'-]{2,30}?)\s+(\d+(?:\.\d+)?)\s*[x×*@]\s*(\d+(?:\.\d{1,3})?)\s+(\d+(?:\.\d{1,3})?)$/);if(m){out.push({name:m[1].trim(),price:+m[3]});return}
    m=l.match(/^([A-Za-z][A-Za-z .&'-]{2,30}?)\s+(\d+\.\d{2})$/);if(m)out.push({name:m[1].trim(),price:+m[2]})});return out.filter(x=>x.price>0&&x.price<5000&&itemKey(x.name).length>=3).slice(0,40)}
function pricesTake(text,shop,cur,date){const I=rcptItems(text);if(!I.length)return 0;I.forEach(i=>put("prices",stamp({id:uid(),key:itemKey(i.name),name:tcase(i.name.toLowerCase()),price:i.price,cur:cur||"QAR",shop:shop||"",date:date||today()})));if(S.prices.length>1500)S.prices.splice(0,S.prices.length-1500);save();return I.length}
{const _rp=rcptParse;rcptParse=function(t){const r=_rp(t);try{window.__lastOcr={text:t,r}}catch(e){}return r}}
{const _rr=rcptRead;rcptRead=async function(f){await _rr(f);try{const o=window.__lastOcr;if(o&&o.text){const n=pricesTake(o.text,o.r.shop,o.r.cur,o.r.date||today());if(n)toast(n+(n==1?" price":" prices")+" remembered for Price watch")}window.__lastOcr=null}catch(e){}}}
function priceGroups(){const G={};S.prices.forEach(p=>{(G[p.key]=G[p.key]||[]).push(p)});return Object.values(G).map(L=>{L.sort((a,b)=>a.date.localeCompare(b.date));const f=L[0],l=L[L.length-1];return {name:l.name,cur:l.cur,last:l,first:f,n:L.length,ch:f.price?Math.round((l.price/f.price-1)*100):0,shops:[...new Set(L.map(x=>x.shop).filter(Boolean))],low:L.reduce((m,x)=>x.price<m.price?x:m,L[0])}}).sort((a,b)=>b.n-a.n)}
function priceSheet(){const G=priceGroups(),rep=G.filter(g=>g.n>=2&&g.last.date>g.first.date),inf=rep.length?Math.round(rep.reduce((s,g)=>s+g.ch,0)/rep.length):null;
  sheet(`<h2>Price watch</h2><p class="sub">Prices remembered from your receipt photos. See what went up and where it’s cheapest.</p>
  ${inf!=null?`<div class="card"><b>Your own price rise: ${inf>=0?"+":""}${inf}%</b><p class="note" style="margin:4px 0 0">Average change across ${rep.length} items you bought more than once.</p></div>`:""}
  ${G.length?G.slice(0,60).map(g=>`<div class="hbl" style="margin:10px 0"><span>${esc(g.name)}<small style="display:block;color:var(--mute)">${g.n}× · cheapest ${fmx(g.low.price,g.cur)}${g.low.shop?" at "+esc(g.low.shop):""}</small></span><span style="text-align:right"><b>${fmx(g.last.price,g.cur)}</b>${g.n>1&&g.ch?`<small style="display:block;color:${g.ch>0?"var(--late)":"var(--good,var(--pri))"}">${g.ch>0?"+":""}${g.ch}%</small>`:""}</span></div>`).join(""):`<div class="empty">Take a photo of a receipt when you add an expense. Item prices are remembered here.</div>`}`)}

/* ---------- 5. round-up jar ---------- */
const rupStep=c=>c=="INR"?100:10;
function rupMonth(m){m=m||today().slice(0,7);const R=S.cfg.rup||{};if(!R.on)return null;let sum=0,n=0;S.tx.forEach(x=>{if(x.kind!="out"||!x.date.startsWith(m)||+x.amt>=(x.cur=="INR"?50000:5000))return;const s=rupStep(x.cur),r=Math.ceil(+x.amt/s)*s-+x.amt;if(r>0&&r<s){sum+=cv(r,x.cur,R.cur||"QAR");n++}});return {sum:Math.round(sum*100)/100,n,cur:R.cur||"QAR",goal:S.goals.find(g=>g.id==R.goal)}}
function rupSheet(){const R=S.cfg.rup||{},x=rupMonth();sheet(`<h2>Round-up jar</h2><p class="sub">Every expense is rounded up (to the next 10 riyal or 100 rupees). The difference adds up here, and once a month you move it to a goal.</p>
  ${R.on&&x?`<div class="card"><div class="big" style="font-size:28px;font-weight:700">${fmx(x.sum,x.cur)}</div><p style="margin:4px 0 0">rounded up from ${x.n} expenses this month${x.goal?" · for "+esc(x.goal.name):""}</p></div>`:""}
  ${SEL("f_rg","Goal to fill",[["","Choose a goal"],...S.goals.map(g=>[g.id,g.name])],R.goal||"")}${SEL("f_rc","Count it in",CURS,R.cur||"QAR")}
  <div class="acts"><button class="btn" data-act="rupSave">${R.on?"Save":"Start the jar"}</button>${R.on&&x&&x.goal&&x.sum>0?`<button class="btn ghost" data-act="rupMove">Moved it to the goal</button>`:""}${R.on?`<button class="btn ghost" data-act="rupOff">Stop</button>`:""}</div>${S.goals.length?"":`<p class="note">Add a savings goal first (Wealth → Goals & loans).</p>`}`)}

/* ---------- 6. mood diary ---------- */
const MOODS=[["5","😄","Great"],["4","🙂","Good"],["3","😐","Okay"],["2","😟","Stressed"],["1","😞","Low"]];
function diarySheet(d){d=d||today();const n=S.notes.find(x=>x.date==d&&x.by==(whoAmI()||"me"))||{},spent=S.tx.filter(x=>x.kind=="out"&&x.date==d).reduce((s,x)=>s+ca(x),0),L=[...S.notes].filter(x=>x.by==(whoAmI()||"me")).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
  sheet(`<h2>Diary</h2><p class="sub">${fmt(d)} · spent ${fmr(spent)} today. A line a day. Each person sees only their own diary.</p><div style="display:flex;gap:6px;justify-content:space-between;margin:8px 0">${MOODS.map(([k,e,t])=>`<button class="btn sm ${n.mood==k?"":"ghost"}" data-act="moodSet" data-id="${k}" title="${t}" style="font-size:22px;flex:1">${e}</button>`).join("")}</div>
  <textarea id="f_note2" rows="4" placeholder="What happened today?" style="width:100%">${esc(n.text||"")}</textarea><div class="acts"><button class="btn" data-act="diarySave" data-id="${d}">Save</button></div>
  ${moodInsight()}${L.length?`<h3>Recent days</h3>${L.map(x=>`<div class="hbl" style="margin:6px 0"><span>${(MOODS.find(m=>m[0]==x.mood)||["","·"])[1]} ${fmt(x.date)}</span><small style="flex:1;margin-left:10px;color:var(--mute);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(x.text||"")}</small></div>`).join("")}`:""}`);window.__mood=n.mood||""}
function moodInsight(){const me=whoAmI()||"me",N=S.notes.filter(x=>x.by==me&&x.mood);if(N.length<6)return "";const by={};N.forEach(x=>{const s=S.tx.filter(t=>t.kind=="out"&&t.date==x.date).reduce((a,t)=>a+ca(t),0);(by[x.mood]=by[x.mood]||[]).push(s)});
  const avg=k=>by[k]?by[k].reduce((a,b)=>a+b,0)/by[k].length:null,good=[avg("5"),avg("4")].filter(x=>x!=null),bad=[avg("2"),avg("1")].filter(x=>x!=null);if(!good.length||!bad.length)return "";
  const g=good.reduce((a,b)=>a+b,0)/good.length,b=bad.reduce((a,b2)=>a+b2,0)/bad.length;return `<div class="card" style="margin-top:10px"><b>On stressed or low days you spend ${b>g?Math.round((b/g-1)*100)+"% more":Math.round((1-b/g)*100)+"% less"}</b><p class="note" style="margin:4px 0 0">About ${fmr(b)} a day, against ${fmr(g)} on good days.</p></div>`}

/* ---------- 7. insights ---------- */
function insights(){const out=[],T=S.tx.filter(x=>x.kind=="out"&&x.date>=plus(-90)),days={};T.forEach(x=>days[x.date]=(days[x.date]||0)+ca(x));
  if(T.length<10)return out;const wd=[0,0,0,0,0,0,0],wn=[0,0,0,0,0,0,0];for(let i=0;i<90;i++){const d=plus(-i),k=wk(d);wn[k]++;wd[k]+=days[d]||0}
  const DN=["Sundays","Mondays","Tuesdays","Wednesdays","Thursdays","Fridays","Saturdays"],avgD=wd.map((s,i)=>wn[i]?s/wn[i]:0),top=avgD.indexOf(Math.max(...avgD)),all=avgD.reduce((a,b)=>a+b,0)/7;
  if(all)out.push(["📅",`You spend most on ${DN[top]}`,`About ${fmr(avgD[top])} a day, ${Math.round((avgD[top]/all-1)*100)}% above your daily average.`]);
  const we=(avgD[5]+avgD[6])/2,wdy=(avgD[0]+avgD[1]+avgD[2]+avgD[3]+avgD[4])/5;if(we&&wdy)out.push(["🌙",we>wdy?"Weekends cost more":"Weekdays cost more",`Fri–Sat about ${fmr(we)} a day, Sun–Thu about ${fmr(wdy)}.`]);
  const m=today().slice(0,7),d0=+today().slice(8);let ns=0,streak=0,best=0;for(let i=1;i<=d0;i++){const d=m+"-"+String(i).padStart(2,"0");if(!days[d]){ns++;streak++;best=Math.max(best,streak)}else streak=0}
  out.push(["🟢",`${ns} no-spend ${ns==1?"day":"days"} this month`,best>1?`Longest run: ${best} days in a row.`:"A day with no spending at all counts."]);
  const C={},Cp={};S.tx.forEach(x=>{if(x.kind!="out"||!x.cat)return;const k=x.date.slice(0,7);if(k==m)C[x.cat]=(C[x.cat]||0)+ca(x);else if(k>=addMon(m,-3))Cp[x.cat]=(Cp[x.cat]||0)+ca(x)/3});
  const up=Object.entries(C).map(([k,v2])=>[k,v2,Cp[k]||0]).filter(x=>x[2]>0&&x[1]>x[2]*1.3).sort((a,b)=>(b[1]-b[2])-(a[1]-a[2]))[0];if(up)out.push(["📈",`${up[0]} is up this month`,`${fmr(up[1])} so far against about ${fmr(up[2])} in a usual month.`]);
  const P={};T.forEach(x=>{if(x.payee)P[x.payee]=(P[x.payee]||0)+1});const fav=Object.entries(P).sort((a,b)=>b[1]-a[1])[0];if(fav&&fav[1]>=4)out.push(["🏪",`Your most visited shop: ${fav[0]}`,`${fav[1]} times in 3 months, about ${fmr(T.filter(x=>x.payee==fav[0]).reduce((s,x)=>s+ca(x),0)/fav[1])} each time.`]);
  const small=T.filter(x=>ca(x)<cv(20,"QAR",V())).reduce((s,x)=>s+ca(x),0);if(small)out.push(["☕","Small spends add up",`Purchases under QAR 20 came to ${fmr(small)} in 3 months.`]);return out}
function insightSheet(){const I=insights(),Ch=chalState();sheet(`<h2>Insights</h2><p class="sub">Patterns in your last 3 months.</p>${I.length?I.map(([ic,t,s])=>`<div class="hbl" style="margin:12px 0;gap:12px;justify-content:flex-start;align-items:flex-start"><span style="font-size:22px">${ic}</span><span><b>${esc(t)}</b><small style="display:block;color:var(--mute)">${esc(s)}</small></span></div>`).join(""):`<div class="empty">Insights appear after a few weeks of entries.</div>`}
  <h2>Challenges</h2>${Ch.length?Ch.map(c=>`<div class="card" style="margin-bottom:8px"><div class="hbl"><b>${esc(c.title)}</b><button class="btn sm ghost" data-act="chalDel" data-id="${c.id}">Remove</button></div><div class="dbar"><i style="width:${Math.min(100,c.p)}%;background:${c.bad?"var(--late)":"var(--pri)"}"></i></div><small style="color:var(--mute)">${esc(c.note)}</small></div>`).join(""):`<p class="note">Set yourself a goal for this month.</p>`}
  <div class="acts"><button class="btn ghost" data-act="chalNew" data-id="cat">+ Spend less on…</button><button class="btn ghost" data-act="chalNew" data-id="ns">+ No-spend days</button></div>`)}

/* ---------- 8. challenges ---------- */
function chalState(){const m=today().slice(0,7),d0=+today().slice(8),dim=new Date(+m.slice(0,4),+m.slice(5,7),0).getDate();return S.chal.filter(c=>c.month==m).map(c=>{
  if(c.kind=="cat"){const s=S.tx.filter(x=>x.kind=="out"&&x.date.startsWith(m)&&(x.cat||"").toLowerCase()==c.cat.toLowerCase()).reduce((a,x)=>a+cv(x.amt,x.cur,c.cur),0),p=Math.round(s/c.limit*100);
    return {...c,title:`${c.cat} under ${fmx(c.limit,c.cur)}`,p,bad:p>100||p>d0/dim*100+15,note:`${fmx(Math.round(s),c.cur)} used · ${p>100?"over the limit":p>d0/dim*100+15?"ahead of pace":"on track"}`}}
  let ns=0;for(let i=1;i<=d0;i++){const d=m+"-"+String(i).padStart(2,"0");if(!S.tx.some(x=>x.kind=="out"&&x.date==d))ns++}const left=dim-d0;return {...c,title:`${c.n} no-spend days`,p:Math.round(ns/c.n*100),bad:ns+left<c.n,note:`${ns} so far, ${left} days left in the month`}})}
function chalForm(kind){sheet(`<h2>${kind=="cat"?"Spend less on…":"No-spend days"}</h2>${kind=="cat"?`${F("f_chc","Category","","text",'list="catlist"')}<div class="two"><div>${F("f_chl","Limit this month","","number")}</div><div>${SEL("f_chu","Currency",CURS,"QAR")}</div></div><datalist id="catlist">${lineCats().map(c=>`<option value="${esc(c)}">`).join("")}</datalist>`:F("f_chn","How many days this month with no spending at all",5,"number")}<div class="acts"><button class="btn" data-act="chalSave" data-id="${kind}">Start</button></div>`)}

/* ---------- 9. cash counter ---------- */
const DENOM={QAR:[500,200,100,50,10,5,1],INR:[500,200,100,50,20,10,5,2,1]};
function cashSheet(id){const C=S.acc.filter(a=>a.type=="cash"),A=id&&ac(id).id?ac(id):C[0];if(!A||!A.id)return toast("Add a cash account first (Accounts → + Add account → Cash)");const Dn=DENOM[A.cur]||DENOM.QAR;
  sheet(`<h2>Count your cash</h2>${C.length>1?SEL("cc_acc","Wallet",C.map(a=>[a.id,a.name]),A.id):""}<p class="sub">How many of each note and coin do you have in ${esc(A.name)}?</p>
  ${Dn.map(d=>`<div class="hbl" style="margin:6px 0"><span>${A.cur=="INR"?"₹":"QAR "}${d}</span><input type="number" inputmode="numeric" min="0" data-cc="${d}" style="width:90px;margin:0" aria-label="Count of ${d}"></div>`).join("")}
  <div class="card" style="margin-top:8px"><div class="hbl"><span>Counted</span><b id="cc_tot">${fmx(0,A.cur)}</b></div><div class="hbl"><span>App shows</span><b>${fmx(bal(A),A.cur)}</b></div></div>
  <div class="acts"><button class="btn" data-act="cashSet" data-id="${A.id}">Set the cash balance</button></div>`)}
const ccTot=()=>[...$$("#over [data-cc]")].reduce((s,e)=>s+(+e.value||0)*+e.dataset.cc,0);
document.addEventListener("input",e=>{if(e.target&&e.target.dataset&&e.target.dataset.cc){const b=$('#over [data-act="cashSet"]'),A=b&&ac(b.dataset.id),t=$("#cc_tot");if(t&&A)t.textContent=fmx(ccTot(),A.cur)}});
document.addEventListener("change",e=>{if(e.target&&e.target.id=="cc_acc")cashSheet(e.target.value)});

/* ---------- 10. shake to hide amounts ---------- */
let shk=[];window.addEventListener("devicemotion",e=>{if(L31("shake")!="1")return;const a=e.accelerationIncludingGravity||e.acceleration;if(!a)return;const g=Math.sqrt((a.x||0)**2+(a.y||0)**2+(a.z||0)**2);
  if(g>24){const t=Date.now();shk=shk.filter(x=>t-x<700);shk.push(t);if(shk.length>=3){shk=[];S.cfg.hide=!S.cfg.hide;save();render();toast(S.cfg.hide?"Amounts hidden":"Amounts shown")}}});

/* ---------- 11. future net worth ---------- */
CALCS.fut=["Future net worth",[["Net worth today",0],["Saved each month",0],["Return % a year",8],["Years",10]]];
{const _cr=calcRun;calcRun=function(k){if(k!="fut")return _cr(k);const g=i=>+v(i)||0,o=$("#calc_out");if(!o)return;const P=g("c1"),A=g("c2"),R=g("c3")/1200,Y=g("c4");if(!Y){o.innerHTML="Fill in the numbers";return}
  const sim=(a)=>{let x=P;for(let i=0;i<Y*12;i++)x=x*(1+R)+a;return x},base=sim(A),more=sim(A*1.2);o.innerHTML=`In ${Y} years: <b>${fmr2(base)}</b><br>If you save 20% more each month: <b>${fmr2(more)}</b> (+${fmr2(more-base)})<br><small>Money you add: ${fmr2(A*12*Y)}</small>`}}
{const _cs=calcSheet;calcSheet=function(k){_cs(k);if(k=="fut"){try{const nw=Math.round(nwv(V())),M=[1,2,3].map(i=>addMon(today().slice(0,7),-i)),sv=Math.round(M.reduce((s,m)=>s+mSum(m,"in")-mSum(m,"out"),0)/3);const a=$("#c1"),b=$("#c2");if(a&&!+a.value)a.value=nw;if(b&&!+b.value)b.value=Math.max(0,sv);calcRun("fut")}catch(e){}}}}

/* ---------- 12. all features guide ---------- */
const GUIDE=[
 ["Add entries",[["➕","Add an expense or income","The + button, or tap Quick add at the top of Home.","quick"],["🗣️","Type or say it in one line","“Lulu 120 riyal groceries”, in English or Tamil.","voice"],["📷","Receipt photo","Attaches the bill and reads the total, shop and date.","quick"],["🔁","Transfers between accounts","Money moved from QNB to SBI, etc.","trf"],["🔄","Recurring entries","Salary, rent and other fixed amounts every month.","addRec"]]],
 ["Payments read for you",[["✉️","Bank SMS and payment apps","Read on the phone; they wait in Payments to review.","review"],["📧","Gmail","Bank emails from the Gmail you choose.","gmail"],["📨","Outlook","Bank emails from Outlook or Hotmail.","outlook"],["🔔","Hourly check when closed","A notification when a new bank email arrives.","gmail"],["⚡","Save in one tap","Save, Save all, or always save from a bank.","review"],["💳","Card bills from statements","Statement emails turn into due dates.","home"],["⚖️","Balance check","Warns when the bank’s balance doesn’t match.","home"]]],
 ["Dues and reminders",[["📅","Due dates","Premiums, EMIs, fees and renewals with reminders.","dues"],["🛡️","Insurance grace period","Warning before a policy lapses.","dues"],["↗️","Pay link","Save where you pay a due and open it in one tap.","dues"],["🧾","Cheques","Post-dated cheques with a balance-short warning.","acc"],["📆","Dues in your calendar","One calendar file for all dues and cheques.","calAll"],["🗓️","Money calendar","The next 12 months of fixed payments, heavy months marked.","moneyCal"],["⭐","Important yearly dates","ITR, PPF and SSY minimum, tax-saving deadline.","yd"]]],
 ["Accounts and cards",[["🏦","Accounts by country","QAR and ₹ accounts; tap one for its actions.","acc"],["📄","Statements","PDF bank statements imported and matched.","acc"],["💱","Rates and money sent home","QAR rate, remittances and best day to send.","remit"],["❓","Was this you?","Asks about unusual card payments.","home"],["🆘","Card emergency","Your bank’s card-block number, one tap to call.","cardSos"],["💵","Count your cash","Count notes to set the cash balance.","cash"]]],
 ["Spending",[["📊","Budgets","With warnings while you add an expense.","spend"],["💡","Suggested budgets","From your last 3 months.","budSug"],["🧳","Trips and events","A budget for a trip, wedding or festival.","spend"],["📈","Spending alerts","When a category jumps this week.","spend"],["🔍","Insights","Your spending patterns and no-spend days.","insights"],["🏁","Challenges","Spend less on something, or no-spend days.","insights"],["🏷️","Price watch","Item prices from your receipts and your own price rise.","prices"],["🪙","Round-up jar","Small change from every expense, for a goal.","rup"],["🧹","Tidy up","Fix entries without a category, change many at once.","bulk"],["🔁","Duplicates","Finds entries added twice.","dup"]]],
 ["Wealth and plans",[["💰","Net worth","Accounts, investments, schemes, gold and loans.","wealth"],["🏛️","SSY, PPF and RD","Deposits, interest and maturity.","schemes"],["📈","Investments","Mutual funds with live NAV and returns.","inv"],["🎯","Goals and loans","Savings goals and EMI loans with prepayment.","goals"],["🧮","Calculators","EMI, SIP, FD/RD, inflation, currency, future net worth.","calc"],["🤔","Can I afford it?","Checks a purchase against payday, budgets and goals.","afford"],["💼","Gratuity and return to India","End-of-service and retirement plans.","plans"],["🇮🇳","Days in India","For your NRI tax status.","plans"],["🧾","Tax pack for your CA","PPF/SSY, premiums, interest, 80G, days in India.","tax"]]],
 ["Family",[["👪","People and ownership","Who owns what, nominees.","fam"],["½","Shared costs","Who paid and who owes whom each month.","split"],["🛒","Shopping list","Shared, tick items off, add the bill.","shop"],["🤝","Hand loans and moi","Money lent and borrowed, moi gifts register.","fam"],["🆘","Emergency pack","A locked PDF of everything important.","fam"],["👀","Family activity","What your family added while you were away.","home"],["📔","Diary","A line a day with your mood, and how mood affects spending.","diary"]]],
 ["Ask and reports",[["💬","Ask your diary","“How much on food this month?”, typed or spoken.","ask"],["📑","Reports","Month by month, year in review, money health.","rep"],["🗞️","Last month in short","Shown on the 1st, share on WhatsApp.","msum"]]],
 ["Safety, backup and settings",[["🔒","App lock and fingerprint","PIN with encryption, fingerprint unlock.","settings"],["🪪","Fingerprint for documents","ID cards need your fingerprint to open.","settings"],["🙈","Hide amounts","Eye button, or shake the phone (turn on below).","shake"],["☁️","Google Drive backup","Daily backup with your documents, and a live Google Sheet.","drive"],["🔄","Family sync","Live sharing with your wife’s phone.","sync"],["⬆️","Updates","The app tells you when a new version is ready.","settings"],["🌐","Tamil","Language and voice in Tamil.","settings"],["🔠","Text size","Normal, Large or Extra large.","settings"],["🧩","Home-screen widget","Needs attention, safe to spend and a mic button.","settings"]]]];
const GO={quick:()=>qForm(),voice:()=>{qForm("out");setTimeout(()=>voice(),300)},trf:()=>ACT.trf(),addRec:()=>ACT.addRec(),review:()=>smsReview(),gmail:()=>gmSheet(),outlook:()=>msSheet(),home:()=>ACT.tab("home"),dues:()=>ACT.tab("dates"),acc:()=>ACT.tab("acc"),calAll:()=>ACT.calAll(),moneyCal:()=>calSheet(),yd:()=>ydSheet(),remit:()=>remitSheet(),cardSos:()=>cardSheet(""),cash:()=>cashSheet(""),
  spend:()=>ACT.tab("spend"),budSug:()=>budSheet(),insights:()=>insightSheet(),prices:()=>priceSheet(),rup:()=>rupSheet(),bulk:()=>bulkSheet(),dup:()=>dupSheet(),wealth:()=>{S.cfg.wSeg="over";ACT.tab("invest")},schemes:()=>{S.cfg.wSeg="sch";ACT.tab("invest")},inv:()=>{S.cfg.wSeg="inv";ACT.tab("invest")},goals:()=>{S.cfg.wSeg="goals";ACT.tab("invest")},plans:()=>{S.cfg.wSeg="plans";ACT.tab("invest")},
  calc:()=>calcSheet("emi"),afford:()=>affordSheet(),tax:()=>ACT.taxPack(),fam:()=>{S.cfg.famSeg="people";ACT.tab("fam")},split:()=>{S.cfg.famSeg="split";ACT.tab("fam")},shop:()=>shopSheet(),diary:()=>diarySheet(),ask:()=>askSheet(),rep:()=>ACT.tab("rep"),msum:()=>monthSum(true),settings:()=>settings(),shake:()=>ACT.shakeT(),drive:()=>gdSheet(),sync:()=>syncForm()};
function guideSheet(q){q=String(q||"").toLowerCase();const n=GUIDE.reduce((s,g)=>s+g[1].length,0);
  sheet(`<h2>All features</h2><p class="sub">${n} things Personal Diary can do. Tap one to open it.</p><input id="f_gq" type="search" value="${esc(q)}" placeholder="Find a feature" aria-label="Find a feature" style="margin:0 0 6px"><div id="guide_list">${guideList(q)}</div>`);if(taOn())taNode($("#over"))}
function guideList(q){return GUIDE.map(([grp,L])=>{const M=L.filter(x=>!q||(x[1]+" "+x[2]).toLowerCase().includes(q));return M.length?`<h3>${esc(grp)}</h3>${M.map(([ic,t,s,go])=>`<div class="row" data-act="guideGo" data-id="${go}" style="cursor:pointer"><div style="display:flex;gap:10px;align-items:flex-start"><span style="font-size:20px;width:26px;text-align:center">${ic}</span><div><b>${esc(t)}</b><small>${esc(s)}</small></div></div><span class="dots">›</span></div>`).join("")}`:""}).join("")||`<div class="empty">Nothing matches.</div>`}
document.addEventListener("input",e=>{if(e.target&&e.target.id=="f_gq"){const o=$("#guide_list");if(o){o.innerHTML=guideList(e.target.value.toLowerCase());if(taOn())taNode(o)}}});

/* ---------- wiring ---------- */
{const _ti=todoItems;todoItems=function(){const L=_ti();
  wtyList().slice(0,3).forEach(({x,why})=>{const A=ac(x.acc);L.push({k:-1650,ic:"❓",tx:`Was this you? ${fmx(x.amt,x.cur)}${x.payee?" at "+x.payee:""}`,sub:`${A.name} · ${fmt(x.date)} · ${why}`,act:"wtyNo",id:x.id,bact:"wtyYes",bid:x.id,bt:"Yes",tone:"late"})});
  const R=rupMonth();if(R&&R.goal&&R.sum>0&&+today().slice(8)>=25)L.push({k:300,ic:"🪙",tx:`Round-up jar: ${fmx(R.sum,R.cur)} this month`,sub:"Move it to "+R.goal.name,act:"rupOpen",tone:""});
  chalState().filter(c=>c.bad).forEach(c=>L.push({k:-350,ic:"🏁",tx:"Challenge: "+c.title,sub:c.note,act:"insightsOpen",tone:"soon"}));
  if(S.notes.some(x=>x.by==(whoAmI()||"me"))&&new Date().getHours()>=20&&!S.notes.some(x=>x.date==today()&&x.by==(whoAmI()||"me")))L.push({k:500,ic:"📔",tx:"How was today?",sub:"Add a line to your diary",act:"diaryOpen",tone:""});
  return L.sort((a,b)=>a.k-b.k)}}
{const _st=settings;settings=function(...a){const r=_st(...a);try{const box=$("#set_more");if(box&&!$("#set_guide")){box.insertAdjacentHTML("afterbegin",`<button id="set_guide" data-act="guideOpen">📖 All features</button>`);box.insertAdjacentHTML("beforeend",`<button data-act="shakeT">${L31("shake")=="1"?"Shake to hide: on":"Shake to hide: off"}</button><button data-act="cardSos">🆘 Card emergency</button>`);if(taOn())taNode(box)}}catch(e){}return r}}
{const _gc=gratCard;gratCard=function(...a){return _gc(...a)+`<div class="acts"><button class="btn ghost" data-act="moneyCal">Money calendar (12 months)</button><button class="btn ghost" data-act="rupOpen">Round-up jar</button></div>`}}
{const _vs=vSpend;vSpend=function(...a){const h=_vs(...a),add=`<div class="acts"><button class="btn ghost" data-act="insightsOpen">Insights and challenges</button><button class="btn ghost" data-act="priceOpen">Price watch</button></div>`,m=h.indexOf('data-act="uncatOpen"');if(m<0)return h+add;const i=h.lastIndexOf("<h2>",m);return i>=0?h.slice(0,i)+add+h.slice(i):h+add}}
{const _vh2=vHome;vHome=function(...a){const h=_vh2(...a);return h.includes('data-act="homeEdit"')?h.replace(/(<[^>]*data-act="homeEdit"[^>]*>[^<]*<\/[a-z]+>)/,`$1 · <button class="lnk" data-act="guideOpen" style="background:none;border:0;color:var(--pri);font:inherit;cursor:pointer;padding:0">${esc(taStr("All features"))}</button>`):h}}
Object.assign(TA,{"All features":"எல்லா அம்சங்களும்","Ask your diary":"உங்கள் டைரியிடம் கேளுங்கள்","Ask":"கேள்","Money calendar":"பண நாள்காட்டி","Insights":"நுண்ணறிவுகள்","Challenges":"சவால்கள்","Price watch":"விலை கண்காணிப்பு","Round-up jar":"சில்லறை சேமிப்பு","Diary":"டைரி","Count your cash":"ரொக்கத்தை எண்ணு","Card or account problem":"அட்டை அல்லது கணக்கு பிரச்சனை","Insights and challenges":"நுண்ணறிவுகள் மற்றும் சவால்கள்"});
NEW27.splice(0,NEW27.length,"💬 Ask your diary: “How much on food this month?” (Home, next to search)","📖 All features: everything the app can do, in one list (Settings or Home)","Money calendar for the next 12 months (Wealth → Plans)","“Was this you?” for unusual card payments, and a card emergency screen","Price watch from receipt photos, with your own price rise","Round-up jar, insights, challenges and a mood diary","Count your cash, shake to hide amounts, future net worth calculator");

Object.assign(ACT,{
  askOpen(){askSheet()},askGo(){askShow(v("f_ask"))},askEx(q){const e=$("#f_ask");if(e)e.value=q;askShow(q)},
  async askVoice(){if(!isApp())return toast("Voice works in the Android app");try{const r=await NP("DueNative","listen",{lang:"en-IN",prompt:"Ask about your money"});if(r&&r.text){const e=$("#f_ask");if(e)e.value=r.text;askShow(r.text)}}catch(e){}},
  moneyCal(){calSheet()},calMon(m){const C=calYear().by.find(x=>x.m==m);if(!C)return;sheet(`<h2>${mlong(m)}</h2>${C.L.map(u=>`<div class="hbl" style="margin:8px 0"><span>${esc(u.n)}<small style="display:block;color:var(--mute)">${fmt(u.d)}</small></span><b>${fmx(u.a,u.c)}</b></div>`).join("")||`<div class="empty">Nothing due.</div>`}<div class="acts"><button class="btn ghost" data-act="moneyCal">Back</button></div>`)},
  wtyYes(id){S.cfg.wtyOk={...(S.cfg.wtyOk||{}),[id]:1};save();render()},wtyNo(id){const x=S.tx.find(t=>t.id==id);cardSheet(x?x.acc:"")},
  cardSos(){cardSheet("")},hotSave(id){S.cfg.hot={...(S.cfg.hot||{}),[id]:v("hot_"+id).trim()};save();toast("Saved");cardSheet(id)},
  priceOpen(){priceSheet()},
  rupOpen(){rupSheet()},rupSave(){const g=v("f_rg");if(!g)return toast("Choose a goal first");S.cfg.rup={...(S.cfg.rup||{}),on:true,goal:g,cur:v("f_rc")};save();rupSheet();render()},
  rupOff(){S.cfg.rup={...(S.cfg.rup||{}),on:false};save();sheet("");render()},
  rupMove(){const R=rupMonth(),g=R&&R.goal;if(!g)return;put("goals",stamp({...g,saved:Math.round(((+g.saved||0)+cv(R.sum,R.cur,g.cur||"INR"))*100)/100},g));S.cfg.rupDone={...(S.cfg.rupDone||{}),[today().slice(0,7)]:R.sum};save();sheet("");render();toast("Added to "+g.name+". Move the money in your bank too.")},
  diaryOpen(){diarySheet()},moodSet(k){window.__mood=k;$$("#over [data-act='moodSet']").forEach(b=>b.classList.toggle("ghost",b.dataset.id!=k))},
  diarySave(d){const me=whoAmI()||"me",old=S.notes.find(x=>x.date==d&&x.by==me);put("notes",stamp({...(old||{}),id:old?old.id:uid(),date:d,mood:window.__mood||(old&&old.mood)||"",text:v("f_note2").trim(),by:me},old));save();toast("Saved");diarySheet(d)},
  insightsOpen(){insightSheet()},chalNew(k){chalForm(k)},
  chalSave(k){const m=today().slice(0,7);if(k=="cat"){const c=v("f_chc").trim(),l=+v("f_chl");if(!c||!l)return toast("Add the category and the limit");put("chal",stamp({id:uid(),kind:"cat",cat:c,limit:l,cur:v("f_chu"),month:m}))}else{const n=Math.max(1,+v("f_chn")||0);put("chal",stamp({id:uid(),kind:"ns",n,month:m}))}save();insightSheet();render()},
  chalDel(id){trash("chal",id);save();insightSheet();render()},
  cashOpen(){cashSheet("")},cashSet(id){const t=ccTot();fixForm(id);const e=$("#f_bal");if(e)e.value=t},
  shakeT(){L31("shake",L31("shake")=="1"?null:"1");toast(L31("shake")=="1"?"Shake the phone to hide or show amounts":"Shake to hide is off");if($("#set_more"))settings()},
  guideOpen(){guideSheet()},guideGo(k){const f=GO[k];if(!f)return;sheet("");try{f()}catch(e){console.warn(e)}}
});
