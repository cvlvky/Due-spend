import json,sys,time,os,re
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
src=open('dist/due-and-spend.html',encoding='utf-8').read()
open('dist/tb.html','w',encoding='utf-8').write(src.replace('__BUILD__','5').replace('__REPO__','vig/Due-spend'))
CBQ="Your card ending **4821 used for QAR 7.00 at Saffron Cafe at 07:06 11-Nov-26 Available Limit: QAR 3,193.00"
WEIRD="ALERT: Spent QAR 45.25 @ MEGA MART DOHA via card 4821. Bal 1200.00"
try:
  # ---- teach once through the screens ----
  c,pg=h.page();E=pg.evaluate
  E('readCheck()');pg.wait_for_selector('#f_rt');pg.fill('#f_rt',WEIRD)
  pg.click('#over button[data-act="teachText"]');pg.wait_for_selector('#over .tkbox')
  amt=E('TCH.ia');ok('teach opens with the amount guessed',amt>=0 and E('TCH.toks[TCH.ia]')=='45.25',E('[TCH.ia,TCH.toks]'))
  # choose shop MEGA..MART (first and last word)
  i1=E('TCH.toks.indexOf("MEGA")');i2=E('TCH.toks.indexOf("DOHA")')
  pg.click(f'#over .tk[data-id="{i1}"]');pg.click(f'#over .tk[data-id="{i2}"]')
  ok('shop range picked',E('[TCH.ps,TCH.pe]')==[i1,i2])
  pg.select_option('#t_acc','a2');pg.fill('#t_cat','Groceries');pg.dispatch_event('#t_cat','change')
  t=pg.inner_text('#t_prev');ok('preview reads the message',"QAR 45.25" in t and "MEGA MART DOHA" in t,t)
  pg.click('#over button[data-act="teachSave"]');pg.wait_for_timeout(200)
  ok('format saved to synced list',len(E('S.tpl'))==1 and 'tpl' in E('COLLS'))
  p=E('parseSms("ALERT: Spent QAR 1,310.50 @ SAFARI HYPERMARKET ABU HAMOUR via card 4821. Bal 9.00")')
  ok('new message with same wording read by the format',p and p['amt']==1310.5 and p['payee']=='SAFARI HYPERMARKET ABU HAMOUR' and p['acc']=='a2' and p['cat']=='Groceries' and p['kind']=='out',p)
  ok('other messages unaffected',E('parseSms(%s).payee'%json.dumps(CBQ))=='Saffron Cafe')
  pg.click('#over button[data-act="teachAddNow"]');pg.wait_for_selector('#over #f_amt');ok('add now opens the entry',pg.input_value('#f_amt') in ('45.25',));pg.click('#over .x')
  # teach a payment-in format, payee at end of message
  E('teachOpen("Salary of QAR 12,000.00 credited by ACME CONTRACTING")');i1=E('TCH.toks.indexOf("ACME")');i2=E('TCH.toks.indexOf("CONTRACTING")')
  pg.click(f'#over .tk[data-id="{i1}"]');pg.click(f'#over .tk[data-id="{i2}"]');pg.select_option('#t_kind','in');pg.click('#over button[data-act="teachSave"]');pg.wait_for_timeout(150)
  p=E('parseSms("Salary of QAR 13,500.00 credited by GULF STAR TRADING WLL")');ok('format with name at the end',p and p['amt']==13500 and p['kind']=='in' and p['payee']=='GULF STAR TRADING WLL',p)
  pg.click('#over .x')
  # review queue gets Teach buttons; delete format from reading check
  E('S.cfg.smsq=[{id:"q1",from:"Bank",body:%s,p:parseSms(%s)}];save();smsReview()'%(json.dumps(CBQ),json.dumps(CBQ)));ok('review has Wrong? Teach',pg.locator('#over [data-act="teach"]').count()==1)
  pg.click('#over [data-act="teach"]');pg.wait_for_selector('#over .tkbox');ok('teach from review',E('TCH.s').startswith('Your card ending'));pg.click('#over .x')
  E('readCheck()');pg.wait_for_timeout(300);ok('reading check lists taught formats','Formats you taught (2)' in pg.inner_text('#over'))
  pg.click('#over [data-act="tplDel"] >> nth=0');pg.wait_for_timeout(200);ok('format can be removed',len(E('S.tpl.filter(t=>!t.off)'))==1 and len(E('S.bin'))>=1);pg.click('#over .x')
  # ---- learning ----
  E('S.tx.push({id:"lx1",kind:"out",amt:80,acc:"a2",cur:"QAR",date:today(),cat:"Groceries",payee:"Lulu Hypermarket Doha"});S.tx.push({id:"lx2",kind:"out",amt:300,acc:"a1",cur:"INR",date:today(),cat:"Shopping",payee:"Meesho"})')
  ok('learns shop to category from history',E('catFor("LULU HYPERMARKET")')=='Groceries' and E('catFor("lulu hypermarket al gharrafa")')=='Groceries',E('catFor("LULU HYPERMARKET")'))
  ok('built-in guesses for new shops',E('catFor("TALABAT.COM")')=='Food' and E('catFor("Ooredoo QSC")')=='Bills' and E('catFor("WOQOD STATION 12")')=='Travel',[E('catFor("TALABAT.COM")'),E('catFor("Ooredoo QSC")')])
  p=E('parseSms("Amount Debited: INR 266.00 Account Number: XX9999 Date & Time: 14-11-26, 12:42:28 IST Transaction Info: UPI/P2M/600000000101/Meesho")')
  ok('account learned from the shop when the card is unknown',p['acc']=='a1' and p['cat']=='Shopping',p)
  # ---- regular payments ----
  E('''for(let k=4;k>=1;k--)S.tx.push({id:"oo"+k,kind:"out",amt:150+(k%2),acc:"a2",cur:"QAR",date:addM(today(),-k),cat:"Bills",payee:"Ooredoo"});save();tab="dates";render()''')
  t=pg.inner_text('#app');ok('dues tab suggests regular payments','Looks like regular payments' in t and 'Ooredoo' in t and 'every month' in t,t[:400])
  pg.click('[data-act="recSub"][data-id^="ooredoo"]');pg.wait_for_selector('#over #f_name')
  ok('subscription form prefilled',pg.input_value('#f_name')=='Ooredoo' and pg.input_value('#f_cur')=='QAR' and pg.input_value('#f_cyc')=='monthly' and pg.input_value('#f_cat')=='Mobile and internet' and pg.input_value('#f_pay')=='a2',[pg.input_value('#f_name'),pg.input_value('#f_cat')])
  pg.click('#over .x')
  while pg.locator('[data-act="recIgn"]').count():pg.click('[data-act="recIgn"] >> nth=0')
  ok('not regular hides it','Looks like regular payments' not in pg.inner_text('#app') and len(E('S.cfg.recIgn'))>=2,E('S.cfg.recIgn'))
  # ---- tax label ----
  E('S.sacc.push({id:"s1",type:"ppf",name:"My PPF",open:"2020-04-10",dep:[{id:"d",d:"2026-05-01",a:50000}],plan:{f:"y",a:50000,day:5}});tab="invest";render()')
  ok('section 123 label','section 123 (old 80C)' in pg.inner_text('#app'))
  # ---- rules file applied ----
  E('''S.cfg.rules={v:1,updated:"2026-12-28",schemes:{quarter:{from:"2027-01-01",to:"2027-03-31",label:"1 Jan – 31 Mar 2027"},rates:{ppf:7.3,rd:6.8}},rateHist:{ppf:[["2027-01-01",7.3]]},
    sms:[{name:"Dukhan card",re:"Dukhan Bank: purchase of QAR ([\\\\d,.]+) at (.+?) on",amt:1,payee:2,kind:"out",cur:"QAR"}],skip:["win a prize"]};rulesApply()''')
  ok('rates from rules file',E('SCH.find(s=>s.id=="ppf").rate')==7.3 and E('SCH_Q.label')=='1 Jan – 31 Mar 2027' and E('rateAt("ppf","2027-02-01")')==7.3 and E('rateAt("ppf","2026-12-01")')==7.1)
  p=E('parseSms("Dukhan Bank: purchase of QAR 250.75 at JARIR BOOKSTORE on 12/12/2026")');ok('message format from rules file',p and p['amt']==250.75 and p['payee']=='JARIR BOOKSTORE' and p['cur']=='QAR',p)
  ok('skip pattern from rules file',E('parseSms("Congratulations! Win a prize of QAR 5000 now")') is None)
  c.close()
  # ---- phone app: updates and rules download ----
  pre='window.__http={"releases/download/app/version.json":%s,"github.io/Due-spend/rules.json":%s};'%(json.dumps(json.dumps({"code":7,"ver":"24","date":"2026-11-16T10:00:00Z"})),json.dumps(json.dumps({"v":1,"updated":"2026-11-16","schemes":{"quarter":{"from":"2026-10-01","to":"2026-12-31","label":"1 Oct – 31 Dec 2026"},"rates":{"ssy":8.2}}})))
  c,pg=h.page(native=True,pre=pre,url='tb.html');E=pg.evaluate
  ok('build number and repo come from the build',E('buildNo()')==5 and E('repoSlug()')=='vig/Due-spend')
  pg.wait_for_function('S.cfg.upd&&S.cfg.upd.code==7',timeout=9000)
  pg.wait_for_selector('#over .updbox',timeout=9000);t=pg.inner_text('#over');ok('update prompt shows when the app opens','Update available' in t and 'Version 24' in t and 'build 7' in t,t[:300])
  pg.click('#over [data-act="updLater"]');pg.wait_for_timeout(200);ok('Later closes it and snoozes',E('!$("#over .sheet")') and E('S.cfg.updSnoozeCode')==7)
  E('updShownAt=0;updPrompt()');pg.wait_for_timeout(400);ok('not shown again right after Later',E('!$("#over .updbox")'))
  pg.click('#nav button[data-id="home"]')
  ok('home shows the update','New version ready: Version 24' in pg.inner_text('#app'))
  pg.click('[data-act="updInstall"]');pg.wait_for_timeout(300)
  ok('install downloads the APK from your repo',any(x[1]=='installApk' and x[2]['url']=='https://github.com/vig/Due-spend/releases/download/app/personal-diary.apk' for x in E('window.__calls')))
  E('window.__n.install={needPermission:true}');pg.click('[data-act="updInstall"]');pg.wait_for_selector('#over .steps');ok('asks for install permission once','Allow from this source' in pg.inner_text('#over'));pg.click('#over .x')
  E('window.__n.install=null;window.Capacitor.nativePromise=(f=>async(p,m,o)=>{if(m=="installApk")throw new Error("not implemented");return f(p,m,o)})(window.Capacitor.nativePromise)')
  pg.click('[data-act="updInstall"]');pg.wait_for_timeout(300);ok('older app falls back to the browser',any(x[1]=='openUrl' for x in E('window.__calls')))
  E('rulesFetch(true)');pg.wait_for_function('S.cfg.rulesOk>0',timeout=6000);ok('rules downloaded from GitHub Pages',E('S.cfg.rulesFrom')=='https://vig.github.io/Due-spend/rules.json')
  E('settings()');t=pg.inner_text('#over');ok('settings: version, repo, rules','App updates' in t and 'build 5' in t and 'Rules file' in t and pg.input_value('#f_repo')=='vig/Due-spend',t[-500:])
  pg.fill('#f_repo','https://github.com/other/Repo2');pg.click('#over [data-act="repoSave"]');ok('repo can be changed',E('repoSlug()')=='other/Repo2')
  c.close()
  # web app: no update banner, nothing broken
  c,pg=h.page();E=pg.evaluate;ok('web app has no build number',E('buildNo()')==0 and E('repoSlug()')=='' and 'New version' not in pg.inner_text('#app'));c.close()
finally:
  h.done()
