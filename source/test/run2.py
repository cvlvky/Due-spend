import json,subprocess,sys,time,os,base64
sys.path.insert(0,'test')
from seed import legacy
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
URL='http://localhost:8765/due-and-spend.html'
errs=[];fails=[]
def watch(pg,tag):
    pg.on('console',lambda m: errs.append((tag,m.type,m.text)) if m.type in('error','warning') and 'Failed to load resource' not in m.text else None)
    pg.on('pageerror',lambda e: errs.append((tag,'pageerror',str(e))))
def ok(name,cond,extra=''):
    print(('PASS ' if cond else 'FAIL ')+name+(' :: '+str(extra) if (extra!='' and not cond) else ''))
    if not cond: fails.append(name)
def close(pg):
    for _ in range(3):
        if pg.locator('#over .x').count(): pg.click('#over .x')
    pg.wait_for_timeout(50)
def tabto(pg,t): close(pg); pg.click(f'#nav button[data-id="{t}"]'); pg.wait_for_timeout(80)
def toast(pg): return pg.inner_text('#toast') if pg.locator('#toast .toast').count() else ''
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
open('/tmp/receipt.png','wb').write(PNG)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    c=b.new_context(viewport={'width':390,'height':844},has_touch=True,accept_downloads=True)
    c.add_init_script("if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy)))
    pg=c.new_page(); watch(pg,'main'); pg.goto(URL); pg.wait_for_selector('#nav button')
    E=pg.evaluate
    b0=E('bal(ac("a2"))'); n0=E('S.tx.length')
    # --- quick add (QAR account is last used)
    pg.click('button[data-act="quick"]'); pg.fill('#f_amt','75'); pg.click('#q_c button[data-id="Food"]')
    pg.click('#over details summary'); pg.fill('#f_sub','Groceries'); pg.fill('#f_payee','Lulu'); pg.fill('#f_tags','qatar, #family')
    pg.click('#over button[data-act="saveTx"]'); pg.wait_for_timeout(100)
    x=E('S.tx[S.tx.length-1]')
    ok('quick add creates entry',E('S.tx.length')==n0+1 and x['cat']=='Food' and x['cur']=='QAR' and x['sub']=='Groceries' and x['tags']==['qatar','family'] and x.get('ct'),x)
    ok('quick add lowers balance',abs(E('bal(ac("a2"))')-(b0-75))<1e-6)
    # --- edit entry, search
    tabto(pg,'spend'); pg.fill('input[data-q]','lulu'); pg.press('input[data-q]','Enter'); pg.wait_for_timeout(100)
    ok('search finds payee',pg.locator('#app .row[data-act="editTx"]').count()>=1)
    pg.click('#app .row[data-act="editTx"] >> nth=0'); pg.fill('#f_amt','80'); pg.click('#over button[data-act="saveTx"]'); pg.wait_for_timeout(100)
    ok('edit entry updates balance',abs(E('bal(ac("a2"))')-(b0-80))<1e-6)
    pg.fill('input[data-q]',''); pg.press('input[data-q]','Enter')
    # --- delete + undo + bin
    pg.fill('input[data-q]','lulu'); pg.press('input[data-q]','Enter'); pg.wait_for_timeout(80)
    pg.click('#app .row[data-act="editTx"] >> nth=0'); pg.click('#over button[data-act="delTx"]'); pg.wait_for_timeout(100)
    ok('delete moves to bin',E('S.bin.length')==1 and abs(E('bal(ac("a2"))')-b0)<1e-6)
    pg.click('#toast button[data-act="undo"]'); pg.wait_for_timeout(100)
    ok('undo restores entry',E('S.bin.length')==0 and abs(E('bal(ac("a2"))')-(b0-80))<1e-6)
    pg.fill('input[data-q]',''); pg.press('input[data-q]','Enter')
    # --- transfer QAR -> INR
    tabto(pg,'acc'); a1=E('bal(ac("a1"))'); a2=E('bal(ac("a2"))')
    pg.click('button[data-act="trf"]'); pg.select_option('#f_from','a2'); pg.select_option('#f_to','a1'); pg.fill('#f_amt','1000'); pg.dispatch_event('#f_amt','change')
    sug=pg.input_value('#f_got'); pg.fill('#f_got','26350'); pg.fill('#f_fee','15'); pg.click('#over button[data-act="saveTr"]'); pg.wait_for_timeout(100)
    ok('transfer suggestion uses rate',abs(float(sug)-26100)<0.01,sug)
    ok('transfer moves money',abs(E('bal(ac("a2"))')-(a2-1015))<1e-6 and abs(E('bal(ac("a1"))')-(a1+26350))<1e-6)
    ok('transfer not counted as spending',E('mSum(today().slice(0,7),"out")')==E('sumV(S.tx.filter(x=>x.kind=="out"&&x.date.startsWith(today().slice(0,7))))'))
    # --- statement, correct balance
    pg.click('button[data-act="stmt"][data-id="a1"]'); ok('statement opens',pg.locator('#over .row').count()>5); close(pg)
    pg.click('button[data-act="fixBal"][data-id="a3"]'); pg.fill('#f_bal','4800'); pg.click('#over button[data-act="saveFix"]'); pg.wait_for_timeout(80)
    ok('correct balance',abs(E('bal(ac("a3"))')-4800)<1e-6 and E('ac("a3").rcd')==E('today()'))
    # --- paid on repeating due, undo
    tabto(pg,'dates'); d1=E('S.dates.find(d=>d.id=="d1").date'); a1=E('bal(ac("a1"))')
    pg.click('button[data-act="paid"][data-id="d1"]'); pg.wait_for_timeout(100)
    nd=E('S.dates.find(d=>d.id=="d1").date')
    ok('paid advances a year',nd[:4]==str(int(d1[:4])+1) and nd[4:]==d1[4:],(d1,nd))
    ok('paid logs linked expense',abs(E('bal(ac("a1"))')-(a1-28450))<1e-6 and E('linked("due","d1").length')==1)
    pg.click('#toast button[data-act="undo"]'); pg.wait_for_timeout(100)
    ok('undo paid restores',E('S.dates.find(d=>d.id=="d1").date')==d1 and abs(E('bal(ac("a1"))')-a1)<1e-6 and E('S.bin.length')==0)
    pg.click('button[data-act="paid"][data-id="d1"]'); pg.wait_for_timeout(3000)
    # --- FD received: neutral inflow, marked done
    inc=E('mSum(today().slice(0,7),"in")'); a1=E('bal(ac("a1"))')
    pg.click('button[data-act="paid"][data-id="d2"]'); pg.wait_for_timeout(100)
    ok('FD received adds to account, not income',abs(E('bal(ac("a1"))')-(a1+212000))<1e-6 and E('mSum(today().slice(0,7),"in")')==inc and E('S.dates.find(d=>d.id=="d2").done')==True)
    ok('completed list shown',pg.locator('#app details summary').count()==1)
    # --- due form: history + currency + attachment
    pg.click('.row[data-act="editDate"][data-id="d1"]'); ok('due shows payment history','Payments' in pg.inner_text('#over'))
    pg.set_input_files('#f_file','/tmp/receipt.png'); pg.wait_for_selector('#attlist .row')
    pg.click('#over button[data-act="saveDate"]'); pg.wait_for_timeout(100)
    ok('attachment saved on due',E('S.dates.find(d=>d.id=="d1").att.length')==1)
    # --- loan EMI paid + undo
    tabto(pg,'invest'); l=E('S.loans.find(x=>x.id=="l2")')
    pg.click('button[data-act="emiPaid"][data-id="l2"]'); pg.wait_for_timeout(100)
    l2=E('S.loans.find(x=>x.id=="l2")')
    ok('EMI paid updates loan',l2['paid']==l['paid']+1 and l2['out']==l['out']-24500 and l2['next']!=l['next'],l2)
    pg.click('#toast button[data-act="undo"]'); pg.wait_for_timeout(100)
    l3=E('S.loans.find(x=>x.id=="l2")'); ok('undo EMI',l3['paid']==l['paid'] and l3['out']==l['out'] and l3['next']==l['next'],l3)
    # --- goal: add from account (QAR goal from INR account)
    a1=E('bal(ac("a1"))'); nw=E('nwv("INR")')
    pg.click('button[data-act="addGoalAmt"][data-id="g2"]'); pg.fill('#f_amt','100'); pg.select_option('#f_acc','a1'); pg.click('#over button[data-act="saveGoalAmt"]'); pg.wait_for_timeout(100)
    ok('goal add from account',abs(E('S.goals.find(g=>g.id=="g2").saved')-1600)<1e-6 and abs(E('bal(ac("a1"))')-(a1-2610))<1e-6)
    ok('net worth unchanged by goal deposit',abs(E('nwv("INR")')-nw)<1e-6,(nw,E('nwv("INR")')))
    # --- investment: add money, withdraw, new from account
    pg.click('.row[data-act="editInv"][data-id="i2"]'); pg.click('#over button[data-act="invAdd"]'); pg.fill('#f_amt','10000'); pg.select_option('#f_acc','a1'); pg.click('#over button[data-act="saveInvMoney"]'); pg.wait_for_timeout(100)
    i2=E('S.inv.find(x=>x.id=="i2")'); ok('investment add money',i2['inv']==160000 and i2['val']==191500,i2)
    a1=E('bal(ac("a1"))')
    pg.click('.row[data-act="editInv"][data-id="i2"]'); pg.click('#over button[data-act="invOut"]'); pg.fill('#f_amt','19150'); pg.select_option('#f_acc','a1'); pg.click('#over button[data-act="saveInvMoney"]'); pg.wait_for_timeout(100)
    i2=E('S.inv.find(x=>x.id=="i2")'); ok('investment withdraw',abs(i2['val']-172350)<1e-6 and abs(i2['inv']-144000)<1e-6 and abs(E('bal(ac("a1"))')-(a1+19150))<1e-6,i2)
    pg.click('button[data-act="addInv"]'); pg.fill('#f_name','New RD'); pg.fill('#f_inv','5000'); pg.select_option('#f_from','a1'); pg.click('#over button[data-act="saveInv"]'); pg.wait_for_timeout(100)
    nr=E('S.inv.find(x=>x.name=="New RD")'); ok('new investment from account',nr['inv']==5000 and E('linked("inv",S.inv.find(x=>x.name=="New RD").id).length')==1 and abs(E('bal(ac("a1"))')-(a1+19150-5000))<1e-6,nr)
    # delete linked entry reverts the investment
    E('removeTx(linked("inv","i2").find(x=>x.kind=="save").id)'); i2=E('S.inv.find(x=>x.id=="i2")'); ok('deleting linked entry takes it back',abs(i2['inv']-134000)<1e-6,i2)
    # --- reports: explain every key, prepay
    tabto(pg,'rep')
    keys=E('[...document.querySelectorAll("#app [data-act=explain]")].map(e=>e.getAttribute("data-id"))')
    bad=[k for k in keys+['nw','due30','emer','emi','chk:uncat','chk:dup','chk:acc','chk:noamt','chk:both','m:fixed:'+E('mon'),'m:flex:'+E('mon')] if not E('(()=>{const d=explainData(%s);return !!d&&Array.isArray(d.rows)})()'%json.dumps(k))]
    ok('every explanation builds',not bad,bad)
    pg.click('#app [data-act="explain"][data-id^="m:out"]'); ok('explain sheet lists entries',pg.locator('#over .row').count()>3); close(pg)
    pg.fill("#pp_amt","10000"); pg.click('button[data-act="prepay"]'); ok('prepay without rate',"fewer EMIs" in pg.inner_text('#pp_out'),pg.inner_text('#pp_out'))
    E('S.loans.find(x=>x.id=="l2").rate=8.5'); pg.select_option('#pp_loan','l2'); pg.click('button[data-act="prepay"]'); t=pg.inner_text('#pp_out'); ok('prepay with rate',"months sooner" in t and "saves about" in t,t)
    for t in ['home','dates','invest','acc','spend','rep']:
        tabto(pg,t); ok('tab '+t+' renders','couldn’t be shown' not in pg.inner_text('#app'))
    pg.click('#nav button[data-id="spend"]'); pg.click('button[data-act="view"][data-id="QAR"]'); pg.wait_for_timeout(80)
    for t in ['home','dates','invest','acc','spend','rep']:
        tabto(pg,t); ok('tab '+t+' renders in QAR','couldn’t be shown' not in pg.inner_text('#app'))
    E('S.cfg.view="INR";save()')
    # --- persistence: database copy survives without the browser-storage mirror
    pg.wait_for_timeout(300); snap=E('bk()'); cnt=E('S.tx.length')
    E('localStorage.removeItem("due-and-spend.v1")'); pg.reload(); pg.wait_for_selector('#nav button')
    ok('reload from phone database',E('S.tx.length')==cnt and E('storeLabel()')=='phone database' and E('S.dates.find(d=>d.id=="d1").att.length')==1)
    # --- backup / restore round trip + before-restore copy + file
    full=E('bkFull()'); fo=json.loads(full); ok('full backup includes file',len(fo.get('files',{}))==1)
    E('S.tx.length=3'); E('save()'); pg.wait_for_timeout(100)
    E('restoreFrom(%s)'%json.dumps(full)); pg.wait_for_timeout(300)
    ok('restore brings entries back',E('S.tx.length')==cnt)
    ok('safety copy before restore',E('snapList().then(l=>l.map(o=>o.k))').count('before-restore')==1)
    pg.click('#nav button[data-id="home"]'); pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="snaps"]'); pg.wait_for_selector('#over button[data-act="snapRestore"]')
    ok('snapshot list shows copies',pg.locator('#over button[data-act="snapRestore"]').count()>=1); close(pg)
    # export files via download
    pg.click('button[data-act="settings"]')
    with pg.expect_download() as dlh: pg.click('#over button[data-act="csv"]')
    csvp=dlh.value.path(); rows=open(csvp,encoding='utf-8').read().splitlines(); ok('csv export',rows[0].startswith('"Date","Type"') and len(rows)>30,rows[:2])
    with pg.expect_download() as dlh: pg.click('#over button[data-act="ics"]')
    ic=open(dlh.value.path(),encoding='utf-8').read(); ok('calendar export',ic.count('BEGIN:VEVENT')>=5 and 'RRULE:FREQ=YEARLY' in ic)
    close(pg)
    # --- app lock: encrypt, reload, wrong/right PIN, attachment readable, turn off
    pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="lock"]'); pg.fill('#f_pin','482913'); pg.click('#over button[data-act="pinSet"]')
    pg.wait_for_function('META.enc&&!document.querySelector("#over").innerHTML',timeout=15000); pg.wait_for_timeout(500)
    raw=E('run(mainDB(),"kv","readonly",s=>s.get("c:tx")).then(v=>typeof v)'); ok('data encrypted at rest',raw=='object' and E('localStorage.getItem("due-and-spend.v1")') is None,raw)
    ok('attachment encrypted',E('run(fileDB(),"f","readonly",s=>s.getAll()).then(a=>a.every(v=>!!v.iv))'))
    pg.reload(); pg.wait_for_selector('#f_lp'); ok('locked on open',pg.locator('#nav button').count()==0)
    pg.fill('#f_lp','1111'); pg.click('button[data-act="unlock"]'); pg.wait_for_function('document.querySelector("#lockmsg").textContent=="Wrong PIN"',timeout=15000); ok('wrong PIN refused',True)
    pg.fill('#f_lp','482913'); pg.press('#f_lp','Enter'); pg.wait_for_selector('#nav button',timeout=15000)
    ok('right PIN opens data',E('S.tx.length')==cnt and E('storeLabel()')=='encrypted phone database')
    ok('encrypted attachment opens',E('fget(S.dates.find(d=>d.id=="d1").att[0].id).then(b=>b.size)')==len(PNG))
    E('addTx({kind:"out",acc:"a1",amt:11,cur:"INR",date:today(),cat:"Test"});save()'); pg.wait_for_timeout(300)
    pg.reload(); pg.wait_for_selector('#f_lp'); pg.fill('#f_lp','482913'); pg.click('button[data-act="unlock"]'); pg.wait_for_selector('#nav button',timeout=15000)
    ok('encrypted save persists',E('S.tx.length')==cnt+1)
    ok('snapshots readable while locked on',E('snapList().then(async l=>{for(const o of l)JSON.parse(await snapRead(o.k));return l.length})')>=1)
    pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="lock"]'); pg.fill('#f_pin','482913'); pg.click('#over button[data-act="pinOff"]'); pg.wait_for_function('!META.enc',timeout=15000); pg.wait_for_timeout(400)
    ok('lock off decrypts',E('run(mainDB(),"kv","readonly",s=>s.get("c:tx")).then(v=>typeof v)')=='string' and E('run(fileDB(),"f","readonly",s=>s.getAll()).then(a=>a.every(v=>!v.iv))'))
    pg.reload(); pg.wait_for_selector('#nav button'); ok('opens without PIN after lock off',E('S.tx.length')==cnt+1)
    c.close()
    # --- legacy PIN (old screen-cover lock) upgrades to encryption
    import hashlib
    leg=dict(legacy); leg['cfg']=dict(legacy['cfg'],pin=hashlib.sha256(b'ds:2468').hexdigest())
    c=b.new_context(viewport={'width':390,'height':844})
    c.add_init_script("if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(leg)))
    pg=c.new_page(); watch(pg,'legacypin'); pg.goto(URL); pg.wait_for_selector('#f_lp'); pg.fill('#f_lp','2468'); pg.click('button[data-act="unlock"]'); pg.wait_for_selector('#nav button',timeout=15000)
    ok('old PIN upgrades to encryption',pg.evaluate('!!META.enc&&!S.cfg.pin&&S.tx.length')==40)
    c.close()
    # --- no database available: falls back to browser storage
    c=b.new_context(viewport={'width':390,'height':844})
    c.add_init_script("Object.defineProperty(window,'indexedDB',{get(){throw new Error('blocked')}});if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy)))
    pg=c.new_page(); watch(pg,'nodb'); pg.goto(URL); pg.wait_for_selector('#nav button')
    pg.click('button[data-act="quick"]'); pg.fill('#f_amt','5'); pg.click('#over button[data-act="saveTx"]'); pg.wait_for_timeout(200); pg.reload(); pg.wait_for_selector('#nav button')
    ok('fallback to browser storage works',pg.evaluate('storeLabel()')=='browser storage' and pg.evaluate('S.tx.length')==41)
    c.close(); b.close()
finally:
    srv.terminate()
print('\n%d failed'%len(fails),fails)
print('console problems:',len(errs)); [print(e) for e in errs[:15]]
