"""Version 35.1: Payment review checks for new payments by itself and explains an empty Waiting list (made-up data only)."""
import json,sys,time
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
MOCK='''(()=>{const np=window.Capacitor.nativePromise;window.Capacitor.nativePromise=async(p,m,o)=>{const N=window.__n;
 if(m=="payActs"){const a=N.acts||[];N.acts=[];return {items:a}}if(m=="appsSkipped")return {items:N.skipped||[]};if(m=="notifStatus")return {enabled:!!N.access,sms:N.smsok};return np(p,m,o)}})()'''
try:
  c,pg=h.page(native=True);E=pg.evaluate
  E(MOCK);E('S.cfg.ntfAuto=false;S.cfg.smsAuto=false;S.cfg.smsq=[];S.cfg.payLog=[];save()')
  now=int(time.time()*1000)
  # empty Waiting says why, with Turn on buttons and the apps that aren't read
  E('window.__n.skipped=[{pkg:"com.example.moneybox",app:"Money Box",t:String(Date.now())}];window.__n.access=false')
  E('payReview("wait")');pg.wait_for_selector('#over .prsrc');pg.wait_for_selector('#over .prsk');t=pg.inner_text('#over')
  ok('Waiting explains what is off',pg.locator('#over .prsrc [data-act="prOnSms"]').count()==1 and pg.locator('#over .prsrc [data-act="prOnNtf"]').count()==1,t[:600])
  ok('and lists apps that showed an amount',"Money Box" in t and pg.locator('#over .prsk [data-act="appRead"]').count()==1)
  pg.click('#over .prsk [data-act="appRead"]');pg.wait_for_timeout(400)
  ok('Read it turns the app on and comes back to Waiting',"com.example.moneybox" in E('S.cfg.readAdd') and pg.locator('#over .prtabs').count()==1)
  ok('Qatar banks and exchange houses are read',E('payRead("com.qib.mobile")') and E('payRead("com.luluexchange.app")') and not E('payRead("org.telegram.messenger")'))
  # opening Payment review fetches new payments by itself
  E('S.cfg.ntfAuto=true;window.__n.access=true;save()')
  it={"id":"com.qnb.mobile:aa1","pkg":"com.qnb.mobile","app":"QNB","body":"Your card ending 4821 was used for QAR 27.00 at BAKERY ONE","time":str(now)}
  E('window.__n.items=[%s]'%json.dumps(it));pg.click('#over .x') if pg.locator('#over .x').count() else None
  E('prChecked=0;payReview()');pg.wait_for_function('(S.cfg.smsq||[]).some(x=>x.id=="com.qnb.mobile:aa1")',timeout=8000);pg.wait_for_timeout(400)
  ok('opening Payment review finds the new payment',any(x['id']==it['id'] for x in E('S.cfg.smsq')))
  ok('and shows it in Waiting',pg.locator('#over .prtabs button.on').inner_text().startswith("Waiting") and "BAKERY ONE" in pg.inner_text('#over'),pg.inner_text('#over')[:300])
  # approve it, it goes to Approved where the account can be changed
  E('ac("a2").l4="4821";S.cfg.smsq.forEach(m=>{m.p.acc="a2"});save();payReview("wait")');pg.wait_for_timeout(150)
  b=pg.locator('#over [data-act="smsQuick"]')
  if b.count():b.first.click()
  else:E('quickSave(S.cfg.smsq[0]);save()')
  pg.wait_for_timeout(250);E('payReview("ok")');pg.wait_for_timeout(200)
  ok('approved payments go to Approved with an account picker',"BAKERY ONE" in pg.inner_text('#over') and pg.locator('#over select[data-pracc]').count()>=1)
finally:
  h.done()
