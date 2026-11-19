import json,subprocess,sys,time,datetime
sys.path.insert(0,'test')
from seed import legacy
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
errs=[];fails=[]
def ok(n,c,x=''):
    print(('PASS ' if c else 'FAIL ')+n+(' :: '+str(x) if (x!='' and not c) else ''))
    if not c: fails.append(n)
SEED="if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    c=b.new_context(viewport={'width':360,'height':740},device_scale_factor=2); c.add_init_script(SEED)
    pg=c.new_page(); pg.on('pageerror',lambda e: errs.append(('pageerror',str(e)))); pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type=='error' and 'Failed to load' not in m.text else None)
    pg.goto('http://localhost:8765/due-and-spend.html'); pg.wait_for_selector('#nav button'); E=pg.evaluate
    # known figures
    rd=E('rdRun({open:"2020-01-01",rate:6.7,dep:Array.from({length:60},(_,k)=>({d:addM("2020-01-01",k),a:1000}))},"2025-01-01").bal'); ok('RD ₹1,000 a month at 6.7% matures near ₹71,369 (India Post figure)',abs(rd-71369)<=60,rd)
    ppf=E('ssyRun({type:"ppf",open:"2010-04-01",rate:7.1,dep:Array.from({length:15},(_,k)=>({d:(2010+k)+"-04-05",a:150000}))},"2025-04-01").bal'); ok('PPF ₹1.5 lakh a year for 15 years at 7.1% ≈ ₹40.68 lakh',abs(ppf-4068209)<2000,ppf)
    ok('monthly rule: deposit after the 5th misses that month',E('ssyRun({type:"ppf",open:"2020-04-01",rate:12,dep:[{d:"2020-04-06",a:1200}]},"2021-04-01").bal')==1200+132 and E('ssyRun({type:"ppf",open:"2020-04-01",rate:12,dep:[{d:"2020-04-05",a:1200}]},"2021-04-01").bal')==1200+144)
    ok('historical rates used',E('rateAt("ssy","2022-06-01")')==7.6 and E('rateAt("ssy","2023-05-01")')==8.0 and E('rateAt("ssy","2024-02-01")')==8.2 and E('rateAt("ppf","2019-08-01")')==7.9 and E('rateAt("rd","2023-08-01")')==6.5)
    # create SSY account opened in the past, add past monthly deposits
    pg.click('#nav button[data-id="invest"]'); pg.click('button[data-act="saAdd"]'); pg.select_option('#f_ty','ssy'); pg.fill('#f_name','Selvamagal - Anika'); pg.fill('#f_holder','Anika'); pg.fill('#f_open','2022-07-10'); pg.fill('#f_plan','2000'); pg.select_option('#f_freq','m'); pg.fill('#f_day','4'); pg.select_option('#f_pay','a1')
    pg.click('#over button[data-act="saSave"]'); pg.wait_for_selector('#over button[data-act="saPastSave"]',timeout=5000); ok('asks for past deposits after creating',True)
    pg.fill('#f_from','2022-07-04'); pg.fill('#f_to',E('addM(today(),-1)')); pg.dispatch_event('#f_to','change'); n_exp=E('pastList().length'); t=pg.inner_text('#pd_prev'); ok('preview counts deposits',str(n_exp) in t and n_exp>=50,t)
    a1=E('bal(ac("a1"))'); pg.click('#over button[data-act="saPastSave"]'); pg.wait_for_timeout(200)
    x=E('S.sacc[0]'); ok('past deposits added without touching account balance',len(x['dep'])==n_exp and abs(E('bal(ac("a1"))')-a1)<1e-6)
    s=E('saState(S.sacc[0])'); ok('value includes interest',s['now']>s['dep']>0 and s['dep']==2000*n_exp,s)
    ok('maturity 21 years and projection',s['mat']=='2043-07-10' and s['proj']>s['now'] and s['fut']>0)
    pg.click('button[data-act="saPast"]'); pg.fill('#f_from','2022-07-04'); pg.fill('#f_to',E('addM(today(),-1)')); pg.fill('#f_day','4'); pg.click('#over button[data-act="saPastSave"]'); pg.wait_for_timeout(200); ok('same past deposits not added twice',len(E('S.sacc[0].dep'))==n_exp)
    # deposit now from an account (transfer)
    pg.click('button[data-act="saDep"]'); pg.select_option('#f_acc','a1'); pg.click('#over button[data-act="saDepSave"]'); pg.wait_for_timeout(200)
    ok('deposit takes money from the account',abs(E('bal(ac("a1"))')-(a1-2000))<1e-6 and len(E('S.sacc[0].dep'))==n_exp+1 and E('S.tx.some(t=>t.link&&t.link.t=="sch")'))
    ok('next due moves to next month',E('saNext(S.sacc[0])')[:7]==E('addMon(today().slice(0,7),1)'))
    ok('shows in reminders',any(u.get('src')=='sch' for u in E('upcoming(today(),plus(40),true)')))
    # details, delete that deposit puts money back
    pg.click('[data-act="saInfo"]'); t=pg.inner_text('#over'); ok('details: year by year table','Year by year' in t and '2022-23' in t and 'Correct from passbook' in t)
    pg.click('#over button[data-act="saDelDep"] >> nth=0'); pg.wait_for_timeout(200); ok('deleting the deposit returns the money',abs(E('bal(ac("a1"))')-a1)<1e-6 and len(E('S.sacc[0].dep'))==n_exp)
    # passbook correction
    before=E('saState(S.sacc[0]).now'); pg.fill('#f_fd','2025-03-31'); pg.fill('#f_fb','70000'); pg.click('#over button[data-act="saFix"]'); pg.wait_for_timeout(200); after=E('saState(S.sacc[0]).now')
    ok('passbook balance changes the result',after!=before and after>70000,(before,after)); pg.click('#over .x')
    # RD account
    pg.click('button[data-act="saAdd"]'); pg.select_option('#f_ty','rd'); pg.fill('#f_name','PO RD'); pg.fill('#f_open','2024-02-15'); pg.fill('#f_plan','1000'); pg.click('#over button[data-act="saSave"]'); pg.wait_for_selector('#over button[data-act="saPastSave"]')
    pg.fill('#f_from','2024-02-15'); pg.fill('#f_day','15'); pg.fill('#f_to',E('addM(today(),-1)')); pg.dispatch_event('#f_to','change'); pg.click('#over button[data-act="saPastSave"]'); pg.wait_for_timeout(200)
    r=E('saState(S.sacc.find(x=>x.type=="rd"))'); ok('RD uses 6.7% fixed at opening and projects maturity',E('saRate(S.sacc.find(x=>x.type=="rd"),today())')==6.7 and abs(r['proj']-71369)<=80 and r['mat']=='2029-02-15',r)
    # net worth, 80C, search, backup
    ok('scheme value in net worth',E('nwParts("INR").inv')>=E('S.sacc.reduce((s,x)=>s+saState(x).now,0)'))
    ok('in backup and sync',len(json.loads(E('bk()'))['sacc'])==2 and 'sacc' in E('COLLS'))
    pg.click('#nav button[data-id="home"]'); pg.fill('input[data-gs]','anika'); pg.press('input[data-gs]','Enter'); pg.wait_for_selector('#over .row[data-act="saInfo"]'); ok('search finds scheme accounts',True); pg.click('#over .x')
    # calculator "Add as my investment" opens a scheme account for SSY
    pg.click('#nav button[data-id="invest"]'); pg.click('[data-act="schOpen"][data-id="ssy"]'); pg.fill('#sch_amt','24000'); pg.click('#over button[data-act="schCalc"]'); pg.click('#over button[data-act="schAdd"]'); ok('calculator opens a scheme account form',pg.input_value('#f_ty')=='ssy' and pg.input_value('#f_plan')=='24000'); pg.click('#over .x')
    for t_ in ['home','dates','invest','acc','spend','rep']:
        pg.click(f'#nav button[data-id="{t_}"]'); pg.wait_for_timeout(60); ok('tab '+t_,'couldn’t be shown' not in pg.inner_text('#app') and E('document.documentElement.scrollWidth<=window.innerWidth'))
    pg.click('#nav button[data-id="invest"]'); pg.wait_for_timeout(300); pg.evaluate('[...document.querySelectorAll("h2")].find(h=>h.textContent=="My savings schemes").scrollIntoView()'); pg.screenshot(path='shots/s-schemes.png')
    c.close(); b.close()
finally: srv.terminate()
print('\n%d failed'%len(fails),fails); print('problems:',len(errs)); [print(e) for e in errs[:10]]
