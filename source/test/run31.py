import json,sys
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
# A made-up statement laid out like a Qatar bank "Transaction History": newest first, signed amounts,
# same-day rows out of order, and long codes broken across lines.
def ln(t,items):return {'p':1,'y':0,'t':t,'items':items}
def row(date,desc,amt,bal):
  return ln(f"{date}   {desc}   {amt}   {bal}",[{'x':36,'s':date,'w':45},{'x':100,'s':desc,'w':len(desc)*4.4},{'x':300,'s':amt,'w':30},{'x':380,'s':bal,'w':35}])
def cont(t,full=False):return ln(t,[{'x':100,'s':t,'w':(118 if full else len(t)*4.4)}])
L=[ln("Date   Details   Amount   Balance",[{'x':36,'s':'Date','w':20},{'x':100,'s':'Details','w':30},{'x':300,'s':'Amount','w':30},{'x':380,'s':'Balance','w':35}]),
 row("22/11/2026","ATM CASH","-40.00","2,960.50"),cont("WITHDRAWAL,111122223333"),cont(",|1234 567890|,CITY MART"),cont("DOHA,11111XXXXXXX9999"),
 row("10/11/2026","TRANSFER TO OWN","-1,000.00","3,000.50"),cont("ACCOUNT,101126W00001,Tr",True),cont("ansfer To"),cont("4010XXXXX7007,TEST USER"),
 row("10/11/2026","CARD BILL","-20.00","4,000.50"),cont("PAYMENT,101126K00002,CA",True),cont("RD NO 4111XXXXXXXX0808"),cont("XXX9999,Paid using"),cont("bankDirect"),
 row("10/11/2026","SALARY TRANSFER,CIB-","4,000.00","4,020.50"),cont("00000001,SALARY FOR"),cont("XXX999,ACME TRADING"),
 row("03/11/2026","TRANSFER -","-80.00","20.50"),cont("DEBIT,031126L00003,oct,RAJ",True),cont("ESH KUMARAN"),
 row("01/11/2026","TRANSFER -","-900.00","100.50"),cont("DEBIT,011126L00004,NOV"),cont("rent,ABDUL RAHMAN AL"),cont("SAYED")]
try:
  c,pg=h.page();E=pg.evaluate
  P=E('(L=>{const p=stmtParse(L);return {open:p.open,close:p.close,chain:p.chain,rows:p.rows.map(r=>[r.date,r.dir,r.amt,r.bal,stmtClean(r.desc)])}})(%s)'%json.dumps(L))
  ok('closing balance is the newest row, not the last line',abs(P['close']-2960.5)<0.001,P['close'])
  ok('opening balance before the oldest row',abs(P['open']-1000.5)<0.001,P['open'])
  ok('rows put in real order by following the balance',P['chain'] and [r[3] for r in P['rows']]==[100.5,20.5,4020.5,4000.5,3000.5,2960.5],[r[3] for r in P['rows']])
  ok('direction from the sign',[r[1] for r in P['rows']]==['out','out','in','out','out','out'])
  C=[r[4] for r in P['rows']]
  ok('words split by the bank joined back',C[1]['payee']=='Rajesh Kumaran' and C[1]['note']=='oct',C[1])
  ok('wrapped names keep their space',C[0]['payee']=='Abdul Rahman Al Sayed' and C[0]['note']=='NOV rent',C[0])
  ok('salary payer',C[2]['payee']=='Acme Trading' and C[2]['cat']=='Salary',C[2])
  ok('own transfer, card bill and ATM recognised',C[4]['hint']=='own' and C[4]['l4']=='7007' and C[3]['hint']=='card' and C[3]['l4']=='0808' and C[5]['hint']=='atm' and C[5]['payee']=='ATM · City Mart Doha',[C[3],C[4],C[5]])
  # import into the app: transfers where the other account exists, opening balance set at the start
  E('S.acc.push({id:"qb",name:"QB Main",type:"bank",cur:"QAR",open:0},{id:"q7",name:"QB 7007",type:"bank",cur:"QAR",open:0,l4:"7007"},{id:"qc",name:"Wallet",type:"cash",cur:"QAR",open:0});save()')
  E('(L=>{const P=stmtParse(L);stPend={acc:"qb",P,M:stmtMatch(P,"qb")};document.body.insertAdjacentHTML("beforeend","<div id=\\"csvout\\"></div>");stmtShow()})(%s)'%json.dumps(L))
  E('document.querySelectorAll("#csvout input[data-sti]").forEach(c=>c.checked=true);ACT.stImportGo()');pg.wait_for_timeout(300)
  T=E('S.tx.filter(x=>x.acc=="qb").map(x=>[x.kind,x.amt,x.to||"",x.payee||x.note||""])')
  ok('own transfer and ATM become transfers',['tr',1000,'q7','Own account 7007'] in T and ['tr',40,'qc','ATM · City Mart Doha'] in T,T)
  ok('card bill stays spending when the card is not in the app',any(t[0]=='out' and t[1]==20 for t in T))
  E('ACT.stFixBal()');pg.wait_for_timeout(200)
  ok('balance matches the statement',abs(E('bal(ac("qb"))')-2960.5)<0.001,E('bal(ac("qb"))'))
  ok('opening correction dated before the first row',E('S.tx.filter(x=>x.acc=="qb"&&x.kind=="adj").map(x=>[x.date,x.amt])')==[['2026-10-31',1000.5]])
  # a wrong earlier correction is replaced, not added to
  E('addTx({kind:"adj",acc:"qb",amt:-300,cur:"QAR",date:"2026-11-22",cat:"Balance correction",note:"Matched to the bank statement"});save()')
  E('stPend.M=stmtMatch(stPend.P,"qb");ACT.stFixBal()');pg.wait_for_timeout(200)
  ok('old wrong correction removed',abs(E('bal(ac("qb"))')-2960.5)<0.001 and E('S.tx.filter(x=>x.acc=="qb"&&x.kind=="adj").length')==1)
  # entries imported the old way get fixed
  E('S.acc.push({id:"q8",name:"QB Card",type:"card",cur:"QAR",open:0,l4:"0808"});const x=S.tx.find(t=>t.acc=="qb"&&t.kind=="out"&&t.amt==20);x.payee="CARD BILL PAYMENT, K ,CA";save();stPend.M=stmtMatch(stPend.P,"qb");stmtShow()')
  ok('fix offered for old entries',E('document.querySelector("#csvout").innerText.includes("Spending → transfer to QB Card")'))
  E('ACT.stFix()');pg.wait_for_timeout(200);ok('card bill turned into a transfer',E('S.tx.some(t=>t.acc=="qb"&&t.kind=="tr"&&t.to=="q8"&&t.amt==20)'))
  ok('balance still right',abs(E('bal(ac("qb"))')-2960.5)<0.001)
  # oldest-first statements still work as before
  L2=[L[0],row("01/11/2026","SHOP","-10.00","90.00"),row("02/11/2026","SALARY","500.00","590.00")]
  P2=E('(L=>{const p=stmtParse(L);return [p.open,p.close]})(%s)'%json.dumps(L2));ok('oldest-first statement',P2==[100,590],P2)
finally:
  h.done()
