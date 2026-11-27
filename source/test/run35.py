"""Cards match the bank from the latest "Available Limit" alert (made-up data)."""
import json,sys,base64,time
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
ALERT=lambda l4,amt,shop,avl:"Your card ending **%s used for QAR %s at %s. Available Limit: QAR %s"%(l4,amt,shop,avl)
try:
  c,pg=h.page(native=True);E=pg.evaluate
  E('S.acc.push({id:"tv",name:"Test Visa",type:"card",cur:"QAR",open:0,l4:"4321",lim:4000},{id:"ot",name:"Other card",type:"card",cur:"QAR",open:0,l4:"8888",lim:1000});addTx({kind:"out",acc:"tv",amt:700,cur:"QAR",date:plus(-20),cat:"Travel",payee:"Agency"});addTx({kind:"out",acc:"tv",amt:237.40,cur:"QAR",date:plus(-10),cat:"Food",payee:"Cafe"});save()')
  ok('alert goes to the right card',E('[cardFor(%s).id,cardFor(%s).id,cardFor("Your debit card ending 9876 used. Available balance QAR 500")]'%(json.dumps(ALERT('4321','5.00','TEST CAFE','3,407.60')),json.dumps(ALERT('8888','9.00','SHOP','991.00'))))==['tv','ot',None])
  # a new CBQ email: the payment waits in review, the bank figure is checked at once
  now=int(time.time()*1000)
  E('it=>mailTake({update:async()=>{}},{items:[it]})',{"id":"g1","from":"cbqsms@cbq.com.qa","subject":"Commercialbank SMS Service","body":ALERT('4321','5.00','TEST CAFE','3,407.60'),"time":now})
  pg.wait_for_timeout(300)
  ok('bank figure recorded',E('S.cfg.cardBank.tv.avl')==3407.6)
  ok('payment waiting in review',E('S.cfg.smsq.some(m=>m.p&&m.p.acc=="tv"&&m.p.amt==5)'))
  w=E('S.cfg.balWarn.tv');ok('difference found (350, counting the waiting 5.00)',w and w['avl']==3407.6 and abs(w['app']+942.4)<0.01,w)
  it=E('todoItems().find(x=>x.act=="balFix"&&x.id=="tv")');ok('needs attention says what the bank says',it and 'bank says QAR 3,407.6 available' in it['tx'] and 'QAR 3,057.6' in it['sub'] and 'QAR 350' in it['sub'],it)
  E('accMenu("tv")');t=pg.inner_text('#over');ok('card page shows the bank alert and the gap',"Bank’s latest alert" in t and "3,407.6" in t and "differs by QAR 350" in t and pg.locator('#over [data-act="cardChkNow"]').count()==1,t[:600])
  # one tap from Needs attention
  E('ACT.balFix("tv")');ok('filled in from the alert',pg.input_value('#f_avl')=='3407.6')
  pg.click('#over [data-act="saveFix"]');pg.wait_for_timeout(200)
  ok('first match goes into the opening balance',E('ac("tv").open')==350 and not E('S.tx.some(x=>x.acc=="tv"&&x.kind=="adj")'),E('[ac("tv").open,S.tx.filter(x=>x.acc=="tv"&&x.kind=="adj").length]'))
  ok('warning cleared',not E('(S.cfg.balWarn||{}).tv'))
  E('quickSave(S.cfg.smsq.find(m=>m.p&&m.p.acc=="tv"&&m.p.amt==5));save()')
  ok('after saving the 5.00: available like the bank',E('cardAv(ac("tv"))')==3407.6 and not E('(S.cfg.balWarn||{}).tv'))
  # a newer SMS that agrees: nothing to do
  E('S.cfg.smsAuto=true;S.cfg.smsAt=Date.now()-6e4;window.__n.sms=[{id:"s9",address:"CBQ",body:%s,date:Date.now()+1000}];save()'%json.dumps(ALERT('4321','10.00','TEST SHOP','3,397.60')))
  E('smsScan()');pg.wait_for_timeout(500)
  ok('SMS alert read',E('S.cfg.cardBank.tv.avl')==3397.6 and E('S.cfg.cardBank.tv.src')=='SMS')
  ok('agrees once the waiting 10.00 is counted',not E('(S.cfg.balWarn||{}).tv'))
  E('quickSave(S.cfg.smsq.find(m=>m.p&&m.p.acc=="tv"&&m.p.amt==10));save()')
  # later difference: a correction entry, not the opening balance
  E('S.cfg.smsAt=Date.now()-6e4;window.__n.sms=[{id:"s10",address:"CBQ",body:%s,date:Date.now()+2000}];smsScan()'%json.dumps(ALERT('4321','4.00','KIOSK','3,360.00')))
  pg.wait_for_timeout(500);E('quickSave(S.cfg.smsq.find(m=>m.p&&m.p.acc=="tv"&&m.p.amt==4));save()')
  w=E('S.cfg.balWarn.tv');ok('later gap found',w and w['avl']==3360,w)
  E('accMenu("tv")');pg.click('#over [data-act="cardChkNow"]');pg.wait_for_timeout(800)
  t=pg.inner_text('#over');ok('check sheet explains',"The bank says QAR 3,360 available" in t and "A correction entry is added" in t,t[:500])
  pg.click('#over [data-act="cardMatchGo"]');pg.wait_for_timeout(300)
  ok('later match adds a correction entry',E('S.tx.some(x=>x.acc=="tv"&&x.kind=="adj"&&x.note=="Matched to the bank"&&Math.abs(x.amt+33.6)<0.01)') and E('ac("tv").open')==350 and E('cardAv(ac("tv"))')==3360,E('[cardAv(ac("tv")),S.tx.filter(x=>x.acc=="tv"&&x.kind=="adj").map(x=>x.amt)]'))
  # look back: an older SMS already on the phone
  E('S.acc.push({id:"lk",name:"Look card",type:"card",cur:"QAR",open:0,l4:"5555",lim:2000});addTx({kind:"out",acc:"lk",amt:100,cur:"QAR",date:plus(-3),payee:"Shop"});window.__n.sms=[{id:"s20",address:"CBQ",body:%s,date:Date.now()-2*864e5}];save()'%json.dumps(ALERT('5555','20.00','MARKET','1,850.00')))
  E('cardLook(ac("lk"),true)');pg.wait_for_timeout(500)
  w=E('S.cfg.balWarn.lk');ok('look back finds the SMS',w and w['avl']==1850,w)
  E('ACT.cardChkNow("lk")');pg.wait_for_timeout(800);t=pg.inner_text('#over')
  ok('first gap explained as before the first entry',"The bank says QAR 1,850 available" in t and "opening balance" in t,t[:500])
  pg.click('#over [data-act="cardMatchGo"]');pg.wait_for_timeout(300)
  ok('matched: available like the bank',E('cardAv(ac("lk"))')==1850 and E('ac("lk").open')==-50)
  # look back in Gmail
  b64=base64.urlsafe_b64encode(ALERT('7777','15.00','BAKERY','1,250.00').encode()).decode()
  E('''b=>{localStorage.setItem("ds-gm-on","1");gmToken=async()=>"t";const of=window.fetch;window.fetch=async(u,o)=>{u=String(u);if(u.includes("gmail.googleapis.com")){if(u.includes("/messages?"))return new Response(JSON.stringify({messages:[{id:"x1"}]}),{status:200});
    return new Response(JSON.stringify({internalDate:String(Date.now()-36e5),payload:{headers:[{name:"Subject",value:"Commercialbank SMS Service"}],mimeType:"text/plain",body:{data:b}}}),{status:200})}return of(u,o)};
    window.__n.sms=[];S.acc.push({id:"ml",name:"Mail card",type:"card",cur:"QAR",open:0,l4:"7777",lim:1500});addTx({kind:"out",acc:"ml",amt:200,cur:"QAR",date:plus(-2),payee:"Shop"});save()}''',b64)
  E('cardLook(ac("ml"),true)');pg.wait_for_timeout(800)
  ok('look back finds the Gmail alert',E('(S.cfg.cardBank.ml||{}).src')=='Gmail' and E('S.cfg.balWarn.ml.avl')==1250,E('[S.cfg.cardBank.ml,S.cfg.balWarn.ml]'))
  # nothing found: type it
  E('localStorage.removeItem("ds-gm-on");S.acc.push({id:"nf",name:"Quiet card",type:"card",cur:"QAR",open:0,l4:"6666",lim:1000});addTx({kind:"out",acc:"nf",amt:300,cur:"QAR",date:plus(-1),payee:"Shop"});save()')
  E('ACT.cardChkNow("nf")');pg.wait_for_timeout(800);t=pg.inner_text('#over')
  ok('nothing found: says so and asks',"No alert with “Available Limit” for this card (ending 6666)" in t and pg.locator('#over #f_cav').count()==1,t[:400])
  pg.fill('#f_cav','750');pg.click('#over [data-act="cardMatchType"]');pg.wait_for_timeout(300)
  ok('typed: matched',E('cardAv(ac("nf"))')==750)
  # setting a limit looks for alerts straight away
  E('S.acc.push({id:"nl",name:"New limit card",type:"card",cur:"QAR",open:0,l4:"2468"});save();accForm(ac("nl"))');pg.fill('#f_lim','500');pg.click('#over [data-act="saveAcc"]');pg.wait_for_timeout(600)
  ok('limit set: looked for alerts',bool(E('(S.cfg.cardLook||{}).nl')))
  # bank accounts untouched
  E('fixForm("a2")');ok('bank account form unchanged',pg.locator('#over #f_bal').count()==1)
finally:
  h.done()
