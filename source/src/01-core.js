"use strict";
/* ===== core: constants, state, small helpers ===== */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const K="due-and-spend.v1",DEFRATE=26,VER="35";
const COLLS=["acc","tx","dates","inv","loans","goals","bud","rec","docs","subs","sacc","tpl","fam","moi","lend","chq","trips","evts","shop","prices","notes","chal","pdays","gideas"],LOCAL=["cfg","nw","bin","del","mk","mkh"];
const blank=()=>({acc:[],tx:[],dates:[],inv:[],loans:[],goals:[],bud:[],rec:[],docs:[],subs:[],sacc:[],tpl:[],fam:[],moi:[],lend:[],bin:[],del:[],mk:null,mkh:{},nw:{},cfg:{rate:DEFRATE,view:"INR"}});
let S=blank(),tab="home",mon="",qs="",sstat="Sync off";

const TYPES={premium:"Premium",fd:"FD maturity",emi:"EMI",renewal:"Renewal"};
const REP={none:["Does not repeat",0],monthly:["Every month",1],quarterly:["Every 3 months",3],half:["Every 6 months",6],yearly:["Every year",12]};
const CATS=["Food","Travel","Bills","Shopping","Health","Rent","Other"];
const IK={fd:"Fixed deposit",mf:"Mutual fund",stock:"Stocks",ppf:"PPF / EPF",gold:"Gold",other:"Other"};
const ATYPE={bank:"Bank account",cash:"Cash",wallet:"Wallet",card:"Credit card"};
const KIND={out:"Spent",in:"Income",save:"Saved",adj:"Adjustment",tr:"Transfer"};
const TABS=[["home","Home"],["dates","Dues"],["invest","Wealth"],["acc","Accounts"],["spend","Spend"],["rep","Reports"]];
const CURS=[["INR","INR (₹)"],["QAR","QAR"]];

/* text and ids */
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-3);
const p2=n=>String(n).padStart(2,"0");
const same=(a,b)=>{a=String(a||"").trim().toLowerCase();b=String(b||"").trim().toLowerCase();return !!a&&!!b&&(a.includes(b)||b.includes(a))};

/* dates (all dates are local YYYY-MM-DD strings) */
const iso=d=>{const z=new Date(d.getTime()-d.getTimezoneOffset()*6e4);return z.toISOString().slice(0,10)};
const today=()=>iso(new Date());
const D=s=>new Date(s+"T00:00:00");
const dl=d=>Math.round((D(d)-D(today()))/864e5);
const addM=(s,n)=>{const d=D(s),day=d.getDate();d.setMonth(d.getMonth()+n);if(d.getDate()!==day)d.setDate(0);return iso(d)};
const addMon=(m,n)=>addM(m+"-01",n).slice(0,7);
const dim=m=>new Date(+m.slice(0,4),+m.slice(5),0).getDate();
const mEnd=m=>m+"-"+p2(dim(m));
const plus=n=>{const d=D(today());d.setDate(d.getDate()+n);return iso(d)};
const fmt=d=>D(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
const mlab=m=>D(m+"-01").toLocaleDateString("en-IN",{month:"short"});
const mlong=m=>D(m+"-01").toLocaleDateString("en-IN",{month:"long",year:"numeric"});
const when=n=>n<0?`${-n} ${n==-1?"day":"days"} overdue`:n==0?"Today":n==1?"Tomorrow":`In ${n} days`;
const cls=n=>n<0?"late":n<=7?"soon":"";

/* money */
const nf=(n,d=2)=>Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:d});
const fmx=(n,c)=>{n=+n||0;return (n<0?"−":"")+(c=="QAR"?"QAR ":"₹")+nf(Math.abs(n))};
const inr=n=>fmx(n,"INR");
const fx=()=>+S.cfg.rate||DEFRATE;
const cv=(n,f,t)=>{n=+n||0;f=f||"INR";t=t||"INR";return f==t?n:t=="INR"?n*fx():n/fx()};
const V=()=>S.cfg.view=="QAR"?"QAR":"INR";
const iv=(n,c)=>cv(n,c,V());
const fm=n=>fmx(n,V());
const fmr=n=>fmx(Math.round(+n||0),V());
const sh=n=>{n=+n||0;const a=Math.abs(n),s=n<0?"−":"";return s+(a>=1e7?(a/1e7).toFixed(1)+"Cr":a>=1e5?(a/1e5).toFixed(1)+"L":a>=1e3?Math.round(a/1e3)+"k":String(Math.round(a)))};
const pct=(a,b)=>b?Math.min(100,Math.max(0,Math.round(a/b*100))):0;

/* form and sheet helpers */
const F=(id,l,val,t,x)=>{t=t||"text";return `<label for="${id}">${l}</label><input id="${id}" type="${t}" ${t=="number"?'inputmode="decimal" step="any"':""} value="${esc(val??"")}" ${x||""}>`};
const SEL=(id,l,o,s,x)=>`<label for="${id}">${l}</label><select id="${id}" ${x||""}>${o.map(([k,t])=>`<option value="${esc(k)}" ${String(k)==String(s??"")?"selected":""}>${esc(t)}</option>`).join("")}</select>`;
const DL=(id,a)=>`<datalist id="${id}">${[...new Set(a)].filter(Boolean).slice(0,30).map(c=>`<option value="${esc(c)}"></option>`).join("")}</datalist>`;
const ACCS=()=>S.acc.map(k=>[k.id,k.name+" ("+k.cur+")"]);
const v=s=>{const e=$("#"+s);return e?e.value:""};
const btns=(sv,id,del)=>`<div class="acts"><button class="btn" data-act="${sv}" data-id="${id||""}">Save</button>${id&&del?`<button class="btn del" data-act="${del}" data-id="${id}">Delete</button>`:""}</div>`;
function sheet(h){$("#over").innerHTML=h?`<div class="back" data-act="close"><div class="sheet"><button class="x" data-act="closeX" aria-label="Close">✕</button>${h}</div></div>`:""}
let toastT=null,undoFn=null;
function toast(t,undo){undoFn=undo||null;$("#toast").innerHTML=`<div class="toast">${esc(t)}${undo?` <button class="btn sm" data-act="undo">Undo</button>`:""}</div>`;clearTimeout(toastT);toastT=setTimeout(()=>{$("#toast").innerHTML="";undoFn=null},undo?7000:2600)}

/* records */
const whoAmI=()=>{try{return me&&me.emailVerified&&me.email||""}catch(e){return ""}};
const stamp=(o,old)=>{o.ct=(old&&old.ct)||o.ct||Date.now();o.ut=Date.now();const w=whoAmI();if(w&&!o.by)o.by=w;return o};
function put(c,o){const i=S[c].findIndex(x=>x.id==o.id);if(i<0)S[c].push(o);else S[c][i]=o;return o}
function done(){save();sheet("");render()}
const stampNote=o=>o&&o.ct?`<p class="note">Added ${fmt(iso(new Date(o.ct)))}${o.ut&&o.ut-o.ct>60000?" · edited "+fmt(iso(new Date(o.ut))):""}</p>`:"";
