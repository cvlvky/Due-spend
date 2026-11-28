"""Version 33.1: only payment sources are read, review history, card bills as transfers, overdue alerts (made-up data only)."""
import json,sys,time,datetime
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
MOCK='''(()=>{const np=window.Capacitor.nativePromise;window.Capacitor.nativePromise=async(p,m,o)=>{const N=window.__n;
 if(m=="payActs"){const a=N.acts||[];N.acts=[];return {items:a}}if(m=="notifLog")return {items:N.nlog||[]};if(m=="appsSkipped")return {items:N.skipped||[]};return np(p,m,o)}})()'''
def calls(E,m):return [c[2] for c in E('window.__calls') if c[1]==m]
def item(pkg,app,body,t):return {"id":pkg+":"+format(abs(hash(body))%(1<<32),'x'),"pkg":pkg,"app":app,"body":body,"time":str(t)}
ids=lambda E:E('S.cfg.smsq.map(x=>x.id)')
try:
  c,pg=h.page(native=True);E=pg.evaluate
  E(MOCK);E('S.cfg.ntfAuto=true;S.cfg.smsAuto=true;save()');now=int(time.time()*1000);dd=datetime.date.today().strftime('%d-%m-%y')
  # ---------- 1. only payment sources ----------
  TG=item("org.telegram.messenger","Telegram","Ravi Kumar. I sent you ₹500 for the movie tickets, paid by UPI",now)
  WA=item("com.whatsapp","WhatsApp","Amma. Paid ₹2,000 school fees today",now+1)
  TB=item("com.talabat","Talabat","Your order of QAR 45.00 is on the way, paid by card",now+2)
  PS=item("com.google.android.apps.messaging","Messages","Amma. Paid ₹1,500 for groceries, sent from my account",now+3)
  BK=item("com.qnb.mobile","QNB","Your card ending 4821 was used for QAR 75.00 at CITY PHARMACY",now+4)
  GP=item("com.google.android.apps.nbu.paisa.user","Google Pay","Paid ₹350 to Fresh Mart. ₹350 paid to Fresh Mart using UPI",now+5)
  BS=item("com.google.android.apps.messaging","Messages","AX-AXISBK. INR 900.00 spent on Axis Bank card XX4400 at BOOK HOUSE on %s"%dd,now+6)
  E('window.__n.items=%s'%json.dumps([TG,WA,TB,PS,BK,GP,BS]));E('notifScan()');q=ids(E)
  ok('Telegram and WhatsApp are never read',TG['id'] not in q and WA['id'] not in q,q)
  ok('other apps such as shopping apps are not read',TB['id'] not in q)
  ok('an SMS from a person is not read',PS['id'] not in q)
  ok('bank apps, payment apps and bank SMS are read',all(x['id'] in q for x in [BK,GP,BS]),q)
  E('window.__n.sms=[{id:"s1",address:"+97455123456",body:"I sent you QAR 500 for the tickets",date:String(Date.now())},{id:"s2",address:"AX-HDFCBK",body:"Rs 640.00 debited from A/c XX1234 to ZOOM CAFE on %s. Avl Bal Rs 9,000",date:String(Date.now())},{id:"s3",address:"+919876543210",body:"Rs 210.00 debited from A/c XX1234 to TEA POINT on %s. Avl Bal Rs 8,790",date:String(Date.now())}];S.cfg.smsAt=Date.now()-6e4'%(dd,dd))
  E('smsScan()');q=ids(E)
  ok('bank SMS inbox: a person’s SMS is passed over',"s1" not in q and not any("s1"==x.get('id') for x in E('S.cfg.smsLog||[]')),q)
  ok('bank SMS inbox: bank messages are read, even from a number',"s2" in q and "s3" in q)
  P=calls(E,'payPop');E('payPopSync()');P=calls(E,'payPop')[-1];ok('the phone gets the read and not-read lists',P.get('allow')=="" and P.get('ign')=="",P)
  # an app that showed an amount can be read if it is your bank's
  E('window.__n.skipped=[{pkg:"com.talabat",app:"Talabat",t:String(Date.now())},{pkg:"com.example.moneybox",app:"Money Box",t:String(Date.now())}]')
  E('appsSheet()');pg.wait_for_selector('#apps_sheet');t=pg.inner_text('#over')
  ok('Apps read explains what is read and never read',all(k in t for k in ["Bank and card apps","Wallets and payment apps","Email","SMS from banks","Never read","Telegram, WhatsApp"]),t[:400])
  ok('apps that showed an amount are listed by name',"Talabat" in t and "Money Box" in t and "Apps that showed an amount" in t)
  pg.click('#over [data-act="appRead"][data-id="com.example.moneybox"]');pg.wait_for_timeout(250)
  ok('Read it turns that app on',"com.example.moneybox" in E('S.cfg.readAdd') and "com.example.moneybox" in calls(E,'payPop')[-1].get('allow',''))
  NB=item("com.example.moneybox","Money Box","QAR 120.00 debited from your account 7788 at LULU",now+8)
  E('window.__n.items=[%s]'%json.dumps(NB));E('notifScan()');ok('then its payments are read',NB['id'] in ids(E))
  E('appsSheet()');pg.wait_for_selector('#over [data-act="appStop"]');pg.click('#over [data-act="appStop"][data-id="com.example.moneybox"]');pg.wait_for_timeout(250)
  ok('Stop reading turns it off and clears its payments',"com.example.moneybox" not in E('S.cfg.readAdd') and NB['id'] not in ids(E))
  E('ACT.appRead("org.telegram.messenger")');ok('a chat app can’t be turned on',E('payIgn("org.telegram.messenger")') and "org.telegram.messenger" not in (E('S.cfg.readAdd')or[]))
  E('window.__n.nlog=%s'%json.dumps([{"app":"Google Pay","pkg":GP['pkg'],"body":GP['body'],"time":str(now),"why":"kept"}]))
  E('readCheck()');pg.wait_for_selector('#over [data-act="ignAdd"]');pg.click('#over [data-act="ignAdd"]');pg.wait_for_timeout(300)
  ok('Don’t read this app stops any app and clears its payments',GP['pkg'] in E('S.cfg.ignAdd') and GP['id'] not in ids(E))
  E('ACT.appAgain(%s)'%json.dumps(GP['pkg']));ok('and it can be read again',GP['pkg'] not in E('S.cfg.ignAdd'))
  # Payment tracking links to it
  E('trackHub()');pg.wait_for_selector('#trk_hub');t=pg.inner_text('#over')
  ok('Payment tracking shows what is read and the review history',"Apps read" in t and "never read" in t and "Payment review" in t,t[-600:])
  pg.click('#over .x')
  # ---------- 3. card bill paid from savings: a transfer ----------
  E('ac("a1").l4="1234";S.acc.push({id:"c1",name:"HDFC Card",type:"card",cur:"INR",open:0,l4:"5678"});S.cfg.smsq=[];save()')
  CD=item("com.google.android.apps.messaging","Messages","HDFCBK. INR 25,000.00 debited from A/c XX1234 on %s towards HDFC Bank Credit Card XX5678 payment. Avl bal INR 40,000"%dd,now+20)
  CC=item("com.google.android.apps.messaging","Messages","HDFCBK. Payment of Rs. 25,000.00 has been received on your HDFC Bank Credit Card XX5678 on %s. Thank you."%dd,now+21)
  E('window.__n.items=%s'%json.dumps([CD,CC]));E('notifScan()');q=E('S.cfg.smsq')
  ok('the bank and the card message are one card bill payment',len(q)==1 and q[0]['p'].get('cc')==1,[x['p'] for x in q])
  p=q[0]['p'];ok('from savings to the card',p.get('ccFrom')=="a1" and p.get('ccTo')=="c1",p)
  E('smsReview()');pg.wait_for_selector('#over .ccnote');t=pg.inner_text('#over')
  ok('the review card offers a transfer, not spending',"A transfer, not spending" in t and "SBI Savings" in t and "HDFC Card" in t and pg.locator('#over [data-act="ccSave"]').count()==1 and pg.locator('#over [data-act="smsQuick"]').count()==0,t[:500])
  ok('expense is still possible',"Expense instead" in t)
  ok('Save all never saves a card bill as spending',E('quickOk(S.cfg.smsq[0])') is False and "Save all" not in t)
  n0=E('S.tx.length');pg.click('#over [data-act="ccSave"]');pg.wait_for_timeout(250);tx=E('S.tx[S.tx.length-1]')
  ok('Save transfer records a transfer from savings to the card',E('S.tx.length')==n0+1 and tx['kind']=="tr" and tx['acc']=="a1" and tx['to']=="c1" and tx['amt']==25000 and len(E('S.cfg.smsq'))==0,tx)
  # on the phone: Add transfer
  CD2=item("com.google.android.apps.messaging","Messages","HDFCBK. INR 8,000.00 debited from A/c XX1234 on %s towards HDFC Bank Credit Card XX5678 payment."%dd,now+30)
  E('window.__n.items=[%s]'%json.dumps(CD2));E('notifScan()')
  E('window.__n.acts=[{id:%s,act:"add",t:Date.now(),amt:8000,cur:"INR",kind:"tr"}]'%json.dumps(CC['id'].replace(CC['id'].split(':')[1],'zz')));E('payNow()')
  tx=E('S.tx[S.tx.length-1]');ok('Add transfer on the phone saves the transfer',tx['kind']=="tr" and tx['amt']==8000 and tx['to']=="c1" and len(E('S.cfg.smsq'))==0,tx)
  # when the card isn't known yet: Transfer… opens the form
  E('S.acc=S.acc.filter(a=>a.id!="c1");S.acc.push({id:"c2",name:"QNB Card",type:"card",cur:"QAR",open:0},{id:"c3",name:"CBQ Card",type:"card",cur:"QAR",open:0});save()')
  QC=item("com.qnb.mobile","QNB","Thank you for your payment of QAR 2,000.00 towards your Credit Card",now+40)
  E('window.__n.items=[%s]'%json.dumps(QC));E('notifScan()');E('smsReview()');pg.wait_for_selector('#over [data-act="ccForm"]')
  ok('unknown card: no one-tap save',pg.locator('#over [data-act="ccSave"]').count()==0)
  pg.click('#over [data-act="ccForm"]');pg.wait_for_selector('#over #f_from');ok('the transfer form opens for the card bill',"Card bill payment" in pg.inner_text('#over h2') and pg.input_value('#f_amt')=="2000")
  pg.select_option('#f_from','a2');pg.select_option('#f_to','c3');n1=E('S.tx.length');pg.click('#over [data-act="saveTr"]');pg.wait_for_timeout(250)
  tx=E('S.tx[S.tx.length-1]');ok('saving it records the transfer and clears the payment',E('S.tx.length')==n1+1 and tx['kind']=="tr" and tx['to']=="c3" and len(E('S.cfg.smsq'))==0,tx)
  ok('next time the bank account for that card is remembered',E('S.cfg.ccFrom&&S.cfg.ccFrom.c3')=="a2")
  # not card bills
  ok('a bill reminder is not a payment',E('parseSms("Your credit card statement is ready. Minimum amount due QAR 300.00, payment due date 10/12")') is None)
  sp=E('parseSms("Rs.1,200.00 spent on HDFC Bank Credit Card XX5678 at AMAZON on %s")'%dd);ok('a card purchase stays an expense',sp and not sp.get('cc') and sp['kind']=="out",sp)
  # ---------- 2. review history ----------
  SK=item("com.qnb.mobile","QNB","Your card ending 4821 was used for QAR 33.00 at SNACK BAR",now+50)
  E('window.__n.items=[%s]'%json.dumps(SK));E('notifScan()');E('smsReview()');pg.wait_for_selector('#over [data-act="smsSkip"][data-id="%s"]'%SK['id']);pg.click('#over [data-act="smsSkip"][data-id="%s"]'%SK['id']);pg.wait_for_timeout(200)
  E('ac("a2").l4="4821";save()')
  PH=item("com.qnb.mobile","QNB","Your card ending 4821 was used for QAR 18.00 at JUICE CORNER",now+51)
  E('window.__n.items=[%s]'%json.dumps(PH));E('notifScan()');E('window.__n.acts=[{id:%s,act:"add",t:Date.now(),amt:18,cur:"QAR",kind:"out"}]'%json.dumps(PH['id']));E('payNow()')
  L=E('S.cfg.payLog');acts=[x['act'] for x in L];vias=[x['via'] for x in L]
  ok('every decision is recorded apart from the entries',"transfer" in acts and "skip" in acts and "add" in acts and "phone" in vias and "app" in vias,list(zip(acts,vias)))
  E('prChecked=Date.now();payReview("ok")');pg.wait_for_selector('#rev_sheet');t=pg.inner_text('#over')
  ok('Approved lists them by day',all(k in t for k in ["Today","Saved as a transfer","Added on the phone","Approved","Ignored","Waiting"]) and "Skipped in the app" not in t,t[:700])
  pg.click('#over [data-act="prTab"][data-id="no"]');pg.wait_for_timeout(150);t=pg.inner_text('#over')
  ok('the Ignored tab shows only skipped',"Skipped in the app" in t and "Added on the phone" not in t)
  pg.click('#over [data-act="revAdd"]');pg.wait_for_selector('#over #f_amt');ok('Add it brings a skipped payment back',pg.input_value('#f_amt')=="33")
  pg.click('#over .x');E('payReview("ok")');pg.wait_for_selector('#over [data-act="revOpen"]');pg.click('#over [data-act="revOpen"]');pg.wait_for_selector('#over #f_amt');ok('Open shows the saved entry',pg.locator('#over #f_amt').count()==1)
  pg.click('#over .x')
  # ---------- 4. overdue alerts ----------
  E('window.__calls=[]');E('S.docs.push({id:"d9",name:"Test permit",type:"Permit",exp:plus(40),rem:30});nativeNotify()');pg.wait_for_timeout(300)
  N=[n for c in calls(E,'schedule') for n in (c.get('notifications') or [])]
  od=[n for n in N if str(n.get('title','')).startswith('Not paid yet')]
  ok('a due gets a "not paid yet" alert after its date',len(od)>=1 and all(7700<=n['id']<7800 for n in od) and any(n.get('actionTypeId')=="DUE" for n in od),[n['title'] for n in od][:3])
  ok('document expiry alerts are scheduled',any(n['title']=="Test permit expires in 30 days" for n in N))
  ok('the usual due reminders are still there',any(" is due " in str(n.get('title','')) for n in N))
  for tb in ['home','dates','acc','spend','rep']:
    E('tab=%s;render()'%json.dumps(tb));ok('tab '+tb+' renders','couldn’t be shown' not in pg.inner_text('#app'))
finally:
  h.done()
