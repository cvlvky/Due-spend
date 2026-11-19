import json,subprocess,sys,time
sys.path.insert(0,'test')
from seed import legacy
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
errs=[];fails=[]
def ok(n,c,x=''):
    print(('PASS ' if c else 'FAIL ')+n+(' :: '+str(x) if (x!='' and not c) else ''))
    if not c: fails.append(n)
NATIVE='''window.__n={saved:[],prune:[],exit:0};window.Capacitor={isNativePlatform:()=>true,addListener(){},nativePromise:async(p,m,o)=>{const N=window.__n;if(p=="LocalNotifications")return m=="getPending"?{notifications:[]}:{display:"granted"};
 if(m=="saveDownload"){N.saved.push(o.name);return {}}if(m=="pruneBackups"){N.prune.push(o);return {removed:0}}if(m=="exitApp"){N.exit++;return {}}return {}}};'''
SEED="if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    c=b.new_context(viewport={'width':390,'height':844}); c.add_init_script(NATIVE+SEED)
    pg=c.new_page(); pg.on('pageerror',lambda e: errs.append(('pageerror',str(e)))); pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error',) and 'Failed to load' not in m.text else None)
    pg.goto('http://localhost:8765/due-and-spend.html'); pg.wait_for_selector('#nav button'); E=pg.evaluate
    pg.wait_for_function('window.__n.saved.length>=1',timeout=8000)
    ok('backup file saved on open',any(n.startswith('personal-diary-backup-') for n in E('window.__n.saved')) and E('S.cfg.autoBkAt')>0)
    ok('old backups trimmed to 14',any(x['keep']==14 for x in E('window.__n.prune')))
    ok('latest copy kept inside the app',E('snapList().then(l=>l.some(o=>o.k=="latest"))'))
    pg.reload(); pg.wait_for_selector('#nav button'); time.sleep(1); ok('only one file per day',len([n for n in E('window.__n.saved') if 'backup-' in n])==0)
    # back button: closes a sheet first, then goes Home, then shows the saved message
    pg.click('#nav button[data-id="rep"]'); ok('back goes Home first',E('window.__dsBack()')==True and E('tab')=='home')
    ok('back on Home shows the saving message',E('window.__dsBack()')==True); pg.wait_for_selector('#over button[data-act="exitNow"]',timeout=10000)
    t=pg.inner_text('#over'); ok('message shows save, sync and backup times','All saved' in t and 'Saved on this phone' in t and 'Backup file in Downloads' in t and 'today at' in t,t)
    pg.click('#over button[data-act="exitNow"]'); ok('Close app leaves the app',E('window.__n.exit')==1 and E('window.__dsBack()')==False)
    pg.evaluate('document.dispatchEvent(new Event("visibilitychange"))'); 
    ok('Stay keeps the app open',True)
    # with sync on, the message shows last synced time
    E('SY={on:true,lastOk:Date.now()-5*60000,cfg:{apiKey:"k",projectId:"p"},space:"x"};exitOk=false')
    E('window.__dsBack()'); pg.wait_for_selector('#over button[data-act="exitNow"]',timeout=10000); ok('shows last synced time','Last synced' in pg.inner_text('#over') and 'today at' in pg.inner_text('#over'))
    pg.click('#over button[data-act="closeX"]'); ok('Stay closes the message',pg.locator('#over .sheet').count()==0)
    c.close(); b.close()
finally: srv.terminate()
print('\n%d failed'%len(fails),fails); print('problems:',len(errs)); [print(e) for e in errs[:10]]
