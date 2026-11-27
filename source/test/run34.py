"""Credit cards: limit, used and available to spend (made-up data)."""
import json,sys
sys.path.insert(0,'test')
from h import H
X=[38,158,265,482,605,725,845]
def line(y,cells):
  items=[{'x':x,'s':s,'w':len(s)*5.2} for x,s in cells if s]
  return {'p':1,'y':y,'t':'   '.join(i['s'] for i in items),'items':items}
def cardfile(l4,rows):
  L=[line(1000,[(38,'Transaction History')]),line(980,[(38,'4111 XXXX XXXX '+l4)]),
     line(940,[(X[0],'Transaction date'),(X[1],'Processed date'),(X[2],'Transaction details'),(X[3],'Transaction currency'),(X[4],'Transaction amount'),(X[5],'QAR equivalent'),(X[6],'Type')])]
  y=920
  for d,desc,a,typ in rows:
    L.append(line(y,[(X[0],d),(X[1],d),(X[2],desc),(X[3],'QAR'),(X[4],a),(X[5],a),(X[6],typ)]));y-=20
  return L
h=H();ok=h.ok
try:
  c,pg=h.page(native=True);E=pg.evaluate
  ok('reads the available limit in card alerts',E('[cardAvl("Your card ending **4321 used for QAR 7.00 at Cafe. Available Limit: QAR 3,193.00"),cardAvl("Avl Lmt: QAR 1,234.50"),cardAvl("Available credit limit QAR 500"),cardAvl("Avl Cr Lmt:INR 12,000.00"),cardAvl("Thank you")]')==[3193,1234.5,500,12000,None])
  E('S.acc.push({id:"tv",name:"Test Visa",type:"card",cur:"QAR",open:0,l4:"4321"});addTx({kind:"out",acc:"tv",amt:100,cur:"QAR",date:plus(-3),cat:"Food",payee:"Cafe"});addTx({kind:"out",acc:"tv",amt:160.17,cur:"QAR",date:plus(-1),cat:"Fuel",payee:"Station"});save();tab="acc";render()')
  tot0=E('tot(V())')
  row=lambda: pg.inner_text('.arow[data-id="tv"]')
  ok('without a limit: shows what you owe',"You owe QAR 260.17" in row() and "owed" in row(),row())
  E('accMenu("tv")');ok('asks for the card limit',"Add the card limit" in pg.inner_text('#over') and pg.locator('#over [data-act="editAcc"]').count()>=1)
  # new account form: limit only for cards
  E('accForm()');ok('limit hidden for a bank account',not pg.is_visible('#f_lim'))
  pg.select_option('#f_type','card');ok('limit shown for a card',pg.is_visible('#f_lim'))
  E('sheet("");accForm(ac("tv"))');ok('limit shown when editing a card',pg.is_visible('#f_lim'))
  pg.fill('#f_lim','3200');pg.click('#over [data-act="saveAcc"]');pg.wait_for_timeout(200)
  ok('limit saved',E('ac("tv").lim')==3200)
  ok('available like the bank app',E('cardAv(ac("tv"))')==2939.83)
  E('tab="acc";render()');r=row()
  ok('accounts list shows available',"QAR 2,939.83" in r and "available" in r and "Used 260.17 of 3,200" in r,r)
  ok('bar shows what is used',E('document.querySelector(\'.arow[data-id="tv"] .cbar i\').style.width')=='8%')
  ok('totals still count what you owe',abs(E('tot(V())')-tot0)<0.01)
  E('accMenu("tv")');t=pg.inner_text('#over')
  ok('card sheet: available, limit, owed',"2,939.83" in t and "available to spend" in t and "Card limit" in t and "3,200" in t and "260.17" in t,t[:300])
  E('stmt(ac("tv"))');ok('statement header',"Limit QAR 3,200 · used QAR 260.17 · available QAR 2,939.83" in pg.inner_text('#over .sub'),pg.inner_text('#over .sub'))
  # correct the balance by typing what the bank app shows
  E('fixForm("tv")');ok('card correction form',pg.locator('#over #f_avl').count()==1 and pg.locator('#over #f_owe2').count()==1 and pg.locator('#over #f_lim2').count()==0)
  pg.fill('#f_avl','2900');pg.click('#over [data-act="saveFix"]');pg.wait_for_timeout(200)
  ok('available typed in: owed worked out',abs(E('bal(ac("tv"))')+300)<0.005 and E('cardAv(ac("tv"))')==2900)
  E('fixForm("tv")');pg.fill('#f_owe2','310');pg.click('#over [data-act="saveFix"]');pg.wait_for_timeout(200)
  ok('or the amount owed',abs(E('bal(ac("tv"))')+310)<0.005 and E('cardAv(ac("tv"))')==2890)
  # alerts keep it right
  E('''quickSave({id:"s1",from:"SMS · CBQ",body:"Your card ending **4321 used for QAR 7.00 at Test Cafe at 07:06 Available Limit: QAR 2,883.00",p:{kind:"out",acc:"tv",amt:7,cur:"QAR",date:today(),payee:"Test Cafe"}});save()''')
  ok('matching alert: no warning',not E('(S.cfg.balWarn||{}).tv'))
  E('''quickSave({id:"s2",from:"SMS · CBQ",body:"Your card ending **4321 used for QAR 10.00 at Test Shop Available Limit: QAR 2,800.00",p:{kind:"out",acc:"tv",amt:10,cur:"QAR",date:today(),payee:"Test Shop"}});save()''')
  w=E('(S.cfg.balWarn||{}).tv');ok('different alert: warned with the available amount',w and w['avl']==2800,w)
  it=E('todoItems().find(x=>x.act=="balFix"&&x.id=="tv")');ok('needs attention in available terms',it and "bank says QAR 2,800 available" in it['tx'] and "QAR 2,873" in it['sub'],it)
  E('ACT.balFix("tv")');ok('tap to correct: filled in',pg.input_value('#f_avl')=='2800')
  pg.click('#over [data-act="saveFix"]');pg.wait_for_timeout(200)
  ok('corrected and warning cleared',E('cardAv(ac("tv"))')==2800 and not E('(S.cfg.balWarn||{}).tv'))
  # statement import box: type what the bank app shows
  L=cardfile('4321',[('25/11/2026','TEST CAFE DOHA QA','-20.00','Billed')])
  E('L=>{const P=stmtParse(L);csvForm();setVal("f_acc","tv");stPend={acc:"tv",P,M:stmtMatch(P,"tv")};stmtShow()}',L)
  t=pg.inner_text('#csvout');ok('import box offers available',pg.locator('#csvout #f_avl').count()==1 and "Card limit QAR 3,200" in t and pg.locator('#csvout #f_lim3').count()==0,t[-600:])
  pg.click('#csvout [data-act="stImportGo"]');pg.wait_for_timeout(200)
  pg.fill('#f_avl','3000');pg.click('#csvout [data-act="stSetBal"]');pg.wait_for_timeout(300)
  ok('available 3,000 sets owed 200',abs(E('bal(ac("tv"))')+200)<0.005 and "QAR 3,000 available" in pg.inner_text('#csvout'),E('bal(ac("tv"))'))
  # a card with no limit yet: the limit can be typed in the same box
  E('S.acc.push({id:"oc",name:"Other card",type:"card",cur:"QAR",open:0});save()')
  L2=cardfile('8888',[('24/11/2026','SHOP ONE DOHA QA','-50.00','Billed')])
  E('L=>{const P=stmtParse(L);stPend={acc:"oc",P,M:stmtMatch(P,"oc")};stmtShow()}',L2)
  ok('limit field when missing',pg.locator('#csvout #f_lim3').count()==1)
  pg.click('#csvout [data-act="stImportGo"]');pg.wait_for_timeout(200)
  pg.fill('#f_avl','4500');pg.click('#csvout [data-act="stSetBal"]');pg.wait_for_timeout(200);ok('available without a limit asks for it',abs(E('bal(ac("oc"))')+50)<0.005)
  pg.fill('#f_lim3','5000');pg.fill('#f_avl','4500');pg.click('#csvout [data-act="stSetBal"]');pg.wait_for_timeout(300)
  ok('limit and available typed together',E('ac("oc").lim')==5000 and abs(E('bal(ac("oc"))')+500)<0.005)
  # bank accounts unchanged
  E('fixForm("a2")');ok('bank account correction unchanged',pg.locator('#over #f_bal').count()==1 and pg.locator('#over #f_avl').count()==0)
  E('tab="acc";render()');ok('bank rows unchanged',"available" not in pg.inner_text('.arow[data-id="a2"]'))
finally:
  h.done()
