import json,sys
sys.path.insert(0,'test')
from h import H
from seed import legacy
h=H();ok=h.ok
try:
  c,pg=h.page();E=pg.evaluate
  # ---- top-up radar ----
  E('''S.acc.push({id:"ax",name:"Axis NRO",type:"bank",cur:"INR",open:5000});S.dates.push({id:"lic2",name:"LIC Jeevan Labh",type:"premium",date:plus(20),amt:28000,cur:"INR",rep:"yearly",pay:"ax",att:[]});
     S.sacc.push({id:"sx",type:"ssy",name:"Selvamagal",open:"2022-07-10",pay:"ax",plan:{f:"m",a:2000,day:5},dep:[{id:"x",d:today(),a:2000}]});S.cfg.mk=null;S.mk={at:Date.now(),date:today(),qi:23.9,g:{inr:8000,qar:330}};save();render()''')
  R=E('radar(90).find(r=>r.a.id=="ax")');ok('radar finds the shortfall in the INR account',R and R['need']>=23000 and R['first']['n']=='LIC Jeevan Labh',R and {k:R[k] for k in ('need','low','by')})
  ok('top-up date is 3 days before',R['by']==E('addDays(plus(20),-3)'))
  t=pg.inner_text('#app');ok('home warns to top up','Top up needed' in t and 'Axis NRO' in t and 'about QAR' in t,t[:600])
  pg.click('[data-act="radar"]');pg.wait_for_selector('#over table');t=pg.inner_text('#over');ok('radar sheet with timeline','Top-up radar' in t and 'LIC Jeevan Labh' in t and 'SSY: Selvamagal' in t,t[:500])
  pg.fill('#min_ax','10000');pg.click('#over [data-act="radarMin"][data-id="ax"]');pg.wait_for_timeout(150);ok('minimum balance saved and counted',E('ac("ax").min')==10000 and E('radar(90).find(r=>r.a.id=="ax").need')>R['need'])
  pg.click('#over [data-act="radarSend"][data-id="ax"]');pg.wait_for_selector('#over #f_got');ok('transfer form prefilled',pg.input_value('#f_to')=='ax' and pg.input_value('#f_from')=='a2' and float(pg.input_value('#f_got'))>=33000,[pg.input_value('#f_from'),pg.input_value('#f_got')])
  # record it with a channel, check money sent home
  E('S.mkh[addDays(today(),-1)]={qi:23.95}');AMT=float(pg.input_value('#f_amt'));GOT=float(pg.input_value('#f_got'));pg.fill('#f_fee','15');pg.fill('#f_via','Al Zaman');pg.click('#over [data-act="saveTr"]');pg.wait_for_timeout(150)
  x=E('S.tx.find(t=>t.kind=="tr"&&t.via=="Al Zaman")');ok('transfer stores the channel',x and x['got']==GOT and x['amt']==AMT and x['fee']==15,x)
  ok('radar cleared after the transfer',not E('radar(90).filter(r=>r.need>0).some(r=>r.a.id=="ax")'))
  pg.click('#nav button[data-id="acc"]');t=pg.inner_text('#app');ok('accounts: money sent home card','Money sent home' in t and 'this tax year' in t,t[-700:])
  pg.click('[data-act="remitSheet"]');pg.wait_for_selector('#over #f_rtgt');t=pg.inner_text('#over')
  r=E('remitRows("").find(r=>r.via=="Al Zaman")');ok('true cost uses the market rate and fee',r and abs(r['cost']-(max(0,23.95*AMT-GOT)+15*23.95))<0.01 and r['mkt']==23.95,r and [r['cost'],AMT,GOT])
  ok('channel table','Channels' in t and 'Al Zaman' in t and 'Rate after fees' in t,t[:800])
  # ---- rate alert ----
  pg.fill('#f_rtgt','23.8');pg.click('#over [data-act="rtgtSave"]');pg.wait_for_timeout(150);ok('rate alert saved and hit',E('S.cfg.rtgt')==23.8 and E('S.cfg.rtHit')==E('today()'))
  pg.click('#over .x');pg.click('#nav button[data-id="home"]');ok('home shows the rate alert','1 QAR = ₹23.90 today' in pg.inner_text('#app'))
  ok('rate target synced with the family',E('prefsOut().rtgt')==23.8 and 'grat' in E('PREFX'))
  # ---- transfer matcher on saved entries ----
  E('''S.tx.push({id:"o9",kind:"out",amt:5000,acc:"a2",cur:"QAR",date:plus(-6),cat:"Other"},{id:"i9",kind:"in",amt:119300,acc:"ax",cur:"INR",date:plus(-5),cat:"Other"});tab="acc";render()''')
  t=pg.inner_text('#app');ok('possible transfer spotted','Possible transfers between your accounts' in t and '1,19,300' in t,t[-900:])
  b0=E('bal(ac("ax"))');pg.click('[data-act="trMerge"]');pg.wait_for_timeout(150)
  ok('merged into one transfer, balances unchanged',E('S.tx.some(t=>t.id=="o9")')==False and E('S.tx.some(t=>t.kind=="tr"&&t.amt==5000&&t.got==119300)') and abs(E('bal(ac("ax"))')-b0)<0.01)
  # ---- transfer matcher in the review queue ----
  E('''S.cfg.smsq=[{id:"m1",from:"CBQ",body:"Your account debited QAR 3,000.00 for transfer",p:{kind:"out",amt:3000,cur:"QAR",acc:"a2",date:plus(-1),payee:"",l4:""}},
     {id:"m2",from:"Outlook",body:"INR 71,700.00 has been credited to A/c no. XX4417",p:{kind:"in",amt:71700,cur:"INR",acc:"ax",date:today(),payee:"",l4:"4417"}}];save();smsReview()''')
  t=pg.inner_text('#over');ok('review suggests one transfer','Looks like your transfer of QAR 3,000' in t,t[:600])
  pg.click('#over [data-act="qMerge"]');pg.wait_for_timeout(150);ok('queue items became one transfer',len(E('S.cfg.smsq'))==0 and E('S.tx.some(t=>t.kind=="tr"&&t.amt==3000&&t.got==71700&&t.acc=="a2"&&t.to=="ax")'))
  pg.click('#over .x')
  # ---- gratuity ----
  pg.click('#nav button[data-id="invest"]');nw0=E('nwv("INR")');pg.click('[data-act="gratForm"]');pg.fill('#g_join',E('addM(today(),-60)'));pg.fill('#g_basic','6000');pg.click('#over [data-act="gratSave"]');pg.wait_for_timeout(150)
  g=E('gratCalc()');ok('gratuity: 5 years at 21 days of basic',g and abs(g['amt']-6000/30*21*g['yrs'])<0.01 and 4.99<g['yrs']<5.01 and g['elig'],g)
  ok('gratuity in net worth',abs(E('nwv("INR")')-nw0-g['amt']*E('fx()'))<1)
  t=pg.inner_text('#app');ok('wealth card','End-of-service gratuity' in t and 'Earned so far' in t and 'counted in net worth' in t)
  E('S.cfg.grat.join=addM(today(),-6);save()');ok('under a year: not payable yet',E('gratCalc().amt')==0 and E('gratCalc().accr')>0)
  ok('gratuity synced and in backup',E('prefsOut().grat.basic')==6000 and json.loads(E('bk()'))['cfg']['grat']['basic']==6000)
  c.close()
finally:
  h.done()
