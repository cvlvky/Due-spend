"""SBI-style SSY statements: newest first, dash for the empty column, summary lines, repairs (made-up data)."""
import json,sys
sys.path.insert(0,'test')
from h import H
def ln(y,cells,p=1):
  items=[{'x':x,'s':s,'w':len(s)*4.6} for x,s in cells if s]
  return {'p':p,'y':y,'t':'   '.join(i['s'] for i in items),'items':items}
def sbi(period,brought,closing,rows,open_date='10-05-2024'):
  L=[ln(760,[(40,'SSA Account Summary')]),ln(700,[(300,'Account Number   : 12345678901')]),ln(680,[(300,'Product   : SUKANYA SAMRIDDHI')]),
     ln(560,[(40,'Interest Rate   : 8.20 % p.a.')]),ln(520,[(40,'Account Open Date   : '+open_date)]),ln(480,[(180,'Statement from %s to %s'%period)]),
     ln(450,[(300,'Ref No/')]),ln(444,[(40,'Value Date'),(110,'Post Date'),(200,'Details'),(520,'Balance')]),ln(438,[(300,'Cheque No')])]
  y=410
  for d,amt,bal,side,who in rows:
    L+=[ln(y+29,[(200,'DEP TFR')]),ln(y+17,[(200,'UPI/CR/000000000001/'+who)]),
        ln(y,[(40,d),(110,d),(380,'-' if side=='cr' else amt),(450,amt if side=='cr' else '-'),(520,bal)]),
        ln(y-6,[(200,'0000000000001 AT 00001')]),ln(y-18,[(200,'TESTTOWN')])]
    y-=70
  L+=[ln(y,[(180,'Statement from %s to %s'%period)]),ln(y-14,[(40,'Brought'),(120,'Dr Count'),(200,'Cr Count'),(300,'Total Debits'),(400,'Total Credits'),(500,'Closing Balance')]),
      ln(y-26,[(40,brought+'CR'),(130,'0'),(210,str(len(rows))),(300,'0.00'),(400,'0.00'),(500,closing+'CR')])]
  return L
A=sbi(('20-05-2024','31-08-2024'),'2,000.00','30,000.00',[('08/08/2024','20,000.00','30,000.00','cr','TESTPARENT'),('26/06/2024','5,000.00','10,000.00','cr','TESTPARENT'),('25/05/2024','3,000.00','5,000.00','cr','TESTPARENT')])
B=sbi(('01-04-2025','30-09-2025'),'31,606.00','33,606.00',[('05/09/2025','1,000.00','33,606.00','cr','TESTPARENT'),('05/06/2025','1,000.00','32,606.00','cr','TESTPARENT')])
h=H();ok=h.ok
def imp(E,i,L):E('([i,L])=>{saImpForm(i);const P=stmtParse(L);P.text=L.filter(l=>(l.p||1)==1).slice(0,40).map(l=>l.t).join(" ");saImpLoad(i,P)}',[i,L])
try:
  c,pg=h.page(native=True);E=pg.evaluate
  P=E('L=>{const p=stmtParse(L);return {open:p.open,close:p.close,period:p.period,rows:p.rows.map(r=>[r.date,r.dir,r.amt,r.bal])}}',A)
  ok('newest first, dash column: all deposits',P['rows']==[['2024-05-25','in',3000,5000],['2024-06-26','in',5000,10000],['2024-08-08','in',20000,30000]],P['rows'])
  ok('brought forward, closing and period read',P['open']==2000 and P['close']==30000 and P['period']=={'from':'2024-05-20','to':'2024-08-31'},P)
  D=sbi(('01-04-2025','30-04-2025'),'5,000.00','4,000.00',[('10/04/2025','1,000.00','4,000.00','dr','TESTPARENT')])
  ok('dash on the other side: money out',E('L=>stmtParse(L).rows.map(r=>[r.dir,r.amt])',D)==[['out',1000]])
  E('S.sacc.push({id:"sb",type:"ssy",name:"Test SSY",no:"12345678901",po:"SBI",open:today(),dep:[]});save()')
  # the later statement first: money already there, the bank's 31 March balance
  imp(E,"sb",B);t=pg.inner_text('#saout')
  ok('later statement: 31 March balance after interest',"Start from the bank’s balance: ₹31,606 on 31 Mar 2025" in t and "Right after the bank added the year’s interest" in t and "Opening date: 10 May 2024" in t,t[:700])
  pg.click('#saout [data-act="saImpGo"]');pg.wait_for_timeout(300)
  x=E('S.sacc.find(q=>q.id=="sb")');ok('money already there noted',x.get('base')=={'d':'2025-04-01','bal':31606} and x['fix']=={'d':'2025-03-31','bal':31606,'src':'stmt'},x)
  # the earlier statement: its brought-forward is the opening deposit
  imp(E,"sb",A);t=pg.inner_text('#saout')
  ok('opening deposit recognised',"Including the opening deposit of ₹2,000 on 10 May 2024" in t,t[:800])
  pg.click('#saout [data-act="saImpGo"]');pg.wait_for_timeout(300)
  x=E('S.sacc.find(q=>q.id=="sb")');ok('all deposits, from the opening',sorted((d['d'],d['a']) for d in x['dep'])==[('2024-05-10',2000),('2024-05-25',3000),('2024-06-26',5000),('2024-08-08',20000),('2025-06-05',1000),('2025-09-05',1000)] and not x.get('base') and x['fix']['d']=='2025-03-31',x)
  t=pg.inner_text('#over');ok('year by year: the bank’s year worked out',"2024-25" in t and "₹30,000" in t and "₹1,606" in t and "₹31,606" in t,t[t.find('Year by year'):t.find('Year by year')+300])
  ok("bank balance shown beside the value","In the bank now: ₹36,314" in t and "which the bank adds on 31 March" in t)
  st=E('[...document.querySelectorAll("#over .stats .stat")].map(e=>e.innerText.replace(/\\n/g," "))');ok('put in 32,000',st[1]=='You put in ₹32,000',st)
  # an earlier import that read them the wrong way round
  E('S.sacc.push({id:"wr",type:"ssy",name:"Wrong SSY",no:"12345678901",po:"SBI",open:"2024-05-10",dep:[["2024-05-25",3000],["2024-06-26",5000],["2024-08-08",20000],["2025-06-05",1000],["2025-09-05",1000]].map((w,i)=>({id:"x"+i,d:w[0],a:-w[1],w:1,src:"stmt"})),fix:{d:"2025-06-04",bal:33606,src:"stmt"},base:{d:"2024-05-25",bal:7000}});save()')
  imp(E,"wr",B);t=pg.inner_text('#saout');ok('repair offered',"2 entries were saved the wrong way round" in t and "which an earlier import got wrong" in t,t[:900])
  pg.click('#saout [data-act="saImpGo"]');pg.wait_for_timeout(300);imp(E,"wr",A);pg.click('#saout [data-act="saImpGo"]');pg.wait_for_timeout(300)
  x=E('S.sacc.find(q=>q.id=="wr")');ok('repaired',sorted(d['a'] for d in x['dep'])==[1000,1000,2000,3000,5000,20000] and x['fix']=={'d':'2025-03-31','bal':31606,'src':'stmt'} and not x.get('base'),x)
finally:
  h.done()
