import json,subprocess,sys,time,os
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
SEED="if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy))
MOCK='''window.claude={use:async name=>{
  if(name=="user")return {id:async()=>"u1"};
  if(name=="downloads")return {save:async o=>{window.__saved={filename:o.filename,len:String(o.data).length};return {status:"saved"}}};
  if(name=="db"){const doc=path=>({get:async()=>{const v=await cloud_get(path);return {exists:v!=null,data:()=>v==null?undefined:JSON.parse(v),metadata:{fromCache:false,hasPendingWrites:false}}},
      set:async d=>{if(JSON.stringify(d).length>262144)throw {code:"invalid_argument"};await cloud_set(path,JSON.stringify(d))},delete:async()=>{await cloud_del(path)},acquire:async o=>({acquired:await cloud_lock(path,o.holder,o.ttlMs||30000)}),
      onSnapshot:(next)=>{let last;const t=setInterval(async()=>{const v=await cloud_get(path);if(v!==last){last=v;if(v!=null)next({exists:true,data:()=>JSON.parse(v),metadata:{hasPendingWrites:false}})}},250);return()=>clearInterval(t)}});
    return {collection:p=>({doc:id=>doc(p+"/"+id)}),doc}}
  return null}};'''
cloud={};locks={}
def lock(p,holder,ttl):
    now=time.time()*1000; cur=locks.get(p)
    if cur and cur[0]!=holder and cur[1]>now: return False
    locks[p]=(holder,now+max(1000,ttl)); return True
def mk(b,seed):
    c=b.new_context(viewport={'width':390,'height':844},has_touch=True)
    c.expose_function('cloud_get',lambda p: cloud.get(p))
    c.expose_function('cloud_set',lambda p,v: cloud.__setitem__(p,v))
    c.expose_function('cloud_del',lambda p: cloud.pop(p,None))
    c.expose_function('cloud_lock',lock)
    c.add_init_script(MOCK+(SEED if seed else ''))
    pg=c.new_page(); watch(pg,'A' if seed else 'B'); pg.goto(URL); pg.wait_for_selector('#nav button'); return c,pg
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    # ---------- copy in the Claude account, two devices ----------
    cA,A=mk(b,True)
    A.wait_for_selector('button[data-act="cloudOn"]'); ok('offer shown on Home, nothing sent before consent',len(cloud)==0)
    A.click('button[data-act="cloudOn"]'); A.wait_for_function('CLS.on&&!!CLS.seen',timeout=15000)
    ok('first upload writes parts and meta',any(k.endswith('/meta') for k in cloud) and any(k.endswith('/tx-0') for k in cloud),list(cloud)[:5])
    ok('each document within size limit',max(len(v) for v in cloud.values())<262144)
    cB,B=mk(b,False)
    B.wait_for_selector('button[data-act="cloudOn"]'); B.click('button[data-act="cloudOn"]'); B.wait_for_function('CLS.on&&!!CLS.seen&&S.tx.length>5',timeout=15000)
    same=lambda: A.evaluate('JSON.stringify(S.acc.map(k=>[k.id,Math.round(bal(k)*100)]).sort())')==B.evaluate('JSON.stringify(S.acc.map(k=>[k.id,Math.round(bal(k)*100)]).sort())')
    ok('second device receives the data',B.evaluate('S.tx.length')==A.evaluate('S.tx.length') and same() and B.evaluate('S.acc.length')==3,(A.evaluate('S.tx.length'),B.evaluate('S.tx.length')))
    ok('second device keeps a local database copy',B.evaluate('storeLabel()')=='phone database')
    # B adds an entry -> A gets it
    B.click('button[data-act="quick"]'); B.fill('#f_amt','123'); B.click('#q_c button[data-id="Food"]'); B.click('#over button[data-act="saveTx"]')
    n=B.evaluate('S.tx.length'); A.wait_for_function('S.tx.length==%d'%n,timeout=20000); ok('new entry reaches the first device',same())
    # A deletes it -> B loses it; A edits an account name -> B sees it
    A.evaluate('removeTx(S.tx.find(x=>x.amt==123).id);const k=ac("a3");k.name="Pocket cash";k.ut=Date.now();save()')
    B.wait_for_function('S.tx.length==%d&&ac("a3").name=="Pocket cash"'%(n-1),timeout=20000); ok('delete and edit reach the second device',same())
    # both change different things at about the same time
    A.evaluate('addTx({kind:"out",acc:"a1",amt:11,cur:"INR",date:today(),cat:"A-side"});save()'); B.evaluate('addTx({kind:"out",acc:"a1",amt:22,cur:"INR",date:today(),cat:"B-side"});save()')
    A.wait_for_function('S.tx.some(x=>x.cat=="B-side")&&S.tx.some(x=>x.cat=="A-side")',timeout=25000); B.wait_for_function('S.tx.some(x=>x.cat=="B-side")&&S.tx.some(x=>x.cat=="A-side")',timeout=25000)
    ok('simultaneous changes both kept',same() and A.evaluate('S.tx.length')==B.evaluate('S.tx.length'))
    # restoring a backup on one device replaces the data on the other, instead of being merged back
    keep=A.evaluate('bk()'); A.evaluate('addTx({kind:"out",acc:"a1",amt:999,cur:"INR",date:today(),cat:"Mistake"});save()'); B.wait_for_function('S.tx.some(x=>x.cat=="Mistake")',timeout=25000)
    A.evaluate('restoreFrom(%s)'%json.dumps(keep)); B.wait_for_function('!S.tx.some(x=>x.cat=="Mistake")',timeout=30000); time.sleep(1)
    ok('restore on one device replaces the other',same() and not A.evaluate('S.tx.some(x=>x.cat=="Mistake")') and A.evaluate('S.tx.length')==B.evaluate('S.tx.length'))
    # quiet when nothing changes
    time.sleep(6); w0=dict(cloud); time.sleep(6); ok('no writes when nothing changed',w0==cloud)
    # reload A: still on, no duplicates
    A.reload(); A.wait_for_selector('#nav button'); A.wait_for_function('CLS.on&&!!CL',timeout=15000); time.sleep(2); ok('stays on after reload without duplicating',A.evaluate('S.tx.length')==B.evaluate('S.tx.length') and A.evaluate('new Set(S.tx.map(x=>x.id)).size==S.tx.length'))
    # downloads capability used for exports inside Claude
    A.click('button[data-act="settings"]'); A.click('#over button[data-act="shareBk"]'); A.wait_for_function('!!window.__saved'); ok('backup offered through Claude download',A.evaluate('window.__saved.filename')=='personal-diary-backup.json' and A.evaluate('S.cfg.lastBk')==A.evaluate('today()'))
    ok('no calendar-file or Google buttons inside Claude',A.locator('#over button[data-act="ics"]').count()==0 and A.locator('#over button[data-act="syncOpen"]').count()==0 and A.locator('#over button[data-act="cloudOpen"]').count()==1)
    A.click('#over button[data-act="cloudOpen"]'); A.click('#over button[data-act="cloudWipe"]'); A.click('#over button[data-act="cloudWipe"]'); A.wait_for_function('CLS.later===true',timeout=30000); time.sleep(.3)
    ok('delete removes the account copy, keeps local data',len(cloud)==0 and A.evaluate('S.tx.length')>30,list(cloud))
    cA.close(); cB.close()
    # ---------- merge rules ----------
    c=b.new_context(); pg=c.new_page(); watch(pg,'unit'); pg.goto(URL); pg.wait_for_selector('#nav button'); E=pg.evaluate
    ids=lambda s: E('(%s).map(x=>x.id+(x.v||"")).join()'%s)
    T='tombMap([{id:"b",at:50}])'
    ok('merge: both sides kept',ids('mergeColl([{id:"a"},{id:"c"}],[{id:"a"},{id:"d"}],new Map())')=='a,d,c')
    ok('merge: deleted id stays deleted',ids('mergeColl([{id:"a"},{id:"b",ut:10}],[{id:"b",ut:20}],%s)'%T)=='a')
    ok('merge: record restored after delete survives',ids('mergeColl([{id:"b",ut:60}],[],%s)'%T)=='b')
    ok('merge: newer edit wins',ids('mergeColl([{id:"a",v:"L",ut:5}],[{id:"a",v:"R",ut:9}],new Map(),true)')=='aR' and ids('mergeColl([{id:"a",v:"L",ut:9}],[{id:"a",v:"R",ut:5}],new Map(),false)')=='aL')
    ok('merge: tie follows the side asked for',ids('mergeColl([{id:"a",v:"L"}],[{id:"a",v:"R"}],new Map(),true)')=='aL' and ids('mergeColl([{id:"a",v:"L"}],[{id:"a",v:"R"}],new Map(),false)')=='aR')
    ok('merge: old transfers folded in once',E('normR({tx:[{id:"x1",kind:"tr"}],tr:[{id:"x1",from:"a",to:"b",amt:1,got:1},{id:"x2",from:"a",to:"b",amt:2,got:2}]}).tx.map(x=>x.id).join()')=='x1,x2')
    # ---------- recurring entries: added once, same id on every device ----------
    E('S.acc.push({id:"z1",name:"Z",type:"bank",cur:"INR",open:0});S.rec.push({id:"rr",kind:"in",amt:1000,acc:"z1",cat:"Salary",day:1,from:addMon(today().slice(0,7),-2),last:""});applyRec();applyRec()')
    ok('recurring adds one entry per month',E('S.tx.filter(x=>x.rec=="rr").length')==3 and E('S.tx.filter(x=>x.rec=="rr").every(x=>x.id=="r_rr_"+x.date.slice(0,7))') and E('bal(ac("z1"))')==3000)
    c.close()
    # ---------- installed app: shortcut, offline ----------
    c=b.new_context(viewport={'width':390,'height':844}); pg=c.new_page(); watch(pg,'pwa')
    pg.goto('http://localhost:8765/pwa/index.html?add=in'); pg.wait_for_selector('#over #f_amt')
    ok('shortcut opens quick add as income',pg.input_value('#f_k')=='in')
    pg.wait_for_function('navigator.serviceWorker.controller||navigator.serviceWorker.getRegistration().then(r=>!!(r&&r.active))',timeout=15000); time.sleep(1)
    pg.fill('#f_amt','50'); pg.click('#over button[data-act="saveTx"]'); pg.wait_for_timeout(300)
    c.set_offline(True); pg.goto('http://localhost:8765/pwa/index.html'); pg.wait_for_selector('#nav button'); ok('opens offline with data',pg.evaluate('S.tx.length')==1)
    man=json.load(open('dist/pwa/manifest.json')); ok('manifest has shortcuts',len(man['shortcuts'])==2)
    c.close()
    # ---------- look at the sheets ----------
    c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True); c.add_init_script(SEED); pg=c.new_page(); watch(pg,'shots'); pg.goto(URL); pg.wait_for_selector('#nav button')
    pg.click('button[data-act="quick"]'); pg.wait_for_timeout(400); pg.screenshot(path='shots/s-quick.png')
    pg.click('#over .x'); pg.click('#nav button[data-id="dates"]'); pg.click('.row[data-act="editDate"][data-id="d1"]'); pg.wait_for_timeout(300); pg.screenshot(path='shots/s-due.png')
    pg.click('#over .x'); pg.click('#nav button[data-id="home"]'); pg.click('button[data-act="settings"]'); pg.wait_for_timeout(300); pg.screenshot(path='shots/s-settings.png')
    pg.click('#over .x'); pg.click('.stat[data-id^="m:out"]'); pg.wait_for_timeout(300); pg.screenshot(path='shots/s-explain.png')
    pg.click('#over .x'); pg.evaluate('settings()'); pg.click('#over button[data-act="theme"]'); pg.click('#over button[data-act="theme"]'); pg.click('#over .x'); pg.click('#nav button[data-id="rep"]'); pg.wait_for_timeout(900); pg.screenshot(path='shots/s-dark.png')
    c.close(); b.close()
finally:
    srv.terminate()
print('\n%d failed'%len(fails),fails)
print('console problems:',len(errs)); [print(e) for e in errs[:15]]
