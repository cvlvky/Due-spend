import json,subprocess,sys,time,base64
sys.path.insert(0,'test')
from seed import legacy
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
errs=[];fails=[]
def ok(n,c,x=''):
    print(('PASS ' if c else 'FAIL ')+n+(' :: '+str(x) if (x!='' and not c) else ''))
    if not c: fails.append(n)
SEED="if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy))
NATIVE='''window.__n={notifs:[],saved:{},nstat:false,opened:0};window.Capacitor={isNativePlatform:()=>true,addListener(){},nativePromise:async(p,m,o)=>{const N=window.__n;
 if(p=="LocalNotifications")return m=="getPending"?{notifications:[]}:{display:"granted"};
 if(m=="notifStatus")return {enabled:N.nstat};if(m=="openNotifSettings"){N.opened++;return {}}if(m=="readNotifs"){const i=N.notifs;N.notifs=[];return {items:i}}
 if(m=="saveDownload"){N.saved[o.name]=o;return {}}if(m=="getLaunch"){const d=N.launch||"";N.launch="";return {data:d}}return {}}};'''
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    def mk(init):
        c=b.new_context(viewport={'width':390,'height':844},has_touch=True,device_scale_factor=2); c.add_init_script(init)
        pg=c.new_page(); pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error','warning') and 'Failed to load resource' not in m.text else None); pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
        pg.goto('http://localhost:8765/due-and-spend.html'); pg.wait_for_selector('#nav button'); return c,pg
    c,pg=mk(SEED); E=pg.evaluate
    # ---- email and app wording
    E('ac("a1").l4="1234";ac("a2").l4="5566"')
    T=[("HDFC Bank: Your available balance is Rs 45,300.00 after a debit of Rs 1,250.00 from A/c XX1234 at AMAZON.",dict(amt=1250,kind='out',acc='a1')),
       ("Netflix: Your payment of ₹499 to Netflix was successful.",dict(amt=499,kind='out',cur='INR',payee='Netflix')),
       ("QNB: Transaction alert: QAR 45.00 was spent at TALABAT on your card ending 5566.",dict(amt=45,kind='out',cur='QAR',acc='a2',payee='TALABAT')),
       ("Ooredoo: Thank you. Payment received from Arun. Amount: QAR 250.00",dict(amt=250,kind='in',cur='QAR')),
       ("Amazon.in: Your order total is ₹1,299.00. Merchant: Amazon Retail",dict(amt=1299,kind='out',payee='Amazon Retail')),
       ("Bank: Refund of Rs 300 has been processed to your card ending 1234",dict(amt=300,kind='in',acc='a1')),
       ("Card: You spent USD 25.00 at UBER",dict(amt=25,kind='out',cur='',payee='UBER'))]
    for t,exp in T:
        r=E('parseSms(%s)'%json.dumps(t)); ok('email: '+t[:42],r is not None and all(r.get(k)==v for k,v in exp.items()),r)
    for t,exp in [("Rs.1,250.00 debited from A/c XX1234 on 12-11-26 to LULU HYPERMARKET. Avl Bal Rs.45,300",dict(amt=1250,payee='LULU HYPERMARKET',acc='a1')),("QAR 84.50 spent on card ending 5566 at CARREFOUR DOHA on 10-Nov-2026",dict(amt=84.5,payee='CARREFOUR DOHA'))]:
        r=E('parseSms(%s)'%json.dumps(t)); ok('SMS still read: '+t[:30],all(r.get(k)==v for k,v in exp.items()),r)
    # ---- data safety
    pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="safety"]'); pg.wait_for_selector('#over .hrow'); t=pg.inner_text('#over')
    ok('safety screen warns when nothing is backed up','Nothing is backed up yet' in t and 'After reinstalling' in t,t[:120]); pg.click('#over .x')
    E('S.dates[0].att=[{id:"zz",name:"bond.pdf",size:204800,type:"application/pdf"}];S.cfg.lastBk=today();save();render()')
    ok('attachment reminder on Home','attached file' in pg.inner_text('#app'))
    pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="safety"]'); pg.wait_for_selector('#over .hrow'); ok('safety warns about files only','out of date' in pg.inner_text('#over')); pg.click('#over .x')
    E('S.cfg.lastFullBk=today();save();render()'); ok('reminder clears after a full backup','attached file' not in pg.inner_text('#app'))
    c.close()
    # ---- setup code and QR
    c,pg=mk(SEED); E=pg.evaluate
    E('SY={cfg:{apiKey:"AIzaSyD-test_key-123",authDomain:"due-spend-1a2b.firebaseapp.com",projectId:"due-spend-1a2b",appId:"1:123:web:abc",storageBucket:"x"},space:"Home-expenses",on:true,members:[]};syv()')
    code=E('setupCode()'); back=E('readSetup(%s)'%json.dumps("Here it is: "+code+" thanks"))
    ok('setup code round trip',back['space']=='Home-expenses' and back['cfg']['apiKey']=='AIzaSyD-test_key-123' and back['cfg']['appId']=='1:123:web:abc' and len(code)<260,(len(code),back))
    ok('bad code refused',E('readSetup("DS1.notvalid")') is None and E('readSetup("hello")') is None)
    pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="syncOpen"]'); pg.wait_for_selector('#over .qrbox svg')
    pg.locator('#over .qrbox').screenshot(path='/tmp/qr.png')
    import cv2
    img=cv2.imread('/tmp/qr.png'); txt,_,_=cv2.QRCodeDetector().detectAndDecode(img)
    ok('QR code scans to the setup code',txt==code,(txt[:30],code[:30]))
    c.close()
    c,pg=mk(SEED); E=pg.evaluate
    pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="syncOpen"]'); pg.fill('#f_scode',code); pg.click('#over button[data-act="useCode"]'); pg.wait_for_timeout(600)
    ok('pasting the code fills sync settings',E('SY.space')=='Home-expenses' and E('SY.cfg.projectId')=='due-spend-1a2b' and E('SY.on')==True)
    c.close()
    # shared code into the phone app opens sync with it
    c,pg=mk(NATIVE.replace('notifs:[]','notifs:[],launch:%s'%json.dumps(json.dumps({"text":code})))+SEED); pg.wait_for_selector('#over #f_scode'); ok('shared setup code opens sync',pg.input_value('#f_scode')==code); c.close()
    # ---- payment alerts in the phone app
    c,pg=mk(NATIVE+SEED); E=pg.evaluate
    pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="notifAuto"]'); pg.wait_for_selector('#over button[data-act="notifOpen"]'); ok('explains how to allow access','restricted' in pg.inner_text('#over'))
    pg.click('#over button[data-act="notifOpen"]'); ok('opens the phone setting',E('window.__n.opened')==1)
    E('window.__n.nstat=true'); pg.evaluate('document.dispatchEvent(new Event("visibilitychange"))'); pg.wait_for_function('S.cfg.ntfAuto===true',timeout=5000); ok('turns on when access is given',True)
    now=int(time.time()*1000)
    E('window.__n.notifs=%s'%json.dumps([{"id":"gm:1","app":"Gmail","body":"HDFC Bank. Your payment of ₹499 to Netflix was successful.","time":str(now)},{"id":"ol:1","app":"Outlook","body":"QNB. Transaction alert: QAR 45.00 was spent at TALABAT","time":str(now)},
      {"id":"sms:1","app":"Messages","body":"QNB. QAR 45.00 was spent at TALABAT on your card ending 5566","time":str(now)},{"id":"x:1","app":"Bank","body":"Your OTP is 4455 for payment of QAR 10","time":str(now)}]))
    E('notifScan()'); pg.wait_for_function('(S.cfg.smsq||[]).length>=2',timeout=5000); time.sleep(.3)
    q=E('S.cfg.smsq'); ok('alerts queued, same payment from two apps kept once, OTP skipped',len(q)==2 and {x['from'] for x in q}=={'Gmail','Outlook'},[(x['from'],x['p']['amt']) for x in q])
    ok('Home shows payments to review','2 payments to review' in pg.inner_text('#app'))
    E('window.__n.notifs=[{"id":"gm:1","app":"Gmail","body":"HDFC Bank. Your payment of ₹499 to Netflix was successful.","time":"%d"}]'%now); E('notifScan()'); time.sleep(.3); ok('same alert not added twice',len(E('S.cfg.smsq'))==2)
    pg.click('[data-act="smsReview"]'); ok('review shows the app name','Gmail:' in pg.inner_text('#over'))
    pg.click('#over button[data-act="smsAdd"] >> nth=0'); pg.wait_for_selector('#over #f_amt'); ok('Add opens a filled entry',pg.input_value('#f_amt') in ('499','45'))
    # monthly full backup with files
    E('S.dates[0].att=[{id:"att1",name:"a.png",size:70,type:"image/png"}];return 1') if False else None
    c.close()
    c,pg=mk(NATIVE+SEED.replace('localStorage.setItem(\'seeded\',\'1\')','localStorage.setItem(\'seeded\',\'1\');window.__seedAtt=1')); E=pg.evaluate
    E('fput("att1",new Blob(["hello"],{type:"text/plain"})).then(()=>{S.dates[0].att=[{id:"att1",name:"a.txt",size:5,type:"text/plain"}];S.cfg.autoFullBk="";nativeFullBackup()})'); pg.wait_for_function('Object.keys(window.__n.saved).some(k=>k.includes("full-backup"))',timeout=8000)
    k=[k for k in E('Object.keys(window.__n.saved)') if 'full' in k][0]; fb=json.loads(E('window.__n.saved[%s].text'%json.dumps(k)))
    ok('monthly full backup includes the file',fb['files']['att1']['data']==base64.b64encode(b'hello').decode() and E('S.cfg.lastFullBk')==E('today()'))
    c.close(); b.close()
finally: srv.terminate()
print('\n%d failed'%len(fails),fails); print('console problems:',len(errs)); [print(e) for e in errs[:12]]
