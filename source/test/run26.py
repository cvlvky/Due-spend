import json,sys,re,base64,time
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
enc=lambda s:base64.urlsafe_b64encode(s.encode()).decode().rstrip('=')
now=int(time.time()*1000)
MSG={
 'm1':{'from':'Axis Bank Alerts <alerts@axisbank.com>','subject':'Debit transaction alert','plain':'Dear Customer, INR 266.00 has been debited from your A/c no. XX4417 on 19-11-2026 at MEESHO. Avl Bal INR 12,000.00'},
 'm2':{'from':'CBQ <noreply@cbq.qa>','subject':'Card transaction','html':'<p>Your card ending 4821 was used for <b>QAR 7.00</b> at SAFFRON CAFE on 19/11/2026.</p>'},
 'm3':{'from':'Bank <x@bank.com>','subject':'Your OTP','plain':'Your one time password is 123456 for a transaction of INR 500'},
}
def gmail(route):
  r=route.request;u=r.url
  if not r.headers.get('authorization','').startswith('Bearer tok'):return route.fulfill(status=401,body='{}')
  m=re.search(r'/messages/(\w+)\?format=full',u)
  if m:
    x=MSG[m.group(1)];part={'mimeType':'text/plain','body':{'data':enc(x['plain'])}} if 'plain' in x else {'mimeType':'text/html','body':{'data':enc(x['html'])}}
    return route.fulfill(status=200,content_type='application/json',body=json.dumps({'id':m.group(1),'internalDate':str(now),'snippet':'','payload':{'mimeType':'multipart/alternative','headers':[{'name':'From','value':x['from']},{'name':'Subject','value':x['subject']}],'parts':[part]}}))
  if '/messages?' in u:
    h.q=u;return route.fulfill(status=200,content_type='application/json',body=json.dumps({'messages':[{'id':k} for k in MSG]}))
  route.fulfill(status=404,body='{}')
try:
  c,pg=h.page(native=True);E=pg.evaluate
  pg.route(re.compile(r'https://gmail\.googleapis\.com/.*'),gmail)
  E('settings()');ok('gmail in settings',pg.locator('#over #set_gm').count()==1)
  pg.click('#over #set_gm');ok('gmail sheet separate from outlook','Outlook is connected separately' in pg.inner_text('#over'))
  pg.click('#over [data-act="gmStart"]');ok('asks which gmail',E('gmOn()')==False)
  pg.fill('#over #f_gma','payments.mail@gmail.com');q0=len(E('S.cfg.smsq||[]'));pg.click('#over [data-act="gmStart"]');pg.wait_for_timeout(2000)
  Q=E('S.cfg.smsq||[]');ok('two payments to review, OTP skipped',len(Q)-q0==2,[x['body'][:60] for x in Q])
  ok('asked for read-only gmail on that account',E('__calls.some(c=>c[1]=="driveToken"&&(c[2].scopes||[]).some(s=>/gmail.readonly/.test(s))&&c[2].account=="payments.mail@gmail.com")'))
  ax=[x for x in Q if 'MEESHO' in x['body'].upper()];cb=[x for x in Q if 'SAFFRON' in x['body'].upper()]
  ok('axis email parsed',ax and ax[0]['p']['amt']==266,ax[:1])
  ok('html email parsed',cb and cb[0]['p']['amt']==7,cb[:1])
  ok('only payment emails searched','debited' in h.q and 'newer_than' in h.q)
  E('localStorage.removeItem("ds-gm-last")');n=E('gmScan(false)');ok('same emails never added twice',n==0 and len(E('S.cfg.smsq'))==len(Q))
  E('GM.tok="";window.__n.gdDeny=1;localStorage.setItem("ds-gm-last",new Date(Date.now()-3600e3).toISOString())');E('gmAuto()');pg.wait_for_timeout(600)
  ok('asks to sign in again',E('todoItems().some(x=>/Gmail reading needs/.test(x.tx))'));E('window.__n.gdDeny=0')
  E('gmSheet()');pg.click('#over [data-act="gmOff"]');ok('turned off',not E('gmOn()'))
finally:
  h.done()
