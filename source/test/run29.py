import json,sys,re,time,base64
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
try:
  c,pg=h.page(native=True);E=pg.evaluate
  # 1 receipt reading
  R=lambda t:E('rcptParse(%s)'%json.dumps(t))
  r=R("LULU HYPERMARKET\nTAX INVOICE\nDate: 18/11/2026 19:42\nMILK 2 x 6.50 13.00\nBREAD 4.50\nSub Total 17.50\nGRAND TOTAL QAR 17.50\nCash 20.00\nChange 2.50")
  ok('receipt total, shop, date',r['amt']==17.5 and r['cur']=='QAR' and r['shop']=='Lulu Hypermarket' and r['date']=='2026-11-18',r)
  r=R("Saravana Bhavan\nBill No 1234\n2 Dosa 180.00\nTotal\n₹ 360.00\nThank you")
  ok('total on the next line, rupees',r['amt']==360 and r['cur']=='INR' and r['shop']=='Saravana Bhavan',r)
  E('window.__n.ocrText="WOQOD\\nFUEL 45.00\\nTOTAL QR 45.00";qForm("out")')
  pg.set_input_files('#over #f_file',files=[{'name':'bill.png','mimeType':'image/png','buffer':PNG}]);pg.wait_for_timeout(1200)
  ok('photo fills the amount and shop',pg.input_value('#f_amt')=='45' and pg.input_value('#f_payee')=='Woqod' and 'Read from the photo' in pg.inner_text('#f_lineok'),[pg.input_value('#f_amt'),pg.input_value('#f_payee')])
  E('qForm("out")');pg.fill('#f_amt','9');n0=E('window.__n.ocrN');pg.set_input_files('#over #f_file',files=[{'name':'b.png','mimeType':'image/png','buffer':PNG}]);pg.wait_for_timeout(800)
  ok('typed amount is kept (no reading)',E('window.__n.ocrN')==n0 and pg.input_value('#f_amt')=='9');pg.click('#over .x')
  # 2 trips & events
  E('ACT.evEdit()');pg.fill('#f_evn','India trip');pg.fill('#f_evf',E('plus(-2)'));pg.fill('#f_evt',E('plus(10)'));pg.fill('#f_evb','50000');pg.select_option('#f_evc','INR')
  E('S.tx.push({id:"old1",kind:"out",acc:"a1",amt:1200,cur:"INR",fx:fx(),date:plus(-1),cat:"Travel",tags:[]})');pg.click('#over [data-act="evSave"]');pg.wait_for_timeout(300)
  ev=E('S.evts[0]');ok('event saved and past entries in range added',ev and ev['budget']==50000 and E('S.tx.find(x=>x.id=="old1").tags.includes("ev:"+S.evts[0].id)'))
  E('qForm("out")');pg.fill('#f_amt','800');pg.fill('#f_cat','Food');pg.select_option('#f_acc','a1');pg.click('#over [data-act="saveTx"]');pg.wait_for_timeout(300)
  ok('new expense during the trip tagged',E('S.tx[S.tx.length-1].tags.includes("ev:"+S.evts[0].id)'))
  ok('spent vs budget',abs(E('evSpent(S.evts[0])')-2000)<1,E('evSpent(S.evts[0])'))
  E('tab="spend";render()');t=pg.inner_text('#app');ok('trips & events on Spend','Trips & events' in t and 'India trip' in t)
  pg.click('#app [data-act="evOpen"]');ok('event sheet with categories','By category' in pg.inner_text('#over') and 'Food' in pg.inner_text('#over'));pg.click('#over .x')
  # 3 shopping list
  E('ACT.shopOpen()');pg.fill('#f_shop','Milk 2');pg.keyboard.press('Enter');pg.wait_for_timeout(200);pg.fill('#f_shop','Eggs');pg.click('#over [data-act="shopAdd"]');pg.wait_for_timeout(200)
  ok('items added',E('S.shop.map(x=>x.name).join()')=='Milk 2,Eggs')
  mid=E('S.shop.find(x=>x.name=="Milk 2").id');pg.locator('#over [data-shop="%s"]'%mid).check();pg.wait_for_timeout(200);ok('tick saved',E('S.shop.filter(x=>x.done).length')==1)
  ok('shopping list on Home',E('todoItems().some(x=>/Shopping list: 1 item/.test(x.tx))'))
  pg.click('#over [data-act="shopBought"]');pg.wait_for_timeout(300);ok('bought opens expense with items',pg.locator('#over #f_amt').count()==1)
  pg.click('#over .x');E('ACT.shopOpen()');pg.click('#over [data-act="shopClear"]');ok('ticked cleared',E('S.shop.length')==1)
  pg.click('#over .x');E('S.cfg.famSeg="shop";tab="fam";render()');ok('shopping on Family','to buy' in pg.inner_text('#app'))
  # 4 calculators
  E('ACT.calcOpen("emi")');pg.fill('#c1','500000');pg.fill('#c2','9');pg.fill('#c3','5');pg.wait_for_timeout(100)
  ok('EMI right',  '10,379' in pg.inner_text('#calc_out'),pg.inner_text('#calc_out'))
  E('ACT.calcOpen("fd")');ok('FD maturity',  '1,41,478' in pg.inner_text('#calc_out'),pg.inner_text('#calc_out'))
  E('ACT.calcOpen("fx")');ok('currency',"₹" in pg.inner_text('#calc_out'));pg.click('#over .x')
  # 5 afford
  E('ACT.affordOpen()');pg.fill('#af_amt','100');pg.wait_for_timeout(100);ok('small purchase is fine','comfortably' in pg.inner_text('#af_out') or 'tight' in pg.inner_text('#af_out'),pg.inner_text('#af_out'))
  pg.fill('#af_amt','99999999');pg.wait_for_timeout(100);ok('huge purchase: wait','Better to wait' in pg.inner_text('#af_out'));pg.click('#over .x')
  # 6 yearly dates
  E('ACT.ydOpen()');pg.locator('#over [data-yd="itr"]').check();pg.locator('#over [data-yd="ppf"]').check();pg.click('#over [data-act="ydAdd"]');pg.wait_for_timeout(200)
  d=E('S.dates.filter(x=>x.yd).map(x=>[x.yd,x.date.slice(5),x.rep])');ok('yearly dates added',['itr','07-31','yearly'] in d and ['ppf','03-31','yearly'] in d,d)
  E('ACT.ydOpen()');ok('already added shown as done',pg.locator('#over [data-yd="itr"]').is_disabled());pg.click('#over .x')
  # 7 pay link
  E('dForm()');pg.fill('#f_name','Ooredoo bill');pg.fill('#f_plink','www.ooredoo.qa/pay');pg.fill('#f_amt','150');pg.click('#over [data-act="saveDate"]');pg.wait_for_timeout(300)
  dd=E('S.dates.find(x=>x.name=="Ooredoo bill")');ok('pay link saved with https',dd and dd.get('plink')=='https://www.ooredoo.qa/pay',dd)
  E('dForm(S.dates.find(x=>x.name=="Ooredoo bill"))');ok('pay now button',pg.locator('#over [data-act="payOpen"]').count()==1);pg.click('#over .x')
  # 8 fingerprint for documents
  E('(async()=>{await fput("dc1",new Blob(["x"],{type:"image/png"}));S.docs.push({id:"dq",name:"QID",att:[{id:"dc1",name:"qid.png",type:"image/png"}]});S.cfg.docLock=true;save()})()');pg.wait_for_timeout(200)
  a0=E('window.__n.authN||0');E('viewAtt("dc1")');pg.wait_for_timeout(400);ok('document asks for fingerprint',E('window.__n.authN||0')==a0+1)
  pg.click('#over .x') if pg.locator('#over .x').count() else None
  E('viewAtt("dc1")');pg.wait_for_timeout(300);ok('not asked again within 2 minutes',E('window.__n.authN')==a0+1)
  # 9 text size
  E('settings()');pg.click('#over #set_tz');ok('text size sent to phone',E('window.__n.zoom')==115 and E('localStorage.getItem("ds-tz")')=='115')
  pg.click('#over #set_tz');pg.click('#over #set_tz');ok('cycles back to normal',E('window.__n.zoom')==100);pg.click('#over .x')
  # 10 google sheet csv
  csv=E('txCsv()');ok('sheet data has header and rows',csv.startswith('Date,Type,Amount,Currency,Account') and csv.count('\n')>=5)
  # 11 family activity
  E('me={email:"arun@x.com",emailVerified:true};localStorage.setItem("ds-actSeen",String(Date.now()-60000));S.tx.push({id:"w1",kind:"out",acc:"a2",amt:30,cur:"QAR",fx:fx(),date:today(),cat:"Food",by:"meena@x.com",ct:Date.now(),tags:[]});save()')
  it=E('todoItems().find(x=>x.act=="actOpen")');ok('family activity shown',it and 'meena added 1 entry' in it['tx'],it)
  E('ACT.actOpen()');pg.click('#over [data-act="actSeen"]');ok('cleared after seen',not E('todoItems().some(x=>x.act=="actOpen")'))
  # 12 bulk fixes
  E('S.tx.push({id:"u1",kind:"out",acc:"a2",amt:5,cur:"QAR",fx:fx(),date:today(),payee:"Karak Point",tags:[]},{id:"u2",kind:"out",acc:"a2",amt:6,cur:"QAR",fx:fx(),date:today(),payee:"Karak Point",tags:[]});save()')
  E('ACT.uncatOpen()');i=E('(window.__uc||[]).findIndex(g=>g[0]=="Karak Point")');pg.fill('#uc_%d'%i,'Food');pg.click('#over [data-act="uncatSet"][data-id="%d"]'%i);pg.wait_for_timeout(200)
  ok('uncategorised fixed in one go',E('S.tx.filter(x=>x.payee=="Karak Point").every(x=>x.cat=="Food")'))
  E('ACT.bulkOpen()');pg.fill('#bk_q','karak point');pg.wait_for_timeout(200);ok('bulk filter',pg.locator('#bk_list [data-bk]').count()==2)
  pg.click('#over [data-act="bkAll"]');pg.fill('#bk_cat','Snacks');pg.click('#over [data-act="bkCat"]');pg.wait_for_timeout(200);ok('bulk set category',E('S.tx.filter(x=>x.payee=="Karak Point").every(x=>x.cat=="Snacks")'))
  pg.click('#over [data-act="bkAll"]');pg.once('dialog',lambda d:d.accept());pg.click('#over [data-act="bkDel"]');pg.wait_for_timeout(300);ok('bulk delete to bin',not E('S.tx.some(x=>x.payee=="Karak Point")'));pg.click('#over .x')
  # 13 month summary
  E('localStorage.removeItem("ds-msum")');E('monthSum(true)');ok('last month in short',' in short' in pg.inner_text('#over h2'));pg.click('#over [data-act="closeX"]')
  # 14 donations in tax pack
  E('S.tx.push({id:"dn1",kind:"out",acc:"a1",amt:2500,cur:"INR",fx:fx(),date:today(),cat:"Donation",payee:"Temple trust",tags:[]});save()')
  tp=E('taxPack()');ok('donations in tax pack','Donations' in tp and '80G' in tp and 'Temple trust' in tp)
  ok('version 30 or later',int(E('VER'))>=30)
finally:
  h.done()
