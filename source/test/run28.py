import json,sys,re,time,base64
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
try:
  c,pg=h.page(native=True);E=pg.evaluate
  # --- card statement parsing ---
  B=lambda t:E('billParse(%s)'%json.dumps(t))
  r=B("Your Axis Bank Credit Card XX4821 statement. Total Amount Due: INR 12,345.67 Minimum Amount Due: INR 620.00 Payment Due Date: 05-12-2026")
  ok('axis style statement',r and r['total']==12345.67 and r['min']==620 and r['due']=='2026-12-05' and r['cur']=='INR' and r['l4']=='4821',r)
  r=B("CBQ e-Statement for card ending 4821. Statement balance QAR 3,210.50. Minimum due QAR 160.53. Please pay by 28 Nov 2026.")
  ok('qatar style statement',r and r['total']==3210.5 and r['cur']=='QAR' and r['due']=='2026-11-28',r)
  r=B("Your statement is ready. Total due Rs. 4,500 due date December 7, 2026")
  ok('month name first date',r and r['due']=='2026-12-07' and r['total']==4500,r)
  ok('not a statement',B("INR 266 debited from A/c XX4417 at MEESHO") is None)
  # --- balance in alerts ---
  P=lambda t:E('balParse(%s)'%json.dumps(t))
  ok('avl bal parsed',P("INR 266.00 debited from A/c XX4417. Avl Bal INR 12,000.50")==12000.5)
  ok('available balance parsed',P("QAR 7.00 spent. Available balance QAR 1,234.00")==1234)
  ok('credit limit ignored',P("QAR 7.00 used on card ending 4821. Avl Limit QAR 9,000")is None)
  # --- payments to review: quick save, all, automatic ---
  bal1=E('bal(ac("a2"))')
  E('''S.cfg.smsq=[{id:"q1",from:"Email · CBQ",body:"QAR 25.00 spent at KARAK HOUSE. Available balance QAR %0.2f",p:{kind:"out",amt:25,cur:"QAR",acc:"a2",date:today(),payee:"Karak House"},src:"m"},
     {id:"q2",from:"Email · CBQ",body:"QAR 40.00 spent at LULU",p:{kind:"out",amt:40,cur:"QAR",acc:"a2",date:today(),payee:"Lulu"},src:"m"},
     {id:"q3",from:"SMS · AXISBK",body:"INR 500 debited",p:{kind:"out",amt:500,cur:"INR",acc:"",date:today()},src:"s"}];save();smsReview()'''%(bal1-25-100))
  ok('save buttons only where ready',pg.locator('#over [data-act="smsQuick"]').count()==2 and pg.locator('#over [data-act="smsAllOk"]').count()==1)
  n=E('S.tx.length');pg.click('#over [data-act="smsQuick"][data-id="q1"]');pg.wait_for_timeout(300)
  t=E('S.tx[S.tx.length-1]');ok('one tap save',E('S.tx.length')==n+1 and t['amt']==25 and t['acc']=='a2' and t['payee']=='Karak House' and t.get('cat'),t)
  w=E('(S.cfg.balWarn||{}).a2');ok('bank balance difference noticed',w and abs(w['bank']-(bal1-125))<0.01 and abs(w['app']-(bal1-25))<0.01,w)
  it=E('todoItems().find(x=>x.act=="balFix")');ok('balance warning in needs attention',it and 'bank says' in it['tx'] and it['bact']=='balOk',it)
  E('ACT.balFix("a2")');ok('correct balance prefilled with bank figure',abs(float(pg.input_value('#f_bal'))-(bal1-125))<0.01);pg.click('#over [data-act="saveFix"]');pg.wait_for_timeout(300)
  ok('warning cleared after correcting',not E('todoItems().some(x=>x.act=="balFix")'))
  E('smsReview()');pg.click('#over [data-act="autoFrom"][data-id="q2"]');pg.wait_for_timeout(300)
  ok('always save from sender saves it now',E('(S.cfg.autoFrom||[]).includes("cbq")') and not E('(S.cfg.smsq||[]).some(x=>x.id=="q2")'),E('S.cfg.autoFrom'))
  E('''S.cfg.smsq=[...S.cfg.smsq,{id:"q4",from:"Email · CBQ",body:"QAR 12.00 spent at WOQOD",p:{kind:"out",amt:12,cur:"QAR",acc:"a2",date:today(),payee:"Woqod"},src:"m"}];dedupeQ();save()''')
  ok('later ones from that sender saved automatically',not E('S.cfg.smsq.some(x=>x.id=="q4")') and E('S.tx.some(x=>x.payee=="Woqod"&&x.amt==12)'))
  ok('unknown account still waits',E('S.cfg.smsq.some(x=>x.id=="q3")'))
  E('''S.cfg.smsq=[...S.cfg.smsq,{id:"q5",from:"SMS · QNB",body:"QAR 9 spent",p:{kind:"out",amt:9,cur:"QAR",acc:"a2",date:today(),payee:"Cafe"},src:"s"},{id:"q6",from:"SMS · QNB",body:"QAR 19 spent",p:{kind:"out",amt:19,cur:"QAR",acc:"a2",date:today(),payee:"Shop"},src:"s"}];save();smsReview()''')
  pg.click('#over [data-act="smsAllOk"]');pg.wait_for_timeout(300);ok('save all ready',E('S.cfg.smsq.map(x=>x.id).join()')=='q3')
  # --- card bills from email (Gmail mock) ---
  enc=lambda s:base64.urlsafe_b64encode(s.encode()).decode().rstrip('=')
  def gmail(route):
    u=route.request.url
    if '/messages?' in u:
      return route.fulfill(status=200,content_type='application/json',body=json.dumps({'messages':[{'id':'st1'}] if 'statement' in u else []}))
    return route.fulfill(status=200,content_type='application/json',body=json.dumps({'id':'st1','internalDate':str(int(time.time()*1000)),'payload':{'mimeType':'text/plain','headers':[{'name':'From','value':'CBQ <estatement@cbq.qa>'},{'name':'Subject','value':'Your credit card e-Statement'}],'body':{'data':enc('Card ending 4821. Statement balance QAR 3,210.50. Minimum due QAR 160.53. Payment due date: %s'%E('plus(9)'))}}}))
  pg.route(re.compile(r'https://gmail\.googleapis\.com/.*'),gmail)
  E('localStorage.setItem("ds-gm-on","1");localStorage.setItem("ds-gm-acct","pay@gmail.com");localStorage.removeItem("ds-bill-last")')
  E('gmScan(false)');pg.wait_for_timeout(1500)
  b=E('(S.cfg.billq||[])[0]');ok('card bill found in email',b and b['total']==3210.5 and b['due']==E('plus(9)') and b['cur']=='QAR',b)
  it=E('todoItems().find(x=>x.act=="billAdd")');ok('card bill in needs attention',it and 'card bill' in it['tx'] and it['bt']=='Add due',it)
  E('ACT.billAdd(%s)'%json.dumps(b['id']));ok('due form prefilled',pg.input_value('#f_amt')=='3210.5' and pg.input_value('#f_date')==E('plus(9)') and pg.input_value('#f_type')=='bill')
  pg.click('#over [data-act="saveDate"]');pg.wait_for_timeout(300);ok('bill reminder gone once due added',not E('todoItems().some(x=>x.act=="billAdd")'))
  E('gmScan(false)');pg.wait_for_timeout(800);ok('same statement not found twice',len(E('S.cfg.billq'))==1)
  # --- emails without amount cleared by full email ---
  E('S.cfg.ntfNo=[{k:"n1",from:"Gmail",body:"Your credit card e-Statement",t:Date.now()}];save()')
  E('S.cfg.ntfNo=[{k:"n1",from:"Gmail",body:"Payment alert: INR spent on your card",t:Date.now()}];save()')
  E('mailTake({update:async()=>{}},{items:[{id:"gx",from:"Axis",subject:"Payment alert: INR spent on your card",body:"INR 450.00 spent on card XX4821 at AMAZON on 19-11-2026",time:Date.now()}]})');pg.wait_for_timeout(300)
  ok('subject-only email cleared once the full email arrives',len(E('S.cfg.ntfNo'))==0 and E('S.cfg.smsq.some(x=>x.id=="m:gx")'))
  # --- background check settings sent to the phone ---
  E('localStorage.setItem("ds-ms-on","1");localStorage.setItem("ds-ms-rt","rtX");localStorage.setItem("ds-ms-acct","a@outlook.com");bgSync()');pg.wait_for_timeout(200)
  bg=E('window.__n.bg');ok('hourly check set up with both accounts',bg and bg['on'] and bg['gmail']=='pay@gmail.com' and bg['msrt']=='rtX' and bg['mscid'].startswith('79f02921'),bg)
  E('window.__n.bgGet={msrt:"rtNEW",msrtAt:Date.now()+5000,on:true};localStorage.setItem("ds-ms-rtAt","1")');E('bgPull()');pg.wait_for_timeout(200)
  ok('renewed outlook sign-in taken from background',E('msLS("rt")')=='rtNEW')
  E('gmSheet()');pg.click('#over [data-act="mailBgT"]');pg.wait_for_timeout(200);ok('hourly check can be turned off',E('S.cfg.mailBg')==False and E('window.__n.bg.on')==False)
  pg.click('#over .x')
  # --- budget suggestions ---
  E('''S.bud=[];for(let i=1;i<=3;i++){const m=addMon(today().slice(0,7),-i);S.tx.push({id:"bs"+i,kind:"out",acc:"a2",amt:300+i*10,cur:"QAR",fx:fx(),date:m+"-10",cat:"Eating out",tags:[]})}save();tab="spend";render()''')
  ok('suggest budgets button',pg.locator('#app [data-act="budSug"]').count()==1)
  pg.click('#app [data-act="budSug"]');L=E('window.__bs');s1=[x for x in L if x['cat']=='Eating out']
  ok('suggestion near usual spend',s1 and s1[0]['cur']=='QAR' and s1[0]['lim']>=320 and s1[0]['lim']<=400,s1)
  pg.click('#over [data-act="budMake"]');pg.wait_for_timeout(300);ok('budgets created',E('S.bud.some(b=>b.cat=="Eating out"&&b.cur=="QAR")'))
  # --- Tamil voice parsing ---
  r=E('parseLine("லுலு 120 ரியால் மளிகை")');ok('tamil line',r['amt']==120 and r.get('cur')=='QAR' and r.get('cat') and r.get('acc')=='a2',r)
  r=E('parseLine("2 ஆயிரம் ரூபாய் வாடகை")');ok('tamil thousand and rupees',r['amt']==2000 and r.get('cur')=='INR' and r.get('cat')=='Rent',r)
  r=E('parseLine("சம்பளம் 15000 ரியால்")');ok('tamil salary is income',r['kind']=='in' and r['amt']==15000,r)
  E('settings()');pg.click('#over #set_vl');ok('voice language setting',E('S.cfg.vlang')=='ta')
  E('qForm("out");window.__n.say="லுலு 50 ரியால் சாப்பாடு"');pg.click('#over [data-act="voice"]');pg.wait_for_timeout(700)
  ok('voice asks for Tamil',E('__calls.filter(c=>c[1]=="listen").pop()[2].lang')=='ta-IN' and pg.input_value('#f_amt')=='50')
  pg.click('#over .x');E('S.cfg.vlang="";save()')
  # --- launches from widget mic and notification ---
  E('__calls.length=0;window.__n.say="Karak 3 riyal food";window.__n.launch=JSON.stringify({add:"voice"})');E('nativeLaunch()');pg.wait_for_timeout(1500)
  ok('widget mic opens add form and starts voice',E('__calls.some(c=>c[1]=="listen")') and pg.locator('#over #f_line').count()==1 and pg.input_value('#over #f_line')=='Karak 3 riyal food')
  pg.click('#over .x');E('S.cfg.smsq=[{id:"r1",from:"SMS · X",body:"INR 5 debited",p:{kind:"out",amt:5,cur:"INR",acc:"",date:today()},src:"s"}];save();window.__n.launch=JSON.stringify({add:"review"})');E('nativeLaunch()');pg.wait_for_timeout(1500)
  ok('notification opens payments to review',pg.locator('#over h2').first.inner_text()=='Payments to review')
  ok('version 29',E('VER')=='29')
finally:
  h.done()
