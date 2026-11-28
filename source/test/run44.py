"""Version 35: Waiting → Approved / Ignored, correct the account or make a transfer, and the app learns (made-up data only)."""
import json,sys,time,datetime
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
MOCK='''(()=>{const np=window.Capacitor.nativePromise;window.Capacitor.nativePromise=async(p,m,o)=>{const N=window.__n;
 if(m=="payActs"){const a=N.acts||[];N.acts=[];return {items:a}}if(m=="notifLog")return {items:N.nlog||[]};return np(p,m,o)}})()'''
def calls(E,m):return [c[2] for c in E('window.__calls') if c[1]==m]
seq=[0]
def item(pkg,app,body):
  seq[0]+=1;return {"id":pkg+":t"+str(seq[0]),"pkg":pkg,"app":app,"body":body,"time":str(int(time.time()*1000)+seq[0])}
def feed(E,*its):E('window.__n.items=%s'%json.dumps(list(its)));E('notifScan()')
ids=lambda E:E('(S.cfg.smsq||[]).map(x=>x.id)')
try:
  c,pg=h.page(native=True);E=pg.evaluate
  E(MOCK);E('S.cfg.ntfAuto=true;S.cfg.smsq=[];S.cfg.payLog=[];S.acc.push({id:"b2",name:"Doha Savings",type:"bank",cur:"QAR",open:0});save()')
  dd=datetime.date.today().strftime('%d-%m-%y')
  # ---------- a payment found in another app shows in Waiting ----------
  A1=item("com.qnb.mobile","QNB","Your card ending 7001 was used for QAR 20.00 at CAFE ONE")
  feed(E,A1);ok('a payment from a bank app shows in Waiting',A1['id'] in ids(E))
  E('payReview()');pg.wait_for_selector('#over .prtabs');ok('Waiting is the open tab with a count',pg.locator('#over .prtabs button.on').inner_text().startswith("Waiting") and "1" in pg.inner_text('#over .prtabs button.on'))
  # approve it in the app with an account: it moves to Approved
  pg.click('#over [data-act="smsAdd"][data-id="%s"]'%A1['id']);pg.wait_for_selector('#over #f_acc');pg.select_option('#over #f_acc','a2');pg.click('#over [data-act="saveTx"]');pg.wait_for_timeout(250)
  ok('approved: gone from Waiting',A1['id'] not in ids(E))
  E('payReview("ok")');pg.wait_for_selector('#over .prrow');t=pg.inner_text('#over')
  ok('it is in Approved, with the account to change',"CAFE ONE" in t and pg.locator('#over select[data-pracc]').count()==1 and pg.locator('#over [data-act="prXfer"]').count()==1 and pg.locator('#over [data-act="prUndo"]').count()==1,t[:400])
  # ---------- change the account right there: the entry moves and the app remembers ----------
  sel=pg.locator('#over select[data-pracc]').first;sel.select_option('b2');pg.wait_for_timeout(250)
  tx=E('S.tx.find(x=>x.payee=="CAFE ONE")');ok('changing the account fixes the entry',tx and tx['acc']=="b2",tx)
  L=E('S.cfg.learn.acc');ok('and the app remembers it for that bank and card',any(k.endswith("|7001") and v['a']=="b2" for k,v in L.items()),L)
  ok('it says so',"Next time it goes there" in pg.inner_text('#toast'))
  # the next payment from that card is filled in with Doha Savings
  A2=item("com.qnb.mobile","QNB","Your card ending 7001 was used for QAR 15.00 at CAFE TWO")
  feed(E,A2);m=[x for x in E('S.cfg.smsq') if x['id']==A2['id']]
  ok('the next one from that card is filled in with the learned account',m and m[0]['p']['acc']=="b2" and m[0]['p'].get('sure')==1,m and m[0]['p'])
  E('payReview("wait")');pg.wait_for_selector('#over .lrnote');ok('Waiting shows what it learned',"Learned: Doha Savings" in pg.inner_text('#over'))
  # Add on the phone saves it straight away with that account
  E('window.__n.acts=[{id:%s,act:"add",t:Date.now(),amt:15,cur:"QAR",kind:"out"}]'%json.dumps(A2['id']));E('payNow()')
  tx=E('S.tx.find(x=>x.payee=="CAFE TWO")');ok('Add on the phone uses the learned account',tx and tx['acc']=="b2",tx)
  # a third time confirms it; after that the app saves without asking
  A3=item("com.qnb.mobile","QNB","Your card ending 7001 was used for QAR 11.00 at CAFE THREE");feed(E,A3)
  E('window.__n.acts=[{id:%s,act:"add",t:Date.now(),amt:11,cur:"QAR",kind:"out"}]'%json.dumps(A3['id']));E('payNow()')
  r=[v for k,v in E('S.cfg.learn.acc').items() if k.endswith("|7001")][0];ok('three times the same account',r['n']>=3,r)
  E('payPopSync()');P=calls(E,'payLearn');ok('the phone is told it may save these without asking',P and any(k.endswith("|7001") for k in P[-1].get('keys',[])),P[-1:])
  A4=item("com.qnb.mobile","QNB","Your card ending 7001 was used for QAR 9.00 at CAFE FOUR");feed(E,A4)
  tx=E('S.tx.find(x=>x.payee=="CAFE FOUR")');ok('the fourth is saved for you',tx and tx['acc']=="b2" and A4['id'] not in ids(E),tx)
  lg=E('S.cfg.payLog[S.cfg.payLog.length-1]');ok('and shows in Approved as saved for you',lg['act']=="auto" and lg['via']=="auto")
  E('payReview("ok")');pg.wait_for_selector('#over .prrow');ok('Approved says Saved for you',"Saved for you" in pg.inner_text('#over'))
  # ---------- transfer: a payment to your own account ----------
  T1=item("com.google.android.apps.messaging","Messages","HDFCBK. Rs.5,000.00 debited from A/c XX1234 to RAHUL MENON on %s. Ref 1122"%dd)
  feed(E,T1);E('window.__n.acts=[{id:%s,act:"add",t:Date.now(),amt:5000,cur:"INR",kind:"out"}]'%json.dumps(T1['id']));E('ac("a1").l4="1234";save()')
  m=[x for x in E('S.cfg.smsq') if x['id']==T1['id']]
  if m: E('ACT.smsQuick(%s)'%json.dumps(T1['id'])) if pg.locator('#over').count()==0 else None
  E('payNow()');E('if((S.cfg.smsq||[]).some(x=>x.id==%s))quickSave(S.cfg.smsq.find(x=>x.id==%s))'%(json.dumps(T1['id']),json.dumps(T1['id'])))
  E('payReview("ok")');pg.wait_for_selector('#over [data-act="prXfer"]')
  lid=E('(S.cfg.payLog.slice().reverse().find(x=>x.payee&&/RAHUL MENON/i.test(x.payee))||{}).lid')
  pg.click('#over [data-act="prXfer"][data-id="%s"]'%lid);pg.wait_for_selector('#over #f_to');ok('Transfer opens the transfer form',"Make it a transfer" in pg.inner_text('#over h2'))
  E('S.acc.push({id:"b3",name:"Wife HDFC",type:"bank",cur:"INR",open:0});save()')
  pg.click('#over .x');E('payReview("ok")');pg.click('#over [data-act="prXfer"][data-id="%s"]'%lid);pg.wait_for_selector('#over #f_to')
  pg.select_option('#over #f_to','b3');n0=E('S.tx.length');pg.click('#over [data-act="saveTr"]');pg.wait_for_timeout(300)
  ok('the expense becomes a transfer',not E('S.tx.some(x=>x.kind=="out"&&/RAHUL MENON/i.test(x.payee||""))') and E('S.tx.some(x=>x.kind=="tr"&&x.to=="b3"&&x.amt==5000)'))
  ok('the app learns the transfer',any("rahul menon" in k and v['to']=="b3" for k,v in E('S.cfg.learn.tr').items()),E('S.cfg.learn.tr'))
  T2=item("com.google.android.apps.messaging","Messages","HDFCBK. Rs.2,000.00 debited from A/c XX1234 to RAHUL MENON on %s. Ref 3344"%dd);feed(E,T2)
  m=[x for x in E('S.cfg.smsq') if x['id']==T2['id']];ok('the next one is suggested as a transfer',m and m[0]['p'].get('xf',{}).get('to')=="b3",m and m[0]['p'])
  E('payReview("wait")');pg.wait_for_selector('#over [data-act="xfSave"]');ok('Waiting offers Save transfer',"a transfer" in pg.inner_text('#over'))
  E('window.__n.acts=[{id:%s,act:"add",t:Date.now(),amt:2000,cur:"INR",kind:"out"}]'%json.dumps(T2['id']));E('payNow()')
  ok('Add on the phone saves it as the transfer',E('S.tx.some(x=>x.kind=="tr"&&x.to=="b3"&&x.amt==2000)') and T2['id'] not in ids(E))
  # ---------- skipping: three times the same and it is ignored for you ----------
  for i in range(3):
    S1=item("com.qnb.mobile","QNB","Your card ending 7002 was used for QAR %d.00 at OFFICE COFFEE CLUB"%(3+i));feed(E,S1)
    E('payReview("wait")');pg.wait_for_selector('#over [data-act="smsSkip"][data-id="%s"]'%S1['id']);pg.click('#over [data-act="smsSkip"][data-id="%s"]'%S1['id']);pg.wait_for_timeout(150)
  S4=item("com.qnb.mobile","QNB","Your card ending 7002 was used for QAR 7.00 at OFFICE COFFEE CLUB");feed(E,S4)
  ok('after 3 skips it is ignored for you',S4['id'] not in ids(E) and E('S.cfg.payLog[S.cfg.payLog.length-1].via')=="auto")
  E('payReview("no")');pg.wait_for_selector('#over .prrow');t=pg.inner_text('#over');ok('Ignored shows it, with Add it and Stop ignoring',"Ignored for you" in t and pg.locator('#over [data-act="prForget"]').count()>=1 and pg.locator('#over [data-act="revAdd"]').count()>=1,t[:400])
  pg.click('#over [data-act="prForget"]');pg.wait_for_timeout(200);ok('Stop ignoring forgets it',not any(v['n']>=3 for v in E('S.cfg.learn.skip').values()))
  # ---------- Undo in Approved moves it to Ignored ----------
  E('payReview("ok")');pg.wait_for_selector('#over [data-act="prUndo"]');n1=E('S.tx.length');pg.locator('#over [data-act="prUndo"]').first.click();pg.wait_for_timeout(250)
  ok('Undo removes the entry and moves it to Ignored',E('S.tx.length')==n1-1 and E('S.cfg.payLog.some(x=>x.act=="skip"&&x.via=="app"&&!x.re)'))
  # ---------- what it learned, and turning saving off ----------
  E('learnSheet()');pg.wait_for_selector('#learn_sheet');t=pg.inner_text('#over')
  ok('What the app has learned lists accounts and transfers',"Doha Savings" in t and "Wife HDFC" in t and "Saved for you" in t,t[:500])
  pg.click('#over [data-act="learnAutoT"]');pg.wait_for_timeout(200);ok('saving for you can be turned off',E('S.cfg.learnAuto')==False and calls(E,'payLearn')[-1].get('keys')==[])
  A5=item("com.qnb.mobile","QNB","Your card ending 7001 was used for QAR 6.00 at CAFE FIVE");feed(E,A5)
  ok('then it only suggests',A5['id'] in ids(E) and [x for x in E('S.cfg.smsq') if x['id']==A5['id']][0]['p']['acc']=="b2")
  E('ACT.learnAutoT()')
  # ---------- an empty Waiting shows where the app looks ----------
  E('S.cfg.smsq=[];save();payReview("wait")');pg.wait_for_selector('#over .prsrc');t=pg.inner_text('#over')
  ok('empty Waiting shows the sources and Check now',all(k in t for k in ["Where the app looks","Bank SMS","Bank apps and wallets","Email"]) and pg.locator('#over [data-act="prCheck"]').count()==1 and pg.locator('#over [data-act="smsScan30"]').count()==1,t[:400])
  pg.click('#over [data-act="prCheck"]');pg.wait_for_timeout(500);ok('Check now reports back',any(k in pg.inner_text('#toast') for k in ["No new payments","to review","saved for you"]))
  for tb in ['home','spend','rep']:
    E('tab=%s;render()'%json.dumps(tb));ok('tab '+tb+' renders','couldn’t be shown' not in pg.inner_text('#app'))
finally:
  h.done()
