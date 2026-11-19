import json,subprocess,sys,time
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
    c=b.new_context(viewport={'width':360,'height':740},device_scale_factor=2,has_touch=True)
    c.add_init_script("if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy)))
    pg=c.new_page(); pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error','warning') and 'Failed to load resource' not in m.text else None); pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
    pg.goto('http://localhost:8765/due-and-spend.html'); pg.wait_for_selector('#nav button'); E=pg.evaluate
    ok('nav has icons and fits',pg.locator('#nav svg').count()==6 and E('[...document.querySelectorAll("#nav button")].every(b=>b.scrollWidth<=b.clientWidth+1)'))
    ok('setup card and account strip on Home','Get set up' in pg.inner_text('#app') and pg.locator('.strip .sc').count()==4)
    pg.screenshot(path='shots/u-home.png')
    # add menu
    pg.click('.fab2'); ok('add menu shows 15 choices',pg.locator('#over .ft').count()==15); pg.screenshot(path='shots/u-fab.png')
    pg.click('#over .ft[data-act="qIn"]'); ok('income from add menu',pg.input_value('#f_k')=='in'); pg.click('#over .x')
    pg.click('.fab2'); pg.click('#over .ft[data-act="trf"]'); ok('transfer from add menu',pg.locator('#over #f_from').count()==1); pg.click('#over .x')
    # frequent entry: make two identical then check chip
    for _ in range(6): E('addTx({kind:"out",acc:"a2",amt:18,cur:"QAR",date:today(),cat:"Food",payee:"Karak House"})')
    E('save()'); pg.click('.fab2'); pg.click('#over .ft[data-act="qOut"]'); ok('frequent entry chip',pg.locator('#over button[data-act="qf"]').count()>=1)
    pg.click('#over button[data-act="qf"]:has-text("Karak")'); ok('chip fills the form',pg.input_value('#f_amt')=='18' and pg.input_value('#f_payee')=='Karak House' and pg.input_value('#f_acc')=='a2')
    n=E('S.tx.length'); pg.click('#over button[data-act="saveTx"]'); pg.wait_for_timeout(120); ok('saved',E('S.tx.length')==n+1)
    # search
    pg.fill('input[data-gs]','lic'); pg.press('input[data-gs]','Enter'); pg.wait_for_selector('#over .row'); ok('search finds the policy',pg.locator('#over .row[data-act="editDate"]').count()==1)
    pg.click('#over .x'); pg.fill('input[data-gs]','karak'); pg.press('input[data-gs]','Enter'); pg.wait_for_selector('#over .row'); ok('search finds entries',pg.locator('#over .row[data-act="editTx"]').count()==7)
    # repeat entry
    pg.click('#over .row[data-act="editTx"] >> nth=0'); n=E('S.tx.length'); pg.click('#over button[data-act="repeatTx"]'); pg.wait_for_timeout(120); ok('add again today',E('S.tx.length')==n+1)
    # account strip opens statement
    pg.click('.strip .sc >> nth=0'); ok('account card opens statement','statement' in pg.inner_text('#over h2')); pg.click('#over .x')
    pg.click('button[data-act="gsHide"]'); ok('setup card can be hidden','Get set up' not in pg.inner_text('#app'))
    # dues calendar
    pg.click('#nav button[data-id="dates"]'); pg.wait_for_timeout(200); ok('calendar marks due days',pg.locator('.cal i.has, .cal i.late').count()>=2); pg.screenshot(path='shots/u-dues.png')
    pg.click('.cal i.has >> nth=0'); ok('tapping a day lists what is due',len(pg.inner_text('#toast'))>3)
    m0=E('dmon'); pg.click('button[data-act="dmon"][data-id="1"]'); ok('calendar next month',E('dmon')==E('addMon("%s",1)'%m0))
    # spend list grouped by day, with icons
    pg.click('#nav button[data-id="spend"]'); pg.wait_for_timeout(200); ok('entries grouped by day with icons',pg.locator('.dh').count()>=2 and pg.locator('.row .ci').count()>5 and 'Today' in pg.inner_text('#app'))
    pg.evaluate('document.querySelector(".dh").scrollIntoView()'); pg.screenshot(path='shots/u-spend.png')
    for t in ['home','dates','invest','acc','spend','rep']:
        pg.click(f'#nav button[data-id="{t}"]'); pg.wait_for_timeout(60); ok('tab '+t,'couldn’t be shown' not in pg.inner_text('#app') and pg.locator('.fab2').count()==1 and E('document.documentElement.scrollWidth<=window.innerWidth'))
    c.close(); b.close()
finally: srv.terminate()
print('\n%d failed'%len(fails),fails); print('console problems:',len(errs)); [print(e) for e in errs[:12]]
