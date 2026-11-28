import json,subprocess,sys,time,io
sys.path.insert(0,'test')
from seed import legacy
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
errs=[];fails=[]
def ok(n,c,x=''):
    print(('PASS ' if c else 'FAIL ')+n+(' :: '+str(x) if (x!='' and not c) else ''))
    if not c: fails.append(n)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    c=b.new_context(viewport={'width':360,'height':740},has_touch=True,accept_downloads=True,device_scale_factor=2)
    c.add_init_script("if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy)))
    pg=c.new_page(); pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error','warning') and 'Failed to load resource' not in m.text else None); pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
    pg.goto('http://localhost:8765/due-and-spend.html'); pg.wait_for_selector('#nav button'); E=pg.evaluate
    # documents
    pg.click('#nav button[data-id="dates"]'); pg.click('button[data-act="showDocs"]'); pg.click('#app button[data-act="addDoc"]'); pg.fill('#f_name','My passport'); pg.select_option('#f_type','Passport'); pg.fill('#f_exp',E('plus(20)')); pg.fill('#f_no','Z1234567'); pg.click('#over button[data-act="saveDoc"]'); pg.wait_for_timeout(120)
    ok('document saved and listed',E('S.docs.length')==1 and 'My passport' in pg.inner_text('#app') and 'In 20 days' in pg.inner_text('#app'))
    pg.click('#nav button[data-id="home"]'); ok('expiry shows under Needs attention','My passport' in pg.inner_text('#app'))
    pg.fill('input[data-gs]','passport'); pg.press('input[data-gs]','Enter'); pg.wait_for_selector('#over .row[data-act="editDoc"]'); ok('search finds the document',True)
    pg.click('#over .row[data-act="editDoc"]'); pg.click('#over button[data-act="delDoc"]'); pg.wait_for_timeout(100); pg.click('#toast button[data-act="undo"]'); pg.wait_for_timeout(100); ok('delete and undo',E('S.docs.length')==1)
    ok('document is in backup and survives reload',len(json.loads(E('bk()'))['docs'])==1)
    # reports additions
    pg.click('#nav button[data-id="rep"]'); pg.wait_for_timeout(300); E('ACT.rSeg("spend")'); t=pg.inner_text('#app'); E('ACT.rSeg("tools")'); t+=pg.inner_text('#app')
    ok('subscriptions, streaks and reports sections',all(s in t for s in ['Subscriptions and fixed payments','Streaks and challenge','Reports to keep']))
    rc=E('recurringCosts()'); ok('recurring costs include premium, EMI and subscription',any('LIC' in x[0] for x in rc) and any('EMI' in x[0] for x in rc) and any('Subscriptions' in x[0] for x in rc),rc[:4])
    st=E('streaks()'); ok('streak numbers sane',st['cur']>=1 and st['best']>=st['cur'] and st['mdays']>=1,st)
    E('addTx({kind:"out",acc:"a1",amt:10,cur:"INR",date:today(),cat:"Tea"})'); ok('spending today resets the streak',E('streaks().cur')==0)
    pg.fill('#f_chal','20000'); pg.click('button[data-act="setChal"]'); pg.wait_for_timeout(100); ok('savings challenge shows progress','Savings challenge' in pg.inner_text('#app') and E('S.cfg.chal')==20000)
    # by person
    E('S.tx.slice(-6).forEach((x,i)=>{x.by=i%2?"wife@example.com":"me@example.com"});ACT.rSeg("spend")'); ok('spending by person appears','Spending by person' in pg.inner_text('#app')); E('ACT.rSeg("tools")')
    # PDF
    with pg.expect_download() as dl: pg.click('button[data-act="pdfMonth"]')
    data=open(dl.value.path(),'rb').read()
    from pypdf import PdfReader
    r=PdfReader(io.BytesIO(data),strict=True); txt="\n".join(pg_.extract_text() for pg_ in r.pages)
    ok('PDF opens and has the report',len(r.pages)>=1 and 'Personal Diary report' in txt and 'Spending by category' in txt and 'Accounts' in txt and 'INR' in txt,txt[:200])
    ok('PDF is plain letters only',all(ch<128 for ch in data))
    open('/tmp/report.pdf','wb').write(data)
    # year in review
    pg.click('button[data-act="yearView"]'); pg.wait_for_selector('#over .stat'); t=pg.inner_text('#over'); ok('year in review',('in review' in t) and ('Top categories' in t) and ('Biggest expense' in t)); pg.screenshot(path='shots/v-year.png')
    y=E('yearData(today().slice(0,4))'); ok('year totals match entries',abs(y['sp']-E('sumV(S.tx.filter(x=>x.kind=="out"&&x.date.startsWith(today().slice(0,4))))'))<1e-6 and y['days']>0,y['days'])
    pg.click('#over button[data-act="yv"][data-id="-1"]'); ok('previous year opens',str(int(E('today().slice(0,4)'))-1) in pg.inner_text('#over h2')); pg.click('#over .x')
    for t_ in ['home','dates','invest','acc','spend','rep']:
        pg.click(f'#nav button[data-id="{t_}"]'); pg.wait_for_timeout(60); ok('tab '+t_,'couldn’t be shown' not in pg.inner_text('#app') and E('document.documentElement.scrollWidth<=window.innerWidth'))
    c.close()
    # in the phone app, exports go to Downloads through the native side
    c=b.new_context(viewport={'width':360,'height':740}); c.add_init_script('''window.__n={};window.Capacitor={isNativePlatform:()=>true,addListener(){},nativePromise:async(p,m,o)=>{if(m=="saveDownload"){window.__n[o.name.split(".").pop()]=o;return {}}if(p=="LocalNotifications")return m=="getPending"?{notifications:[]}:{display:"granted"};return {}}};'''+"if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy)))
    pg=c.new_page(); pg.goto('http://localhost:8765/due-and-spend.html'); pg.wait_for_selector('#nav button')
    pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="csv"]'); pg.wait_for_function('!!window.__n.csv'); pg.click('#over .x'); pg.click('#nav button[data-id="rep"]'); pg.click('button[data-act="rSeg"][data-id="tools"]'); pg.click('button[data-act="pdfMonth"]'); pg.wait_for_function('!!window.__n.pdf')
    ok('phone app saves CSV and PDF to Downloads',pg.evaluate('window.__n.csv.mime')=='text/csv' and pg.evaluate('window.__n.pdf.mime')=='application/pdf' and pg.evaluate('window.__n.pdf.text.startsWith("%PDF")'))
    c.close(); b.close()
finally: srv.terminate()
print('\n%d failed'%len(fails),fails); print('console problems:',len(errs)); [print(e) for e in errs[:12]]
