import json,subprocess,sys,time,base64
sys.path.insert(0,'test')
from seed import legacy
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
errs=[];fails=[]
def ok(n,c,x=''):
    print(('PASS ' if c else 'FAIL ')+n+(' :: '+str(x) if (x!='' and not c) else ''))
    if not c: fails.append(n)
OZ=31.1034768
DATA={'xau':{"date":"2026-11-13","xau":{"inr":340000.0,"qar":14500.0,"usd":3980.0}},'xag':{"date":"2026-11-13","xag":{"inr":4100.0,"qar":175.0}},'qar':{"date":"2026-11-13","qar":{"inr":24.31}}}
MF_SEARCH=[{"schemeCode":122639,"schemeName":"Parag Parikh Flexi Cap Fund - Direct Plan - Growth"},{"schemeCode":122640,"schemeName":"Parag Parikh Flexi Cap Fund - Regular Plan - Growth"}]
MF_LATEST={"meta":{"scheme_name":"Parag Parikh Flexi Cap Fund - Direct Plan - Growth"},"data":[{"date":"12-11-2026","nav":"92.5100"}]}
LIVE={'d':None}
def route(r):
    u=r.request.url
    if 'xaus.com/api' in u:
        return r.fulfill(status=200,content_type='application/json',body=json.dumps(LIVE['d']),headers={'Access-Control-Allow-Origin':'*'}) if LIVE['d'] else r.fulfill(status=503,body='',headers={'Access-Control-Allow-Origin':'*'})
    for k in DATA:
        if f'/currencies/{k}.min.json' in u: return r.fulfill(status=200,content_type='application/json',body=json.dumps(DATA[k]),headers={'Access-Control-Allow-Origin':'*'})
    if 'mfapi.in/mf/search' in u: return r.fulfill(status=200,content_type='application/json',body=json.dumps(MF_SEARCH),headers={'Access-Control-Allow-Origin':'*'})
    if 'mfapi.in/mf/' in u: return r.fulfill(status=200,content_type='application/json',body=json.dumps(MF_LATEST),headers={'Access-Control-Allow-Origin':'*'})
    return r.continue_()
SEED="if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    c=b.new_context(viewport={'width':360,'height':740},device_scale_factor=2); c.route('**/*',route); c.add_init_script(SEED)
    pg=c.new_page(); pg.on('pageerror',lambda e: errs.append(('pageerror',str(e)))); pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type=='error' and 'Failed to load' not in m.text else None)
    pg.goto('http://localhost:8765/due-and-spend.html'); pg.wait_for_selector('#nav button'); E=pg.evaluate
    ok('new name shown','Personal Diary' in pg.inner_text('#app') and pg.title()=='Personal Diary')
    pg.wait_for_function('S.mk&&S.mk.g',timeout=10000)
    g24=E('goldGram("INR",24)'); ok('24K India price per gram with 15% duty and 3% import GST',abs(g24-340000/OZ*1.1845)<0.01,g24)
    ok('22K Qatar price',abs(E('goldGram("QAR",22)')-14500/OZ*.916)<0.001)
    ok('QAR rate follows live price',E('S.cfg.rate')==24.31 and E('S.cfg.rateAt')==E('today()'))
    pg.click('#nav button[data-id="invest"]'); pg.wait_for_timeout(200); t=pg.inner_text('#app')
    ok('gold card shows rates','Gold and exchange rates' in t and 'Gold 22K' in t and '₹24.31' in t,t[:300])
    ok('card shows the international price and where the difference comes from','International gold' in t and '$3,980 an ounce' in t and '18.45%' in t and 'Daily price for' in t,t[:900])
    # the live price is used when it is available
    LIVE['d']={'spot_usd_oz':4100.0,'silver_usd_oz':50.0,'price_as_of':'2026-11-27T10:00:00Z','stale':False}
    E('ACT.mkRefresh()');pg.wait_for_function('S.mk&&S.mk.live',timeout=10000)
    ok('live price used for gold',abs(E('S.mk.g.usd*31.1034768')-4100)<0.01 and abs(E('goldGram("INR",24)')-4100*340000/3980/OZ*1.1845)<0.01 and E('S.mk.date')==E('today()'))
    pg.wait_for_timeout(300);t=pg.inner_text('#app');ok('card says it is live','Live price' in t and '$4,100 an ounce' in t,t[:900])
    # matching the jeweller's rates
    pg.click('[data-act="mkSet"]');pg.wait_for_selector('#f_in22')
    pg.fill('#f_in22','118200');pg.click('#over [data-act="mkSave"]');pg.wait_for_timeout(150);ok('a 10-gram price is caught',not E('S.cfg.gpk&&S.cfg.gpk.IN') and E('!!$("#f_in22")'))
    pg.fill('#f_in22','11820');pg.fill('#f_qa22','412.5');pg.fill('#f_qa24','445');pg.click('#over [data-act="mkSave"]');pg.wait_for_timeout(200)
    ok('India 22K matches the jeweller',abs(E('goldGram("INR",22)')-11820)<2,E('goldGram("INR",22)'))
    ok('Qatar 22K and 24K match the jeweller',abs(E('goldGram("QAR",22)')-412.5)<0.1 and abs(E('goldGram("QAR",24)')-445)<0.1,[E('goldGram("QAR",22)'),E('goldGram("QAR",24)')])
    ok('other purities follow the 22K margin',abs(E('goldGram("INR",18)')/E('goldGram("INR",22)')-0.75/0.916)<0.001)
    t=pg.inner_text('#app');ok('card says it is matched','matched to your jeweller' in t,t[:900])
    pg.click('[data-act="mkSet"]');pg.wait_for_selector('#over [data-act="mkClear"]');pg.click('#over [data-act="mkClear"]');pg.wait_for_timeout(150);ok('matching can be stopped',not E('S.cfg.gpk') and abs(E('goldGram("INR",24)')-E('S.mk.g.inr')*1.1845)<0.01)
    # the old 6% (or 0) setting moves to the new duty once
    E('S.cfg.gpIN=0;delete S.cfg.gpMig;render()');ok('old duty setting moves to the new duty',E('S.cfg.gpIN')==None and abs(E('goldGram("INR",24)')/E('S.mk.g.inr')-1.1845)<0.0001)
    E('S.cfg.gpIN=0;render()');ok('a 0% chosen after that is kept',E('S.cfg.gpIN')==0)
    E('delete S.cfg.gpIN;S.mk.at=0;S.mk.live=false')
    LIVE['d']=None;E('ACT.mkRefresh()');pg.wait_for_function('S.mk&&S.mk.at>0&&!S.mk.live',timeout=10000)
    ok('post office schemes listed','Post office schemes (India)' in t and 'Public Provident Fund' in t and '8.2%' in t)
    # PPF calc: 1.5L/yr for 15 yrs at 7.1% ≈ 40.68 lakh
    pg.click('[data-act="schOpen"][data-id="ppf"]'); pg.fill('#sch_amt','150000'); pg.click('#over button[data-act="schCalc"]'); t=pg.inner_text('#over')
    ok('PPF calculator',('40,68,' in t) and ('22,50,000' in t),t)
    pg.click('#over button[data-act="schAdd"]'); pg.wait_for_timeout(200); ok('add opens a scheme account',pg.input_value('#f_ty')=='ppf' and pg.input_value('#f_plan')=='150000'); pg.click('#over .x')
    pg.click('[data-act="schOpen"][data-id="kvp"]'); pg.fill('#sch_amt','100000'); pg.click('#over button[data-act="schCalc"]'); ok('KVP doubles','2,00,000' in pg.inner_text('#over')); pg.click('#over .x')
    pg.click('[data-act="schOpen"][data-id="scss"]'); pg.fill('#sch_amt','1000000'); pg.click('#over button[data-act="schCalc"]'); ok('SCSS quarterly payout','20,500' in pg.inner_text('#over')); pg.click('#over .x')
    # gold holding valued automatically
    pg.click('button[data-act="addInv"]'); pg.fill('#f_name','Wife gold chain'); pg.select_option('#f_kind2','gold'); pg.fill('#f_inv','400000'); pg.click('#over details summary >> text=Live value'); pg.fill('#f_gr','50'); pg.select_option('#f_pur','22'); pg.click('#over button[data-act="saveInv"]'); pg.wait_for_timeout(300)
    x=E('S.inv.find(x=>x.name=="Wife gold chain")'); ok('gold value from grams',x['gr']==50 and abs(x['val']-round(50*340000/OZ*.916*1.1845))<=1,x)
    # mutual fund via search
    pg.click('button[data-act="addInv"]'); pg.fill('#f_name','Parag Parikh'); pg.select_option('#f_kind2','mf'); pg.fill('#f_inv','100000'); pg.click('#over details summary >> text=Live value'); pg.fill('#f_units','1500'); pg.click('#over button[data-act="mfFind"]'); pg.wait_for_selector('#mf_out .row')
    pg.click('#mf_out .row >> nth=0'); pg.wait_for_function('document.querySelector("#mf_name").textContent.includes("NAV ₹")'); print('DBG',pg.inner_text('#mf_name'),pg.input_value('#f_val'));ok('fund picked shows NAV','92.51' in pg.inner_text('#mf_name') and pg.input_value('#f_val')=='138765')
    pg.click('#over button[data-act="saveInv"]'); pg.wait_for_timeout(300); m=E('S.inv.find(x=>x.name=="Parag Parikh")'); ok('fund saved with code and units',m['mf']=='122639' and m['units']==1500,m)
    E('S.inv.find(x=>x.name=="Parag Parikh").navAt="";refreshFunds(false)'); pg.wait_for_timeout(500); m=E('S.inv.find(x=>x.name=="Parag Parikh")'); ok('daily NAV update sets value',abs(m['val']-138765)<0.01 and m['navAt']==E('today()'))
    # missing attachment message
    E('S.dates[0].att=[{id:"gone",name:"policy.pdf",size:100,type:"application/pdf"}]'); E('viewAtt("gone")'); pg.wait_for_timeout(200); ok('missing file explained','File not on this phone' in pg.inner_text('#over')); pg.click('#over .x')
    for t_ in ['home','dates','invest','acc','spend','rep']:
        pg.click(f'#nav button[data-id="{t_}"]'); pg.wait_for_timeout(60); ok('tab '+t_,'couldn’t be shown' not in pg.inner_text('#app') and E('document.documentElement.scrollWidth<=window.innerWidth'))
    pg.click('#nav button[data-id="invest"]'); pg.wait_for_timeout(300); pg.screenshot(path='shots/m-wealth.png',full_page=True)
    c.close()
    # phone app: prices through the built-in web request plugin, files open in another app
    APP='''window.__n={open:null,http:0};window.Capacitor={isNativePlatform:()=>true,addListener(){},nativePromise:async(p,m,o)=>{const N=window.__n;
      if(p=="CapacitorHttp"){N.http++;const D=%s;for(const k in D)if(o.url.includes("/currencies/"+k+".min.json"))return {status:200,data:D[k]};return {status:404,data:null}}
      if(m=="openFile"){N.open=o;return {}}if(p=="LocalNotifications")return m=="getPending"?{notifications:[]}:{display:"granted"};return {}}};'''%json.dumps(DATA)
    c=b.new_context(viewport={'width':360,'height':740}); c.add_init_script(APP+SEED); pg=c.new_page(); pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
    pg.goto('http://localhost:8765/due-and-spend.html'); pg.wait_for_selector('#nav button'); pg.wait_for_function('S.mk&&S.mk.g',timeout=10000); ok('phone app gets prices natively',pg.evaluate('window.__n.http')>=3)
    pg.evaluate('fput("f1",new Blob(["%PDF-1.4 test"],{type:"application/pdf"})).then(()=>{S.dates[0].att=[{id:"f1",name:"policy bond.pdf",size:13,type:"application/pdf"}];viewAtt("f1")})'); pg.wait_for_function('!!window.__n.open',timeout=5000)
    o=pg.evaluate('window.__n.open'); ok('PDF handed to a viewer app',o['mime']=='application/pdf' and base64.b64decode(o['data'])==b'%PDF-1.4 test' and o['name']=='policy bond.pdf')
    c.close(); b.close()
finally: srv.terminate()
print('\n%d failed'%len(fails),fails); print('problems:',len(errs)); [print(e) for e in errs[:10]]
