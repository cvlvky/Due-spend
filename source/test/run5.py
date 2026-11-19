import json,subprocess,sys,time
sys.path.insert(0,'test')
from seed import legacy
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
URL='http://localhost:8765/due-and-spend.html'
errs=[];fails=[]
def ok(n,c,x=''):
    print(('PASS ' if c else 'FAIL ')+n+(' :: '+str(x) if (x!='' and not c) else ''))
    if not c: fails.append(n)
SEED="if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy))
MOCK='''window.__asked=[];window.claude={use:async name=>{
  if(name=="user")return {id:async()=>window.__uid||"u1"};
  if(name=="downloads")return {save:async o=>({status:"saved"})};
  if(name=="sample"){const f=async(input,o)=>{window.__asked.push(String(input));if(o&&o.onText)o.onText({text:"You sent QAR 7,500.",delta:"x"});return {text:"You sent QAR 7,500.",truncated:false}};
    f.json=async(input,o)=>{window.__img=o&&o.images&&o.images.length;return {amount:84.5,currency:"QAR",date:"2026-11-10",merchant:"Carrefour",category:"Food"}};f.limits=async()=>({maxPromptBytes:262144,images:{maxCount:4,maxInputBytes:2e7,mediaTypes:["image/png","image/jpeg"]}});return f}
  if(name=="db"){const doc=path=>({get:async()=>{const v=await cloud_get(path);return {exists:v!=null,data:()=>v==null?undefined:JSON.parse(v),metadata:{}}},set:async d=>{await cloud_set(path,JSON.stringify(d))},delete:async()=>{await cloud_del(path)},acquire:async o=>({acquired:true}),
      onSnapshot:(next)=>{let last;const t=setInterval(async()=>{const v=await cloud_get(path);if(v!==last){last=v;if(v!=null)next({exists:true,data:()=>JSON.parse(v),metadata:{}})}},250);return()=>clearInterval(t)}});
    return {collection:p=>({doc:id=>doc(p+"/"+id)}),doc}}
  return null}};'''
cloud={}
def mk(b,seed,uid,mock=True):
    c=b.new_context(viewport={'width':390,'height':844},has_touch=True)
    c.expose_function('cloud_get',lambda p: cloud.get(p)); c.expose_function('cloud_set',lambda p,v: cloud.__setitem__(p,v)); c.expose_function('cloud_del',lambda p: cloud.pop(p,None))
    c.add_init_script(("window.__uid=%s;"%json.dumps(uid))+(MOCK if mock else '')+(SEED if seed else ''))
    pg=c.new_page(); pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error','warning') and 'Failed to load resource' not in m.text else None); pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
    return c,pg
open('/tmp/stmt.csv','w').write('''Account statement,,,,
Date,Narration,Withdrawal Amt.,Deposit Amt.,Closing Balance
01/10/2026,"UPI-LULU HYPERMARKET-9876","1,250.00",,"98,750.00"
03/10/2026,NEFT SALARY ACME,,"85,000.00","1,83,750.00"
05/10/2026,ATM WDL DOHA,2000,,181750
bad row,,,,
06-Oct-2026,"BIG BAZAAR, MG ROAD",640.50,,181109.50
''')
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    c,pg=mk(b,True,'u1'); pg.goto(URL); pg.wait_for_selector('#nav button'); E=pg.evaluate
    # ---- SMS parsing
    E('ac("a1").l4="1234";ac("a2").l4="5566"')
    T=[("Rs.1,250.00 debited from A/c XX1234 on 12-11-26 to LULU HYPERMARKET. Avl Bal Rs.45,300",dict(kind='out',amt=1250,cur='INR',acc='a1',payee='LULU HYPERMARKET',date='2026-11-12')),
       ("Your A/c XXXX5566 has been credited with QAR 12,000.00 on 01/11/2026 from ACME TRADING. Balance QAR 16,000",dict(kind='in',amt=12000,cur='QAR',acc='a2',payee='ACME TRADING',date='2026-11-01')),
       ("QAR 84.50 spent on card ending 5566 at CARREFOUR DOHA on 10-Nov-2026",dict(kind='out',amt=84.5,cur='QAR',acc='a2',payee='CARREFOUR DOHA',date='2026-11-10')),
       ("INR 500.00 debited from a/c **1234 and credited to merchant@upi (UPI Ref 123456789)",dict(kind='out',amt=500,cur='INR',acc='a1')),
       ("Dear customer, refund of Rs 299 received in A/c 1234",dict(kind='in',amt=299,cur='INR',acc='a1'))]
    for t,exp in T:
        r=E('parseSms(%s)'%json.dumps(t)); ok('SMS: '+t[:38],r is not None and all(r[k]==v for k,v in exp.items()),r)
    ok('SMS with no amount is refused',E('parseSms("Your OTP is being sent")') is None)
    pg.click('button[data-act="quick"]'); pg.click('#over button[data-act="smsOpen"]'); pg.fill('#f_sms',T[2][0]); pg.click('#over button[data-act="smsRead"]'); pg.wait_for_selector('#over #f_amt')
    ok('SMS fills the entry form',pg.input_value('#f_amt')=='84.5' and pg.input_value('#f_acc')=='a2' and pg.input_value('#f_payee')=='CARREFOUR DOHA' and pg.input_value('#f_date')=='2026-11-10')
    pg.fill('#f_cat','Groceries'); n=E('S.tx.length'); pg.click('#over button[data-act="saveTx"]'); pg.wait_for_timeout(120); ok('SMS entry saved',E('S.tx.length')==n+1)
    ok('category learned from payee',E('parseSms("QAR 20 spent on card ending 5566 at CARREFOUR DOHA on 11-Nov-2026").cat')=='Groceries' and E('catFor("carrefour")')=='Groceries')
    # ---- CSV import
    pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="csvOpen"]'); pg.select_option('#f_acc','a1'); pg.set_input_files('#f_csv','/tmp/stmt.csv'); pg.wait_for_selector('#csvout .card')
    ok('statement read: 4 new, 1 unreadable',E('csvPend.rows.length')==4 and E('csvPend.bad')==1 and E('csvPend.rows.map(r=>r.kind+r.amt).join()')=='out1250,in85000,out2000,out640.5',E('csvPend'))
    a1=E('bal(ac("a1"))'); n=E('S.tx.length'); pg.click('#over button[data-act="csvImport"]'); pg.wait_for_timeout(150)
    ok('statement imported into account',E('S.tx.length')==n+4 and abs(E('bal(ac("a1"))')-(a1-1250+85000-2000-640.5))<1e-6)
    pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="csvOpen"]'); pg.select_option('#f_acc','a1'); pg.set_input_files('#f_csv','/tmp/stmt.csv'); pg.wait_for_selector('#csvout .card')
    ok('importing the same file again adds nothing',E('csvPend.rows.length')==0 and E('csvPend.dup')==4,E('csvPend')); pg.click('#over .x')
    # ---- receipt photo and questions through Claude (simulated)
    pg.wait_for_function('!!SMART.sample&&SMART.img'); pg.click('button[data-act="quick"]'); pg.set_input_files('#over input[data-receipt]','/tmp/receipt.png') if __import__('os').path.exists('/tmp/receipt.png') else None
    pg.wait_for_function('document.querySelector("#f_amt")&&document.querySelector("#f_amt").value=="84.5"',timeout=8000)
    ok('receipt photo fills the form',pg.input_value('#f_payee')=='Carrefour' and pg.input_value('#f_acc')=='a2' and pg.input_value('#f_cat')=='Groceries' and E('window.__img')==1); pg.click('#over .x')
    pg.click('#nav button[data-id="rep"]'); pg.fill('#ask_q','How much did I send to India?'); pg.click('button[data-act="ask"]'); pg.wait_for_function('document.querySelector("#ask_out").textContent.includes("7,500")')
    q=E('window.__asked[0]'); ok('question sends a data summary',('ACCOUNTS:' in q) and ('QAR-INR TRANSFERS' in q) and ('How much did I send' in q) and len(q)<200000,len(q))
    # ---- planning
    pg.fill('#wi_inc','10000'); pg.fill('#wi_emi','4000'); pg.click('button[data-act="whatIf"]'); ok('what-if shows result','After 12 months' in pg.inner_text('#wi_out'))
    w=E('whatIf(10000,4000,0,12)'); ok('what-if arithmetic',abs((w[11]['bal']-w[11]['base'])-6000*11)<1e-6 and w[0]['bal']==w[0]['base'],w[11])
    w2=E('whatIf(0,0,30,12)'); ok('what-if rate change raises rupee value of QAR',w2[11]['bal']>w2[11]['base'] and E('S.cfg.rate')==26.1)
    g=E('goalPlan()'); ok('goal planner gives monthly amount',g[0]['need']>0 and g[0]['mo']>=1 and g[1]['need'] is None,g)
    cv=E('coverView()'); ok('cover and yearly totals',cv['cover']==500000 and cv['lifeYr']==28450 and 'Goal planner' in pg.inner_text('#app') and 'Cover and yearly totals' in pg.inner_text('#app'),cv)
    ok('reports still render','couldn’t be shown' not in pg.inner_text('#app'))
    # ---- family sharing (simulated): two different people, one shared set
    pg.click('#nav button[data-id="home"]'); pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="cloudOpen"]'); pg.click('#over button[data-act="cloudShareOn"]'); pg.wait_for_function('CLS.shared&&!!CLS.seen',timeout=20000)
    ok('shared copy is written to the shared list',any(k.startswith('family/') for k in cloud) and not any(k.startswith('data/users') for k in cloud),list(cloud)[:3])
    c2,p2=mk(b,False,'u2'); p2.goto(URL); p2.wait_for_selector('#nav button'); p2.wait_for_function('!!CL'); p2.click('button[data-act="settings"]'); p2.click('#over button[data-act="cloudOpen"]'); p2.click('#over button[data-act="cloudShareOn"]')
    p2.wait_for_function('CLS.shared&&S.tx.length>40',timeout=20000); ok('second person sees the shared records',p2.evaluate('S.tx.length')==E('S.tx.length') and p2.evaluate('S.acc.length')==3)
    p2.evaluate('addTx({kind:"out",acc:"a1",amt:77,cur:"INR",date:today(),cat:"From spouse"});save()'); pg.wait_for_function('S.tx.some(x=>x.cat=="From spouse")',timeout=25000); ok('their entry reaches the first person',True)
    c2.close(); c.close()
    # ---- installed app: shared SMS text opens a filled entry; no Claude features shown
    c,pg=mk(b,True,'u1',mock=False); pg.goto('http://localhost:8765/pwa/index.html?text='+__import__('urllib.parse').parse.quote(T[0][0])); pg.wait_for_selector('#over #f_amt')
    ok('shared SMS opens a filled entry',pg.input_value('#f_amt')=='1250' and pg.input_value('#f_k')=='out'); pg.click('#over .x')
    pg.click('#nav button[data-id="rep"]'); ok('no Claude features outside Claude',pg.locator('#ask_q').count()==0 and pg.evaluate('!SMART.sample'))
    man=json.load(open('dist/pwa/manifest.json')); ok('manifest has share target',man['share_target']['params']['text']=='text')
    c.close(); b.close()
finally: srv.terminate()
print('\n%d failed'%len(fails),fails); print('console problems:',len(errs)); [print(e) for e in errs[:12]]
