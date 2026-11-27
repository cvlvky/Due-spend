import json,sys,time,os,datetime
sys.path.insert(0,'test')
from h import H
from seed import legacy
import subprocess;subprocess.run([sys.executable,'test/mkpdfs.py'],check=True,capture_output=True)
h=H();ok=h.ok
docs={}
FAKE=open('test/run18.py').read().split("FAKE='''")[1].split("'''")[0]
FAKE=FAKE.replace('''   onSnapshot(next,err)''','''   async update(d){const v=await fb_get(id),old=v?JSON.parse(v):null;if(!old)throw{code:"not-found"};if(!old.members.includes(A.currentUser.email))throw{code:"permission-denied"};
     const n={...old};for(const [k,x] of Object.entries(d)){if(x&&x.__r){const rm=x.__r.map(i=>JSON.stringify(i));n[k]=(old[k]||[]).filter(i=>!rm.includes(JSON.stringify(i)))}else n[k]=x}await fb_set(id,JSON.stringify(n))},
   onSnapshot(next,err)''').replace('FieldValue:{arrayUnion:x=>({__u:x})}','FieldValue:{arrayUnion:x=>({__u:x}),arrayRemove:(...x)=>({__r:x})}')
assert 'arrayRemove' in FAKE and 'async update' in FAKE
def fb_commit(R,W,email):
    R=json.loads(R);W=json.loads(W)
    for k,v in R.items():
        if docs.get(k)!=v: return 'conflict'
    for k,v in W:
        if v is None: docs.pop(k,None)
        else: docs[k]=v
    return 'ok'
try:
  # ---------- Gmail reader inbox ----------
  c=h.b.new_context(viewport={'width':360,'height':740})
  c.expose_function('fb_get',lambda i: docs.get(i));c.expose_function('fb_set',lambda i,v: docs.__setitem__(i,v));c.expose_function('fb_del',lambda i: docs.pop(i,None));c.expose_function('fb_commit',fb_commit)
  c.add_init_script('window.__me="v@x.com";'+FAKE+"if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy)))
  pg=c.new_page();pg.on('pageerror',lambda e: h.errs.append(('pageerror',str(e))));pg.goto('http://localhost:8765/due-and-spend.html');pg.wait_for_selector('#nav button');E=pg.evaluate
  E('''SY.cfg={apiKey:"AIzaKEY",authDomain:"p.firebaseapp.com",projectId:"p"};SY.space="home";SY.on=true;syv();syncStart()''');pg.wait_for_function('sstat.startsWith("Synced")',timeout=15000)
  now=int(time.time()*1000)
  docs['home__mail']=json.dumps({"members":["v@x.com","d@x.com"],"ts":now,"items":[
    {"id":"g1","from":"Axis Bank Alerts <alerts@axis.bank.in>","subject":"INR 3400.00 was debited from your A/c no. XX4417.","body":"11-11-2026\nDear Arun Kumar,\nAmount Debited: INR 3400.00\nAccount Number: XX4417\nDate & Time: 11-11-26, 14:38:14 IST\nTransaction Info: UPI/P2M/600000000102/Suresh Kumar R","time":now},
    {"id":"g2","from":"cbqsms@cbq.com.qa","subject":"Commercialbank SMS Service","body":"Your card ending **4821 used for QAR 7.00 at Saffron Cafe at 07:06 11-Nov-26 Available Limit: QAR 3,193.00","time":now},
    {"id":"g3","from":"Axis Bank Alerts <alerts@axis.bank.in>","subject":"Credit notification from Axis Bank","body":"Thank you for banking with us. Click here to view the transaction.","time":now},
    {"id":"g4","from":"alerts@axis.bank.in","subject":"Your OTP for login","body":"Your OTP is 4455 for QAR 10.00","time":now}]})
  pg.wait_for_function('S.cfg.mailN>=4',timeout=15000);pg.wait_for_timeout(600)
  q=E('S.cfg.smsq.map(m=>[m.src,m.p.amt,m.p.payee])');ok('emails from the Gmail script become payments to review',['m',3400,'Suresh Kumar R'] in q and ['m',7,'Saffron Cafe'] in q,q)
  ok('email with no amount waits for the text',any('Credit notification' in x['body'] for x in E('S.cfg.ntfNo||[]')))
  ok('security codes ignored',not any(x[1]==10 for x in q))
  ok('mail document emptied after reading',json.loads(docs['home__mail'])['items']==[],json.loads(docs['home__mail'])['items'])
  docs['home__mail']=json.dumps({"members":["v@x.com"],"items":[{"id":"g1","from":"x","subject":"INR 3400.00 was debited from your A/c no. XX4417.","body":"","time":now}]})
  pg.wait_for_timeout(1500);ok('same email not added twice',sum(1 for x in E('S.cfg.smsq') if x['p']['amt']==3400)==1)
  E('gmailGuide()');t=pg.inner_text('#over');ok('setup guide with copy buttons','script.google.com' in t and pg.locator('#over [data-act="gsCopy"]').count()==1 and pg.locator('#over [data-act="gsCode"]').count()==1)
  ok('the script travels inside the app','function setup()' in E('GSCRIPT') and 'appendMissingElements' in E('GSCRIPT'))
  c.close()
  # ---------- bank statement PDF ----------
  c,pg=h.page();E=pg.evaluate
  E('S.cfg.pdfjsBase="pdfjs/";S.acc.push({id:"ax",name:"Axis NRO",type:"bank",cur:"INR",open:50000});addTx({kind:"out",acc:"ax",amt:266,cur:"INR",date:plus(-19),cat:"Shopping",payee:"Meesho"});addTx({kind:"out",acc:"ax",amt:999,cur:"INR",date:plus(-8),cat:"Food",payee:"Cash lunch"});save();tab="acc";render()')
  pg.click('.arow[data-id="ax"]'); pg.click('#over [data-act="stImport"][data-id="ax"]');pg.wait_for_selector('#f_csv');ok('import PDF button opens with the account chosen',pg.input_value('#f_acc')=='ax' and 'PDF' in pg.inner_text('#over'))
  pg.set_input_files('#f_csv','test/fixtures/axis.pdf');pg.wait_for_selector('#csvout .card',timeout=20000);t=pg.inner_text('#csvout')
  R=E('stPend.P.rows.map(r=>[r.dir,r.amt,r.bal])');ok('all 6 transactions read with direction from the balance',[r[0] for r in R]==['out','in','out','in','out','out'] and [r[1] for r in R]==[266,85250.75,1450.5,45000,3400,28450],R)
  ok('opening and closing balance read',E('stPend.P.open')==50000 and abs(E('stPend.P.close')-146684.25)<0.01)
  ok('multi-line description joined',any('Suresh Kumar R' in r for r in E('stPend.P.rows.map(r=>r.desc)')))
  ok('already-entered transaction recognised','1 already in the app' in t and '5 new' in t,t[:400])
  ok('entry only in the app is listed','1 in the app but not in the statement' in t)
  ok('payee from UPI and category guess','arunkumar' in t.lower() and 'Meesho' not in t.split('new')[1] if 'new' in t else False,t[:900])
  pg.click('#csvout input[data-sti] >> nth=1');pg.click('#over [data-act="stImportGo"]');pg.wait_for_timeout(200)
  ok('ticked ones added, unticked left out',E('S.tx.filter(t=>t.acc=="ax"&&t.imp).length')==4 and E('S.tx.some(t=>t.acc=="ax"&&t.payee=="LIC OF INDIA PREMIUM"||t.acc=="ax"&&/LIC/.test(t.payee||""))'))
  t=pg.inner_text('#csvout');ok('statement rechecked after adding','5 already in the app' in t and '1 new' in t,t[:300])
  pg.click('#over [data-act="stFixBal"]');pg.wait_for_timeout(150);ok('balance made to match the statement on its last date',abs(E('balAt("ax",stPend.M.to)')-146684.25)<0.01)
  pg.click('#over .x')
  # password-protected statement
  E('csvForm();setVal("f_acc","ax")');pg.set_input_files('#f_csv','test/fixtures/axis-locked.pdf');pg.wait_for_selector('#f_pdfpw',timeout=20000);ok('asks for the statement password',True)
  pg.fill('#f_pdfpw','WRONG');pg.click('#over [data-act="stPw"]');pg.wait_for_function('document.querySelector("#csvout").innerText.includes("didn’t work")',timeout=20000);ok('wrong password message',True)
  pg.fill('#f_pdfpw','CUST1234');pg.click('#over [data-act="stPw"]');pg.wait_for_selector('#csvout .card b',timeout=20000);ok('opens with the right password','transactions' in pg.inner_text('#csvout'))
  pg.click('#over .x')
  # ---------- mutual fund CAS ----------
  pg.click('#nav button[data-id="invest"]');pg.click('[data-act="casOpen"]');pg.fill('#f_caspw','ABCDE1234F');pg.set_input_files('#f_cas','test/fixtures/cas.pdf');pg.wait_for_selector('#casout .card',timeout=20000)
  F=E('casPend');ok('two funds found',len(F)==2,[f['name'] for f in F])
  m=F[0];ok('fund details',m['name']=='Mirae Asset Large Cap Fund - Regular Plan Growth' and m['isin']=='INF769K01010' and m['folio']=='1234567/89' and abs(m['units']-77.619)<1e-9 and m['nav']==125.5 and m['value']==9741.18 and m['cost']==7800,{k:m[k] for k in ('name','isin','folio','units','nav','value','cost')})
  ok('stamp duty line skipped, redemption negative',[t['amt'] for t in m['tx']]==[5000,5000,-2200])
  def yr(a,b): return (datetime.date.fromisoformat(b)-datetime.date.fromisoformat(a)).days*86400/31557600
  cf=[("2024-01-05",-5000),("2024-02-05",-5000),("2025-06-10",2200),("2026-11-13",9741.18)]
  f=lambda r: sum(a/(1+r)**yr(cf[0][0],d) for d,a in cf);lo,hi=-0.9,5
  for _ in range(200):
    mid=(lo+hi)/2
    if f(lo)*f(mid)<0: hi=mid
    else: lo=mid
  ok('XIRR matches an independent calculation',abs(m['xirr']-mid*100)<0.01,[m['xirr'],mid*100])
  p=F[1];ok('fund without a value line valued from units × NAV',p['value']==25530 and p['cost']==20000 and p['folio']=='9988776/11',{k:p[k] for k in ('value','cost','folio')})
  pg.click('#over [data-act="casGo"]');pg.wait_for_timeout(500)
  I=E('S.inv.filter(x=>x.isin)');ok('added to investments with units and cash flows',len(I)==2 and I[0]['units']==77.619 and I[0]['val']==9741.18 and len(I[0]['cf'])==3)
  ok('yearly return now uses the real cash flows',E('invRet(S.inv.find(x=>x.isin=="INF769K01010")).yr')>0)
  pg.click('[data-act="casOpen"]');pg.fill('#f_caspw','ABCDE1234F');pg.set_input_files('#f_cas','test/fixtures/cas.pdf');pg.wait_for_selector('#casout .card',timeout=20000)
  ok('importing again updates instead of duplicating','updates the existing one' in pg.inner_text('#casout'))
  pg.click('#over [data-act="casGo"]');pg.wait_for_timeout(300);ok('still two funds',len(E('S.inv.filter(x=>x.isin)'))==2)
  pg.click('[data-act="casOpen"]');pg.fill('#f_caspw','nope');pg.set_input_files('#f_cas','test/fixtures/cas.pdf');pg.wait_for_function('document.querySelector("#casout").innerText.includes("didn’t work")',timeout=20000)
  pg.fill('#f_caspw','ABCDE1234F');pg.click('#over [data-act="casRetry"]');pg.wait_for_selector('#casout .card',timeout=20000);ok('wrong CAS password, then retry',True)
  c.close()
finally:
  h.done()
