import json,subprocess,sys,time
sys.path.insert(0,'test')
from seed import legacy
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
errs=[];fails=[]
def ok(n,c,x=''):
    print(('PASS ' if c else 'FAIL ')+n+(' :: '+str(x) if (x!='' and not c) else ''))
    if not c: fails.append(n)
SEED="if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy))
# a stand-in for the Android side
FAKE='''window.__n={calls:[],launch:%s,sms:[],pin:"",listeners:{}};
window.Capacitor={isNativePlatform:()=>true,addListener:(p,e,cb)=>{window.__n.listeners[p+"."+e]=cb},nativePromise:async(p,m,o)=>{const N=window.__n;N.calls.push([p,m,o]);
  if(p=="LocalNotifications"){if(m=="checkPermissions"||m=="requestPermissions")return {display:"granted"};if(m=="getPending")return {notifications:N.sched||[]};if(m=="cancel"){N.sched=[];return {}}if(m=="schedule"){N.sched=(N.sched||[]).concat(o.notifications);return {}}return {}}
  if(p=="DueNative"){if(m=="getLaunch"){const d=N.launch;N.launch="";return {data:d}}if(m=="setWidget"){N.widget=o;return {}}if(m=="readSms")return {messages:N.sms.filter(x=>+x.date>+o.since)};
    if(m=="saveDownload"){N.saved=o;return {}}if(m=="canAuth")return {ok:true};if(m=="setPin"){N.pin=o.pin;return {}}if(m=="auth")return {ok:true,pin:N.pin}}
  return {}}};'''
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    def mk(launch):
        c=b.new_context(viewport={'width':390,'height':844},has_touch=True); c.add_init_script((FAKE%json.dumps(launch))+SEED)
        pg=c.new_page(); pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error','warning') and 'Failed to load resource' not in m.text else None); pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
        pg.goto('http://localhost:8765/due-and-spend.html'); pg.wait_for_selector('#nav button'); return c,pg
    # widget button "+ Income" opens the form
    c,pg=mk(json.dumps({"add":"in"})); E=pg.evaluate
    pg.wait_for_selector('#over #f_amt'); ok('widget button opens income form',pg.input_value('#f_k')=='in')
    ok('back button closes the form',E('window.__dsBack()')==True and pg.locator('#over .sheet').count()==0)
    pg.click('#nav button[data-id="rep"]'); ok('back goes Home, then shows the saved message',E('window.__dsBack()')==True and E('tab')=='home' and E('window.__dsBack()')==True); pg.wait_for_selector('#over button[data-act="exitNow"]',timeout=10000); pg.click('#over button[data-act="closeX"]')
    pg.wait_for_function('!!window.__n.sched&&!!window.__n.widget',timeout=10000)
    N=E('window.__n.sched'); due=[n for n in N if n['id']<8000]; daily=[n for n in N if n['id']>=9000]
    ok('due reminders scheduled with Mark paid',len(due)>=4 and all(n.get('actionTypeId')=='DUE' for n in due if 'FD' not in n['title'] and 'Health' not in n['title']) and all(n['schedule']['at'].endswith('Z') for n in N),due[:1])
    ok('evening summaries scheduled',6<=len(daily)<=7 and 'tomorrow' in daily[0]['body'].lower(),daily[:1])
    ok('budget alert sent once',len([n for n in N if 8000<=n['id']<9000])==1)
    w=E('window.__n.widget'); ok('widget text set',('overdue' in w['line1'] or 'In ' in w['line1']) and w['line2'].startswith('Safe to spend'),w)
    ok('weekly backup saved to Downloads',E('window.__n.saved.name').startswith('personal-diary-backup-') and E('S.cfg.autoBk')==E('today()'))
    # Mark paid from the notification
    d1=E('S.dates.find(d=>d.id=="d1").date'); E('window.__n.listeners["LocalNotifications.localNotificationActionPerformed"]({actionId:"paid",notification:{extra:{due:"d1"}}})')
    ok('Mark paid on a reminder pays the due',E('S.dates.find(d=>d.id=="d1").date')!=d1 and E('linked("due","d1").length')==1)
    l=E('S.loans.find(x=>x.id=="l1").paid'); E('window.__n.listeners["LocalNotifications.localNotificationActionPerformed"]({actionId:"paid",notification:{extra:{loan:"l1"}}})'); ok('Mark paid on an EMI reminder',E('S.loans.find(x=>x.id=="l1").paid')==l+1)
    # automatic SMS
    now=int(time.time()*1000)
    E('ac("a2").l4="5566";window.__n.sms=%s'%json.dumps([{"id":"11","address":"QNB","body":"QAR 84.50 spent on card ending 5566 at CARREFOUR DOHA","date":str(now-1000)},{"id":"12","address":"QNB","body":"Your OTP is 123456 for payment of QAR 10","date":str(now-900)},{"id":"13","address":"Friend","body":"See you at 5","date":str(now-800)},{"id":"14","address":"SBI","body":"Rs.2,000.00 credited to A/c XX1234 by NEFT from ACME","date":str(now-700)}]))
    pg.click('button[data-act="settings"]'); pg.click('#over [data-act="trackHub"]'); pg.wait_for_selector('#over button[data-act="trkSms"]'); pg.click('#over button[data-act="trkSms"]'); pg.wait_for_function('(S.cfg.smsq||[]).length==2',timeout=8000); ok('bank messages queued, OTP and chats ignored',True)
    pg.click('#over .x'); pg.click('[data-act="smsReview"]'); ok('review list shows them',pg.locator('#over button[data-act="smsAdd"]').count()==2)
    pg.click('#over button[data-act="smsAdd"] >> nth=0'); pg.wait_for_selector('#over #f_amt'); ok('Add opens a filled entry',pg.input_value('#f_amt')=='84.5' and pg.input_value('#f_acc')=='a2' and pg.input_value('#f_date')==E('today()'))
    n=E('S.tx.length'); pg.click('#over button[data-act="saveTx"]'); pg.wait_for_timeout(150); ok('entry saved, queue shrinks',E('S.tx.length')==n+1 and E('S.cfg.smsq.length')==1)
    E('smsScan()'); pg.wait_for_timeout(300); ok('same messages are not queued twice',E('S.cfg.smsq.length')==1)
    # fingerprint unlock with app lock
    pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="lock"]'); pg.fill('#f_pin','4821'); pg.click('#over button[data-act="pinSet"]'); pg.wait_for_function('META.enc&&!document.querySelector("#over").innerHTML',timeout=15000)
    pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="lock"]'); pg.fill('#f_pin','4821'); pg.click('#over button[data-act="fpOn"]'); pg.wait_for_function('localStorage.getItem("ds-nfp")=="1"',timeout=15000)
    ok('fingerprint turned on',E('window.__n.pin')=='4821')
    pin=E('window.__n.pin'); pg.reload(); 
    pg.evaluate('window.__n.pin=%s'%json.dumps(pin)); 
    try:
        pg.wait_for_selector('#nav button',timeout=4000); auto=True
    except Exception:
        auto=False
    if not auto:
        pg.click('button[data-act="fpIn"]'); pg.wait_for_selector('#nav button',timeout=15000)
    ok('fingerprint opens the locked app',E('S.tx.length')>40 and E('storeLabel()')=='encrypted phone database')
    pg.wait_for_function('!!window.__n.widget',timeout=10000)
    ok('widget hides amounts while locked on',not E('window.__n.widget.line2').startswith('Safe'),E('window.__n.widget'))
    c.close()
    # shared SMS text and shared backup file
    c,pg=mk(json.dumps({"text":"Rs.1,250.00 debited from A/c XX1234 on 12-11-26 to LULU HYPERMARKET"})); pg.wait_for_selector('#over #f_amt'); ok('shared SMS opens a filled entry',pg.input_value('#f_amt')=='1250'); bk=pg.evaluate('bk()'); c.close()
    c,pg=mk(json.dumps({"file":bk})); pg.wait_for_selector('#over button[data-act="fileRestore"]'); pg.evaluate('S.tx.length=2'); pg.click('#over button[data-act="fileRestore"]'); pg.wait_for_timeout(400); ok('shared backup file restores',pg.evaluate('S.tx.length')==40); c.close()
    b.close()
finally: srv.terminate()
print('\n%d failed'%len(fails),fails); print('console problems:',len(errs)); [print(e) for e in errs[:12]]
