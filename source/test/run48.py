"""Version 38: one payment is one payment whichever apps tell you about it; "Already saved"; pop-up notifications;
cards checked strictly; long card statements keep the bank account right (all made-up data)."""
import json,sys,time
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
ACTS='''(()=>{const np=window.Capacitor.nativePromise;window.Capacitor.nativePromise=async(p,m,o)=>{const N=window.__n;
 if(m=="payActs"){const a=N.acts||[];N.acts=[];return {items:a}}if(m=="payTest"){N.tested=(N.tested||0)+1;return {}}return np(p,m,o)}})()'''
def calls(E,m):return [c for c in E('window.__calls') if c[1]==m]
BANK="com.testbank.mobile";WAL="com.google.android.apps.walletnfcrel";GM="com.google.android.gm"
def n(i,pkg,app,body,t):return {"id":pkg+":"+i,"pkg":pkg,"app":app,"body":body,"time":str(t)}
try:
  c,pg=h.page(native=True);E=pg.evaluate;E(ACTS)
  E('S.cfg.ntfAuto=true;S.acc.push({id:"sb",name:"Test Savings",type:"bank",cur:"QAR",open:1000,l4:"0005"},{id:"tc",name:"Test Card",type:"card",cur:"QAR",open:0,l4:"0808",lim:3000});save()')
  t0=int(time.mktime((2026,11,28,12,0,0,0,0,-1))*1000);H1=3600*1000
  Q=lambda:E('(S.cfg.smsq||[]).map(m=>[m.id,m.p.amt,m.p.payee||"",(m.also||[]).length])')
  L=lambda:E('(S.cfg.payLog||[]).filter(e=>e.act=="same").map(e=>[e.id,e.tx||"",e.also||""])')
  # ---------- the same purchase from the bank app, Google Wallet and Gmail, hours apart ----------
  E('window.__n.items=%s;notifScan()'%json.dumps([n("1",BANK,"Test Bank","Your credit card ending 0808 was used for QAR 7.00 at TEST DINER DOH DOHA QA on 28/11/2026. Available limit QAR 2,993.00",t0),
     n("2",WAL,"Google Wallet","Test Diner. QAR 7.00 with Visa •••• 0808",t0+20*60000)]))
  ok('bank app and Google Wallet: one payment to review',[q[1] for q in Q()]==[7] and len(L())==1,[Q(),L()])
  E('window.__n.items=%s;notifScan()'%json.dumps([n("3",GM,"Gmail","Test Bank: your card ending 0808 was used for QAR 7.00 at TEST DINER",t0+5*H1)]))
  ok('the email five hours later: still one',[q[1] for q in Q()]==[7] and len(L())==2,[Q(),L()])
  ok('the one kept knows the card and the shop',E('(()=>{const m=S.cfg.smsq[0];return [m.p.acc,!!m.p.payee,(m.also||[]).length]})()')==['tc',True,2])
  # ---------- two purchases at one shop from the same app stay two; another shop stays apart ----------
  E('window.__n.items=%s;notifScan()'%json.dumps([n("4",BANK,"Test Bank","Your credit card ending 0808 was used for QAR 3.00 at TEST DINER on 28/11/2026",t0+H1),
     n("5",BANK,"Test Bank","Your credit card ending 0808 was used for QAR 3.00 at TEST DINER on 28/11/2026",t0+3*H1),n("6",WAL,"Google Wallet","Other Cafe. QAR 3.00 with Visa •••• 0808",t0+4*H1)]))
  ok('two 3.00 from the bank app stay two, another shop’s 3.00 stays apart',sorted(q[1] for q in Q())==[3,3,3,7],Q())
  # ---------- approved, then a late message about it: "Already saved" ----------
  E('ACT.smsQuick&&ACT.smsQuick(S.cfg.smsq.find(m=>m.p.amt==7).id)');pg.wait_for_timeout(200)
  sv=E('S.tx.filter(x=>x.acc=="tc"&&x.amt==7).length');ok('saved once',sv==1,sv)
  E('window.__n.items=%s;notifScan()'%json.dumps([n("7",GM,"Gmail","Card ending 0808: QAR 7.00 spent at Test Diner. Thank you",t0+9*H1)]))
  ok('a message about a saved payment is not asked again',not any(q[1]==7 for q in Q()) and E('S.tx.filter(x=>x.acc=="tc"&&x.amt==7).length')==1 and any(l[0]==GM+":7" and l[1] for l in L()),[Q(),L()])
  E('window.__n.items=%s;notifScan()'%json.dumps([n("1",BANK,"Test Bank","Your credit card ending 0808 was used for QAR 7.00 at TEST DINER DOH DOHA QA on 28/11/2026. Available limit QAR 2,993.00",t0)]))
  ok('the same message read again is dropped',not any(q[1]==7 for q in Q()))
  # ---------- an entry from a bank statement: the same day counts, the day before doesn't ----------
  E('S.tx.push({id:"st1",kind:"out",acc:"tc",amt:12,cur:"QAR",date:"2026-11-27",payee:"Test Grocery",cat:"Food",imp:"imp_x",ct:Date.now(),ut:Date.now()});save()')
  E('window.__n.items=%s;notifScan()'%json.dumps([n("8",WAL,"Google Wallet","Test Grocery. QAR 12.00 with Visa •••• 0808",int(time.mktime((2026,11,27,18,0,0,0,0,-1))*1000)),
     n("9",WAL,"Google Wallet","Test Grocery. QAR 12.00 with Visa •••• 0808",int(time.mktime((2026,11,26,18,0,0,0,0,-1))*1000))]))
  ok('statement entry: same day already saved, the day before still asked',[q[1] for q in Q()].count(12)==1 and any(l[0]==WAL+":8" and l[1]=="st1" for l in L()),[Q(),L()])
  # ---------- a card bill: the transfer is already in from the statement ----------
  E('S.tx.push({id:"tr1",kind:"tr",acc:"sb",to:"tc",amt:328.38,got:328.38,fee:0,cur:"QAR",date:"2026-11-28",note:"Card bill 0808",imp:"imp_y",ct:Date.now(),ut:Date.now()});save()')
  E('window.__n.items=%s;notifScan()'%json.dumps([n("10",BANK,"Test Bank","Payment of QAR 328.38 has been received for your credit card ending 0808. Thank you",t0+2*H1)]))
  ok('card bill payment already in: not asked',not any(q[1]==328.38 for q in Q()) and any(l[0]==BANK+":10" and l[1]=="tr1" for l in L()),[Q(),L()])
  # ---------- Payment review shows them with the approved ones ----------
  E('payReview()');pg.wait_for_timeout(200)
  if pg.locator('#over [data-pr="ok"],#over [data-act="prTab"][data-id="ok"]').count():pg.locator('#over [data-pr="ok"],#over [data-act="prTab"][data-id="ok"]').first.click();pg.wait_for_timeout(200)
  t=pg.inner_text('#over');ok('Payment review: Already saved, with Not the same',"Already saved" in t and "Same payment as" in t and pg.locator('#over [data-act="revSameAdd"]').count()>=1,t[:900])
  pg.locator('#over [data-act="revSameAdd"]').first.click();pg.wait_for_timeout(300)
  ok('“Not the same: add it” opens the form with the amount',pg.locator('#over #f_amt').count()==1 and float(pg.input_value('#over #f_amt') or 0)>0)
  pg.click('#over .x')
  ok('an answer on the phone for it is done',E('payApply({id:"%s:10",act:"add",amt:328.38,kind:"tr",t:Date.now()})'%BANK)=="done")
  c.close()
  # ---------- pop-ups ----------
  c,pg=h.page(native=True);E=pg.evaluate;E(ACTS)
  E('window.__n.pop={on:true,pd_pay2:4,pd_alerts:2,pd_daily:3}');E('popCheck()');pg.wait_for_timeout(200)
  ok('pop-ups found off for dues',E('S.cfg.popBad')==True)
  E('tab="home";render()');pg.wait_for_timeout(200);ok('Home says pop-ups are off',"Pop-ups are off" in pg.inner_text('body'))
  E('popSheet()');pg.wait_for_timeout(300);t=pg.inner_text('#over')
  ok('the pop-up screen: payments on, dues off',"Payment confirmations" in t and "Pops up when a payment is found" in t and "Only in the notification list" in t,t[:600])
  pg.click('#over [data-act="popOpen"][data-id="pd_alerts"]');pg.wait_for_timeout(200);ok('Turn on opens that channel’s settings',E('window.__n.popOpened')=='pd_alerts')
  pg.click('#over [data-act="popTestPay"]');pg.wait_for_timeout(200);ok('test a payment pop-up',E('window.__n.tested')==1)
  pg.click('#over [data-act="popTestDue"]');pg.wait_for_timeout(300)
  S_=[c_[2] for c_ in calls(E,'schedule')];ok('test due alert on the pop-up channel',any(x['notifications'][0].get('channelId')=='pd_alerts' for x in S_),S_[-1:])
  E('S.dates=S.dates||[];S.dates.push({id:"d9",name:"Test rent",date:plus(5),amt:500,cur:"QAR",rep:"none"});save()');E('nativeNotify()');pg.wait_for_timeout(500)
  S_=[c_[2] for c_ in calls(E,'schedule')];N_=[x for s in S_ for x in s['notifications']]
  ok('every alert goes to a channel: dues pop up, the evening summary stays quiet',N_ and all(x.get('channelId') for x in N_) and any(x['channelId']=='pd_alerts' and 'due' in x['title'] for x in N_) and all(x['channelId']=='pd_daily' for x in N_ if 9000<=x['id']<9100),[(x['id'],x.get('channelId'),x['title'][:20]) for x in N_][:8])
  CC=[c_[2] for c_ in calls(E,'createChannel')];ok('channels made: dues high, summary normal',any(x['id']=='pd_alerts' and x['importance']==4 for x in CC) and any(x['id']=='pd_daily' and x['importance']==3 for x in CC),CC)
  pg.click('#over .x');E('settings()');pg.wait_for_timeout(200);ok('Settings has Pop-ups',pg.locator('#over [data-act="popSheet"]').count()==1)
  E('window.__n.pop={on:true,pd_pay2:4,pd_alerts:4,pd_daily:3};popCheck()');pg.wait_for_timeout(200);ok('all on: no warning',E('S.cfg.popBad')==False)
  # ---------- cards: strict, and a payment the bank dates tomorrow counts ----------
  E('S.acc.push({id:"sb",name:"Bank",type:"bank",cur:"QAR",open:5000},{id:"tk",name:"Card K",type:"card",cur:"QAR",open:0,lim:1000,l4:"0999"});addTx({kind:"out",acc:"tk",amt:200,cur:"QAR",date:today(),payee:"Shop"});save()')
  E('S.cfg.cardBank={tk:{avl:800,t:Date.now()-60000,src:"SMS"}};save()');ok('alert matches',E('cardRecon(ac("tk"))')==0)
  E('addTx({kind:"tr",acc:"sb",to:"tk",amt:200,got:200,cur:"QAR",date:plus(1),note:"Card bill"});addTx({kind:"in",acc:"tk",amt:200,cur:"QAR",date:today(),payee:"Payment received",cat:"Card payment"});save()')
  ok('a payment saved twice (one dated tomorrow by the bank) is caught',abs(E('cardRecon(ac("tk"))')+400)<0.005,E('cardRecon(ac("tk"))'))
  E('accMenu("tk")');t=pg.inner_text('#over');ok('the card page says how far apart and offers the finder',"differs by QAR 400" in t and pg.locator('#over [data-act="dupScan"]').count()>=1,t[:700])
  c.close()
  # ---------- a long card statement: payments from before the bank account's records stay on the card ----------
  c,pg=h.page(native=True);E=pg.evaluate
  X=[38,158,265,482,605,725,845]
  def line(y,cells,p=1):
    items=[{'x':x,'s':s,'w':len(s)*5.2} for x,s in cells if s];return {'p':p,'y':y,'t':'   '.join(i['s'] for i in items),'items':items}
  def row(y,d,pd,desc,a,typ,p=1):return line(y,[(X[0],d),(X[1],pd),(X[2],desc),(X[3],'QAR'),(X[4],a),(X[5],a),(X[6],typ)],p)
  Lc=[line(1000,[(38,'Transaction History')]),line(980,[(38,'4111 XXXX XXXX 0808')]),line(940,[(X[0],'Transaction date'),(X[1],'Processed date'),(X[2],'Transaction details'),(X[3],'Transaction currency'),(X[4],'Transaction amount'),(X[5],'QAR equivalent'),(X[6],'Type')]),
      row(920,'28/11/2026','UNBILLED','TEST DINER DOH DOHA QA','-7.00','Unbilled'),row(900,'09/11/2026','09/11/2026','Paid using bankDirect 091126K90002','60.25','Payment/Refund'),
      row(880,'05/11/2026','06/11/2026','TEST GROCERY DOH DOHA QA','-15.25','Billed'),row(860,'20/07/2026','20/07/2026','Paid using bankDirect 200726K00001','100.00','Payment/Refund'),
      line(1000,[(38,'Transaction History')],2),line(980,[(38,'4111 XXXX XXXX 0808')],2),row(960,'15/07/2026','16/07/2026','TEST SHOP DOHA QA','-50.00','Billed',2)]
  E('''()=>{S.acc.push({id:"sb",name:"Test Savings",type:"bank",cur:"QAR",open:1000},{id:"tc",name:"Test Card",type:"card",cur:"QAR",open:0,l4:"0808",lim:3000});
    S.tx.push({id:"s1",kind:"tr",acc:"sb",to:"tc",amt:60.25,got:60.25,fee:0,cur:"QAR",date:"2026-11-10",note:"Card bill 0808",raw:"CARD BILL PAYMENT,091126K90002,CARD NO 4111XXXXXXXX0808",imp:"imp_s",ct:1,ut:1},{id:"s2",kind:"in",acc:"sb",amt:500,cur:"QAR",date:"2026-10-31",payee:"Salary",cat:"Salary",imp:"imp_s",ct:1,ut:1});
    S.cfg.stmts=[{acc:"sb",from:"2026-10-31",to:"2026-11-29",n:2,close:1439.75,at:Date.now(),ok:true}];S.cfg.cardBank={tc:{avl:2993,t:new Date(2026,10,28,19,0).getTime(),src:"SMS"}};save()}''')
  before=E('Math.round(bal(ac("sb"))*100)/100')
  E('L=>{const P=stmtParse(L);csvForm();setVal("f_acc","tc");stPend={acc:"tc",P,M:stmtMatch(P,"tc")};stmtShow()}',Lc)
  P=E('stPend.P.rows.map(r=>[r.date,r.dir,r.amt])');ok('both pages read',len(P)==5 and P[0]==['2026-07-15','out',50],P)
  ok('the matched payment takes the card’s date',any(f[0]=="date" for f in E('stFixRows(stPend,ac("tc")).map(f=>[f.op,f.x.id])')))
  t=pg.inner_text('#csvout');ok('the July payment is said to stay on the card',"noted on the card only" in t,t[:900])
  pg.click('#csvout [data-act="stAll"]');pg.wait_for_timeout(500);t=pg.inner_text('#csvout')
  ok('card matches the alert: owes 7',"✓ Matches the bank" in t and abs(E('bal(ac("tc"))')+7)<0.005,[E('bal(ac("tc"))'),t[:500]])
  ok('the bank account is untouched by the July payment',abs(E('Math.round(bal(ac("sb"))*100)/100')-before)<0.005 and E('S.tx.filter(x=>x.kind=="tr"&&x.to=="tc").length')==1,[before,E('bal(ac("sb"))')])
  ok('the July payment is on the card only, as a card payment',E('S.tx.filter(x=>x.acc=="tc"&&x.kind=="in").map(x=>[x.date,x.amt,x.cat])')==[['2026-07-20',100,'Card payment']],E('S.tx.filter(x=>x.acc=="tc"&&x.kind=="in").map(x=>[x.date,x.amt,x.cat,x.payee])'))
  ok('the November payment is one transfer, on the card’s date',E('S.tx.filter(x=>x.kind=="tr"&&x.to=="tc").map(x=>[x.date,x.amt])')==[['2026-11-09',60.25]])
  c.close()
finally:
  h.done()
