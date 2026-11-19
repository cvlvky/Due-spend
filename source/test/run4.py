import json,subprocess,sys,time
sys.path.insert(0,'test')
from seed import legacy
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
URL='http://localhost:8765/due-and-spend.html'
errs=[];fails=[]
def ok(name,cond,extra=''):
    print(('PASS ' if cond else 'FAIL ')+name+(' :: '+str(extra) if (extra!='' and not cond) else ''))
    if not cond: fails.append(name)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    c=b.new_context(viewport={'width':360,'height':740},has_touch=True)
    c.add_init_script("if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy)))
    pg=c.new_page()
    pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error','warning') and 'Failed to load resource' not in m.text else None)
    pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
    pg.goto(URL); pg.wait_for_selector('#nav button'); E=pg.evaluate
    def tab(t): pg.click(f'#nav button[data-id="{t}"]'); pg.wait_for_timeout(60)
    def sv(act): pg.click(f'#over button[data-act="{act}"]'); pg.wait_for_timeout(120)
    def nowrong(n): t=pg.inner_text('#toast'); ok(n,'Something went wrong' not in t and pg.locator('#over .sheet').count()==0,t or 'sheet still open')
    # nav fits at 360px wide
    ok('six tabs fit a 360px screen',E('[...document.querySelectorAll("#nav button")].every(b=>b.scrollWidth<=b.clientWidth+1)'),E('[...document.querySelectorAll("#nav button")].map(b=>[b.textContent,b.scrollWidth,b.clientWidth])'))
    ok('no sideways scroll',E('document.documentElement.scrollWidth<=window.innerWidth'))
    # new due date in QAR, with odd characters in the name
    tab('dates'); pg.click('button[data-act="addDate"]'); pg.fill('#f_name','Villa rent <b>"A&B"</b>'); pg.fill('#f_amt','4500'); pg.select_option('#f_cur','QAR'); pg.select_option('#f_rep','monthly'); pg.select_option('#f_pay','a2'); sv('saveDate'); nowrong('save QAR due date')
    ok('name shown as text, not markup',pg.locator('#app b >> text=Villa rent <b>"A&B"</b>').count()>=1)
    d=E('S.dates.find(x=>x.cur=="QAR")'); a2=E('bal(ac("a2"))'); pg.click(f'button[data-act="paid"][data-id="{d["id"]}"]'); pg.wait_for_timeout(120)
    ok('QAR due paid from QAR account',abs(E('bal(ac("a2"))')-(a2-4500))<1e-6)
    pg.click(f'.row[data-act="editDate"][data-id="{d["id"]}"]'); ok('calendar link present',pg.get_attribute('#over a.btn','href').startswith('https://calendar.google.com/')); 
    pg.mouse.click(180,20); pg.wait_for_timeout(80); ok('tap outside closes sheet',pg.locator('#over .sheet').count()==0)
    # accounts
    tab('acc'); pg.click('button[data-act="addAcc"]'); pg.fill('#f_name','HDFC Card'); pg.select_option('#f_type','card'); pg.fill('#f_open','-1200'); sv('saveAcc'); nowrong('add account')
    pg.click('button[data-act="addMoney"][data-id="a3"]'); ok('add money opens as income with category',pg.input_value('#f_k')=='in' and pg.input_value('#f_cat')=='Deposit' and pg.input_value('#f_acc')=='a3'); pg.fill('#f_amt','700'); sv('saveTx'); nowrong('add money')
    pg.click('button[data-act="stmt"][data-id="a1"]'); pg.click('#over .row >> text=Transfer from'); ok('statement row opens the transfer',pg.locator('#over #f_from').count()==1); pg.fill('#f_note','edited'); sv('saveTr'); nowrong('edit transfer')
    pg.click('button[data-act="fixBal"][data-id="a1"]'); sv('okBal'); ok('confirm balance matches',E('ac("a1").rcd')==E('today()'))
    # wealth forms
    tab('invest'); pg.click('button[data-act="addGoal"]'); pg.fill('#f_name','Laptop'); pg.fill('#f_tg','90000'); sv('saveGoal'); nowrong('add goal')
    pg.click('button[data-act="addLoan"]'); pg.fill('#f_name','Gold loan'); pg.fill('#f_emi','5000'); pg.fill('#f_tot','12'); pg.fill('#f_rate','9'); sv('saveLoan'); nowrong('add loan')
    pg.click('[data-act="editLoan"] >> nth=0'); ok('loan form opens',pg.locator('#over #f_emi').count()==1); sv('saveLoan'); nowrong('edit loan')
    pg.click('.row[data-act="editInv"][data-id="i1"]'); pg.fill('#f_val','214000'); sv('saveInv'); ok('value history kept',E('S.inv.find(x=>x.id=="i1").hist.length')==1)
    # spend forms
    tab('spend'); pg.click('button[data-act="addBud"]'); pg.fill('#f_cat','Travel'); pg.fill('#f_lim','500'); pg.select_option('#f_cur','QAR'); sv('saveBud'); nowrong('add budget')
    pg.click('button[data-act="addRec"]'); pg.select_option('#f_k','in'); pg.fill('#f_amt','12000'); pg.select_option('#f_acc','a2'); pg.fill('#f_cat','Salary'); pg.fill('#f_day','1'); sv('saveRec'); nowrong('add recurring')
    ok('forecast uses recurring income',E('forecast(3)[1].planned')>0 and E('forecast(3)[1].est')==0)
    pg.select_option('#f_fa','a2'); pg.wait_for_timeout(80); ok('account filter',E('document.querySelectorAll("#app .row[data-act=editTx]").length')>0 and E('[...document.querySelectorAll("#app .row[data-act=editTx] > div:not(.r) > small")].every(e=>e.textContent.includes("QNB Salary"))'))
    pg.select_option('#f_fa',''); pg.fill('#f_rate','26.4'); pg.dispatch_event('#f_rate','change'); pg.wait_for_timeout(80); ok('rate change recorded',E('S.cfg.rate')==26.4 and E('S.cfg.rateAt')==E('today()'))
    pg.click('button[data-act="mon"][data-id="-1"]'); pg.wait_for_timeout(60); ok('previous month',E('mon')==E('addMon(today().slice(0,7),-1)'))
    # saved entry into a goal via the entry form; then delete takes it back
    pg.click('.fab2'); pg.click('#over .ft[data-act="qOut"]'); pg.click('#q_k button[data-id="save"]'); pg.fill('#f_amt','2000'); pg.select_option('#f_acc','a1'); pg.click('#over details summary'); pg.select_option('#f_goal','g1'); sv('saveTx')
    ok('saved entry adds to the goal',E('S.goals.find(g=>g.id=="g1").saved')==52000)
    tab('rep'); pg.click('#app [data-act="explain"][data-id^="m:save"]'); pg.click('#over .row[data-act="editTx"] >> text=2,000'); sv('delTx'); ok('deleting it lowers the goal again',E('S.goals.find(g=>g.id=="g1").saved')==50000)
    # recycle bin restore
    tab('home'); pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="bin"]'); n=pg.locator('#over button[data-act="binRestore"]').count(); pg.click('#over button[data-act="binRestore"] >> nth=0'); pg.wait_for_timeout(100)
    ok('restore from recycle bin',pg.locator('#over button[data-act="binRestore"]').count()==n-1 and E('S.goals.find(g=>g.id=="g1").saved')==52000)
    pg.click('#over .x'); pg.click('button[data-act="settings"]'); pg.fill('#f_fixed','Rent, Bills, Family'); sv('saveCfg'); ok('fixed categories saved',E('S.cfg.fixedCats')=='Rent, Bills, Family')
    pg.click('button[data-act="hide"]'); ok('hide amounts',E('document.body.classList.contains("hide")')); pg.click('button[data-act="hide"]')
    E('settings()'); pg.click('#over button[data-act="theme"]'); pg.click('#over .x'); ok('theme switch',E('document.documentElement.getAttribute("data-theme")')=='light')
    for t in ['home','dates','invest','acc','spend','rep']:
        tab(t); ok('tab '+t+' still renders','couldn’t be shown' not in pg.inner_text('#app'))
    ok('no sideways scroll on reports',E('document.documentElement.scrollWidth<=window.innerWidth'),E('document.documentElement.scrollWidth'))
    pg.wait_for_timeout(300); n=E('S.tx.length'); pg.reload(); pg.wait_for_selector('#nav button'); ok('everything saved across reload',E('S.tx.length')==n and E('S.acc.length')==4 and E('S.loans.length')==3 and E('S.bud.length')==3)
    c.close(); b.close()
finally:
    srv.terminate()
print('\n%d failed'%len(fails),fails); print('console problems:',len(errs)); [print(e) for e in errs[:15]]
