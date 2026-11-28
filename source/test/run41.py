"""Version 33: Add or Skip on payment notifications, Google Wallet and Google Pay reading, the Payment tracking screen,
Reports as five pages of pictures and the Home spending bar (made-up data only)."""
import json,sys,time,datetime
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
ACTS='''(()=>{const np=window.Capacitor.nativePromise;window.Capacitor.nativePromise=async(p,m,o)=>{const N=window.__n;
 if(m=="payActs"){const a=N.acts||[];N.acts=[];return {items:a}}if(m=="payTest"){N.tested=(N.tested||0)+1;return {}}return np(p,m,o)}})()'''
def calls(E,m):return [c[2] for c in E('window.__calls') if c[1]==m]
try:
  c,pg=h.page(native=True);E=pg.evaluate
  E(ACTS);E('S.cfg.ntfAuto=true;ac("a2").l4="4821";ac("a1").l4="1234";save()')
  now=int(time.time()*1000);dd=datetime.date.today().strftime('%d-%m-%y')
  # ---------- the phone is told to ask ----------
  E('payPopSync()');P=calls(E,'payPop');ok('the phone is told to ask about payments',P and P[-1].get('on') is True and P[-1].get('apps') is True and isinstance(P[-1].get('auto'),list),P[-1:])
  # ---------- Google Wallet: the shop is the title, only the amount below ----------
  W={"id":"com.google.android.apps.walletnfcrel:aa1","pkg":"com.google.android.apps.walletnfcrel","app":"Google Wallet","body":"Saffron Cafe. QAR 45.00 with Visa •••• 4821","time":str(now)}
  E('window.__n.items=[%s]'%json.dumps(W));E('notifScan()')
  m=[x for x in E('S.cfg.smsq') if x['id']==W['id']];p=m[0]['p'] if m else {}
  ok('Google Wallet payment: shop, amount and card',p.get('amt')==45 and p.get('cur')=='QAR' and p.get('kind')=='out' and p.get('payee')=='Saffron Cafe' and p.get('acc')=='a2',p)
  R=E('walletNorm({pkg:"com.google.android.apps.walletnfcrel",body:"Refund from Noon. QAR 80.00 to Visa •••• 4821"})');rp=E('t=>parseSms(t)',R)
  ok('a Google Wallet refund is money in from the shop',rp['kind']=='in' and rp['payee']=='Noon' and rp['amt']==80,[R,rp])
  # ---------- Add on the notification: saved straight into the list ----------
  n0=E('S.tx.length')
  E('window.__n.acts=[{id:%s,act:"add",t:Date.now(),amt:45,cur:"QAR",kind:"out"}]'%json.dumps(W['id']));E('payNow()')
  t=E('S.tx[S.tx.length-1]')
  ok('Add on the phone saves the expense',E('S.tx.length')==n0+1 and t['amt']==45 and t['acc']=='a2' and t['payee']=='Saffron Cafe' and t['kind']=='out',t)
  ok('it leaves Payments to review',not any(x['id']==W['id'] for x in E('S.cfg.smsq')) and E('S.cfg.payTx[%s]'%json.dumps(W['id']))==t['id'])
  ok('says so',"1 payment added" in pg.inner_text('#toast'),pg.inner_text('#toast'))
  # ---------- Undo on the "Added" notification ----------
  E('window.__n.acts=[{id:%s,act:"skip",t:Date.now()}]'%json.dumps(W['id']));E('payNow()')
  ok('Undo on the phone takes it back out',E('S.tx.length')==n0 and not E('S.tx.some(x=>x.id==%s)'%json.dumps(t['id'])))
  # ---------- Google Pay: "paid you" is money in ----------
  GP={"id":"com.google.android.apps.nbu.paisa.user:bb2","pkg":"com.google.android.apps.nbu.paisa.user","app":"Google Pay","body":"Ravi Kumar paid you ₹500. ₹500 received from Ravi Kumar","time":str(now)}
  E('window.__n.items=[%s]'%json.dumps(GP));E('notifScan()')
  m=[x for x in E('S.cfg.smsq') if x['id']==GP['id']];p=m[0]['p'] if m else {}
  ok('Google Pay "paid you" is income from that person',p.get('kind')=='in' and p.get('amt')==500 and p.get('payee')=='Ravi Kumar',p)
  E('window.__n.acts=[{id:%s,act:"skip",t:Date.now()}]'%json.dumps(GP['id']));E('payNow()')
  ok('Skip on the phone removes it',not any(x['id']==GP['id'] for x in E('S.cfg.smsq')) and E('S.tx.length')==n0)
  # ---------- an answer for an email the app hasn't read yet waits for it ----------
  E('window.__n.acts=[{id:"m:gT1",act:"add",t:Date.now(),amt:1250,cur:"INR",kind:"out"}]');E('payNow()')
  ok('an answer that arrives first waits',len(E('S.cfg.payPend'))==1)
  E('mailTake({update:async()=>{}},{items:[{id:"gT1",from:"HDFC Bank <alerts@example.com>",subject:"Transaction alert",body:"Rs.1,250.00 has been debited from your account XX1234 to AMAZON on %s",time:Date.now()}]})'%dd)
  pg.wait_for_timeout(200);t=E('S.tx[S.tx.length-1]')
  ok('when the email comes in, it is saved',E('S.tx.length')==n0+1 and t['amt']==1250 and t['acc']=='a1' and len(E('S.cfg.payPend'))==0,t)
  ok('the hourly email check is told the app has it',any('gT1' in (x.get('ids') or []) for x in calls(E,'mailSeen')))
  n1=E('S.tx.length')
  # ---------- Add on the phone when the message names no account (two bank accounts in rupees) ----------
  E('S.acc.push({id:"a4",name:"Test Bank",type:"bank",cur:"INR",open:0});save()')
  MB={"id":"com.google.android.apps.messaging:cc3","pkg":"com.google.android.apps.messaging","app":"Messages","body":"MYBANK. Rs.300.00 spent at ZEN TEA HOUSE on %s"%dd,"time":str(now)}
  E('window.__n.items=[%s]'%json.dumps(MB));E('notifScan()')
  E('window.__n.acts=[{id:%s,act:"add",t:Date.now(),amt:300,cur:"INR",kind:"out"}]'%json.dumps(MB['id']));E('payNow()')
  m=[x for x in E('S.cfg.smsq') if x['id']==MB['id']]
  ok('without an account it waits, marked',m and m[0].get('yes')==1 and E('S.tx.length')==n1 and "need an account" in pg.inner_text('#toast'),m)
  E('smsReview()');pg.wait_for_timeout(150)
  ok('Payments to review shows that you tapped Add',"You tapped Add on the phone" in pg.inner_text('#over'))
  pg.click('#over [data-act="smsAdd"][data-id="%s"]'%MB['id']);pg.wait_for_selector('#over #f_acc');pg.select_option('#f_acc','a1');pg.click('#over [data-act="saveTx"]');pg.wait_for_timeout(200)
  ok('saving it remembers the account for that bank',E('S.tx.length')==n1+1 and E('S.cfg.srcAcc&&S.cfg.srcAcc["mybank|INR"]')=='a1',E('S.cfg.srcAcc'))
  ok('the question on the phone is cleared',any(MB['id'] in (x.get('ids') or []) for x in calls(E,'payDone')))
  MB2={"id":"com.google.android.apps.messaging:cc4","pkg":"com.google.android.apps.messaging","app":"Messages","body":"MYBANK. Rs.120.00 spent at CORNER BAKERY on %s"%dd,"time":str(now+5)}
  E('window.__n.items=[%s]'%json.dumps(MB2));E('notifScan()')
  E('window.__n.acts=[{id:%s,act:"add",t:Date.now(),amt:120,cur:"INR",kind:"out"}]'%json.dumps(MB2['id']));E('payNow()')
  t=E('S.tx[S.tx.length-1]');ok('next time Add saves straight into that account',E('S.tx.length')==n1+2 and t['amt']==120 and t['acc']=='a1',t)
  # ---------- opening the app from the notification ----------
  W3={"id":"com.google.android.apps.walletnfcrel:dd5","pkg":"com.google.android.apps.walletnfcrel","app":"Google Wallet","body":"Lulu Express. QAR 64.25 with Visa •••• 4821","time":str(now+9)}
  E('window.__n.items=[%s]'%json.dumps(W3));E('notifScan()');E('window.__n.launch=%s;nativeLaunch()'%json.dumps(json.dumps({"add":"review","payid":W3['id']})))
  pg.wait_for_selector('#over #f_amt');ok('tapping the notification opens that payment',pg.input_value('#f_amt')=='64.25' and pg.input_value('#f_acc')=='a2')
  pg.click('#over .x')
  # ---------- Payment tracking screen ----------
  E('settings()');pg.wait_for_timeout(150);st=pg.inner_text('#over')
  ok('Settings has one Payment tracking entry',"Payment tracking" in st and pg.locator('#over [data-act="notifAuto"]').count()==0 and pg.locator('#over [data-act="smsAuto"]').count()==0)
  pg.click('#over [data-act="trackHub"]');pg.wait_for_selector('#trk_hub');t=pg.inner_text('#over')
  ok('it lists every place and the question',all(k in t for k in ['Bank SMS','Bank apps, wallets and SMS alerts','Google Wallet','Gmail','Outlook','A notification for each payment','Last messages checked']),t[:600])
  pg.click('#over [data-act="payPopT"]');pg.wait_for_timeout(200)
  ok('the question can be turned off',E('S.cfg.payPop')==False and calls(E,'payPop')[-1].get('on') is False and "Payments wait on Home" in pg.inner_text('#toast'))
  pg.click('#over [data-act="payPopT"]');pg.wait_for_timeout(200);ok('and on again',E('payPopOn()') and calls(E,'payPop')[-1].get('on') is True)
  pg.click('#over [data-act="payTest"]');pg.wait_for_timeout(150);ok('example notification',E('window.__n.tested')==1)
  E('S.cfg.ntfAuto=false;save()');E('trackHub()');pg.wait_for_timeout(150)
  ok('says what to turn on when nothing is watched',"so the app sees payments as they happen" in pg.inner_text('#over'))
  E('S.cfg.ntfAuto=true;save()');E('S.cfg.hide=true;payPopSync()');ok('hidden amounts stay hidden on the notification',calls(E,'payPop')[-1].get('hide') is True);E('S.cfg.hide=false;save()')
  pg.click('#over .x')
  # ---------- Reports: five pages ----------
  E('S.cfg.rSeg="";tab="rep";render()');pg.wait_for_timeout(200)
  ok('Reports opens on Summary with five pages',pg.locator('#app .rsegs button').count()==5 and E('rSeg()')=="sum" and pg.locator('#app .rsegs button.on').inner_text().strip()=="Summary")
  t=pg.inner_text('#app')
  ok('Summary: glance, health lights, where it went',all(k in t for k in ['This month at a glance','Kept from income','Money health','Where it went','Where the money went']) and 'Fixed and flexible spending' not in t and 'Maturity ladder' not in t,t[:500])
  ok('health shows as coloured badges',pg.locator('#app .hlth .hcell').count()>=3 and pg.locator('#app .hlth .hbadge').count()>=3)
  s0=E('(()=>{const d=document.createElement("div");d.innerHTML=summary(mon)[0]||"";return d.textContent.trim()})()')
  ok('the long month summary text is gone',s0 and s0[:40] not in t,s0)
  ok('the hint to tap numbers stays',"Tap any number" in t)
  pg.click('#app .rsegs [data-id="spend"]');pg.wait_for_timeout(150);t=pg.inner_text('#app')
  ok('Spending page',all(k in t for k in ['Fixed and flexible spending','Last 6 months']) and 'This month at a glance' not in t and E('S.cfg.rSeg')=='spend')
  ok('budgets as bars',"Budgets this month" in t and pg.locator('#app .meter').count()>=1)
  pg.click('#app .rsegs [data-id="flow"]');pg.wait_for_timeout(150);t=pg.inner_text('#app')
  ok('Cash flow page, no month buttons',"Cash-flow forecast" in t and pg.locator('#app [data-act="mon"]').count()+pg.locator('#app .mon').count()==0,t[:300])
  pg.click('#app .rsegs [data-id="wealth"]');pg.wait_for_timeout(150);t=pg.inner_text('#app')
  ok('Wealth page with return bars',"Investment returns" in t and "a year" in t and pg.locator('#app .hbt i').count()>=1 and "Loans" in t)
  pg.click('#app .rsegs [data-id="tools"]');pg.wait_for_timeout(150);t=pg.inner_text('#app')
  ok('Tools page',all(k in t for k in ['Streaks and challenge','Reports to keep','What if','Goal planner']))
  E('ACT.rSeg("flow")');ok('tables fold away under charts',E('[...document.querySelectorAll("#app details.rinfo > summary")].some(s=>s.textContent=="See the numbers")'))
  # in Tamil the pages still split and translate
  E('S.cfg.lang="ta";ACT.rSeg("sum")');pg.wait_for_timeout(150);ok('Tamil: pages still work',pg.locator('#app .rsegs button').count()==5 and pg.locator('#app .hlth').count()==1);E('S.cfg.lang="";save()')
  # ---------- Home: this month as a bar ----------
  E('tab="home";render()');pg.wait_for_timeout(150)
  ok('Home shows how much of the budgets is used',pg.locator('#app .pace .meter').count()==1 and ("Budgets used" in pg.inner_text('#app .pace')))
  E('S.bud=[];render()');pg.wait_for_timeout(100)
  ok('without budgets it compares with a usual month',pg.locator('#app .pace').count()==0 or "usual" in pg.inner_text('#app .pace'))
  for tb in ['home','dates','invest','acc','spend','rep']:
    E('tab=%s;render()'%json.dumps(tb));ok('tab '+tb+' renders','couldn’t be shown' not in pg.inner_text('#app'))
  # ---------- in the browser version nothing asks the phone ----------
  c2,pg2=h.page(native=False);E2=pg2.evaluate
  E2('trackHub()');pg2.wait_for_selector('#trk_hub');ok('web: the screen explains these work in the phone app',"Works in the phone app" in pg2.inner_text('#over'))
  ok('web: Payments still need nothing native',E2('payPopSync()') is None and E2('payTake()')==0)
finally:
  h.done()
