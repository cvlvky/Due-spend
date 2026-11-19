import json,subprocess,sys,time,os
sys.path.insert(0,'test')
from seed import legacy
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
URL='http://localhost:8765/due-and-spend.html'
errs=[]
def watch(pg,tag):
    pg.on('console',lambda m: errs.append((tag,m.type,m.text)) if m.type in('error','warning') and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.on('pageerror',lambda e: errs.append((tag,'pageerror',str(e))))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    # 1. fresh
    c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True)
    pg=c.new_page(); watch(pg,'fresh'); pg.goto(URL); pg.wait_for_selector('#nav button')
    for t in ['home','dates','invest','acc','spend','rep']:
        pg.click(f'#nav button[data-id="{t}"]'); pg.wait_for_timeout(120)
        assert 'couldn’t be shown' not in pg.inner_text('#app'), ('fresh',t,pg.inner_text('#app')[:300])
    print('fresh ok; storage:',pg.evaluate('storeLabel()'),'secure',pg.evaluate('isSecureContext'))
    c.close()
    # 2. legacy data
    c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True)
    c.add_init_script("if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy)))
    pg=c.new_page(); watch(pg,'legacy'); pg.goto(URL); pg.wait_for_selector('#nav button')
    os.makedirs('shots',exist_ok=True)
    for t in ['home','dates','invest','acc','spend','rep']:
        pg.click(f'#nav button[data-id="{t}"]'); pg.wait_for_timeout(900)
        txt=pg.inner_text('#app'); assert 'couldn’t be shown' not in txt, ('legacy',t,txt[:400])
        pg.screenshot(path=f'shots/{t}.png',full_page=True)
    info=pg.evaluate('''()=>({bal:S.acc.map(k=>[k.id,bal(k)]),ntx:S.tx.length,tr:S.tx.filter(x=>x.kind=="tr").length,hasTr:"tr" in S,nw:nwv("INR"),store:storeLabel(),rec:S.tx.filter(x=>x.rec).length,
       sum:summary(today().slice(0,7)),health:health(today().slice(0,7)).map(h=>h.n+": "+h.v+" ["+h.l+"]"),fc:forecast(6).map(r=>[r.m,Math.round(r.inc),Math.round(r.fixed),Math.round(r.flex),Math.round(r.bal)]),safe:safeSpend().safe,checks:checks().map(c=>c.t)})''')
    print(json.dumps(info,indent=1,ensure_ascii=False))
    # expected balances by the old rule
    exp={}
    for a in legacy['acc']:
        v=a['open']
        for x in legacy['tx']:
            if x['acc']==a['id']: v+= x['amt'] if x['kind'] in('in','adj') else -x['amt']
        for t in legacy['tr']:
            if t['from']==a['id']: v-=t['amt']+t['fee']
            if t['to']==a['id']: v+=t['got']
        exp[a['id']]=v
    got=dict(info['bal']); recs=info['rec']
    print('expected (before recurring):',exp,'recurring added:',recs)
    c.close(); b.close()
finally:
    srv.terminate()
print('ERRORS' if errs else 'no console errors'); [print(e) for e in errs[:20]]
