import json,sys,re,time
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
try:
  c,pg=h.page(native=True);E=pg.evaluate
  E('''const m=today().slice(0,7);for(let i=0;i<12;i++)S.tx.push({id:"f"+i,kind:"out",acc:"a2",amt:20+i,cur:"QAR",fx:fx(),date:m+"-0"+(1+(i%Math.min(9,+today().slice(8)))),cat:"Food",payee:i%2?"Lulu":"Karak House",tags:[],ct:Date.now()-864e5*5});
       S.tx.push({id:"g1",kind:"out",acc:"a2",amt:150,cur:"QAR",fx:fx(),date:addMon(m,-1)+"-12",cat:"Food",payee:"Lulu",tags:[]});save()''')
  A=lambda q:E('askRun(%s)'%json.dumps(q))
  r=A("How much on food this month?");exp=E('fmx(Math.round(cv(S.tx.filter(x=>x.kind=="out"&&x.cat=="Food"&&x.date.startsWith(today().slice(0,7))).reduce((s,x)=>s+ca(x),0),V(),V())),V())')
  ok('ask: food this month',r['big']==exp and 'Food' in r['say'] and len(r['list'])>=12,[r['big'],exp,r['say']])
  r=A("how many times at Lulu this month");ok('ask: count at a shop','times' in r['big'] and 'Lulu' in r['say'],r)
  r=A("biggest expenses last month");ok('ask: biggest last month',r['list'] and r['list'][0]['amt']>=150,r['say'])
  r=A("what is due next week");ok('ask: dues',"to pay" in r['say'],r['say'])
  r=A("balance in all accounts");ok('ask: balances',r.get('rows') and len(r['rows'])==E('S.acc.length'))
  r=A("where did I spend most this month");ok('ask: by shop',r.get('rows') and any(x[0]=='Lulu' for x in r['rows']),r.get('rows'))
  r=A("food in riyal last month");ok('ask: currency and month',r['big'].startswith('QAR'),r['big'])
  E('tab="home";render()');ok('ask button next to search',pg.locator('#app [data-act="askOpen"]').count()==1)
  pg.click('#app [data-act="askOpen"]');pg.fill('#f_ask','how much on food this month');pg.keyboard.press('Enter');pg.wait_for_timeout(200);ok('ask sheet answers',len(pg.inner_text('#ask_out'))>5);pg.click('#over .x')
  # money calendar
  E('S.dates.push({id:"y1",name:"LIC yearly",type:"premium",date:addMon(today().slice(0,7),3)+"-10",day:10,amt:60000,cur:"INR",rep:"yearly"});save()')
  C=E('(()=>{const c=calYear();return {n:c.by.length,heavy:c.heavy.map(x=>x.m),set:c.setAside}})()');ok('money calendar 12 months with heavy month',C['n']==12 and len(C['heavy'])>=1 and C['set']>0,C)
  E('calSheet()');ok('calendar sheet','Heavy months' in pg.inner_text('#over'));pg.click('#over .x')
  # was this you
  E('S.tx.push({id:"w9",kind:"out",acc:"a2",amt:99999,cur:"QAR",fx:fx(),date:today(),payee:"Unknown Online Store",tags:[],ct:Date.now()});save()')
  it=E('todoItems().find(x=>x.id=="w9")');ok('was this you asked',it and it['tx'].startswith('Was this you') and it['bact']=='wtyYes',it)
  E('ACT.wtyNo("w9")');ok('no opens card emergency','Card or account problem' in pg.inner_text('#over'))
  pg.fill('#hot_a2','+974 4449 0000');pg.click('#over [data-act="hotSave"][data-id="a2"]');pg.wait_for_timeout(200);ok('bank number saved with call button',pg.locator('#over a[href="tel:+97444490000"]').count()==1)
  pg.click('#over .x');E('ACT.wtyYes("w9")');ok('yes clears it',not E('todoItems().some(x=>x.id=="w9")'))
  # price watch from receipt
  E('window.__n.ocrText="LULU HYPERMARKET\\nDate: "+today().split("-").reverse().join("/")+"\\nALMARAI MILK 2 x 6.50 13.00\\nBREAD 4.50\\nGRAND TOTAL QAR 17.50";qForm("out")')
  import base64;PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
  pg.set_input_files('#over #f_file',files=[{'name':'b.png','mimeType':'image/png','buffer':PNG}]);pg.wait_for_timeout(1500)
  P=E('S.prices.map(p=>[p.key,p.price])');ok('item prices remembered',['almarai milk',6.5] in P and ['bread',4.5] in P,P)
  pg.click('#over .x');E('put("prices",stamp({id:"pp0",key:"almarai milk",name:"Almarai Milk",price:6.0,cur:"QAR",shop:"Carrefour",date:plus(-60)}));save();priceSheet()')
  t=pg.inner_text('#over');ok('price watch shows change and cheapest','Almarai Milk' in t and '+8%' in t and 'Carrefour' in t,t[:300]);pg.click('#over .x')
  # round-up jar
  E('S.goals.push({id:"gl1",name:"Holiday",target:5000,saved:100,cur:"QAR"});save();rupSheet()');pg.select_option('#f_rg','gl1');pg.select_option('#f_rc','QAR');pg.click('#over [data-act="rupSave"]');pg.wait_for_timeout(200)
  R=E('rupMonth()');ok('round-ups counted',R and R['sum']>0 and R['n']>=10,R)
  E('rupSheet()');pg.click('#over [data-act="rupMove"]');pg.wait_for_timeout(200);ok('moved to the goal',E('S.goals.find(g=>g.id=="gl1").saved')>100)
  # diary
  E('diarySheet()');pg.click('#over [data-act="moodSet"][data-id="2"]');pg.fill('#f_note2','Busy day at site');pg.click('#over [data-act="diarySave"]');pg.wait_for_timeout(200)
  n=E('S.notes[0]');ok('diary saved with mood',n and n['mood']=='2' and n['text']=='Busy day at site',n)
  # insights & challenges
  I=E('insights().map(x=>x[1])');ok('insights found',len(I)>=3,I)
  E('insightSheet()');pg.click('#over [data-act="chalNew"][data-id="cat"]');pg.fill('#f_chc','Food');pg.fill('#f_chl','100');pg.select_option('#f_chu','QAR');pg.click('#over [data-act="chalSave"]');pg.wait_for_timeout(200)
  ch=E('chalState()');ok('challenge tracks spending',ch and ch[0]['bad'] and ch[0]['p']>100,ch)
  ok('challenge at risk in needs attention',E('todoItems().some(x=>/Challenge: Food under/.test(x.tx))'));pg.click('#over .x')
  # cash counter
  E('cashSheet("a3")');pg.fill('#over [data-cc="100"]','2');pg.fill('#over [data-cc="10"]','3');pg.wait_for_timeout(100);ok('cash counted',E('ccTot()')==230 and '230' in pg.inner_text('#cc_tot'))
  pg.click('#over [data-act="cashSet"]');ok('opens correct balance with total',pg.input_value('#f_bal')=='230');pg.click('#over .x')
  # shake
  E('localStorage.setItem("ds-shake","1")');h0=E('!!S.cfg.hide')
  for _ in range(3):E('window.dispatchEvent(Object.assign(new Event("devicemotion"),{accelerationIncludingGravity:{x:30,y:5,z:5}}))')
  ok('shake toggles hide amounts',E('!!S.cfg.hide')!=h0);E('S.cfg.hide=false;save()')
  # future net worth
  E('calcSheet("fut")');ok('future net worth prefilled',pg.input_value('#c1')!='0' and 'In 10 years' in pg.inner_text('#calc_out'),pg.inner_text('#calc_out'));pg.click('#over .x')
  # all features guide
  E('settings()');ok('all features in settings',pg.locator('#over #set_guide').count()==1);pg.click('#over #set_guide')
  n=E('document.querySelectorAll("#guide_list [data-act=guideGo]").length');ok('guide lists many features',n>=60,n)
  pg.fill('#f_gq','count your cash');pg.wait_for_timeout(100);ok('guide search',E('document.querySelectorAll("#guide_list [data-act=guideGo]").length')==1)
  pg.click('#guide_list [data-act="guideGo"]');pg.wait_for_timeout(300);ok('guide opens the feature','Count your cash' in pg.inner_text('#over') or E('tab')=='acc')
  bad=E('(()=>{const L=[];GUIDE.forEach(g=>g[1].forEach(x=>{if(!GO[x[3]])L.push(x[3])}));return L})()');ok('every guide item opens something',bad==[],bad)
  errs=E('''(()=>{const bad=[];for(const k of Object.keys(GO)){try{GO[k]()}catch(e){bad.push(k+": "+e.message)}sheet("")}return bad})()''');ok('every guide action runs',errs==[],errs)
  E('tab="home";render()');ok('all features link on Home',pg.locator('#app [data-act="guideOpen"]').count()==1)
  ok('version 31',int(E('VER'))>=31)
finally:
  h.done()
