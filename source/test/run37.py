"""Import a scheme statement (SSY / PPF / RD) from the bank: made-up data."""
import json,sys
sys.path.insert(0,'test')
from h import H
X=[40,100,160,300,380,440,510]
def ln(y,cells):
  items=[{'x':x,'s':s,'w':len(s)*4.6} for x,s in cells if s]
  return {'p':1,'y':y,'t':'   '.join(i['s'] for i in items),'items':items}
def row(y,d,desc,cr,bal,dr=''):return ln(y,[(X[0],d),(X[1],d),(X[2],desc),(X[4],dr),(X[5],cr),(X[6],bal)])
def stmt(open_line=True):
  L=[ln(800,[(40,'STATE BANK OF INDIA')]),ln(780,[(40,'Account Name : TEST CHILD')]),ln(765,[(40,'Account Number : 00000012345678901')]),ln(750,[(40,'Account Description : SUKANYA SAMRIDDHI ACCOUNT')])]
  if open_line:L.append(ln(735,[(40,'Account open Date : 10 Apr 2023')]))
  L+=[ln(720,[(40,'Balance as on 1 Apr 2025 : 24,000.00')]),
   ln(700,[(X[0],'Txn Date'),(X[1],'Value Date'),(X[2],'Description'),(X[3],'Ref No./Cheque No.'),(X[4],'Debit'),(X[5],'Credit'),(X[6],'Balance')]),
   row(680,'5 Apr 2025','BY TRANSFER-INB SSY','1,000.00','25,000.00'),row(660,'5 May 2025','BY TRANSFER-INB SSY','1,000.00','26,000.00'),
   row(640,'4 Jun 2025','CASH DEPOSIT','1,000.00','27,000.00'),row(620,'31 Mar 2026','INTEREST CREDIT','2,100.00','29,100.00'),
   row(600,'5 Apr 2026','BY TRANSFER-INB SSY','1,500.00','30,600.00'),row(580,'5 May 2026','BY TRANSFER-INB SSY','1,500.00','32,100.00')]
  return L
CSV="Txn Date,Description,Debit,Credit,Balance\n05-04-2025,BY TRANSFER-INB SSY,,1000.00,25000.00\n05-05-2025,BY TRANSFER-INB SSY,,1000.00,26000.00\n04-06-2025,CASH DEPOSIT,,1000.00,27000.00\n31-03-2026,INTEREST CREDIT,,2100.00,29100.00\n05-04-2026,BY TRANSFER-INB SSY,,1500.00,30600.00\n05-05-2026,BY TRANSFER-INB SSY,,1500.00,32100.00\n"
h=H();ok=h.ok
try:
  c,pg=h.page(native=True);E=pg.evaluate
  E('S.sacc.push({id:"ss",type:"ssy",name:"Test child SSY",holder:"Test child",no:"12345678901",po:"SBI",open:today(),dep:[],plan:{f:"m",a:1000,day:5,md:"01-05"}},{id:"s2",type:"ssy",name:"CSV SSY",no:"12345678901",po:"SBI",open:today(),dep:[]},{id:"s3",type:"ssy",name:"Other SSY",no:"99999999999",po:"SBI",open:today(),dep:[]},{id:"s4",type:"ssy",name:"No date SSY",no:"",po:"SBI",open:today(),dep:[]});save()')
  E('saInfoSheet("ss")');ok('import button on the scheme',pg.locator('#over [data-act="saImp"]').count()==1)
  pg.click('#over [data-act="saImp"]');ok('import sheet',pg.locator('#over #f_safile').count()==1)
  P=E('L=>{const P=stmtParse(L);return {open:P.open,close:P.close,rows:P.rows.map(r=>[r.date,r.dir,r.amt,r.desc])}}',stmt())
  ok('reads the SBI layout',P['open']==24000 and P['close']==32100 and len(P['rows'])==6 and all(r[1]=='in' for r in P['rows']) and P['rows'][0][3]=='BY TRANSFER-INB SSY',P)
  E('L=>{const P=stmtParse(L);P.text=L.slice(0,40).map(l=>l.t).join(" ");saImpLoad("ss",P)}',stmt())
  Q=E('({dep:saImpP.Q.dep.length,ints:saImpP.Q.ints.length,fix:saImpP.Q.fix,open:saImpP.Q.open,mis:saImpP.Q.mis,hist:saImpP.Q.hist})')
  ok('deposits and interest told apart',Q['dep']==5 and Q['ints']==1,Q)
  ok('bank balance right after the 31 March interest',Q['fix']=={'d':'2026-03-31','bal':29100,'why':'int'},Q['fix'])
  ok('opening date from the statement',Q['open']=='2023-04-10' and not Q['mis'],Q)
  ok('finished year from the bank',Q['hist']==[{'fy':'2025-26','dep':3000,'int':2100,'close':29100}],Q['hist'])
  t=pg.inner_text('#saout');ok('preview explains',"Deposits: 5" in t and "5 new" in t and "Interest added by the bank" in t and "Start from the bank’s balance" in t and "Opening date: 10 Apr 2023" in t and "matures on 10 Apr 2044" in t,t[:900])
  pg.click('#saout [data-act="saImpGo"]');pg.wait_for_timeout(300)
  x=E('S.sacc.find(q=>q.id=="ss")');ok('imported',len(x['dep'])==5 and x['fix']['bal']==29100 and x['open']=='2023-04-10' and x['hist'][0]['fy']=='2025-26',x)
  now=E('saState(S.sacc.find(q=>q.id=="ss")).now');ok('value now from the bank balance plus this year',now>33500 and now<33800,now)
  t=pg.inner_text('#over');ok('year by year shows the bank’s year',"2025-26" in t and "₹29,100" in t and "from the bank statement" in t,t[:900])
  st=E('[...document.querySelectorAll("#over .stats .stat")].map(e=>e.innerText.replace(/\\n/g," "))')
  ok('put in and interest since the statement starts',st[1]=='Put in since 5 Apr 2025 ₹6,000' and st[2]=='Interest since 5 Apr 2025 ₹3,625' and "₹24,000 was already in the account before 5 Apr 2025" in pg.inner_text('#over'),st)
  # an older statement from the opening: fills in the years before, keeps the newer bank balance
  OLD=[ln(780,[(40,'Account Number : 00000012345678901')]),ln(735,[(40,'Account open Date : 10 Apr 2023')]),ln(720,[(40,'Balance as on 10 Apr 2023 : 0.00')]),
   ln(700,[(X[0],'Txn Date'),(X[1],'Value Date'),(X[2],'Description'),(X[4],'Debit'),(X[5],'Credit'),(X[6],'Balance')]),
   row(680,'10 Apr 2023','CASH DEPOSIT','10,000.00','10,000.00'),row(660,'31 Mar 2024','INTEREST CREDIT','700.00','10,700.00'),
   row(640,'5 Apr 2024','BY TRANSFER-INB SSY','12,000.00','22,700.00'),row(620,'31 Mar 2025','INTEREST CREDIT','1,300.00','24,000.00')]
  E('L=>{saImpForm("ss");const P=stmtParse(L);P.text=L.slice(0,40).map(l=>l.t).join(" ");saImpLoad("ss",P)}',OLD)
  ok('older statement: newer bank balance kept',E('saImpP.Q.fix')is None and pg.locator('#sa_fix').count()==0)
  pg.click('#saout [data-act="saImpGo"]');pg.wait_for_timeout(300)
  x=E('S.sacc.find(q=>q.id=="ss")');ok('years before filled in',[h['fy'] for h in x['hist']]==['2023-24','2024-25','2025-26'] and x['fix']['d']=='2026-03-31' and not x.get('base'),x.get('hist'))
  st=E('[...document.querySelectorAll("#over .stats .stat")].map(e=>e.innerText.replace(/\\n/g," "))')
  ok('all of it now: put in 28,000, interest 5,625',st[1]=='You put in ₹28,000' and st[2]=='Interest ₹5,625',st)
  # again: nothing twice
  pg.click('#over [data-act="saImp"]');E('L=>{const P=stmtParse(L);P.text=L.slice(0,40).map(l=>l.t).join(" ");saImpLoad("ss",P)}',stmt())
  ok('second import adds nothing',"All the deposits in this statement are already in the app" in pg.inner_text('#saout') and E('saImpP.Q.dep.filter(r=>!r.have).length')==0)
  ok('opening date not offered again',E('saImpP.Q.open')=='')
  # CSV
  E('t=>{saImpForm("s2");saImpLoad("s2",saCsv(t))}',CSV);pg.click('#saout [data-act="saImpGo"]');pg.wait_for_timeout(300)
  x=E('S.sacc.find(q=>q.id=="s2")');ok('CSV statement too',len(x['dep'])==5 and x['fix']['d']=='2026-03-31' and x['fix']['bal']==29100,x)
  # another account's statement
  E('L=>{saImpForm("s3");const P=stmtParse(L);P.text=L.slice(0,40).map(l=>l.t).join(" ");saImpLoad("s3",P)}',stmt())
  ok('warns about another account',"This may be another account" in pg.inner_text('#saout'))
  # no opening date printed: the first entry, marked as a guess
  E('L=>{saImpForm("s4");const P=stmtParse(L);P.text=L.slice(0,40).map(l=>l.t).join(" ");saImpLoad("s4",P)}',stmt(False))
  ok('first entry as a guess',E('saImpP.Q.open')=='2025-04-05' and E('saImpP.Q.guess') and "if the account is older" in pg.inner_text('#saout'))
  # untick: only deposits
  pg.uncheck('#sa_fix');pg.uncheck('#sa_open');pg.click('#saout [data-act="saImpGo"]');pg.wait_for_timeout(300)
  x=E('S.sacc.find(q=>q.id=="s4")');ok('only what was ticked',len(x['dep'])==5 and not x.get('fix') and x['open']==E('today()'),x)
finally:
  h.done()
