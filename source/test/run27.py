import json,sys,re,time
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
now=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
MS=[{'id':'AAA111','subject':'Transaction alert','from':{'emailAddress':{'name':'Axis Bank','address':'alerts@axisbank.com'}},'receivedDateTime':now,'bodyPreview':'INR 3,400.00 debited','body':{'content':'Dear Customer, INR 3,400.00 has been debited from A/c no. XX7730 on 19-11-2026 towards UPI/ARUNKUMAR. Avl bal INR 50,000'}},
    {'id':'AAA222','subject':'Credit alert','from':{'emailAddress':{'name':'Axis Bank'}},'receivedDateTime':now,'bodyPreview':'INR 1,28,206.12 credited','body':{'content':'INR 1,28,206.12 has been credited to A/c no. XX7730 on 19-11-2026. Info: SALARY'}},
    {'id':'AAA333','subject':'Weekend sale!','from':{'emailAddress':{'name':'Shop'}},'receivedDateTime':now,'bodyPreview':'Big offers','body':{'content':'Big offers this weekend'}}]
def graph(route):
  r=route.request
  if not r.headers.get('authorization','').startswith('Bearer ms'):return route.fulfill(status=401,body='{}')
  h.gq=r.url;h.pref=r.headers.get('prefer','')
  route.fulfill(status=200,content_type='application/json',body=json.dumps({'value':MS}))
try:
  c,pg=h.page(native=True);E=pg.evaluate
  pg.route(re.compile(r'https://graph\.microsoft\.com/.*'),graph)
  E('settings()');ok('outlook in settings',pg.locator('#over #set_ms').count()==1);pg.click('#over #set_ms')
  ok('asks only for the outlook email, app id built in',pg.locator('#over #f_msa').count()==1 and pg.locator('#over #f_msc').count()==0 and E('msClient()')=='74658136-14ec-4630-ad9b-26e160ff0fc6')
  pg.fill('#f_msa','arun.home@outlook.com');q0=len(E('S.cfg.smsq||[]'));pg.click('#over [data-act="msStart"]');pg.wait_for_timeout(2000)
  u=E('window.__n.authUrl');ok('microsoft sign-in for that address with PKCE',u and 'login.microsoftonline.com/consumers' in u and 'login_hint=arun.home%40outlook.com' in u and 'code_challenge_method=S256' in u and 'client_id=74658136' in u and 'Mail.Read' in u,u)
  b=E('window.__n.msBodies[0]');ok('code exchanged with verifier',b and 'grant_type=authorization_code' in b and 'code_verifier=' in b and 'code=CODE1' in b,b)
  ok('connected',E('msOn()') and E('msLS("rt")')=='rt1')
  Q=E('S.cfg.smsq||[]');ok('two outlook payments, sale skipped',len(Q)-q0==2,[x['body'][:50] for x in Q])
  ok('reads text bodies, recent only','outlook.body-content-type' in h.pref and 'receivedDateTime' in h.gq)
  ok('debit parsed',any(x['p']['amt']==3400 for x in Q) and any(abs(x['p']['amt']-128206.12)<0.01 for x in Q))
  E('MS.tok="";localStorage.removeItem("ds-ms-last")');n=E('msScan()');ok('refresh token used, nothing twice',n==0 and any('grant_type=refresh_token' in x for x in E('window.__n.msBodies')))
  E('MS.tok="";window.__n.msBad=1;localStorage.setItem("ds-ms-last",new Date(Date.now()-3600e3).toISOString())');E('msAuto()');pg.wait_for_timeout(600)
  ok('expired sign-in shows in needs attention',E('todoItems().some(x=>/Outlook reading needs/.test(x.tx))'));E('window.__n.msBad=0')
  E('msSheet()');pg.click('#over [data-act="msOff"]');ok('turned off',not E('msOn()') and not E('msLS("rt")'))
  E('msSheet()');pg.fill('#f_msa','arun.home@outlook.com');E('window.__n.msCancel=1');pg.click('#over [data-act="msStart"]');pg.wait_for_timeout(800);ok('cancel leaves it off',not E('msOn()'))
  ok('gmail and outlook separate settings',E('settings()') is None and pg.locator('#over #set_gm').count()==1 and pg.locator('#over #set_ms').count()==1)
finally:
  h.done()
