"""Shared test harness for the newer suites."""
import json,subprocess,sys,time,os
sys.path.insert(0,os.path.dirname(__file__))
from seed import legacy
from playwright.sync_api import sync_playwright
NATIVE='''window.__calls=[];window.__http=window.__http||{};window.__n=Object.assign({sms:[],items:[],log:[],clip:"",install:{started:true}},window.__n||{});
window.Capacitor={isNativePlatform:()=>true,addListener(){},nativePromise:async(p,m,o)=>{const N=window.__n;window.__calls.push([p,m,o||{}]);
 if(p=="LocalNotifications")return m=="getPending"?{notifications:[]}:{display:"granted"};
 if(p=="CapacitorHttp"){const u=o.url;for(const k of Object.keys(window.__http))if(u.includes(k)){const r=window.__http[k];if(r&&r.status>=400)return r;return {status:200,data:typeof r=="string"?r:JSON.stringify(r)}}throw new Error("offline in test: "+u)}
 if(m=="readSms")return {messages:N.sms};if(m=="readNotifs"){const i=N.items;N.items=[];return {items:i}}if(m=="notifLog")return {items:N.log};
 if(m=="notifStatus")return {enabled:true,conn:String(Date.now()),disc:"0",seen:"0",sms:true};if(m=="readClip")return {text:N.clip};
 if(m=="installApk")return N.install;if(m=="saveDownload"||m=="openFile"||m=="openUrl"||m=="pruneBackups"||m=="setWidget")return {};if(m=="getLaunch"){const d=N.launch||"";N.launch="";return {data:d}}if(m=="driveToken"){if(N.gdDeny&&!(o&&o.interactive))throw new Error("needs-consent");if(N.gdCancel)throw new Error("cancelled");N.tokAsk=(N.tokAsk||0)+1;return {token:"tok"+N.tokAsk}}if(m=="webAuth"){N.authUrl=o.url;if(N.msCancel)return {url:"personaldiary://auth?error=access_denied"};const st=new URL(o.url).searchParams.get("state");return {url:"personaldiary://auth?code=CODE1&state="+st}}if(m=="webAuthPending")return {url:""};if(m=="msToken"){N.msBodies=(N.msBodies||[]).concat([o.body]);if(N.msBad)return {status:400,body:JSON.stringify({error:"invalid_grant",error_description:"AADSTS70000 expired"})};N.msN=(N.msN||0)+1;return {status:200,body:JSON.stringify({access_token:"ms"+N.msN,refresh_token:"rt"+N.msN,expires_in:3600})}}if(m=="mailBg"){N.bg=o;return {}}if(m=="mailBgGet")return N.bgGet||{msrt:"",msrtAt:0,on:false};if(m=="listen"){if(N.sayErr)throw new Error(N.sayErr);return {text:N.say||""}}
 return {}}};'''
class H:
    def __init__(s):
        s.errs=[];s.fails=[]
        s.srv=subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
        s.pw=sync_playwright().start();s.b=s.pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    def ok(s,n,c,x=''):
        print(('PASS ' if c else 'FAIL ')+n+(' :: '+str(x)[:600] if (x!='' and not c) else ''))
        if not c: s.fails.append(n)
    def page(s,native=False,seed=None,pre='',url='due-and-spend.html',width=360,height=740):
        d=json.loads(json.dumps(legacy if seed is None else seed))
        SEED="if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(d))
        c=s.b.new_context(viewport={'width':width,'height':height},device_scale_factor=2,accept_downloads=True)
        c.add_init_script('window.__noNews=1;'+pre+(NATIVE if native else '')+SEED)
        pg=c.new_page();pg.on('pageerror',lambda e: s.errs.append(('pageerror',str(e))))
        pg.on('console',lambda m: s.errs.append((m.type,m.text)) if m.type=='error' and 'Failed to load' not in m.text and 'net::' not in m.text else None)
        pg.goto('http://localhost:8765/'+url);pg.wait_for_selector('#nav button');return c,pg
    def done(s):
        try: s.b.close();s.pw.stop()
        finally: s.srv.terminate()
        print('\n%d failed'%len(s.fails),s.fails);print('problems:',len(s.errs));[print(e) for e in s.errs[:12]]
