"""Bank statements whose descriptions start above the date line (Axis style), footers, family names (made-up data)."""
import json,sys,copy
sys.path.insert(0,'test')
from h import H
def ln(y,cells,p=1):
  items=[{'x':x,'s':s,'w':len(s)*4.6} for x,s in cells if s]
  return {'p':p,'y':y,'t':'   '.join(i['s'] for i in items),'items':items}
def row(y,d,desc,dr,cr,bal):return ln(y,[(40,d),(120,desc),(330,dr),(400,cr),(470,bal),(540,'891')])
def pre(y,t):return ln(y,[(120,t)])
L=[ln(600,[(40,'TEST USER')]),ln(583,[(40,'Tran Date'),(90,'Chq No'),(160,'Particulars'),(330,'Debit'),(400,'Credit'),(470,'Balance'),(540,'Init.')]),ln(574,[(540,'Br')]),
 ln(554,[(120,'OPENING BALANCE'),(470,'10000.00')]),
 pre(541,'IMPS/P2A/600000000001/TESTUSER/FEDERA'),row(532,'10-09-2026','LB/RDAMaste/9199999999999049000','','50000.00','60000.00'),
 pre(519,'UPI/P2A/700000000002/KKAVYA'),row(510,'11-09-2026','/Paymen/AXIS BANK','20000.00','','40000.00'),
 pre(497,'UPI/P2M/700000000003/TANGEDCO'),row(488,'21-09-2026','/TANGED/INDIAN BANK','845.00','','39155.00'),
 pre(475,'SB:900000000000001:Int.Pd:01-07-2026 to 30-'),row(466,'01-10-2026','09-2026','','101.00','39256.00'),
 pre(453,'UPI/P2A/700000000005/RAMESH KUMAR A'),row(444,'08-10-2026','/Paymen/State Bank Of India','5000.00','','34256.00'),
 pre(431,'UPI/P2A/700000000006/RAMESH KUMAR A'),row(422,'09-10-2026','/Paymen/State Bank Of India','2000.00','','32256.00'),
 pre(409,'UPI/P2M/700000000007/VODAFONE IDEA'),row(400,'31-10-2026','LIMITED/Paymen/HSBC','1849.00','','30407.00'),
 pre(387,'UPI/P2A/700000000008/KKAVYA'),row(378,'23-11-2026','/Paymen/AXIS BANK','10000.00','','20407.00'),
 ln(360,[(120,'TRANSACTION TOTAL'),(330,'39694.00'),(400,'50101.00')]),ln(345,[(120,'CLOSING BALANCE'),(470,'20407.00')]),
 ln(320,[(40,'he/she has found the account correct.')]),ln(300,[(40,'CWDR-Cash Withdrawal through ATM')]),ln(557,[(40,'VMT-Visa Money Transfer through ATM')],p=2)]
h=H();ok=h.ok
try:
  c,pg=h.page(native=True);E=pg.evaluate
  E('S.fam=[{id:"k1",name:"Kavya",rel:"spouse"}];S.acc.push({id:"nr",name:"Test NRE",type:"bank",cur:"INR",open:0,l4:"7777"},{id:"cw",name:"Home cash",type:"cash",cur:"INR",open:0});save()')
  P=E('L=>{const p=stmtParse(L);return {open:p.open,close:p.close,chain:p.chain,rows:p.rows.map(r=>{const k=stmtClean(r.desc);return [r.date,r.dir,r.amt,k.payee,stCat(k,r,ac("nr")),k.hint,r.desc]})}}',L)
  R=P['rows'];ok('opening, closing and order',P['open']==10000 and P['close']==20407 and P['chain'] and len(R)==8,P)
  ok('each entry keeps its own description',[r[3] for r in R]==['Remittance · Federal Bank','Kavya','Tangedco','Interest','Ramesh Kumar A','Ramesh Kumar A','Vodafone Idea Limited','Kavya'],[r[3] for r in R])
  ok('categories from the right text',[r[4] for r in R]==['Money sent home','Family','Bills','Interest','','','Bills','Family'],[r[4] for r in R])
  ok('footer and legends stay out of the last entry',R[-1][5]=='' and 'ATM' not in R[-1][6] and 'correct' not in R[-1][6],R[-1])
  ok('broken words joined',any(r[6].startswith('IMPS/P2A/600000000001/TESTUSER/FEDERALB/RDAMaste') or r[6].startswith('IMPS/P2A/600000000001/TESTUSER/FEDERA LB/RDAMaste') for r in R),R[0][6])
  L2=copy.deepcopy(L)
  for l in L2:l.pop('y',None)
  ok('files without positions still read',E('L=>stmtParse(L).rows.length',L2)==8)
  # import: the last one stays a payment even though a cash wallet exists
  E('L=>{const P=stmtParse(L);csvForm();setVal("f_acc","nr");stPend={acc:"nr",P,M:stmtMatch(P,"nr")};stmtShow()}',L)
  t=pg.inner_text('#csvout');ok('Ramesh paid twice: offered as family',"Paid to people more than once" in t and "Ramesh Kumar A" in t,t[:900])
  pg.click('#csvout [data-act="stImportGo"]');pg.wait_for_timeout(300)
  T=E('S.tx.filter(x=>x.acc=="nr"&&x.kind!="adj").sort((a,b)=>a.date.localeCompare(b.date)).map(x=>[x.date,x.kind,x.payee||"",x.cat||""])')
  ok('23 Nov is a payment to Kavya, not cash',T[-1]==['2026-11-23','out','Kavya','Family'],T)
  ok('cash wallet untouched',abs(E('bal(ac("cw"))'))<0.01)
  # add Ramesh to Family from the preview: his payments are relabelled
  pg.click('#csvout [data-act="stFamOpen"][data-id="Ramesh Kumar A"]');ok('family form with the name',pg.input_value('#f_stfn')=='Ramesh Kumar A')
  pg.fill('#f_stfn','Teacher');pg.click('#csvout [data-act="stFamSave"]');ok('name must be part of the bank name',not E('S.fam.some(m=>m.name=="Teacher")'))
  pg.fill('#f_stfn','Ramesh');pg.select_option('#f_stfr','father');pg.click('#csvout [data-act="stFamSave"]');pg.wait_for_timeout(300)
  ok('added to family',E('S.fam.some(m=>m.name=="Ramesh"&&m.rel=="father")'))
  F=E('stFixRows(stPend,ac("nr")).map(f=>[f.op,f.k.payee,stCat(f.k,f.r,ac("nr"))])');ok('his payments offered as Family',F.count(['name','Ramesh','Family'])==2,F)
  pg.click('#csvout [data-act="stFix"]');pg.wait_for_timeout(300)
  ok('relabelled',E('S.tx.filter(x=>x.acc=="nr"&&x.payee=="Ramesh"&&x.cat=="Family").length')==2)
  # an older import that took the next entry's name and read the footer as a cash withdrawal
  E('''L=>{S.acc.push({id:"od",name:"Old NRE",type:"bank",cur:"INR",open:0});const R=stmtParse(L).rows;R.forEach((r,i)=>{const nx=R[i+1],od=nx?"/Paymen/AXIS BANK "+nx.desc:"/Paymen/AXIS BANK he/she has found the account correct. CWDR-Cash Withdrawal through ATM",k=stmtClean(od);
     if(!nx){S.tx.push({id:"od"+i,kind:"tr",acc:"od",to:"cw",amt:r.amt,got:r.amt,fee:0,cur:"INR",date:r.date,note:k.payee,raw:od,imp:"imp_o"});return}
     S.tx.push({id:"od"+i,kind:r.dir=="in"?"in":"out",acc:"od",amt:r.amt,cur:"INR",date:r.date,payee:k.payee,cat:/VODAFONE|TANGEDCO/.test(od)?"Bills":"",raw:od.slice(0,160),imp:"imp_o"})});
     S.tx.push({id:"odo",kind:"adj",acc:"od",amt:10000,cur:"INR",date:"2026-09-09",cat:"Balance correction",note:"Opening balance from the bank statement"});save()}''',L)
  ok('old import: cash wallet got 10,000',abs(E('bal(ac("cw"))')-10000)<0.01)
  E('L=>{const P=stmtParse(L);stPend={acc:"od",P,M:stmtMatch(P,"od")};stmtShow()}',L)
  t=pg.inner_text('#csvout');ok('repair offered',"Not a cash withdrawal or transfer" in t and "Names and categories from the bank’s text" in t,t[:900])
  pg.click('#csvout [data-act="stFix"]');pg.wait_for_timeout(300)
  T=E('S.tx.filter(x=>x.acc=="od"&&x.kind!="adj").sort((a,b)=>a.date.localeCompare(b.date)).map(x=>[x.date,x.kind,x.payee||"",x.cat||""])')
  ok('names and categories repaired',[r[2] for r in T]==['Remittance · Federal Bank','Kavya','Tangedco','Interest','Ramesh','Ramesh','Vodafone Idea Limited','Kavya'] and [r[3] for r in T]==['Money sent home','Family','Bills','Interest','Family','Family','Bills','Family'],T)
  ok('cash withdrawal undone',T[-1][1]=='out' and abs(E('bal(ac("cw"))'))<0.01 and abs(E('bal(ac("od"))')-20407)<0.01)
  # statement list shows who it was
  E('stmt(ac("od"))');t=pg.inner_text('#over');ok('statement list shows names',"Kavya" in t and "Family · 23 Nov 2026" in t and "Remittance · Federal Bank" in t,t[:400])
finally:
  h.done()
