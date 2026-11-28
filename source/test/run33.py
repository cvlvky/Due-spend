"""Card transaction lists without a balance column (made-up data), the minus-sign fix, wrong-sign entries, setting what you owe."""
import json,sys
sys.path.insert(0,'test')
from h import H
X=[38,158,265,482,605,725,845]
def line(y,cells):
  items=[{'x':x,'s':s,'w':len(s)*5.2} for x,s in cells if s]
  t='   '.join(i['s'] for i in items)
  return {'p':1,'y':y,'t':t,'items':items}
def row(y,d,pd,desc,loc,cur,a,q,typ):
  return line(y,[(X[0],d),(X[1],pd),(X[2],desc),(385,loc),(X[3],cur),(X[4],a),(X[5],q),(X[6],typ)])
L=[line(1000,[(38,'Transaction History')]),line(980,[(38,'4111 XXXX XXXX 4321')]),line(960,[(38,'Visa Classic - TEST USER')]),
 line(940,[(X[0],'Transaction date'),(X[1],'Processed date'),(X[2],'Transaction details'),(X[3],'Transaction currency'),(X[4],'Transaction amount'),(X[5],'QAR equivalent'),(X[6],'Type')]),
 row(920,'24/10/2026','UNBILLED','SPICE GARDEN REST','DOH DOHA QA','QAR','-12.50','-12.50','Unbilled'),line(910,[(X[2],'AUTH NO. 111111')]),
 row(895,'23/10/2026','24/10/2026','AL MEERA MARKET','DOHA QA AUTH','QAR','-40.25','-40.25','Billed'),line(885,[(X[2],'NO. 222222')]),
 row(870,'22/10/2026','22/10/2026','Credit Shield Insurance Fee','','QAR','-0.21','-0.21','Billed'),
 row(850,'21/10/2026','21/10/2026','Paid using bankDirect 211026K00001','','QAR','100.00','100.00','Payment/Refund'),
 row(830,'20/10/2026','21/10/2026','AMAZON MKTPLACE','SEATTLE US','USD','-10.00','-36.50','Billed'),line(820,[(X[2],'AUTH NO. 333333')]),
 row(805,'19/10/2026','20/10/2026','WOQOD - AL SADD PS DOHA 634 AUTH','','QAR','-60.00','-60.00','Carried Forward -'),line(795,[(X[2],'NO. 444444'),(X[6],'Unbilled')]),
 row(780,'18/10/2026','19/10/2026','CITY CENTER CINEMA','DOHA QA','QAR','25.00','25.00','Payment/Refund'),line(770,[(X[2],'AUTH NO. 555555')]),
 line(700,[(300,'Page 1 of 1')])]
h=H();ok=h.ok
try:
  c,pg=h.page(native=True);E=pg.evaluate
  ok('minus sign read once',E('[amtOf("-5.00"),amtOf("(5.00)"),amtOf("5.00 Cr"),amtOf("5.00 Dr"),amtOf("1,250.75")]')==[-5,-5,5,-5,1250.75])
  P=E('L=>{const p=stmtParse(L);return {nobal:p.nobal,open:p.open,close:p.close,l4:p.l4,rows:p.rows.map(r=>[r.date,r.dir,r.amt,stmtClean(r.desc).payee,r.fx||"",!!r.pend])}}',L)
  ok('no balance column found',P['nobal'] and P['open'] is None and P['close'] is None,P)
  ok('card number from the file',P['l4']=='4321')
  R=P['rows'];ok('7 rows oldest first',len(R)==7 and R[0][0]=='2026-10-18' and R[-1][0]=='2026-10-24',R)
  d={r[3]:r for r in R}
  ok('purchases out, payment and refund in',[r[1] for r in R]==['in','out','out','in','out','out','out'],[r[1] for r in R])
  ok('fee is money out even with "Credit" in the name',d.get('Credit Shield Insurance Fee',[0,0])[1]=='out')
  ok('names cleaned',all(k in d for k in ['Spice Garden Rest','Al Meera Market','Woqod - Al Sadd PS','City Center Cinema','bankDirect payment']),list(d))
  ok('foreign amount uses the QAR column',[r for r in R if r[0]=='2026-10-20'][0][2]==36.5 and [r for r in R if r[0]=='2026-10-20'][0][4]=='USD 10.00')
  ok('not billed yet marked',d['Spice Garden Rest'][5]==True)
  ok('bank statements with a balance column use the old reader',E('stmtCols([{x:38,s:"Date",w:20},{x:120,s:"Description",w:50},{x:300,s:"Debit",w:20},{x:380,s:"Credit",w:20},{x:460,s:"Balance",w:30}])')is None)
  # accounts: two QAR banks, a card
  E('S.acc.push({id:"cb",name:"CBQ main",type:"bank",cur:"QAR",open:1000,no:"9876"},{id:"tc",name:"Test card",type:"card",cur:"QAR",open:0,no:"4321"});save()')
  # chosen the wrong account: warned, one tap to switch
  E('L=>{const P=stmtParse(L);csvForm();setVal("f_acc","cb");stPend={acc:"cb",P,M:stmtMatch(P,"cb")};stmtShow()}',L)
  ok('warned that the file is for the card',"This file is for the card ending 4321" in pg.inner_text('#csvout'))
  pg.click('#csvout [data-act="stUseAcc"]');pg.wait_for_timeout(200);ok('switched to the card',E('stPend.acc')=='tc' and "This file is for" not in pg.inner_text('#csvout'))
  t=pg.inner_text('#csvout')
  ok('payment shown as from the bank',"Payment from CBQ main" in t,t[:800])
  ok('refund labelled',"Refund" in t)
  ok('asks what you owe',pg.locator('#csvout #f_owe').count()==1 and pg.locator('#csvout [data-act="stFixBal"]').count()==0)
  pg.click('#csvout [data-act="stImportGo"]');pg.wait_for_timeout(300)
  ok('payment saved as a transfer from the bank',E('S.tx.some(x=>x.kind=="tr"&&x.acc=="cb"&&x.to=="tc"&&x.amt==100)'))
  ok('refund saved as money in',E('S.tx.some(x=>x.acc=="tc"&&x.kind=="in"&&x.amt==25&&x.cat=="Refund")'))
  ok('foreign amount noted',E('(S.tx.find(x=>x.acc=="tc"&&x.amt==36.5)||{}).note')=='USD 10.00')
  ok('card balance from the rows',abs(E('bal(ac("tc"))')+24.46)<0.005,E('bal(ac("tc"))'))
  pg.fill('#f_owe','150');pg.click('#csvout [data-act="stSetBal"]');pg.wait_for_timeout(300)
  ok('card now shows 150 owed',abs(E('bal(ac("tc"))')+150)<0.005,E('bal(ac("tc"))'))
  a=E('S.tx.filter(x=>x.acc=="tc"&&x.kind=="adj").map(x=>[x.date,x.amt])');ok('opening worked out the day before the first row',a==[['2026-10-17',-125.54]],a)
  ok('bank lost only the payment',abs(E('bal(ac("cb"))')-900)<0.005)
  pg.fill('#f_owe','-150');pg.click('#csvout [data-act="stSetBal"]');pg.wait_for_timeout(300)
  ok('typing it with a minus means the same',abs(E('bal(ac("tc"))')+150)<0.005 and E('S.tx.filter(x=>x.acc=="tc"&&x.kind=="adj").length')==1)
  ok('the screen confirms',"you owe QAR 150" in pg.inner_text('#csvout') and "✓" in pg.inner_text('#csvout'))
  # importing the same file again adds nothing
  E('L=>{const P=stmtParse(L);stPend={acc:"tc",P,M:stmtMatch(P,"tc")};stmtShow()}',L)
  ok('second import adds nothing',"Everything in this statement is already in the app" in pg.inner_text('#csvout'))
  # wrong sign and a wrong-sign duplicate, as older versions saved them
  E('(()=>{const f=S.tx.find(x=>x.acc=="tc"&&x.amt==0.21);f.kind="in";S.tx.push({id:"dupx",kind:"out",acc:"tc",amt:100,cur:"QAR",date:"2026-10-21",payee:"PAID USING BANKDIRECT K QAR",cat:""});save()})()')
  E('L=>{const P=stmtParse(L);stPend={acc:"tc",P,M:stmtMatch(P,"tc"),T:-150};stmtShow()}',L)
  F=E('stFixRows(stPend,ac("tc")).map(f=>[f.op,f.x.amt])')
  ok('finds the flipped fee and the duplicate',['flip',0.21] in F and ['dup',100] in F,F)
  ok('flipped fee is not offered as new',E('stPend.M.res.filter(r=>!r.match&&!r.flip).length')==0)
  i_dup=[i for i,f in enumerate(F) if f[0]=='dup'][0]
  pg.uncheck('#csvout input[data-stf="%d"]'%i_dup);pg.click('#csvout [data-act="stFix"]');pg.wait_for_timeout(300)
  ok('only the ticked fix applied',E('S.tx.find(x=>x.acc=="tc"&&x.amt==0.21).kind')=='out' and E('S.tx.some(x=>x.id=="dupx")'))
  pg.click('#csvout [data-act="stFix"]');pg.wait_for_timeout(300)
  ok('duplicate removed',not E('S.tx.some(x=>x.id=="dupx")'))
  ok('what you owe kept after fixes',abs(E('bal(ac("tc"))')+150)<0.005,E('bal(ac("tc"))'))
  # older names from earlier imports
  ok('old raw names cleaned',E('stmtClean("UNBILLED SPICE GARDEN REST DOH DOHA QA QAR AUTH NO. 069000").payee')=='Spice Garden Rest' and E('stmtClean("WOQOD - AL SADD PS DOHA 634 AUTH QAR NO. 023000").payee')=='Woqod - Al Sadd PS')
  ok('bank-style names unchanged',E('stmtClean("TRANSFER - DEBIT,010126L00001,oct,ARUN KUMAR").payee')=='Arun Kumar')
finally:
  h.done()
