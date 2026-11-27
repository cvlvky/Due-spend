import re
import json,sys
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
src=open('dist/due-and-spend.html',encoding='utf-8').read()
open('dist/tb.html','w',encoding='utf-8').write(src.replace('__BUILD__','5').replace('__REPO__','cvlvky/Due-spend'))
try:
  c,pg=h.page();E=pg.evaluate
  E('S.cfg.wSeg="over";S.cfg.lastBk=today();save();tab="home";render()')
  # ---- Home ----
  ok('header icons: quick add, hide amounts, settings',all(pg.locator('#app .top [data-act="%s"]'%a).count()==1 for a in ('quick','hide','settings')))
  ok('search stays on Home',pg.locator('#app input[data-gs]').count()==1)
  t=pg.inner_text('#app .hero');ok('hero: net worth, in accounts, due, safe to spend','Net worth' in t and 'In accounts' in t and 'Due in 30 days' in t and 'Safe to spend' in t,t)
  ok('one Needs attention list instead of a stack of cards',pg.locator('#app .todo').count()==1 and pg.locator('#app .todo .trow').count()>=1)
  ok('old clutter gone',all(x not in pg.inner_text('#app') for x in ('Theme: ','Open reports','Up next')))
  E('S.cfg.smsq=[{id:"q",from:"CBQ",body:"x",p:{kind:"out",amt:7,cur:"QAR",acc:"a2",date:today(),payee:"Lulu"}}];render()')
  ok('payments to review is a row with a button',pg.locator('#app .todo .trow:has-text("1 payment to review") [data-act="smsReview"]').count()==1)
  n=E('todoItems().length');ok('long list folds after five rows',(n<=5) or (pg.locator('#app .todo .trow').count()==5 and pg.locator('#app [data-act="todoAll"]').count()==1),n)
  if n>5:
    pg.click('#app [data-act="todoAll"]');ok('show all opens the full list',pg.locator('#app .todo .trow').count()==n)
  # Paid button acts, row tap opens the record
  E('S.dates.push({id:"dz",name:"Water bill",type:"renewal",date:plus(2),amt:150,cur:"QAR",rep:"none",att:[]});window.__todoAll=true;render()')
  pg.click('#app .todo .trow:has-text("Water bill") .chev, #app .todo .trow:has-text("Water bill") b');pg.wait_for_timeout(200)
  ok('tapping the row opens the due',pg.locator('#over [data-act="saveDate"]').count()==1);pg.click('#over .x')
  pg.click('#app .todo .trow:has-text("Water bill") button[data-act="paid"]');pg.wait_for_timeout(200)
  ok('Paid button marks it paid',E('S.dates.find(d=>d.id=="dz").done')==True or not E('upcoming(today(),plus(7),true).some(u=>u.id=="dz")'))
  pg.click('#over .x') if pg.locator('#over .x').count() else None
  t=pg.inner_text('#app');ok('this month card with tappable figures','This month' in t and 'so far' in t and pg.locator('#app .mini3 .stat[data-act="explain"]').count()==3)
  ok('coming up list','Coming up' in t and pg.locator('#app .crow').count()>=1)
  ok('shortcuts: family, reports, backup',all(pg.locator('#app .short3 [data-act="%s"]'%a).count()==1 for a in ('famGo','settings')) and pg.locator('#app .short3 [data-id="rep"]').count()==1)
  pg.click('#app [data-act="homeEdit"]');pg.uncheck('#over input[data-home="month"]');pg.uncheck('#over input[data-home="acc"]');pg.click('#over [data-act="homeSave"]');pg.wait_for_timeout(150)
  t=pg.inner_text('#app');ok('choose what Home shows','This month' not in t and pg.locator('#app .strip').count()==0 and sorted(E('S.cfg.homeOff'))==['acc','month'])
  E('S.cfg.homeOff=[];save();render()')
  # ---- Wealth sections ----
  pg.click('#nav button[data-id="invest"]');t=pg.inner_text('#app')
  ok('wealth opens on overview','What it’s made of' in t and 'Net worth' in t and 'Post office schemes' not in t,t[:300])
  for seg,want,not_ in (('inv',['Investments','Import mutual fund statement'],['Savings goals']),('sch',['My savings schemes','Post office schemes'],['Import mutual fund statement']),('goals',['Savings goals','Loans and EMIs'],['Gratuity']),('plans',['Return to India','Gratuity'],['Savings goals'])):
    pg.click('#app .segs [data-id="%s"]'%seg);pg.wait_for_timeout(100);t=pg.inner_text('#app')
    ok('wealth section '+seg,all(w in t for w in want) and all(n_ not in t for n_ in not_),t[:200])
  ok('section remembered',E('S.cfg.wSeg')=='plans')
  # ---- duplicates ----
  E('S.tx.push({id:"dp1",kind:"out",amt:266,acc:"a1",cur:"INR",date:today(),cat:"Shopping",payee:"Meesho",ct:1},{id:"dp2",kind:"out",amt:266,acc:"a1",cur:"INR",date:today(),cat:"Shopping",payee:"MEESHO",ct:2});tab="home";render()')
  ok('duplicates flagged on Home','2 possible duplicate entries' in pg.inner_text('#app'),pg.inner_text('#app')[:900])
  E('dupSheet()');ok('duplicate sheet lists each group',pg.locator('#over [data-act="dupDel"]').count()==2)
  pg.click('#over [data-act="dupDel"][data-id="dp2"]');pg.wait_for_timeout(150);ok('extra one deleted, first kept',E('S.tx.some(t=>t.id=="dp1")') and not E('S.tx.some(t=>t.id=="dp2")'))
  E('S.tx.push({id:"dp3",kind:"out",amt:266,acc:"a1",cur:"INR",date:today(),cat:"Shopping",payee:"Meesho",ct:3});dupSheet()')
  while pg.locator('#over [data-act="dupKeep"]').count():pg.click('#over [data-act="dupKeep"] >> nth=0');pg.wait_for_timeout(120)
  ok('both real: not asked again',E('dupFind(0).length')==0);pg.click('#over .x')
  # ---- share the month ----
  E('window.__opened=[];window.open=u=>{window.__opened.push(u)};0');E('verdictSheet(today().slice(0,7))');pg.click('#over [data-act="shareWa"]');u=E('window.__opened[0]')
  ok('share summary on WhatsApp',u.startswith('https://wa.me/?text=') and 'Personal%20Diary' in u and 'Spent' in u,u[:120])
  pg.click('#over .x')
  # ---- settings ----
  E('settings()');t=pg.inner_text('#over');ok('settings: theme, hide amounts, duplicates, Home',all(x in t for x in ('Theme','amounts','Find duplicates','Choose what Home shows')))
  pg.click('#over [data-act="theme"]');ok('theme from settings',E('S.cfg.theme')=='light' and bool(re.search(r'Theme\s*:?\s*Light',pg.inner_text('#over'))))
  c.close()
  # ---- phone app: update prompt and automatic updates ----
  pre='window.__http={"releases/download/app/version.json":%s};'%json.dumps(json.dumps({"code":9,"ver":"26","date":"2026-11-19T10:00:00Z","notes":"Clearer Home and Wealth\nUpdate prompt"}))
  c,pg=h.page(native=True,pre=pre,url='tb.html');E=pg.evaluate
  pg.wait_for_selector('#over .updbox',timeout=12000);t=pg.inner_text('#over')
  ok('prompt in front with what’s new','Update available' in t and 'Version 26' in t and 'Clearer Home and Wealth' in t,t)
  pg.check('#u_auto');pg.click('#over [data-act="updGo"]');pg.wait_for_timeout(300)
  ok('Update now installs and remembers the choice',E('S.cfg.updAuto')==True and any(x[1]=='installApk' for x in E('window.__calls')))
  n0=sum(1 for x in E('window.__calls') if x[1]=='installApk');E('updShownAt=0;updPrompt()');pg.wait_for_timeout(500)
  ok('next time it updates without asking',sum(1 for x in E('window.__calls') if x[1]=='installApk')==n0+1 and pg.locator('#over .updbox').count()==0)
  E('settings()');pg.wait_for_timeout(200);ok('settings has the automatic update switch',pg.locator('#over input[data-act="updAutoT"]').count()==1)
  pg.click('#over input[data-act="updAutoT"]');pg.wait_for_timeout(150);ok('switch turns it off',E('S.cfg.updAuto')==False)
  c.close()
  # dark theme screenshot for a visual check
  c,pg=h.page();pg.evaluate('S.cfg.theme="dark";S.cfg.wSeg="over";save();applyUI&&applyUI();render()');pg.wait_for_timeout(500);pg.screenshot(path='shots/s-v26-dark.png');c.close()
finally:
  h.done()
