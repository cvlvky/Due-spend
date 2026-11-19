import json,sys
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
try:
  c,pg=h.page(native=True);E=pg.evaluate
  # ---- one line parser ----
  P=lambda s:E('parseLine(%s)'%json.dumps(s))
  r=P("Lulu 120 riyal groceries");ok('Lulu 120 riyal groceries',r.get('amt')==120 and r.get('payee')=='Lulu' and r.get('kind')=='out' and r.get('acc')=='a2' and bool(r.get('cat')),r)
  r=P("spent 45 qr on fuel");ok('spent 45 qr on fuel',r.get('amt')==45 and r.get('cat') in ('Fuel','Travel') and not r.get('payee') and r.get('acc')=='a2',r)
  r=P("Salary 15000 riyal");ok('salary is income',r.get('kind')=='in' and r.get('amt')==15000 and r.get('cat')=='Salary',r)
  r=P("paid 2.5k rupees to Amazon from SBI for shopping");ok('k amounts, account by name, for category',r.get('amt')==2500 and r.get('acc')=='a1' and r.get('cat')=='Shopping' and r.get('payee')=='Amazon',r)
  r=P("Ooredoo recharge 50 riyal yesterday");ok('last word category, yesterday',r.get('amt')==50 and r.get('payee')=='Ooredoo' and r.get('cat') and r.get('date')==E('plus(-1)'),r)
  r=P("Food 30 cash");ok('cash picks the wallet',r.get('cat')=='Food' and r.get('acc')=='a3' and r.get('amt')==30,r)
  # ---- quick add form gets the line box, budget hint ----
  E('qForm("out")');ok('line box and mic in the add form',pg.locator('#over #f_line').count()==1 and pg.locator('#over [data-act="voice"]').count()==1)
  pg.fill('#f_line','Lulu 120 riyal food');pg.wait_for_timeout(500)
  ok('line fills amount, category, account',pg.input_value('#f_amt')=='120' and pg.input_value('#f_cat')=='Food' and pg.input_value('#f_acc')=='a2' and pg.input_value('#f_payee')=='Lulu',[pg.input_value('#f_amt'),pg.input_value('#f_cat'),pg.input_value('#f_acc')])
  ok('says what it understood','QAR 120' in pg.inner_text('#f_lineok') and 'Lulu' in pg.inner_text('#f_lineok'),pg.inner_text('#f_lineok'))
  ok('budget hint while adding','Food budget' in pg.inner_text('#q_bud') and 'with this' in pg.inner_text('#q_bud'),pg.inner_text('#q_bud'))
  n=E('S.tx.length');pg.click('#over [data-act="saveTx"]');pg.wait_for_timeout(200)
  x=E('S.tx[S.tx.length-1]');ok('saved from the line',E('S.tx.length')==n+1 and x['amt']==120 and x['payee']=='Lulu' and x['acc']=='a2',x)
  # voice through the phone's speech screen
  E('window.__n.say="Karwa taxi 25 riyal travel"');E('qForm("out")');pg.click('#over [data-act="voice"]');pg.wait_for_timeout(600)
  ok('voice fills the line',pg.input_value('#f_line')=='Karwa taxi 25 riyal travel' and pg.input_value('#f_amt')=='25' and pg.input_value('#f_cat')=='Travel',pg.input_value('#f_line'))
  ok('native speech called',E('__calls.some(c=>c[0]=="DueNative"&&c[1]=="listen")'))
  E('window.__n.sayErr="cancelled"');pg.click('#over [data-act="voice"]');pg.wait_for_timeout(300);ok('cancel is silent',pg.locator('#toast .toast').count()==0 or 'voice' not in pg.inner_text('#toast').lower())
  pg.click('#over .x')
  # ---- accounts ----
  E('tab="acc";render()')
  ok('accounts as compact rows',pg.locator('#app .arow').count()==3 and pg.locator('#app button[data-act="addMoney"]').count()==0)
  t=pg.inner_text('#app');ok('grouped by country','In Qatar (QAR)' in t and 'In India (₹)' in t,t[:300])
  pg.click('#app .arow[data-id="a2"]');ok('menu has all actions',all(pg.locator('#over [data-act="%s"][data-id="a2"]'%a).count()==1 for a in ('addMoney','accSpend','trfFrom','stmt','fixBal','editAcc','stImport')))
  pg.click('#over [data-act="trfFrom"]');ok('transfer starts from this account','#f_from' and pg.input_value('#over #f_from')=='a2' if pg.locator('#over #f_from').count() else False)
  pg.click('#over .x')
  # ---- cheques ----
  bal=E('bal(ac("a2"))')
  E('S.chq.push({id:"c1",payee:"Landlord",amt:%d,acc:"a2",cur:"QAR",date:plus(3),no:"000101",status:"issued"});save();render()'%(int(bal)+500))
  ok('cheque listed with shortfall','Landlord' in pg.inner_text('#app') and 'short by' in pg.inner_text('#app'))
  ok('needs attention warns about the cheque',E('todoItems().some(x=>/Cheque #000101/.test(x.tx)&&x.tone=="late"&&/short/.test(x.sub)&&x.bact=="addMoney")'))
  pg.click('#app [data-act="chqSeries"]');pg.fill('#f_cpay','Bank');pg.fill('#f_camt','1000');pg.fill('#f_cdate',E('plus(40)'));pg.fill('#f_cno','0099');pg.fill('#f_cn','3');pg.click('#over [data-act="chqSaveS"]');pg.wait_for_timeout(200)
  ok('series of 3 with numbers',E('S.chq.filter(c=>c.payee=="Bank").map(c=>c.no).join()')=='0099,0100,0101',E('S.chq.filter(c=>c.payee=="Bank").map(c=>c.no+" "+c.date)'))
  n=E('S.tx.length');E('chqClear("c1")');ok('clearing takes it out of the account',E('S.tx.length')==n+1 and E('S.chq.find(c=>c.id=="c1").status')=='cleared' and abs(E('bal(ac("a2"))')-(bal-(int(bal)+500)))<0.01)
  ok('cheques in the calendar file','Cheque #0099' in E('ics()'))
  E('nativeNotify()');pg.wait_for_timeout(500);ok('cheque reminders scheduled',E('__calls.some(c=>c[1]=="schedule"&&c[2].notifications.some(n=>/Cheque #0099/.test(n.title)))'))
  # ---- days in India ----
  fs=E('fyStart()')
  E('S.trips.push({id:"t1",from:"%s",to:"%s"});save()'%(fs,E('iso(new Date(D(fyStart()).getTime()+9*864e5))')))
  ok('arrival and departure both count',E('indiaDays()')==10,E('indiaDays()'))
  E('S.trips.push({id:"t2",from:"%s",to:"%s"})'%(E('iso(new Date(D(fyStart()).getTime()-5*864e5))'),E('iso(new Date(D(fyStart()).getTime()+4*864e5))')))
  ok('only days inside the year count, overlaps not double counted per trip',E('indiaDays()')==15,E('indiaDays()'))
  E('S.trips=[{id:"t3",from:plus(-130),to:""}];S.cfg.wSeg="plans";tab="invest";render()')
  d=E('indiaDays()');ok('open trip counts until today',d==min(131,E('dayN(today())-dayN(fyStart())+1')),d)
  ok('plans shows days in India','Days in India' in pg.inner_text('#app'))
  if d>=120:ok('needs attention mentions days in India',E('todoItems().some(x=>/days in India/.test(x.tx))'))
  # ---- payday ----
  E('S.rec.push({id:"rs",kind:"in",amt:15000,acc:"a2",cat:"Salary",day:25,from:today().slice(0,7),last:""});S.cfg.wSeg="over";tab="home";render()')
  P2=E('payPlan()');ok('next payday from salary entry',P2 and P2['np'][8:]=='25' and P2['np']>E('today()'),P2 and P2['np'])
  ok('payday card on Home','Until payday' in pg.inner_text('#app'))
  pg.click('#app .card.pay');ok('payday sheet lists payments','Left to spend' in pg.inner_text('#over') or 'Short by' in pg.inner_text('#over'));pg.click('#over .x')
  # ---- dues to calendar ----
  E('tab="dates";render()');ok('add all to calendar button',pg.locator('#app [data-act="calAll"]').count()==1)
  pg.click('#app [data-act="calAll"]');ok('calendar sheet',pg.locator('#over [data-act="ics"]').count()==1);pg.click('#over .x')
  # ---- widget ----
  E('__calls.length=0;nativeWidget()');pg.wait_for_timeout(300)
  w=E('__calls.filter(c=>c[1]=="setWidget").pop()');ok('widget gets the attention list',w and w[2].get('line3','').startswith('• ') and w[2].get('line1'),w)
  # ---- Tamil ----
  E('tab="home";render();settings()');pg.click('#over #set_lang');pg.wait_for_timeout(300)
  ok('nav in Tamil',pg.locator('#nav button[data-id="home"] span').inner_text()=='முகப்பு')
  t=pg.inner_text('#app');ok('home headings in Tamil','கவனிக்க' in t and 'Needs attention' not in t,t[:200])
  E('tab="acc";render()');ok('accounts in Tamil','கணக்குகள்' in pg.inner_text('#app'))
  h1=E('document.querySelector("#app").innerHTML');E('render()');ok('no redraw churn in Tamil',E('document.querySelector("#app").innerHTML')==h1)
  E('qForm("out")');ok('add form in Tamil and still works',pg.locator('#over [data-act="saveTx"]').count()==1 and 'சேமி' in pg.inner_text('#over'))
  pg.click('#over .x');E('settings()');pg.click('#over #set_lang');pg.wait_for_timeout(300)
  ok('back to English',pg.locator('#nav button[data-id="home"] span').inner_text()=='Home')
  # ---- what's new ----
  E('whatsNew(true)');ok('what is new sheet',"What’s new in Version 27" in pg.inner_text('#over'));pg.click('#over [data-act="closeX"]')
  # sync carries the new lists
  ok('cheques and trips sync and back up',E('COLLS.includes("chq")&&COLLS.includes("trips")&&("chq" in bkObj())'))
  pg.screenshot(path='shots/s-v27.png')
finally:
  h.done()
