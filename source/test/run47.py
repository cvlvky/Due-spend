"""Version 37: a bank statement makes the app match the bank exactly (all made-up data).
A Qatar-bank-style savings statement (newest first, descriptions under the date line and broken mid-word, same-day lines out of order)
and a card "Transaction History" without a balance column, both as real PDFs, against an app with the usual mistakes:
a card bill saved with a slightly different amount, spending that is really a transfer, transfers to the wrong account,
an entry the bank doesn't have, names taken from the neighbouring line, old corrections, a payment saved twice on the card, a card alert."""
import json,sys
sys.path.insert(0,'test')
from h import H
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth

FS=8.5;COLW=138
def wrap(text):
  """the bank's own wrapping: whole words while they fit, a word too long for a line is cut where the line ends"""
  out=[];cur=''
  for w in text.split(' '):
    t=(cur+' '+w) if cur else w
    if stringWidth(t,'Helvetica',FS)<=COLW:cur=t;continue
    if cur:out.append(cur);cur=''
    while stringWidth(w,'Helvetica',FS)>COLW:
      i=len(w)
      while stringWidth(w[:i],'Helvetica',FS)>COLW:i-=1
      out.append(w[:i]);w=w[i:]
    cur=w
  if cur:out.append(cur)
  return out
# newest first; same-day lines in the bank's own (not running) order; balances follow the real order
SAV=[('29/11/2026','CARD BILL PAYMENT,281126K90001,CARD NO 4111XXXXXXXX0808XXX9999,Paid using bankDirect','-250.50','2,429.25'),
 ('22/11/2026','ATM CASH WITHDRAWAL,632500000001 ,|4900 500000|,TEST MART SUPER MKT DOHA,52000XXXXXXX1111 21/11 18.44','-50.00','2,679.75'),
 ('09/11/2026','TRANSFER TO OWN ACCOUNT,091126W00003,Transfer To 4000XXXXX0009,TEST USER','-3,000.00','2,990.00'),
 ('09/11/2026','TRANSFER TO OWN ACCOUNT,091126W00002,Transfer To 4000XXXXX0009,TEST USER','-10.00','5,990.00'),
 ('09/11/2026','TRANSFER TO OWN ACCOUNT,091126W00001,Transfer To 4000XXXXX0009,TEST USER','-100.00','6,000.00'),
 ('09/11/2026','NAPS ATM,631300000001,| 4000 000001 1AB000NW|,SAMPLE ISLAMIC BANK DOHA,52000XXXXXXX1111 09/11 17.13,63400000000','-200.00','2,729.75'),
 ('09/11/2026','CARD BILL PAYMENT,091126K90002,CARD NO 4111XXXXXXXX0808XXX9999,Paid using bankDirect','-60.25','2,929.75'),
 ('09/11/2026','SALARY TRANSFER,CIB-00000001,SALARY FOR XXX000,BO SAMPLE CONTRACTING CO,QA00TEST 0000XXXXXXXXXXXXX0005','6,000.00','6,100.00'),
 ('02/11/2026','TRANSFER - DEBIT,021126L00001,oct,TEST PERSON ONE','-100.00','100.00'),
 ('31/10/2026','TRANSFER - DEBIT,301026L00002,NOV rent,SAMPLE LANDLORD NAME HERE','-1,000.00','200.00')]
def savings_pdf(path):
  c=canvas.Canvas(path,pagesize=(595,842));c.setFont('Helvetica-Bold',11);c.drawString(74,752.76,'Transaction History');c.setFont('Helvetica',FS)
  c.drawString(74,730.3,'4000000000005');c.drawString(74,710.1,'SAVINGS ACCOUNT - TEST USER')
  for x,s in [(74,'Date'),(172.94,'Details'),(316.73,'Amount'),(439.2,'Balance')]:c.drawString(x,682.6,s)
  y=664.6
  for d,desc,amt,bal in SAV:
    L=wrap(desc);c.drawString(74,y,d);c.drawString(172.94,y,L[0]);c.drawString(316.73,y,amt);c.drawString(439.2,y,bal)
    for l in L[1:]:y-=11.16;c.drawString(172.94,y,l)
    y-=15.12
  c.save()
X=[38,157.68,264.7,482,605,725,845]
CARD=[('28/11/2026','28/11/2026',['Paid using bankDirect 281126K90001'],'250.50','Payment/Refund'),
 ('27/11/2026','UNBILLED',['NEW TEST SUPERMARKET W NEW','TEST SU QA AUTH NO. 000001'],'-20.10','Unbilled'),
 ('27/11/2026','UNBILLED',['EVERY DAY DISCOUNT CENTE DOHA QA','AUTH NO. 000002'],'-10.00','Unbilled'),
 ('27/11/2026','28/11/2026',['SAMPLE GRILL HOUSE DOH DOHA QA','AUTH NO. 000003'],'-12.00','Billed'),
 ('26/11/2026','27/11/2026',['TEST CAFE   DOH DOHA QA','AUTH NO. 000004'],'-5.00','Billed'),
 ('19/11/2026','19/11/2026',['Credit Shield Insurance Fee'],'-0.13','Billed'),
 ('19/11/2026','20/11/2026',['TEST CITY FOOD RES DOHA QA','AUTH NO. 000005'],'-30.00','Carried Forward - Unbilled'),
 ('09/11/2026','09/11/2026',['Paid using bankDirect 091126K90002'],'60.25','Payment/Refund'),
 ('08/11/2026','09/11/2026',['SAMPLE TRAVEL N TOURISM DOHA QA','AUTH NO. 000006'],'-400.00','Billed'),
 ('06/11/2026','07/11/2026',['TEST FUEL - AL TEST PS DOHA 634','AUTH NO. 000007'],'-45.00','Billed'),
 ('05/11/2026','06/11/2026',['TEST GROCERY DOH DOHA QA AUTH','NO. 000008'],'-15.25','Billed')]
def card_pdf(path):
  c=canvas.Canvas(path,pagesize=(950,1060));c.setFont('Helvetica',8.5);c.drawString(38,1017.7,'Transaction History');c.drawString(38,996.1,'4111 XXXX XXXX 0808');c.drawString(38,975.9,'Visa Classic - TEST USER')
  for x,s in zip(X,['Transaction date','Processed date','Transaction details','Transaction currency','Transaction amount','QAR equivalent','Type']):c.drawString(x,948.9,s)
  y=926.5
  for d,pd,desc,amt,typ in CARD:
    for x,s in zip(X,[d,pd,desc[0],'QAR',amt,amt,typ]):c.drawString(x,y,s)
    for l in desc[1:]:y-=11.16;c.drawString(X[2],y,l)
    y-=15.12
  c.save()
savings_pdf('/tmp/v37sav.pdf');card_pdf('/tmp/v37card.pdf')

SETUP='''()=>{S.cfg.pdfjsBase="pdfjs/";S.acc.push({id:"sv",name:"CBQ Test Savings",type:"bank",cur:"QAR",open:0},{id:"tc",name:"Test Card",type:"card",cur:"QAR",open:100,l4:"0808",lim:3000},{id:"ax",name:"Test NRI",type:"bank",cur:"INR",open:0,l4:"9"});
  const T=o=>S.tx.push({ct:Date.now(),ut:Date.now(),fx:1,cur:"QAR",...o});
  T({id:"e_rent",kind:"out",acc:"sv",amt:1000,date:"2026-10-31",payee:"Sample Landlord Name Here",cat:"Rent",note:"NOV rent",imp:"i0",raw:"TEST PERSON ONE TRANSFER - DEBIT,301026L00002,NOV rent,SAMPLE LANDLORD NAME HERE"});
  T({id:"e_oct",kind:"out",acc:"sv",amt:100,date:"2026-11-02",payee:"Oct",cat:"",imp:"i0",raw:"SAMPLE CONTRACTING CO,QA00TEST 0000XXXXXXXXXXXXX0005 TRANSFER - DEBIT,021126L00001,oct,TES"});
  T({id:"e_sal",kind:"in",acc:"sv",amt:6000,date:"2026-11-09",payee:"Bo Sample Contracting Co",cat:"Salary",imp:"i0",raw:"XXX9999,Paid using bankDirect SALARY TRANSFER,CIB-00000001,SALARY FOR XXX000,BO SAMPLE CONTRACTING CO"});
  T({id:"e_o1",kind:"tr",acc:"sv",to:"ax",amt:100,got:2280,date:"2026-11-09",note:"Own account 0009",imp:"i0",raw:"4000XXXXX0009,TEST USER TRANSFER TO OWN ansfer To"});
  T({id:"e_o2",kind:"tr",acc:"sv",to:"ax",amt:10,got:228,date:"2026-11-09",note:"Own account 0009",imp:"i0",raw:"4000XXXXX0009,TEST USER TRANSFER TO OWN ansfer To"});
  T({id:"e_o3",kind:"out",acc:"sv",amt:3000,date:"2026-11-09",payee:"Own account 1111",cat:"Own account transfer",imp:"i0",raw:"DOHA,52000XXXXXXX1111 TRANSFER TO OWN ansfer To"});
  T({id:"e_cb1",kind:"out",acc:"sv",amt:60.25,date:"2026-11-09",payee:"Card bill 1111",cat:"Card bill",imp:"i0",raw:"DOHA,52000XXXXXXX1111 CARD BILL PAYMENT,091126K90002,CARD NO 4111XXXXX"});
  T({id:"e_atm1",kind:"out",acc:"sv",amt:200,date:"2026-11-09",payee:"ATM",cat:"Cash withdrawal"});
  T({id:"e_atm2",kind:"out",acc:"sv",amt:50,date:"2026-11-22",payee:"ATM",cat:"Cash withdrawal"});
  T({id:"e_fuel",kind:"out",acc:"sv",amt:45.30,date:"2026-11-22",payee:"Test Fuel Station",cat:"Fuel"});
  T({id:"e_pop",kind:"tr",acc:"sv",to:"tc",amt:250.40,got:250.40,date:"2026-11-28",note:"Card bill paid"});
  T({id:"a_open",kind:"adj",acc:"sv",amt:1200,date:"2026-10-30",cat:"Balance correction",note:"Opening balance from the bank statement"});
  T({id:"a_fix",kind:"adj",acc:"sv",amt:45.20,date:"2026-11-28",cat:"Balance correction",note:"Matched to the bank statement"});
  T({id:"k_pay1",kind:"in",acc:"tc",amt:60.25,date:"2026-11-09",payee:"bankDirect payment",cat:"Card payment",imp:"i1"});
  T({id:"k_food",kind:"out",acc:"tc",amt:20.10,date:"2026-11-27",payee:"",cat:"Food"});
  T({id:"k_spent",kind:"out",acc:"tc",amt:12,date:"2026-11-27",payee:"Spent",cat:""});
  T({id:"k_pay2",kind:"in",acc:"tc",amt:250.50,date:"2026-11-28",payee:"Payment received",cat:"Card payment"});
  T({id:"k_a1",kind:"adj",acc:"tc",amt:30,date:"2026-11-27",cat:"Balance correction",note:"Matched to the bank"});
  T({id:"k_a2",kind:"adj",acc:"tc",amt:-14,date:"2026-11-04",cat:"Balance correction",note:"Opening balance worked out from the balance now"});
  S.cfg.cardBank={tc:{avl:2522.77,t:new Date(2026,10,27,19,14).getTime(),src:"SMS"}};
  S.cfg.smsq=[{id:"w1",from:"SMS · TESTBANK",body:"Card 0808 used for QAR 5.00 at TEST CAFE",time:new Date(2026,10,26,12,0).getTime(),p:{acc:"tc",amt:5,kind:"out",cur:"QAR",date:"2026-11-26",payee:"Test Cafe"}}];save()}'''
h=H();ok=h.ok
def load(pg,path,acc):
  pg.evaluate('id=>{csvForm();setVal("f_acc",id)}',acc);pg.set_input_files('#f_csv',path);pg.wait_for_function('stPend&&stPend.M&&document.querySelector("#csvout .card")',timeout=25000)
B=lambda E,i:E('Math.round(bal(ac("%s"))*100)/100'%i)
try:
  c,pg=h.page(native=True);E=pg.evaluate
  # ---------- helpers ----------
  ok('card names: repeated tail cut, cut-short words finished',E('[stTidy("NEW TEST SUPERMARKET W NEW TEST SU"),stTidy("EVERY DAY DISCOUNT CENTE"),stTidy("TEST CITY FOOD RES"),stTidy("LULU HYPERMARKET LULU"),stTidy("TEST RESTAURANT")]')==['NEW TEST SUPERMARKET','EVERY DAY DISCOUNT CENTER','TEST CITY FOOD RESTAURANT','LULU HYPERMARKET',"TEST RESTAURANT"])
  ok('the card number after CARD NO, even run together with the next number',E('stL4("CARD BILL PAYMENT,091126K90002,CARD NO 4111XXXXXXXX0808XXX9999,Paid using bankDirect")')=='0808')
  ok('the account after Transfer To, not the debit card in the same text',E('stL4("NAPS ATM,52000XXXXXXX1111 TRANSFER TO OWN ACCOUNT,Transfer To 4000XXXXX0009")')=='0009')
  ok('bank reference read',E('stRef("Paid using bankDirect 281126K90001")')=='281126K90001')
  E('S.acc.push({id:"z1",name:"Short",type:"bank",cur:"QAR",open:0,l4:"9"});save()')
  ok('a saved "9" does not catch every number ending in 9',E('acc4("0009",null)')is None)
  E('S.acc.find(a=>a.id=="z1").l4="0009";save()');ok('the exact last 4 digits do',E('(acc4("0009",null)||{}).id')=='z1')
  E('S.acc=S.acc.filter(a=>a.id!="z1");save()')
  # ---------- the savings statement, read from the PDF ----------
  E(SETUP)
  ok('start: the app shows the bank’s closing only because of a correction',abs(B(E,'sv')-2429.25)<0.005,B(E,'sv'))
  load(pg,'/tmp/v37sav.pdf','sv')
  P=E('({open:stPend.P.open,close:stPend.P.close,rows:stPend.P.rows.map(r=>[r.date,r.dir,r.amt,r.desc])})')
  R=P['rows'];ok('opening, closing and 10 lines in the real order',P['open']==1200 and P['close']==2429.25 and len(R)==10 and R[2][2]==6000 and R[3][2]==100 and R[5][2]==3000,[(r[0],r[2]) for r in R])
  D={r[2]:r[3] for r in R}
  ok('each line keeps its own description, none of the next one',D[100.0]!='' and all(D[a].startswith(p) for a,p in [(1000,'TRANSFER - DEBIT,301026L00002,NOV rent,SAMPLE'),(6000,'SALARY TRANSFER'),(3000,'TRANSFER TO OWN ACCOUNT,091126W00003,Transfer To 4000XXXXX0009'),(60.25,'CARD BILL PAYMENT,091126K90002,CARD NO 4111'),(200,'NAPS ATM'),(50,'ATM CASH WITHDRAWAL'),(250.5,'CARD BILL PAYMENT,281126K90001')]),D)
  ok('a word broken across lines is joined',[r[3] for r in R if r[2]==100 and 'own' not in r[3].lower()][0]=='TRANSFER - DEBIT,021126L00001,oct,TEST PERSON ONE' and 'Transfer To' in D[10.0],[r[3] for r in R if r[2] in (100,10)])
  K=E('stPend.P.rows.map(r=>{const k=stmtClean(r.desc);return [r.amt,k.payee,k.note,k.hint,k.l4]})');KD={k[0]:k for k in K}
  ok('payee and note from the bank’s text',KD[1000][1]=='Sample Landlord Name Here' and KD[1000][2]=='NOV rent' and KD[6000][1]=='Sample Contracting Co',KD)
  ok('own account and card bill read with the right numbers',KD[3000][3:]==['own','0009'] and KD[60.25][3:]==['card','0808'] and KD[250.5][3:]==['card','0808'])
  t=pg.inner_text('#csvout')
  ok('the check lists what is wrong',all(s in t for s in ['10 in the app','saved twice' if False else 'to fix','not in the statement','old corrections','Make it match the bank']),t[:700])
  F=E('stFixRows(stPend,ac("sv")).map(f=>[f.op,f.x.id])');ops={x[1]:x[0] for x in F}
  ok('fixes: card bill amount, card bill as a transfer, names',ops.get('e_pop')=='amt' and ops.get('e_cb1')=='tr' and ops.get('e_oct')=='name' and ops.get('e_sal')=='name',F)
  ok('the card’s own “Card payment” entry is merged into the transfer',E('(stFixRows(stPend,ac("sv")).find(f=>f.x.id=="e_cb1")||{}).e?.id')=='k_pay1')
  ok('entry the bank doesn’t have: listed, set to Remove',E('stPend.M.only.map(x=>x.id)')==['e_fuel'] and pg.input_value('#csvout select[data-sto="e_fuel"]')=='del')
  ok('old corrections listed and ticked',pg.locator('#csvout input[data-stc]:checked').count()==2)
  ok('own account ending 0009 missing: said, with what it is saved as now',"Your own account ending 0009" in t and "2 × a transfer to Test NRI" in t,t[t.find('Your own'):t.find('Your own')+300])
  ok('after this, the balance matches (shown before doing it)',"the bank says QAR 2,429.25 ✓" in E('document.querySelector("#stproj").innerText'),E('document.querySelector("#stproj").innerText'))
  before=E('JSON.stringify({tx:S.tx.map(x=>[x.id,x.kind,x.acc,x.to||"",x.amt,x.payee||""]).sort(),acc:S.acc.map(a=>[a.id,a.open])})')
  pg.click('#csvout [data-act="stAll"]');pg.wait_for_timeout(500);t=pg.inner_text('#csvout')
  ok('one tap: matches the bank',"✓ Matches the bank" in t and abs(E('balAt("sv","2026-11-29")')-2429.25)<0.005,t[:500])
  ok('opening from the bank, as the account’s own opening (nothing older in the app)',E('ac("sv").open')==1200 and not E('S.tx.some(x=>x.acc=="sv"&&x.kind=="adj")'))
  ok('card bill amount put right, one transfer each, card payment merged',E('S.tx.filter(x=>x.kind=="tr"&&x.acc=="sv"&&x.to=="tc").map(x=>x.amt).sort((a,b)=>a-b)')==[60.25,250.5] and not E('S.tx.some(x=>x.id=="k_pay1")'))
  ok('removed entries go to the bin',E('S.bin.some(b=>b.r.id=="e_fuel")') and not E('S.tx.some(x=>x.id=="e_fuel")'))
  ok('names from the bank',E('[ac("sv").id&&S.tx.find(x=>x.id=="e_oct").payee,S.tx.find(x=>x.id=="e_oct").note,S.tx.find(x=>x.id=="e_sal").payee,S.tx.find(x=>x.id=="e_sal").cat]')==['Test Person One','oct','Sample Contracting Co','Salary'])
  ok('next step said: add the own account',"Next: add your own account ending 0009" in t)
  # undo puts every entry and account back, then again
  pg.click('#csvout [data-act="stUndoAll"]');pg.wait_for_timeout(300)
  ok('undo: exactly as before',E('JSON.stringify({tx:S.tx.map(x=>[x.id,x.kind,x.acc,x.to||"",x.amt,x.payee||""]).sort(),acc:S.acc.map(a=>[a.id,a.open])})')==before)
  pg.click('#csvout [data-act="stAll"]');pg.wait_for_timeout(500)
  ok('done again',abs(B(E,'sv')-2429.25)<0.005 and abs(E('balAt("sv","2026-10-30")')-1200)<0.005)
  # the own account: add it, the transfers move to it
  pg.click('#csvout [data-act="stAccAdd"][data-id="own:0009"]');pg.wait_for_timeout(300)
  F=E('stFixRows(stPend,ac("sv")).map(f=>[f.op,f.x.id])');ok('then: transfers to it offered',sorted(F)==[['retr','e_o1'],['retr','e_o2'],['tr','e_o3']],F)
  pg.click('#csvout [data-act="stAll"]');pg.wait_for_timeout(500);t=pg.inner_text('#csvout')
  n9=E('(S.acc.find(a=>a.l4=="0009")||{}).id');ok('own account gets 3,110, the wrong account nothing, savings exact',abs(B(E,n9)-3110)<0.005 and abs(B(E,'ax'))<0.005 and abs(B(E,'sv')-2429.25)<0.005 and "✓ Matches the bank" in t,[B(E,n9),B(E,'ax'),B(E,'sv')])
  ok('statement remembered for the account',E('S.cfg.stmts.some(s=>s.acc=="sv"&&s.ok&&s.from=="2026-10-31"&&s.to=="2026-11-29")'))
  # opening it again: nothing to do
  load(pg,'/tmp/v37sav.pdf','sv');t=pg.inner_text('#csvout')
  ok('second time: everything matches, nothing offered',"Make it match the bank" not in t and "Everything in this statement is already in the app" in t and "You checked this statement on" in t,t[:400])
  # ---------- the card statement: no balance column, the bank's alert sets it ----------
  ok('card before: a payment saved twice shows as credit',B(E,'tc')>0,B(E,'tc'))
  E('accMenu("tc")');ok('card page warns about the credit',"in credit on this card" in pg.inner_text('#over'))
  pg.click('#over [data-act="dupScan"]');pg.wait_for_timeout(200);ok('saved-twice finder pairs the two payments',pg.locator('#over [data-act="dupDel"]').count()==2 and "Payment received" in pg.inner_text('#over'),pg.inner_text('#over')[:400])
  pg.click('#over .x')
  load(pg,'/tmp/v37card.pdf','tc')
  P=E('stPend.P.rows.map(r=>[r.date,r.dir,r.amt,stmtClean(r.desc).payee])');PD={(p[0],p[2]):p for p in P}
  ok('11 card lines, payments in',len(P)==11 and PD[('2026-11-28',250.5)][1]=='in' and PD[('2026-11-09',60.25)][1]=='in',P)
  ok('card names tidy',PD[('2026-11-27',20.1)][3]=='New Test Supermarket' and PD[('2026-11-27',10)][3]=='Every Day Discount Center' and PD[('2026-11-19',30)][3]=='Test City Food Restaurant',P)
  t=pg.inner_text('#csvout')
  ok('the alert is used: owed then',"you owed QAR 477.23 then" in t,t[t.find('alert'):t.find('alert')+300])
  F=E('stFixRows(stPend,ac("tc")).map(f=>[f.op,f.x.id])');ops={x[1]:x[0] for x in F}
  ok('card: payment saved twice, shop names for vague entries',ops.get('k_pay2')=='dup2' and ops.get('k_food')=='name' and ops.get('k_spent')=='name',F)
  ok('card: old corrections listed',pg.locator('#csvout input[data-stc]').count()==2)
  ok('card: waiting payment already in the statement',"1 waiting in Payment review is already in this statement" in t)
  pg.click('#csvout [data-act="stAll"]');pg.wait_for_timeout(500);t=pg.inner_text('#csvout')
  ok('card matches the alert, now owed 226.73, available 2,773.27',"✓ Matches the bank" in t and abs(B(E,'tc')+226.73)<0.005 and abs(E('cardAv(ac("tc"))')-2773.27)<0.005,[B(E,'tc'),t[:600]])
  ok('card opening from the alert: 0 (was 100)',abs(E('ac("tc").open'))<0.005 and not E('S.tx.some(x=>x.acc=="tc"&&x.kind=="adj")'))
  ok('shop names on the vague ones',E('[S.tx.find(x=>x.id=="k_food").payee,S.tx.find(x=>x.id=="k_food").cat,S.tx.find(x=>x.id=="k_spent").payee]')==['New Test Supermarket','Food','Sample Grill House'])
  ok('waiting payment cleared and recorded',not E('(S.cfg.smsq||[]).some(m=>m.id=="w1")') and E('(S.cfg.payLog||[]).some(l=>l.id=="w1"&&l.via=="statement")'))
  ok('the 5.00 purchase added once',E('S.tx.filter(x=>x.acc=="tc"&&x.amt==5&&x.date=="2026-11-26").length')==1)
  E('accMenu("tc")');t=pg.inner_text('#over')
  ok('card page: no credit warning, the alert matches, statement listed',"in credit on this card" not in t and "The app matches it" in t and "Bank statements checked" in t and "✓ matches" in t,t[:900])
  c.close()
  # ---------- the other order: card first, then savings ----------
  c,pg=h.page(native=True);E=pg.evaluate;E(SETUP)
  load(pg,'/tmp/v37card.pdf','tc')
  F=E('stFixRows(stPend,ac("tc")).map(f=>[f.op,f.x.id])');ops={x[1]:x[0] for x in F}
  ok('card first: payments become transfers from the bank, typed-off copy saved twice',ops.get('k_pay1')=='trin' and ops.get('k_pay2')=='trin' and ops.get('e_pop')=='dup2',F)
  pg.click('#csvout [data-act="stAll"]');pg.wait_for_timeout(500)
  load(pg,'/tmp/v37sav.pdf','sv');pg.click('#csvout [data-act="stAll"]');pg.wait_for_timeout(500);t=pg.inner_text('#csvout')
  ok('same result either way',abs(B(E,'sv')-2429.25)<0.005 and abs(B(E,'tc')+226.73)<0.005 and E('S.tx.filter(x=>x.kind=="tr"&&x.acc=="sv"&&x.to=="tc").map(x=>x.amt).sort((a,b)=>a-b)')==[60.25,250.5] and not E('S.tx.some(x=>x.acc=="tc"&&x.kind=="in")'),[B(E,'sv'),B(E,'tc'),E('S.tx.filter(x=>x.acc=="tc"||x.to=="tc").map(x=>[x.kind,x.amt,x.date])')])
  c.close()
  # ---------- descriptions above the date, across pages, and an alert in the middle of a day ----------
  c,pg=h.page(native=True);E=pg.evaluate
  def ln(y,cells,p=1):
    items=[{'x':x,'s':s,'w':len(s)*4.6} for x,s in cells if s];return {'p':p,'y':y,'t':'   '.join(i['s'] for i in items),'items':items}
  def rw(y,d,a,b,p=1):return ln(y,[(40,d),(120,'PAYMENT TO'),(330,a),(430,b)],p)
  def ct(y,t,p=1):return ln(y,[(120,t)],p)
  HD=lambda y,p=1:ln(y,[(40,'Date'),(120,'Details'),(330,'Amount'),(430,'Balance')],p)
  L=[HD(700),rw(680,'03/11/2026','-10.00','90.00'),ct(669,'FIRST SHOP'),ct(658,'REF 1'),rw(643,'03/11/2026','-20.00','100.00'),ct(632,'SECOND SHOP'),
     rw(617,'02/11/2026','-30.00','120.00'),ct(606,'THIRD SHOP'),ct(595,'LINE TWO'),rw(584,'01/11/2026','-40.00','150.00'),ct(573,'FOURTH SHOP'),
     ln(60,[(250,'Page 1 of 2')]),ln(50,[(40,'Customer care 800 0000')]),HD(780,2),rw(760,'31/10/2026','-50.00','190.00',2),ct(749,'FIFTH SHOP',2)]
  P=E('L=>{const p=stmtParse(L);return {open:p.open,d:p.rows.map(r=>r.desc)}}',L)
  ok('descriptions under the date: even gaps follow the statement’s habit; the last line of a page keeps its text; footers stay out',P['open']==240 and P['d']==['PAYMENT TO FIFTH SHOP','PAYMENT TO FOURTH SHOP','PAYMENT TO THIRD SHOP LINE TWO','PAYMENT TO SECOND SHOP','PAYMENT TO FIRST SHOP REF 1'],P)
  E('S.acc.push({id:"k9",name:"Alert card",type:"card",cur:"QAR",open:0,lim:1000,l4:"0999"});addTx({kind:"out",acc:"k9",amt:100,cur:"QAR",date:"2026-11-20",payee:"Shop A"});addTx({kind:"out",acc:"k9",amt:40,cur:"QAR",date:"2026-11-20",payee:"Shop B"});S.cfg.cardBank={k9:{avl:900,t:new Date(2026,10,20,11,0).getTime(),src:"SMS"}};save()')
  ok('an alert before the day’s later spending still matches',E('cardRecon(ac("k9"))')==0 and not E('!!(S.cfg.balWarn||{}).k9'))
  E('S.cfg.cardBank.k9.avl=850;save()');ok('a real difference is still reported',abs(E('cardRecon(ac("k9"))')+10)<0.005 or abs(E('cardRecon(ac("k9"))')-(-10))<0.005,E('cardRecon(ac("k9"))'))
  c.close()
finally:
  h.done()
