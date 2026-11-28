"""Version 36: quick actions, Quick review with swipe, Type it, select many entries, Month in review, accents (made-up data only)."""
import json,sys,time
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
Q='''[{id:"com.qnb.mobile:x1",from:"QNB",body:"Your card ending 4821 was used for QAR 27.00 at BAKERY ONE",p:{kind:"out",amt:27,cur:"QAR",payee:"BAKERY ONE",date:today(),acc:"a2",l4:"4821"},src:"n"},
{id:"com.qnb.mobile:x2",from:"QNB",body:"QAR 120.00 debited at LULU",p:{kind:"out",amt:120,cur:"QAR",payee:"LULU",date:today(),acc:"a2"},src:"n"},
{id:"com.qnb.mobile:x3",from:"QNB",body:"QAR 500.00 transferred to account 9911",p:{kind:"out",amt:500,cur:"QAR",payee:"ACCOUNT 9911",date:today(),acc:"a2"},src:"n"}]'''
try:
  c,pg=h.page(native=True);E=pg.evaluate;pg.set_viewport_size({"width":412,"height":915})
  E('S.cfg.ntfAuto=true;S.cfg.payLog=[];S.cfg.smsq=%s;S.acc.push({id:"a5",name:"QIB Savings",type:"bank",cur:"QAR",open:0});save();tab="home";render()'%Q)
  pg.wait_for_timeout(200)
  ok('Home has five quick actions',pg.locator('#app .qa button').count()==5 and pg.inner_text('#app .qa .qab')=="3")
  pg.click('#app .qa [data-act="qaReview"]');pg.wait_for_selector('#over #rvcard')
  ok('Review opens Quick review when payments wait',"1 of 3" in pg.inner_text('#over .rvtop') and "BAKERY ONE" in pg.inner_text('#over'))
  n0=E('S.tx.length');pg.click('#over .rvcats .fchip:nth-child(2)');cat=E('document.querySelector("#rvcard").dataset.cat')
  pg.click('#over [data-act="rvOk"]');pg.wait_for_timeout(250);t=E('S.tx[S.tx.length-1]')
  ok('Approve saves it with the chosen category and account',E('S.tx.length')==n0+1 and t['amt']==27 and t['acc']=="a2" and t['cat']==cat,t)
  ok('it is logged as approved in the app',E('S.cfg.payLog[S.cfg.payLog.length-1].act')=="add" and E('S.cfg.payLog[S.cfg.payLog.length-1].via')=="app")
  ok('the next payment shows',"2 of 3" in pg.inner_text('#over .rvtop') and "LULU" in pg.inner_text('#over'))
  pg.click('#toast [data-act="undo"]');pg.wait_for_timeout(250)
  ok('Undo takes it back to Waiting',E('S.tx.length')==n0 and any(x['id']=="com.qnb.mobile:x1" for x in E('S.cfg.smsq')) and "BAKERY ONE" in pg.inner_text('#over') and E('S.cfg.payLog.length')==0)
  # swipe right approves
  box=pg.locator('#rvcard .rvamt').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
  pg.mouse.move(x,y);pg.mouse.down();
  for k in range(1,9):pg.mouse.move(x+k*25,y+2)
  pg.mouse.up();pg.wait_for_timeout(500)
  ok('swiping right approves',E('S.tx.length')==n0+1 and "2 of 3" in pg.inner_text('#over .rvtop'),pg.inner_text('#over .rvtop'))
  # swipe left ignores
  box=pg.locator('#rvcard .rvamt').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
  pg.mouse.move(x,y);pg.mouse.down()
  for k in range(1,9):pg.mouse.move(x-k*25,y+2)
  pg.mouse.up();pg.wait_for_timeout(500)
  ok('swiping left ignores',not any(x['id']=="com.qnb.mobile:x2" for x in E('S.cfg.smsq')) and E('S.cfg.payLog[S.cfg.payLog.length-1].act')=="skip")
  # the last one is a transfer to my own account
  pg.check('#over #rv_tr');pg.wait_for_timeout(100);ok('the transfer choice shows the To account',E('!document.querySelector("#rv_tobox").hidden'))
  pg.select_option('#over #rv_to','a5');n1=E('S.tx.length');pg.click('#over [data-act="rvOk"]');pg.wait_for_timeout(250)
  t=E('S.tx[S.tx.length-1]');ok('it is saved as a transfer',E('S.tx.length')==n1+1 and t['kind']=="tr" and t['acc']=="a2" and t['to']=="a5" and t['amt']==500,t)
  ok('and the app learns that transfer',any(r.get('to')=="a5" for r in E('Object.values(S.cfg.learn.tr)')))
  ok('All done shows the counts',"All done" in pg.inner_text('#over') and "2 approved · 1 ignored" in pg.inner_text('#over'))
  pg.click('#over [data-act="closeX"]')
  # ---------- Type it ----------
  P=lambda s:E('t=>smartParse(t)',s)
  p=P("45 lulu");ok('“45 lulu”',p['amt']==45 and p['kind']=="out" and p['payee']=="Lulu",p)
  p=P("salary 12000 qar");ok('“salary 12000 qar” is income in riyals',p['kind']=="in" and p['amt']==12000 and p['cur']=="QAR",p)
  p=P("2000 from qnb to sbi");ok('“2000 from qnb to sbi” is a transfer',p['kind']=="tr" and p['acc']=="a2" and p['to']=="a1",p)
  p=P("250 petrol yesterday");ok('“yesterday” sets the date',p['date']==E('plus(-1)') and p['amt']==250,p)
  p=P("1.5k rent");ok('“1.5k” is 1500',p['amt']==1500,p)
  p=P("paid 300 to ravi kumar on 3 with sbi");ok('payee and account from the sentence',p['payee']=="Ravi Kumar" and p['acc']=="a1",p)
  E('smartAdd()');pg.wait_for_selector('#over #sm_t');pg.fill('#over #sm_t','45 lulu');pg.wait_for_timeout(150)
  ok('the preview fills in',"Expense" in pg.inner_text('#over #sm_prev') and "Lulu" in pg.inner_text('#over #sm_prev'))
  n2=E('S.tx.length');pg.press('#over #sm_t','Enter');pg.wait_for_timeout(200);t=E('S.tx[S.tx.length-1]')
  ok('Enter saves it',E('S.tx.length')==n2+1 and t['amt']==45 and t['payee']=="Lulu",t)
  pg.click('#toast [data-act="undo"]');pg.wait_for_timeout(150);ok('and Undo takes it back',E('S.tx.length')==n2)
  E('qForm("out")');pg.wait_for_timeout(100);ok('the add form links to Type it',pg.locator('#over .smlink').count()==1);pg.click('#over .x')
  # ---------- select many ----------
  E('tab="spend";render()');pg.wait_for_timeout(200);pg.click('#app [data-act="selT"]');pg.wait_for_timeout(150)
  rows=pg.locator('#app .row[data-act="selTx"]');ok('Select turns entries into a pick list',rows.count()>=3 and pg.locator('#app .selbar').count()==1)
  ids=[rows.nth(0).get_attribute('data-id')];rows.nth(0).click();pg.wait_for_timeout(100)
  r2=pg.locator('#app .row[data-act="selTx"]');ids.append(r2.nth(1).get_attribute('data-id'));r2.nth(1).click();pg.wait_for_timeout(100)
  ok('two picked',"2 selected" in pg.inner_text('#app .selbar') and pg.locator('#app .row.picked').count()==2)
  old=E('%s.map(i=>S.tx.find(t=>t.id==i).cat)'%json.dumps(ids))
  pg.click('#app .selbar [data-act="selCat"]');pg.click('#over [data-act="selCatSet"][data-id="Health"]');pg.wait_for_timeout(200)
  ok('category changed for both',E('%s.every(i=>S.tx.find(t=>t.id==i).cat=="Health")'%json.dumps(ids)) and pg.locator('#app .selbar').count()==0)
  pg.click('#toast [data-act="undo"]');pg.wait_for_timeout(150);ok('Undo puts them back',E('%s.map(i=>S.tx.find(t=>t.id==i).cat)'%json.dumps(ids))==old)
  E('selMode=true;SEL_IDS.add(%s);render()'%json.dumps(ids[0]));pg.click('#app .selbar [data-act="selAcc"]');pg.click('#over [data-act="selAccSet"][data-id="a5"]');pg.wait_for_timeout(150)
  ok('account changed',E('S.tx.find(t=>t.id==%s).acc'%json.dumps(ids[0]))=="a5")
  pg.on("dialog",lambda d:d.accept());E('selMode=true;SEL_IDS.add(%s);render()'%json.dumps(ids[1]));n3=E('S.tx.length');pg.click('#app .selbar [data-act="selDel"]');pg.wait_for_timeout(200)
  ok('delete goes to the bin',E('S.tx.length')==n3-1);pg.click('#toast [data-act="undo"]');pg.wait_for_timeout(150);ok('and can be restored',E('S.tx.length')==n3)
  # ---------- Month in review ----------
  E('wrapSheet(today().slice(0,7))');pg.wait_for_selector('#over #wrap_sheet');ok('Month in review cards',pg.locator('#over .wcard').count()>=4 and "spent" in pg.inner_text('#over .w1'))
  pg.click('#over .x');E('tab="rep";S.cfg.rSeg="sum";render()');pg.wait_for_timeout(150);ok('Reports links to it',pg.locator('#app .wbtn').count()==1)
  # ---------- look ----------
  E('settings()');pg.wait_for_timeout(200);ok('Settings starts with Payment review and Look',E('(()=>{const s=document.querySelector("#over .sheet"),a=[...s.querySelectorAll(".setpay,.looks,#set_more")].map(e=>e.className||e.id);return a.join(",")})()').startswith("setpay,card looks"))
  pg.click('#over [data-act="lookAccent"][data-id="blue"]');pg.wait_for_timeout(150);ok('an accent colour applies',E('document.documentElement.getAttribute("data-accent")')=="blue")
  pg.click('#over [data-act="lookAccent"][data-id=""]');pg.wait_for_timeout(100);ok('and back to teal',E('document.documentElement.getAttribute("data-accent")') is None)
  pg.click('#over .x');E('tab="spend";render()');pg.wait_for_timeout(150);ok('category icons are coloured',E('[...document.querySelectorAll("#app .row .ci")].some(c=>c.style.background.includes("color-mix"))'))
  for tb in ['home','dates','invest','acc','spend','rep']:
    E('tab=%s;render()'%json.dumps(tb));ok('tab '+tb+' renders','couldn’t be shown' not in pg.inner_text('#app'))
  E('S.cfg.lang="ta";tab="home";render()');pg.wait_for_timeout(150);ok('Tamil: quick actions show',pg.locator('#app .qa button').count()==5);E('S.cfg.lang="";save()')
finally:
  h.done()
