import json,subprocess,sys,time
sys.path.insert(0,'test')
from seed import legacy
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
errs=[];fails=[]
def ok(n,c,x=''):
    print(('PASS ' if c else 'FAIL ')+n+(' :: '+str(x) if (x!='' and not c) else ''))
    if not c: fails.append(n)
CBQ="Commercialbank SMS Service. Your card ending **4821 used for QAR 7.00 at Saffron Cafe at 07:06 11-Nov-26 Available Limit: QAR 3,193.00"
AX="alerts@axis.bank.in. INR 3400.00 was debited from your A/c no. XX4417."
NOW=int(time.time()*1000)
NATIVE='''window.__n={rebind:0,clip:%s,sms:[{id:"s1",address:"CBQ",date:"%d",body:"Your card ending **4821 used for QAR 7.00 at Saffron Cafe at 07:06 11-Nov-26 Available Limit: QAR 3,193.00"},{id:"s2",address:"Mum",date:"%d",body:"Dinner at 8?"},{id:"s3",address:"QNB",date:"%d",body:"Your OTP is 123456 for QAR 10.00"}],
 items:[{id:"n1",app:"Outlook",body:%s,time:"%d"},{id:"n2",app:"Outlook",body:%s,time:"%d"},{id:"n3",app:"Outlook",body:"Axis Bank Alerts. Credit notification from Axis Bank",time:"%d"},{id:"n4",app:"Talabat",body:"Get QAR 50 off on your next order",time:"%d"}],
 log:[{app:"Outlook",body:"Axis Bank Alerts. Credit notification from Axis Bank",time:"%d",why:"noamt"},{app:"Outlook",body:%s,time:"%d",why:"kept"}]};
window.Capacitor={isNativePlatform:()=>true,addListener(){},nativePromise:async(p,m,o)=>{const N=window.__n;if(p=="LocalNotifications")return m=="getPending"?{notifications:[]}:{display:"granted"};
 if(m=="readSms")return {messages:N.sms};if(m=="readNotifs"){const i=N.items;N.items=[];return {items:i}}if(m=="notifLog")return {items:N.log};
 if(m=="notifStatus"){if(o&&o.rebind)N.rebind++;return {enabled:true,conn:String(N.rebind?Date.now():0),disc:"0",seen:"%d",sms:true}}
 if(m=="readClip")return {text:N.clip};return {}}};'''%(json.dumps("Txn of QAR 9.00 on Card ending 4321 at TALABAT.COM is approved"),NOW-3600e3,NOW-3000e3,NOW-2000e3,json.dumps(CBQ),NOW-3500e3,json.dumps(AX),NOW-1000e3,NOW-900e3,NOW-800e3,NOW-900e3,json.dumps(CBQ),NOW-3500e3,NOW-800e3)
SEED="if(!localStorage.getItem('seeded')){const d=%s;d.cfg=d.cfg||{};d.cfg.smsAuto=true;d.cfg.ntfAuto=true;localStorage.setItem('due-and-spend.v1',JSON.stringify(d));localStorage.setItem('seeded','1')}"%json.dumps(legacy)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    c=b.new_context(viewport={'width':360,'height':740},device_scale_factor=2); c.add_init_script(NATIVE+SEED)
    pg=c.new_page(); pg.on('pageerror',lambda e: errs.append(('pageerror',str(e)))); pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type=='error' and 'Failed to load' not in m.text else None)
    pg.goto('http://localhost:8765/due-and-spend.html'); pg.wait_for_selector('#nav button'); E=pg.evaluate
    ok('settings came through',E('S.cfg.smsAuto&&S.cfg.ntfAuto'),E('[S.cfg.smsAuto,S.cfg.ntfAuto]'))
    pg.wait_for_timeout(2500)
    q=E('(S.cfg.smsq||[]).map(m=>[m.src||"s",m.p.amt,m.p.cur,m.p.payee])')
    ok('CBQ by SMS and email counted once',sum(1 for x in q if x[1]==7)==1,q)
    ok('Axis debit from Outlook read',any(x[1]==3400 for x in q),q)
    ok('copied Talabat message picked up',any(x[0]=='c' and x[1]==9 for x in q),q)
    ok('promo and personal SMS and OTP ignored',not any(x[1] in (50,10) for x in q) and len(q)==3,q)
    ok('email without amount kept aside',len(E('S.cfg.ntfNo||[]'))==1)
    ok('alert reading reconnected when never connected',E('window.__n.rebind')>=1)
    ok('SMS log has reasons',E('(S.cfg.smsLog||[]).map(x=>x.why)')==['kept','code'],E('S.cfg.smsLog'))
    ok('clipboard not offered twice',E('clipCheck().then(()=>S.cfg.smsq.filter(m=>m.src=="c").length)')==1)
    pg.click('#nav button[data-id="home"]'); t=pg.inner_text('#app'); ok('home shows payments to review','3 payments to review' in t,t[:300])
    pg.click('[data-act="smsReview"]'); t=pg.inner_text('#over'); ok('review: card ending question and no-amount email','Card or account ending 4821 is' in t and 'Emails without an amount' in t and 'Paste copied text' in t)
    pg.select_option('select[data-l4pick="4821"]',E('S.acc.find(a=>a.cur=="QAR").id')); pg.wait_for_timeout(200)
    ok('ending 4821 linked to the account',E('S.acc.find(a=>a.cur=="QAR").l4s')==['4821'] and E('S.cfg.smsq.find(m=>m.p.amt==7).p.acc')==E('S.acc.find(a=>a.cur=="QAR").id'))
    ok('next time it is matched automatically',E('parseSms("Your card ending **4821 used for QAR 12.00 at Lulu").acc')==E('S.acc.find(a=>a.cur=="QAR").id'))
    pg.click('#over button[data-act="smsAdd"] >> nth=0'); pg.wait_for_selector('#over #f_amt'); ok('Add opens the entry form prefilled',pg.input_value('#f_amt') in ('7','7.00'),pg.input_value('#f_amt')); pg.click('#over .x')
    pg.click('[data-act="smsReview"]'); E('window.__n.clip="Credit notification from Axis Bank. INR 85250.75 has been credited to A/c no. XX4417 on 09-11-26 at 16:25:45 IST. Reference no. - IMPS/P2A/600000000103/ARUNKUMAR"')
    pg.click('#over button[data-act="clipAdd"]'); pg.wait_for_selector('#over #f_amt'); ok('paste copied email text opens the form',float(pg.input_value('#f_amt'))==85250.75 and len(E('S.cfg.ntfNo'))==0); pg.click('#over .x')
    E('trackHub()'); pg.wait_for_selector('#over button[data-act="readCheck"]'); pg.click('#over button[data-act="readCheck"]'); pg.wait_for_timeout(300); t=pg.inner_text('#over')
    ok('reading check screen',all(k in t for k in ['Bank SMS: on','Email and app alerts: on','Last messages checked','No amount shown','Security code, ignored','Focused and Other','Unrestricted']),t[:500])
    pg.fill('#f_rt',CBQ); pg.click('#over button[data-act="readTest"]'); t=pg.inner_text('#rt_out'); ok('test a message',"money out" in t and "Saffron Cafe" in t and "4821" in t,t)
    pg.screenshot(path='shots/s-readcheck.png'); pg.click('#over .x')
    E('window.__n.sms=[{id:"s9",address:"AXISBK",date:String(Date.now()-20*864e5),body:"INR 5,000.00 debited from A/c no. XX3456 on 13-11-26 to LULU HYPERMARKET. Avl Bal INR 12,000"}]')
    E('trackHub()'); pg.wait_for_selector('#over button[data-act="readCheck"]'); pg.click('#over button[data-act="readCheck"]'); pg.wait_for_timeout(200); pg.click('#over button[data-act="smsScan30"]'); pg.wait_for_timeout(500)
    ok('read last 30 days',any(m['p']['amt']==5000 for m in E('S.cfg.smsq')))
    c.close(); b.close()
finally: srv.terminate()
print('\n%d failed'%len(fails),fails); print('problems:',len(errs)); [print(e) for e in errs[:10]]
