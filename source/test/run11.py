import json,subprocess,sys,time
sys.path.insert(0,'test')
from seed import legacy
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
errs=[];fails=[]
def ok(n,c,x=''):
    print(('PASS ' if c else 'FAIL ')+n+(' :: '+str(x) if (x!='' and not c) else ''))
    if not c: fails.append(n)
NATIVE='''window.__n={l:{}};window.Capacitor={isNativePlatform:()=>true,addListener:(p,e,cb)=>{window.__n.l[e]=cb},nativePromise:async(p,m,o)=>{if(p=="LocalNotifications"){if(m=="schedule")window.__n.sched=o.notifications;return m=="getPending"?{notifications:[]}:{display:"granted"}}return {}}};'''
SEED="if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    c=b.new_context(viewport={'width':360,'height':740},has_touch=True,device_scale_factor=2); c.add_init_script(NATIVE+SEED)
    pg=c.new_page(); pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error','warning') and 'Failed to load resource' not in m.text else None); pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
    pg.goto('http://localhost:8765/due-and-spend.html'); pg.wait_for_selector('#nav button'); E=pg.evaluate
    pg.click('#nav button[data-id="dates"]'); ok('Dues has three views',pg.locator('#app button[data-act="dview"]').count()==3)
    # subscription with auto renew, payment recorded now
    pg.click('button[data-act="dview"][data-id="subs"]'); pg.click('#app button[data-act="addSub"]')
    pg.fill('#f_name','Netflix'); pg.fill('#f_plan','Premium'); pg.fill('#f_price','55'); pg.select_option('#f_cur','QAR'); pg.select_option('#f_cyc','monthly'); pg.fill('#f_start',E('plus(-25)')); pg.select_option('#f_pay','a2'); pg.select_option('#f_rec','1')
    a2=E('bal(ac("a2"))'); pg.click('#over button[data-act="saveSub"]'); pg.wait_for_timeout(150)
    s=E('S.subs[0]'); ok('subscription saved with worked-out end date',s['end']==E('addM(plus(-25),1)') and s['auto']==True,s)
    ok('first payment recorded from the account',abs(E('bal(ac("a2"))')-(a2-55))<1e-6 and E('linked("sub",S.subs[0].id).length')==1)
    t=pg.inner_text('#app'); ok('card shows price, dates and paid so far','Netflix' in t and 'QAR 55' in t and 'renews' in t and 'Paid so far' in t,t[:300])
    ok('renewal in 5 days shows on Home and in upcoming',any(u['n']=='Netflix' for u in E('upcoming(today(),plus(30),true)')))
    end0=s['end']; pg.click('button[data-act="subRenew"]'); pg.wait_for_timeout(150)
    ok('renewal moves end on a month and logs payment',E('S.subs[0].end')==E('addM("%s",1)'%end0) and E('S.subs[0].start')==end0 and E('linked("sub",S.subs[0].id).length')==2)
    pg.click('#toast button[data-act="undo"]'); pg.wait_for_timeout(150); ok('undo puts it back',E('S.subs[0].end')==end0 and E('linked("sub",S.subs[0].id).length')==1)
    # yearly, not auto renew
    pg.click('#app button[data-act="addSub"]'); pg.fill('#f_name','Prime Video'); pg.fill('#f_price','1499'); pg.select_option('#f_cur','INR'); pg.select_option('#f_cyc','yearly'); pg.select_option('#f_auto','0'); pg.fill('#f_start','2026-03-01'); pg.click('#over button[data-act="saveSub"]'); pg.wait_for_timeout(150)
    pr=E('S.subs.find(x=>x.name=="Prime Video")'); ok('one-off yearly plan ends a year later',pr['end']=='2027-03-01' and not pr['auto'])
    ok('monthly total counts both',abs(E('subAct().reduce((s,x)=>s+subMon(x),0)')-(55*26.1+1499/12))<1e-6)
    ok('subscriptions in recurring costs',any(x[0]=='Netflix' for x in E('recurringCosts()')))
    pg.click('.card.sub button[data-act="subCancel"] >> nth=1'); pg.click('.card.sub button[data-act="subCancel"] >> nth=1'); pg.wait_for_timeout(150); ok('cancel needs two taps and moves it to Cancelled',E('S.subs.filter(x=>x.cancelled).length')==1 and 'Cancelled (1)' in pg.inner_text('#app'))
    pg.screenshot(path='shots/w-subs.png',full_page=True)
    # notification Mark paid for subscription
    E('nativeNotify()'); pg.wait_for_function('!!window.__n.sched',timeout=8000)
    sn=[n for n in E('window.__n.sched') if n.get('extra',{}).get('sub')]; ok('renewal reminder with Mark paid',len(sn)>=1 and sn[0].get('actionTypeId')=='DUE' and 'Netflix' in sn[0]['title'],sn[:1])
    n0=E('linked("sub",S.subs[0].id).length'); E('window.__n.l.localNotificationActionPerformed({actionId:"paid",notification:{extra:{sub:S.subs[0].id}}})'); ok('Mark paid from the notification renews it',E('linked("sub",S.subs[0].id).length')==n0+1)
    # documents
    pg.click('button[data-act="dview"][data-id="docs"]'); pg.click('#app button[data-act="addDoc"]')
    pg.fill('#f_name','My work visa'); pg.select_option('#f_type','Visa'); pg.fill('#f_holder','Arun'); pg.fill('#f_no','V-998877'); pg.fill('#f_by','Qatar MOI'); pg.fill('#f_issue','2025-12-01'); pg.fill('#f_exp',E('plus(50)')); pg.fill('#f_fee','500'); pg.select_option('#f_cur','QAR'); pg.select_option('#f_rem','60'); pg.select_option('#f_rec','a2')
    a2=E('bal(ac("a2"))'); pg.click('#over button[data-act="saveDoc"]'); pg.wait_for_timeout(150)
    d=E('S.docs[0]'); ok('document saved with all details',d['holder']=='Arun' and d['issue']=='2025-12-01' and d['fee']==500 and d['rem']==60,d)
    ok('fee recorded as spent',abs(E('bal(ac("a2"))')-(a2-500))<1e-6)
    t=pg.inner_text('#app'); ok('card shows dates, length and fee','Issued' in t and 'expires' in t and 'paid QAR 500' in t,t[:400])
    ok('60-day reminder: shows as expiring soon',E('docAlerts().length')==1)
    pg.click('.card[data-act="editDoc"]'); pg.click('#over button[data-act="docRenew"]'); pg.wait_for_selector('#over button[data-act="saveDocRenew"]')
    pg.fill('#f_exp','2028-12-01'); pg.fill('#f_fee','550'); pg.click('#over button[data-act="saveDocRenew"]'); pg.wait_for_timeout(150)
    d=E('S.docs[0]'); ok('renewal keeps history',d['exp']=='2028-12-01' and d['fee']==550 and len(d['hist'])==1 and d['hist'][0]['fee']==500)
    ok('renewal count and total fees shown','Renewed 1 time' in pg.inner_text('#app'))
    pg.screenshot(path='shots/w-docs.png',full_page=True)
    # search, backup, calendar
    pg.click('#nav button[data-id="home"]'); pg.fill('input[data-gs]','netflix'); pg.press('input[data-gs]','Enter'); pg.wait_for_selector('#over .row[data-act="editSub"]'); ok('search finds subscriptions',True); pg.click('#over .x')
    bk=json.loads(E('bk()')); ok('subscriptions in backup and sync',len(bk['subs'])==2 and 'subs' in E('COLLS'))
    pg.click('.fab2'); ok('add menu has Subscription and Document',pg.locator('#over .ft[data-act="addSub"]').count()==1 and pg.locator('#over .ft[data-act="addDoc"]').count()==1); pg.click('#over .x')
    E('dmon=S.docs[0].exp.slice(0,7)'); pg.click('#nav button[data-id="dates"]'); pg.click('button[data-act="dview"][data-id="dues"]'); ok('expiry shows on the calendar',pg.locator('.cal i.has, .cal i.late').count()>=1)
    for t_ in ['home','dates','invest','acc','spend','rep']:
        pg.click(f'#nav button[data-id="{t_}"]'); pg.wait_for_timeout(60); ok('tab '+t_,'couldn’t be shown' not in pg.inner_text('#app') and E('document.documentElement.scrollWidth<=window.innerWidth'))
    c.close(); b.close()
finally: srv.terminate()
print('\n%d failed'%len(fails),fails); print('console problems:',len(errs)); [print(e) for e in errs[:12]]
