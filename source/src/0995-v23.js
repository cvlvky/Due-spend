/* ===== Version 23: family members, emergency pack, moi register, hand loans ===== */
PREFX.push("ep");
const REL={self:"Me",spouse:"Wife / husband",son:"Son",daughter:"Daughter",father:"Father",mother:"Mother",brother:"Brother",sister:"Sister",other:"Other"};
const OCC=["Wedding","Engagement","Housewarming","Naming ceremony","Ear piercing","Puberty ceremony","Birthday","Baby shower","Funeral","Festival","Temple function","Other"];
const famName=id=>{const m=S.fam.find(x=>x.id==id);return m?m.name:"Family / joint"};
/* ---------- owner and nominee on records ---------- */
const OWNC={saveAcc:"acc",saveDate:"dates",saveInv:"inv",saveGoal:"goals",saveLoan:"loans",saveDoc:"docs",saveSub:"subs",saSave:"sacc"},NOMC={acc:1,inv:1,sacc:1};
function ownFields(){if(!S.fam.length)return;for(const [a,c] of Object.entries(OWNC)){const b=$(`#over [data-act="${a}"]`);if(!b||$("#f_own"))continue;const id=b.getAttribute("data-id"),r=id&&S[c].find(x=>x.id==id)||{},box=b.closest(".acts");if(!box)return;
  box.insertAdjacentHTML("beforebegin",`<div class="two"><div>${SEL("f_own",c=="dates"?"Policy or due belongs to":"Belongs to",[["","Family / joint"],...S.fam.map(m=>[m.id,m.name])],r.own||"")}</div><div>${NOMC[c]?F("f_nomi","Nominee",r.nomi||"","text",'list="dl_fam"'):""}</div></div>${DL("dl_fam",S.fam.map(m=>m.name))}`);return}}
{const _sh=sheet;sheet=function(h){_sh(h);if(h)try{ownFields()}catch(e){console.warn(e)}}}
for(const [a,c] of Object.entries(OWNC)){const _f=ACT[a];if(!_f)continue;ACT[a]=async function(id,...r){const has=!!$("#f_own"),own=v("f_own"),nomi=$("#f_nomi")?v("f_nomi").trim():null,before=new Set(S[c].map(x=>x.id)),res=await _f.call(this,id,...r);
  if(has){const x=id&&S[c].find(q=>q.id==id)||S[c].find(q=>!before.has(q.id));if(x&&(x.own||"")!=own||x&&nomi!=null&&(x.nomi||"")!=nomi){x.own=own;if(nomi!=null)x.nomi=nomi;x.ut=Date.now();save();render()}}return res}}
/* per-person net worth, in the view currency */
function ownWorth(id){const to=V(),m=x=>(x.own||"")==id;let a=0;
  S.acc.filter(m).forEach(x=>a+=cv(bal(x),x.cur,to));S.inv.filter(x=>m(x)&&!x.closed).forEach(x=>a+=cv(invVal(x),x.cur,to));S.sacc.filter(m).forEach(x=>a+=cv(saState(x).now,"INR",to));
  S.goals.filter(m).forEach(g=>a+=cv(+g.saved||0,g.cur,to));S.loans.filter(m).forEach(l=>a-=cv(loanOut(l),l.cur,to));return a}
const ownCount=id=>{const m=x=>(x.own||"")==id,n=[[S.acc.filter(m).length,"account"],[S.dates.filter(m).length,"policy or due","policies or dues"],[S.inv.filter(m).length,"investment"],[S.sacc.filter(m).length,"scheme"],[S.docs.filter(m).length,"document"]];return n.filter(x=>x[0]).map(x=>x[0]+" "+(x[0]==1?x[1]:x[2]||x[1]+"s")).join(" · ")};
/* ---------- hand loans ---------- */
const lOut=x=>Math.max(0,(+x.amt||0)-(x.pays||[]).reduce((s,p)=>s+(+p.a||0),0));
function lendTx(x,amt,date,acc,kind){if(!acc)return "";const A=ac(acc);if(!A.id)return "";const sign=x.dir=="lent"?(kind=="start"?-1:1):(kind=="start"?1:-1),cat=x.dir=="lent"?(kind=="start"?"Lent to ":"Repaid by "):(kind=="start"?"Borrowed from ":"Repaid to ");
  return addTx({kind:"adj",acc,amt:sign*cv(amt,x.cur,A.cur),cur:A.cur,date,cat:cat+x.person,note:"Hand loan",link:{t:"lend",id:x.id}}).id}
{const _la=linkApply;linkApply=function(x,s){if(x.link&&(x.link.t=="lend"||x.link.t=="moi"))return;return _la(x,s)}}
{const _nw=nwParts;nwParts=function(to){const p=_nw(to);S.lend.filter(x=>!x.closed).forEach(x=>{const o=cv(lOut(x),x.cur,to);if(x.dir=="lent")p.inv+=o;else p.loan+=o});return p}}
{const _up=upcoming;upcoming=function(from,to,inc){const L=_up(from,to,inc);S.lend.forEach(x=>{if(x.closed||!x.due||!lOut(x))return;if(x.due<=to&&(x.due>=from||inc))L.push({d:x.due,n:(x.dir=="lent"?"Back from ":"Repay ")+x.person,t:"lend",src:"lend",a:lOut(x),c:x.cur,id:x.id})});return L.sort((a,b)=>a.d.localeCompare(b.d))}}
function waLink(x){const ph=String(x.phone||"").replace(/[^\d]/g,""),msg=x.dir=="lent"?`Hi ${x.person}, hope you’re doing well. Just a gentle reminder about the ${fmx(lOut(x),x.cur)} from ${fmt(x.date)}. Whenever it’s convenient for you. Thank you!`:`Hi ${x.person}, I haven’t forgotten the ${fmx(lOut(x),x.cur)} from ${fmt(x.date)}. I’ll return it soon. Thank you!`;return `https://wa.me/${ph}?text=${encodeURIComponent(msg)}`}
async function openExt(u){if(isApp()){try{await NP("DueNative","openUrl",{url:u});return}catch(e){}}try{window.open(u,"_blank","noopener")}catch(e){location.href=u}}
function lendForm(x,dir){x=x||null;const d=x?x.dir:dir||"lent";sheet(`<h2>${x?"Edit hand loan":"New hand loan"}</h2>${SEL("l_dir","Type",[["lent","I gave money (they owe me)"],["borrowed","I took money (I owe them)"]],d,x?"disabled":"")}
  <div class="two"><div>${F("l_who","Person",x&&x.person||"","text",'list="dl_ppl"')}</div><div>${F("l_ph","WhatsApp number (optional)",x&&x.phone||"","tel",'placeholder="+91 98xxxxxxxx"')}</div></div>${DL("dl_ppl",[...S.lend.map(l=>l.person),...S.moi.map(m=>m.person),...S.fam.map(m=>m.name)])}
  <div class="two"><div>${F("l_amt","Amount",x?x.amt:"","number")}</div><div>${SEL("l_cur","Currency",CURS,x?x.cur:"INR")}</div></div>
  <div class="two"><div>${F("l_date","Date",x?x.date:today(),"date")}</div><div>${F("l_due","Expected back by (optional)",x&&x.due||"","date")}</div></div>
  ${x?"":SEL("l_acc","Money went through",[["","Don’t change any account"],...ACCS()],"")}${F("l_note","Note (optional)",x&&x.note||"")}
  <p class="note">If you choose an account, its balance changes; either way the amount counts in your net worth until it’s repaid.</p>${btns("lendSave",x&&x.id,"lendDel")}`)}
function lendSheet(id){const x=S.lend.find(q=>q.id==id);if(!x)return;const o=lOut(x);sheet(`<h2>${esc(x.person)}</h2><p class="sub">${x.dir=="lent"?"Owes you":"You owe"} <b>${fmx(o,x.cur)}</b> of ${fmx(x.amt,x.cur)} · since ${fmt(x.date)}${x.due?" · expected by "+fmt(x.due):""}</p>
  ${(x.pays||[]).length?`<h3>Repayments</h3>${x.pays.map(p=>`<div class="row" style="cursor:default"><div><b>${fmx(p.a,x.cur)}</b><small>${fmt(p.d)}${p.acc?" · "+esc(an(p.acc)):""}</small></div><button class="btn sm ghost" data-act="lendPayDel" data-id="${x.id}|${p.id}" aria-label="Delete repayment">✕</button></div>`).join("")}`:""}
  ${o>0?`<h3>Record a repayment</h3><div class="two"><div>${F("lp_amt","Amount",o,"number")}</div><div>${F("lp_date","Date",today(),"date")}</div></div>${SEL("lp_acc","Money went through",[["","Don’t change any account"],...ACCS()],x.acc||"")}
  <div class="acts"><button class="btn" data-act="lendPay" data-id="${x.id}">Save repayment</button>${x.dir=="lent"?`<button class="btn ghost" data-act="lendWa" data-id="${x.id}">WhatsApp reminder</button>`:""}</div>`:`<p class="note">Fully repaid.</p>`}
  <div class="acts"><button class="btn ghost" data-act="lendEdit" data-id="${x.id}">Edit</button></div>`)}
/* ---------- moi register ---------- */
function moiForm(x,pre){x=x||null;const g=k=>x?x[k]??"":pre&&pre[k]||"";sheet(`<h2>${x?"Edit gift":"Moi / gift"}</h2>${SEL("m_dir","This is",[["gave","A gift I gave"],["got","A gift I received"]],g("dir")||"gave")}
  <div class="two"><div>${F("m_who","Person or family",g("person"),"text",'list="dl_ppl2" placeholder="Ravi, Selvi family"')}</div><div>${F("m_place","Place (optional)",g("place"),"text",'placeholder="Madurai"')}</div></div>${DL("dl_ppl2",S.moi.map(m=>m.person))}
  <div class="two"><div>${SEL("m_occ","Occasion",OCC.map(o=>[o,o]),g("occ")||"Wedding")}</div><div>${F("m_date","Date (future dates remind you)",g("date")||today(),"date")}</div></div>
  <div class="two"><div>${F("m_cash","Cash",g("cash"),"number")}</div><div>${SEL("m_cur","Currency",CURS,g("cur")||"INR")}</div></div>
  <div class="two"><div>${F("m_gold","Gold (grams, optional)",g("gold"),"number")}</div><div>${F("m_gift","Gift item (optional)",g("gift"),"text",'placeholder="Silver lamp"')}</div></div>
  ${x?"":SEL("m_acc","Record the cash in an account?",[["","No"],...ACCS()],"")}${F("m_note","Note (optional)",g("note"))}${btns("moiSave",x&&x.id,"moiDel")}`)}
function moiPeople(){const P={};S.moi.forEach(m=>{const k=(m.person||"").trim().toLowerCase();if(!k)return;const p=P[k]=P[k]||{name:m.person,place:m.place,gave:0,got:0,L:[]};p.L.push(m);if(m.place)p.place=m.place;const c=cv(+m.cash||0,m.cur,"INR");if(m.date<=today()){if(m.dir=="gave")p.gave+=c;else p.got+=c}});
  return Object.values(P).map(p=>({...p,L:p.L.sort((a,b)=>b.date.localeCompare(a.date)),last:p.L.map(m=>m.date).sort().pop()})).sort((a,b)=>b.last.localeCompare(a.last))}
function moiPerson(k){const p=moiPeople().find(x=>x.name.toLowerCase()==k);if(!p)return;const lastGot=p.L.find(m=>m.dir=="got"&&m.date<=today()&&(+m.cash||+m.gold)),lastGave=p.L.find(m=>m.dir=="gave"&&m.date<=today());
  sheet(`<h2>${esc(p.name)}</h2><p class="sub">${p.place?esc(p.place)+" · ":""}You gave ${inr(Math.round(p.gave))} · received ${inr(Math.round(p.got))}</p>
  ${lastGot?`<div class="card" style="margin:6px 0"><b>When they invite you</b><p class="note" style="margin:4px 0 0">They gave ${lastGot.cash?fmx(lastGot.cash,lastGot.cur):""}${lastGot.gold?" + "+lastGot.gold+" g gold":""} at your ${esc(lastGot.occ).toLowerCase()} (${fmt(lastGot.date)})${lastGave&&lastGave.date>lastGot.date?`. Your last gift to them: ${fmx(lastGave.cash||0,lastGave.cur)} (${fmt(lastGave.date)})`:""}.</p></div>`:""}
  ${p.L.map(m=>`<div class="row" data-act="moiEdit" data-id="${m.id}"><div><b>${m.dir=="gave"?"Gave":"Received"} ${m.cash?fmx(m.cash,m.cur):""}${m.gold?" · "+m.gold+" g gold":""}${m.gift?" · "+esc(m.gift):""}</b><small>${esc(m.occ)} · ${fmt(m.date)}${m.date>today()?" · coming up":""}</small></div></div>`).join("")}
  <div class="acts"><button class="btn" data-act="moiAdd" data-id="${esc(p.name)}">Add for ${esc(p.name)}</button></div>`)}
/* ---------- emergency pack: a password-protected PDF (RC4 128-bit, PDF standard security) ---------- */
function md5(m){const K=new Uint32Array(64),R=[7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21];for(let i=0;i<64;i++)K[i]=Math.floor(Math.abs(Math.sin(i+1))*4294967296)>>>0;
  const n=m.length,nb=((n+8)>>>6)+1,W=new Uint32Array(nb*16);for(let i=0;i<n;i++)W[i>>2]|=m[i]<<((i%4)*8);W[n>>2]|=0x80<<((n%4)*8);W[nb*16-2]=(n*8)>>>0;W[nb*16-1]=Math.floor(n/536870912)>>>0;
  let a0=0x67452301,b0=0xefcdab89,c0=0x98badcfe,d0=0x10325476;
  for(let b=0;b<nb;b++){let A=a0,B=b0,C=c0,Dd=d0;for(let i=0;i<64;i++){let F,g;if(i<16){F=(B&C)|(~B&Dd);g=i}else if(i<32){F=(Dd&B)|(~Dd&C);g=(5*i+1)%16}else if(i<48){F=B^C^Dd;g=(3*i+5)%16}else{F=C^(B|~Dd);g=(7*i)%16}
    const s=R[(i>>4)*4+(i%4)];F=(F+A+K[i]+W[b*16+g])>>>0;A=Dd;Dd=C;C=B;B=(B+((F<<s)|(F>>>(32-s))))>>>0}a0=(a0+A)>>>0;b0=(b0+B)>>>0;c0=(c0+C)>>>0;d0=(d0+Dd)>>>0}
  const o=new Uint8Array(16);[a0,b0,c0,d0].forEach((v,i)=>{for(let j=0;j<4;j++)o[i*4+j]=(v>>>(8*j))&255});return o}
function rc4(k,d){const s=new Uint8Array(256);for(let i=0;i<256;i++)s[i]=i;let j=0;for(let i=0;i<256;i++){j=(j+s[i]+k[i%k.length])&255;const t=s[i];s[i]=s[j];s[j]=t}
  const o=new Uint8Array(d.length);let i=0;j=0;for(let x=0;x<d.length;x++){i=(i+1)&255;j=(j+s[i])&255;const t=s[i];s[i]=s[j];s[j]=t;o[x]=d[x]^s[(s[i]+s[j])&255]}return o}
const PDFPAD=new Uint8Array([0x28,0xBF,0x4E,0x5E,0x4E,0x75,0x8A,0x41,0x64,0x00,0x4E,0x56,0xFF,0xFA,0x01,0x08,0x2E,0x2E,0x00,0xB6,0xD0,0x68,0x3E,0x80,0x2F,0x0C,0xA9,0xFE,0x64,0x53,0x69,0x7A]);
const cat8=(...a)=>{const n=a.reduce((s,x)=>s+x.length,0),o=new Uint8Array(n);let p=0;a.forEach(x=>{o.set(x,p);p+=x.length});return o};
const lat1=s=>{const o=new Uint8Array(s.length);for(let i=0;i<s.length;i++)o[i]=s.charCodeAt(i)&255;return o};
const padPw=pw=>{const b=lat1(asc(pw).slice(0,32));return cat8(b,PDFPAD.slice(0,32-b.length))};
const hex8=u=>[...u].map(b=>b.toString(16).padStart(2,"0")).join("");
function pdfKeys(user,owner,id0){const P=-4,pb=new Uint8Array([P&255,(P>>8)&255,(P>>16)&255,(P>>>24)&255]);
  let h=md5(padPw(owner));for(let i=0;i<50;i++)h=md5(h);let O=rc4(h,padPw(user));for(let i=1;i<=19;i++)O=rc4(h.map(b=>b^i),O);
  let k=md5(cat8(padPw(user),O,pb,id0));for(let i=0;i<50;i++)k=md5(k);let U=rc4(k,md5(cat8(PDFPAD,id0)));for(let i=1;i<=19;i++)U=rc4(k.map(b=>b^i),U);
  return {O,U:cat8(U,new Uint8Array(16)),key:k,P}}
function pdfPagesOf(lines){const pe=s=>asc(s).replace(/[^\x00-\xff]/g,"?").replace(/[\\()]/g,"\\$&"),pages=[];let y=800,cur=[];
  const wrap=(t,size)=>{const max=Math.floor(495/(size*0.5)),out=[];let s=asc(t);while(s.length>max){let k=s.lastIndexOf(" ",max);if(k<10)k=max;out.push(s.slice(0,k));s=s.slice(k).trim()}out.push(s);return out};
  lines.forEach(([t,size,bold,gap])=>{size=size||11;y-=gap||0;wrap(t,size).forEach(w=>{const h=size*1.5;if(y-h<50){pages.push(cur);cur=[];y=800}y-=h;cur.push(`BT /F${bold?2:1} ${size} Tf 50 ${y.toFixed(1)} Td (${pe(w)}) Tj ET`)})});pages.push(cur);return pages}
function mkPdfLocked(lines,pw){const pages=pdfPagesOf(lines),id0=md5(lat1(String(Date.now())+Math.random())),K=pdfKeys(pw,pw+"#"+uid()+uid(),id0),parts=[],off=[];let pos=0;
  const put=x=>{const b=typeof x=="string"?lat1(x):x;parts.push(b);pos+=b.length};const objKey=n=>md5(cat8(K.key,new Uint8Array([n&255,(n>>8)&255,(n>>16)&255,0,0]))).slice(0,16);
  const obj=[];obj[1]="<< /Type /Catalog /Pages 2 0 R >>";obj[3]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";obj[4]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";const kids=[];
  pages.forEach((p,i)=>{const pn=5+i*2;kids.push(pn+" 0 R");obj[pn]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pn+1} 0 R >>`;obj[pn+1]={stream:lat1(p.join("\n"))}});
  obj[2]=`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;const enc=obj.length;obj[enc]=`<< /Filter /Standard /V 2 /R 3 /Length 128 /P ${K.P} /O <${hex8(K.O)}> /U <${hex8(K.U)}> >>`;
  put("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");for(let i=1;i<obj.length;i++){off[i]=pos;const o=obj[i];if(o&&o.stream){const e=rc4(objKey(i),o.stream);put(`${i} 0 obj\n<< /Length ${e.length} >>\nstream\n`);put(e);put("\nendstream\nendobj\n")}else put(`${i} 0 obj\n${o}\nendobj\n`)}
  const x=pos;put(`xref\n0 ${obj.length}\n0000000000 65535 f \n`+off.slice(1).map(o=>String(o).padStart(10,"0")+" 00000 n \n").join("")+`trailer\n<< /Size ${obj.length} /Root 1 0 R /Encrypt ${enc} 0 R /ID [<${hex8(id0)}><${hex8(id0)}>] >>\nstartxref\n${x}\n%%EOF\n`);return cat8(...parts)}
const u8b64=u=>{let s="";for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s)};
async function saveBin(name,u8,mime){const b64=u8b64(u8);
  if(isApp()){try{await NP("DueNative","saveDownload",{name,b64,mime});toast("Saved to Downloads/DueAndSpend");try{await NP("DueNative","openFile",{name,data:b64,mime})}catch(e){}return true}catch(e){}}
  const f=new File([u8],name,{type:mime});try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:name});return true}}catch(e){if(e&&e.name=="AbortError")return false}
  try{const u=URL.createObjectURL(f),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),8000);toast("Saving "+name+"…");return true}catch(e){toast("Couldn’t save a file here");return false}}
function epLines(withBal){const E=S.cfg.ep||{},L=[["Family emergency pack",20,1],["Made on "+fmt(today())+" with Personal Diary. Keep it private.",10,0]],H=t=>L.push([t,14,1,14]),T=(t,s)=>L.push([t,s||11]),own=x=>x.own?" · belongs to "+famName(x.own):"";
  if(E.note){H("Read this first");String(E.note).split(/\n+/).forEach(x=>T(x))}
  if(S.fam.length){H("Family");S.fam.forEach(m=>T(m.name+" · "+(REL[m.rel]||"")+(m.dob?" · born "+fmt(m.dob):"")+(m.phone?" · "+m.phone:"")))}
  if((E.contacts||[]).length){H("People to call");E.contacts.forEach(c=>T(c.n+(c.r?" ("+c.r+")":"")+(c.p?" · "+c.p:"")))}
  if(S.acc.length){H("Bank accounts and cash");S.acc.forEach(a=>T(a.name+" · "+(ATYPE[a.type]||"Account")+" · "+a.cur+(a.l4?" · ending "+a.l4:"")+((a.l4s||[]).length?" · cards "+a.l4s.join(", "):"")+(a.nomi?" · nominee "+a.nomi:"")+own(a)+(withBal?" · balance "+fmx(Math.round(bal(a)),a.cur):"")))}
  const pol=S.dates.filter(d=>!d.done);if(pol.length){H("Insurance, premiums and dues");pol.forEach(d=>T(d.name+" · "+(TYPES[d.type]||"Due")+(d.no?" · no. "+d.no:"")+(+d.sa?" · cover "+fmx(d.sa,d.cur):"")+(d.nom?" · nominee "+d.nom:"")+(d.date?" · next "+fmt(d.date):"")+(+d.amt?" · "+fmx(d.amt,d.cur):"")+own(d)))}
  const inv=S.inv.filter(x=>!x.closed);if(inv.length){H("Investments");inv.forEach(x=>T(x.name+" · "+(IK[x.kind]||"Investment")+(x.no?" · "+x.no:"")+(x.mdate?" · matures "+fmt(x.mdate):"")+(x.nomi?" · nominee "+x.nomi:"")+own(x)+(withBal?" · about "+fmx(Math.round(invVal(x)),x.cur):"")))}
  if(S.sacc.length){H("Post office and savings schemes");S.sacc.forEach(x=>{const s=saState(x);T(x.name+" · "+SAS[x.type]+(x.no?" · no. "+x.no:"")+(x.holder?" · holder "+x.holder:"")+(x.po?" · "+x.po:"")+" · matures "+fmt(s.mat)+(x.nomi?" · nominee "+x.nomi:"")+(withBal?" · about "+inr(Math.round(s.now)):""))})}
  if(S.loans.length){H("Loans");S.loans.forEach(l=>T(l.name+" · EMI "+fmx(l.emi,l.cur)+" · left about "+fmx(Math.round(loanOut(l)),l.cur)))}
  const G=S.cfg.grat,g=G&&gratCalc();if(g){H("Qatar end-of-service gratuity");T("Joined "+fmt(G.join)+" · basic QAR "+nf(G.basic)+" · earned about QAR "+nf(Math.round(g.accr))+" so far (estimate)")}
  const ln=S.lend.filter(x=>!x.closed&&lOut(x));if(ln.length){H("Hand loans");ln.forEach(x=>T((x.dir=="lent"?x.person+" owes us ":"We owe "+x.person+" ")+fmx(lOut(x),x.cur)+" (since "+fmt(x.date)+")"+(x.phone?" · "+x.phone:"")))}
  if(S.docs.length){H("Documents");S.docs.forEach(d=>T(d.name+(d.type?" · "+d.type:"")+(d.no?" · no. "+d.no:"")+(d.holder?" · "+d.holder:"")+(d.exp?" · expires "+fmt(d.exp):"")))}
  const sb=subAct();if(sb.length){H("Subscriptions to cancel or keep");sb.forEach(s=>T(s.name+" · "+fmx(s.price,s.cur)+(s.pay?" · paid from "+an(s.pay):"")))}
  H("Good to know");["Insurance and bank claims are made by the nominee, with the policy or account number above and the needed certificates.","Keep this file and its password in different places. Make a fresh copy every year or after big changes."].forEach(x=>T(x));return L}
function epSeg(){const E=S.cfg.ep||{},C=[...(E.contacts||[]),{},{}].slice(0,Math.max(3,(E.contacts||[]).length+1));
  return `<div class="card"><b>Emergency pack</b><p class="note">One password-protected PDF with your accounts, policies, nominees, schemes, loans, documents and people to call, for your family if something happens to you.${E.at?" Last made "+fmt(E.at)+".":""}</p>
  <label for="ep_note">Read this first (optional)</label><textarea id="ep_note" rows="3" placeholder="Where the original documents are kept, who to call first…">${esc(E.note||"")}</textarea>
  <h3>People to call</h3>${C.map((c,j)=>`<div class="two"><div>${F("ec_n"+j,j?"":"Name",c.n||"","text",'placeholder="'+(["Brother","LIC agent","Company HR"][j]||"Name")+'"')}</div><div>${F("ec_p"+j,j?"":"Phone",c.p||"","tel")}</div></div>`).join("")}
  ${SEL("ep_bal","Include balances?",[["0","No, only names and numbers"],["1","Yes"]],E.bal?"1":"0")}${F("ep_pw","Password for the PDF (6 or more characters)","","password",'autocomplete="new-password"')}
  <div class="acts"><button class="btn" data-act="epMake">Make the PDF</button><button class="btn ghost" data-act="epSave">Save details</button></div><p class="note">The password isn’t stored anywhere. Tell it to your family separately.</p></div>`}
/* ---------- the Family screen ---------- */
function vFam(){const seg=S.cfg.famSeg||"people",lent=S.lend.filter(x=>!x.closed&&x.dir=="lent").reduce((s,x)=>s+iv(lOut(x),x.cur),0),owe=S.lend.filter(x=>!x.closed&&x.dir=="borrowed").reduce((s,x)=>s+iv(lOut(x),x.cur),0);
  const sg=(k,l)=>`<button class="btn sm ${seg==k?"":"ghost"}" data-act="famSeg" data-id="${k}">${l}</button>`;let h=`<h1>Family</h1><p class="sub">People, gifts, hand loans and the emergency pack.</p><div class="seg" style="flex-wrap:wrap">${sg("people","People")}${sg("moi","Moi register")}${sg("lend","Hand loans")}${sg("ep","Emergency pack")}</div><div style="height:10px"></div>`;
  if(seg=="people"){h+=S.fam.map(m=>`<div class="card" style="margin-bottom:8px;cursor:pointer" data-act="famView" data-id="${m.id}"><div class="hbl"><b>${esc(m.name)}</b><b>${fm(ownWorth(m.id))}</b></div><small style="color:var(--mute)">${REL[m.rel]||""}${ownCount(m.id)?" · "+ownCount(m.id):""}</small></div>`).join("")+
    `<div class="card" style="margin-bottom:8px;cursor:pointer" data-act="famView" data-id=""><div class="hbl"><b>Family / joint</b><b>${fm(ownWorth(""))}</b></div><small style="color:var(--mute)">Everything not marked as someone’s${ownCount("")?" · "+ownCount(""):""}</small></div>
    <div class="acts"><button class="btn" data-act="famAdd">+ Add family member</button></div><p class="note">Open an account, policy, investment, scheme or document and choose who it belongs to and the nominee.</p>`}
  else if(seg=="moi"){const P=moiPeople(),gave=P.reduce((s,p)=>s+p.gave,0),got=P.reduce((s,p)=>s+p.got,0),up=S.moi.filter(m=>m.date>today()).sort((a,b)=>a.date.localeCompare(b.date));
    h+=`<div class="stats" style="margin:0 0 10px">${tile("Given",inr(Math.round(gave)))}${tile("Received",inr(Math.round(got)))}${tile("People",P.length)}</div>`+
    (up.length?`<h2>Coming up</h2>${up.map(m=>`<div class="row" data-act="moiEdit" data-id="${m.id}"><div><b>${esc(m.person)} · ${esc(m.occ)}</b><small>${fmt(m.date)} · ${when(dl(m.date))}</small></div><b>${m.cash?fmx(m.cash,m.cur):""}</b></div>`).join("")}`:"")+
    `${F("moi_q","Find a person","","search",'placeholder="Name or place" data-moiq="1"')}<div id="moiL">${moiList("")}</div><div class="acts"><button class="btn" data-act="moiAdd">+ Add gift</button></div>`}
  else if(seg=="lend"){const L=S.lend.filter(x=>!x.closed&&lOut(x)>0),C=S.lend.filter(x=>x.closed||!lOut(x));
    h+=`<div class="stats" style="margin:0 0 10px">${tile("People owe you",fm(lent))}${tile("You owe",fm(owe))}</div>`+(L.length?L.map(x=>`<div class="row ${x.due?cls(dl(x.due)):""}" data-act="lendView" data-id="${x.id}"><div><b>${esc(x.person)}</b><small>${x.dir=="lent"?"Owes you":"You owe"} · since ${fmt(x.date)}${x.due?" · "+when(dl(x.due)):""}</small></div><b>${fmx(lOut(x),x.cur)}</b></div>`).join(""):`<div class="empty">No open hand loans.</div>`)+
    `<div class="acts"><button class="btn" data-act="lendAdd" data-id="lent">+ I gave money</button><button class="btn ghost" data-act="lendAdd" data-id="borrowed">+ I took money</button></div>`+(C.length?`<h2>Settled</h2>${C.map(x=>`<div class="row" data-act="lendView" data-id="${x.id}"><div><b>${esc(x.person)}</b><small>${x.dir=="lent"?"Lent":"Borrowed"} ${fmt(x.date)}</small></div><b>${fmx(x.amt,x.cur)}</b></div>`).join("")}`:"")}
  else h+=epSeg();return h}
const moiList=q=>{q=String(q||"").toLowerCase().trim();const P=moiPeople().filter(p=>!q||(p.name+" "+(p.place||"")).toLowerCase().includes(q));
  return P.length?P.map(p=>`<div class="row" data-act="moiPerson" data-id="${esc(p.name.toLowerCase())}"><div><b>${esc(p.name)}</b><small>${p.place?esc(p.place)+" · ":""}${p.L.length} ${p.L.length==1?"entry":"entries"} · last ${fmt(p.last)}</small></div><small style="text-align:right">gave ${inr(Math.round(p.gave))}<br>got ${inr(Math.round(p.got))}</small></div>`).join(""):`<div class="empty">${q?"No one by that name.":"Record moi you give and receive at weddings and functions, so returns are right."}</div>`};
document.addEventListener("input",e=>{const t=e.target;if(t&&t.dataset&&t.dataset.moiq){const b=$("#moiL");if(b)b.innerHTML=moiList(t.value)}});
function famForm(m){m=m||null;sheet(`<h2>${m?"Edit family member":"Add family member"}</h2>${F("fm_name","Name",m&&m.name||"")}<div class="two"><div>${SEL("fm_rel","Relation",Object.entries(REL),m?m.rel:"self")}</div><div>${F("fm_dob","Date of birth (optional)",m&&m.dob||"","date")}</div></div>${F("fm_ph","Phone (optional)",m&&m.phone||"","tel")}${btns("famSave",m&&m.id,"famDel")}`)}
function famView(id){const m=S.fam.find(x=>x.id==id),own=x=>(x.own||"")==(id||""),sec=(t,L,f)=>L.length?`<h3>${t}</h3>`+L.map(f).join(""):"";
  sheet(`<h2>${m?esc(m.name):"Family / joint"}</h2><p class="sub">${m?(REL[m.rel]||"")+" · ":""}Net worth ${fm(ownWorth(id||""))}</p>
  ${sec("Accounts",S.acc.filter(own),a=>`<div class="row" data-act="editAcc" data-id="${a.id}"><div><b>${esc(a.name)}</b><small>${a.nomi?"Nominee "+esc(a.nomi):"No nominee noted"}</small></div><b>${fmx(bal(a),a.cur)}</b></div>`)}
  ${sec("Policies and dues",S.dates.filter(own),d=>`<div class="row" data-act="editDate" data-id="${d.id}"><div><b>${esc(d.name)}</b><small>${d.nom?"Nominee "+esc(d.nom):"No nominee noted"}${d.date?" · next "+fmt(d.date):""}</small></div></div>`)}
  ${sec("Investments",S.inv.filter(x=>own(x)&&!x.closed),x=>`<div class="row" data-act="editInv" data-id="${x.id}"><div><b>${esc(x.name)}</b><small>${x.nomi?"Nominee "+esc(x.nomi):"No nominee noted"}</small></div><b>${fmx(invVal(x),x.cur)}</b></div>`)}
  ${sec("Schemes",S.sacc.filter(own),x=>`<div class="row" data-act="saInfo" data-id="${x.id}"><div><b>${esc(x.name)}</b><small>${SAS[x.type]}</small></div><b>${inr(Math.round(saState(x).now))}</b></div>`)}
  ${sec("Documents",S.docs.filter(own),d=>`<div class="row" data-act="editDoc" data-id="${d.id}"><div><b>${esc(d.name)}</b><small>${d.exp?"Expires "+fmt(d.exp):""}</small></div></div>`)}
  ${m?`<div class="acts"><button class="btn ghost" data-act="famEdit" data-id="${m.id}">Edit</button></div>`:""}`)}
Object.assign(ACT,{
  famGo(){tab="fam";render();scrollTo(0,0)},famSeg(k){S.cfg.famSeg=k;save();render()},
  famAdd(){famForm()},famEdit(id){famForm(S.fam.find(x=>x.id==id))},famView(id){famView(id)},
  famSave(id){const n=v("fm_name").trim();if(!n)return toast("Add a name");const old=S.fam.find(x=>x.id==id);put("fam",stamp({...(old||{}),id:id||uid(),name:n,rel:v("fm_rel"),dob:v("fm_dob"),phone:v("fm_ph").trim()},old));done()},
  famDel(id,t){if(t.getAttribute("data-ok")!="1"){t.setAttribute("data-ok","1");t.textContent="Tap again to delete";return}trash("fam",id);[...S.acc,...S.dates,...S.inv,...S.sacc,...S.docs,...S.goals,...S.loans,...S.subs].forEach(x=>{if(x.own==id){x.own="";x.ut=Date.now()}});done()},
  moiAdd(name){moiForm(null,name?{person:name}:null)},moiEdit(id){moiForm(S.moi.find(x=>x.id==id))},moiPerson(k){moiPerson(k)},
  moiSave(id){const who=v("m_who").trim(),cash=+v("m_cash")||0,gold=+v("m_gold")||0,gift=v("m_gift").trim();if(!who)return toast("Add the person or family");if(!cash&&!gold&&!gift)return toast("Add the cash, gold or gift");
    const old=S.moi.find(x=>x.id==id),o=stamp({...(old||{}),id:id||uid(),dir:v("m_dir"),person:who,place:v("m_place").trim(),occ:v("m_occ"),date:v("m_date")||today(),cash,cur:v("m_cur"),gold,gift,note:v("m_note").trim()},old);
    const acc=$("#m_acc")?v("m_acc"):"";if(!old&&acc&&cash&&o.date<=today()){const A=ac(acc);o.tx=addTx({kind:o.dir=="gave"?"out":"in",acc,amt:cv(cash,o.cur,A.cur),cur:A.cur,date:o.date,cat:"Gifts",payee:who,note:o.occ,link:{t:"moi",id:o.id}}).id}
    if(old&&old.tx){const x=S.tx.find(t=>t.id==old.tx);if(x&&cash){const A=ac(x.acc);x.amt=cv(cash,o.cur,A.cur);x.date=o.date;x.payee=who;x.ut=Date.now()}}
    put("moi",o);done();toast("Saved")},
  moiDel(id,t){if(t.getAttribute("data-ok")!="1"){t.setAttribute("data-ok","1");t.textContent="Tap again to delete";return}const x=S.moi.find(q=>q.id==id);if(x&&x.tx)removeTx(x.tx);trash("moi",id);done()},
  lendAdd(dir){lendForm(null,dir)},lendEdit(id){lendForm(S.lend.find(x=>x.id==id))},lendView(id){lendSheet(id)},
  lendSave(id){const who=v("l_who").trim(),amt=+v("l_amt")||0;if(!who||!amt)return toast("Add the person and amount");const old=S.lend.find(x=>x.id==id);
    const o=stamp({...(old||{pays:[]}),id:id||uid(),dir:old?old.dir:v("l_dir"),person:who,phone:v("l_ph").trim(),amt,cur:v("l_cur"),date:v("l_date")||today(),due:v("l_due"),note:v("l_note").trim()},old);
    if(!old){const acc=v("l_acc");if(acc){o.acc=acc;o.tx=lendTx(o,amt,o.date,acc,"start")}}else if(old.tx){const x=S.tx.find(t=>t.id==old.tx);if(x){const A=ac(x.acc);x.amt=(o.dir=="lent"?-1:1)*cv(amt,o.cur,A.cur);x.date=o.date;x.cat=(o.dir=="lent"?"Lent to ":"Borrowed from ")+who;x.ut=Date.now()}}
    o.closed=lOut(o)<=0.005;put("lend",o);done();toast("Saved")},
  lendDel(id,t){if(t.getAttribute("data-ok")!="1"){t.setAttribute("data-ok","1");t.textContent="Tap again to delete";return}S.tx.filter(x=>x.link&&x.link.t=="lend"&&x.link.id==id).map(x=>x.id).forEach(removeTx);trash("lend",id);done()},
  lendPay(id){const x=S.lend.find(q=>q.id==id),a=+v("lp_amt")||0;if(!x||!a)return toast("Enter the amount");const acc=v("lp_acc"),p={id:uid(),d:v("lp_date")||today(),a:Math.min(a,lOut(x)),acc};p.tx=lendTx(x,p.a,p.d,acc,"pay");
    x.pays=[...(x.pays||[]),p];x.closed=lOut(x)<=0.005;x.ut=Date.now();save();render();if(x.closed){sheet("");toast(x.person+" is settled")}else lendSheet(id)},
  lendPayDel(key){const [id,pid]=key.split("|"),x=S.lend.find(q=>q.id==id);if(!x)return;const p=(x.pays||[]).find(q=>q.id==pid);if(p&&p.tx)removeTx(p.tx);x.pays=(x.pays||[]).filter(q=>q.id!=pid);x.closed=false;x.ut=Date.now();save();render();lendSheet(id)},
  lendWa(id){const x=S.lend.find(q=>q.id==id);if(x)openExt(waLink(x))},
  epSave(){const E={...(S.cfg.ep||{}),note:v("ep_note").trim(),bal:v("ep_bal")=="1",contacts:[]};for(let j=0;j<10;j++){if(!$("#ec_n"+j))break;const n=v("ec_n"+j).trim(),p=v("ec_p"+j).trim();if(n||p)E.contacts.push({n,p})}S.cfg.ep=E;save();render();toast("Saved")},
  async epMake(){const pw=v("ep_pw");if(pw.length<6)return toast("Choose a password of 6 or more characters");ACT.epSave();const E=S.cfg.ep;const pdf=mkPdfLocked(epLines(!!E.bal),pw);
    const ok=await saveBin("family-emergency-pack-"+today()+".pdf",pdf,"application/pdf");if(ok!==false){S.cfg.ep={...E,at:today()};save();render()}}
});
{const _fab=ACT.fab;ACT.fab=function(...a){const r=_fab.apply(this,a);const g=$("#over .fgrid");if(g)g.insertAdjacentHTML("beforeend",fabTile("moiAdd","🎁","Moi gift")+fabTile("lendAdd","🤝","Hand loan")+fabTile("saAdd","🏤","Scheme account")+fabTile("famGo","👪","Family"));return r}}
{const _al=alerts;alerts=function(){let h=_al();const A=[];S.lend.forEach(x=>{if(!x.closed&&x.due&&lOut(x)&&dl(x.due)<=7)A.push((x.dir=="lent"?x.person+" to repay ":"Repay "+x.person+" ")+fmx(lOut(x),x.cur)+" · "+when(dl(x.due)))});
  S.moi.forEach(m=>{const n=dl(m.date);if(n>=0&&n<=7)A.push(m.person+": "+m.occ+" · "+when(n))});const E=S.cfg.ep;if(E&&E.at&&dl(E.at)<-365)A.push("Emergency pack is over a year old. Make a fresh copy in Family");
  if(!A.length)return h;const add=A.map(a=>`<div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px"><span>${esc(a)}</span></div>`).join("");
  return h?h.replace(/<\/div>$/,add+"</div>"):`<div class="card" style="border-color:var(--soon);background:var(--soonbg);margin:0 0 12px"><b>Needs attention</b>${add}</div>`}}
{const _vH=vHome;vHome=function(){const h=_vH(),o=S.lend.filter(x=>!x.closed&&x.dir=="lent").reduce((s,x)=>s+iv(lOut(x),x.cur),0),up=S.moi.filter(m=>m.date>=today()).sort((a,b)=>a.date.localeCompare(b.date))[0];
  return h+`<div class="card" style="margin-top:12px;cursor:pointer" data-act="famGo"><div class="hbl"><b>Family</b><span class="chip">Open</span></div><small style="color:var(--mute)">${[S.fam.length?S.fam.length+(S.fam.length==1?" person":" people"):"Add family members",o?"people owe you "+fm(o):"",up?"next: "+up.person+" "+up.occ.toLowerCase()+" "+when(dl(up.date)).toLowerCase():"","moi register, hand loans, emergency pack"].filter(Boolean).join(" · ")}</small></div>`}}
{const _vW=vWealth;vWealth=function(){const h=_vW();if(!S.fam.length)return h;const rows=[...S.fam.map(m=>[m.name,ownWorth(m.id),m.id]),["Family / joint",ownWorth(""),""]].filter(r=>Math.abs(r[1])>0.5);if(!rows.length)return h;
  return h+`<h2>By person</h2><div class="card">${rows.map(r=>`<div class="hbl" style="margin:6px 0;cursor:pointer" data-act="famView" data-id="${r[2]}"><span>${esc(r[0])}</span><b>${fm(r[1])}</b></div>`).join("")}</div>`}}
