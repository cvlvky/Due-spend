import json,sys,base64
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
try:
  c,pg=h.page(native=True);E=pg.evaluate
  # speed cache gives same balances and follows edits
  b0=E('S.acc.map(a=>bal(a))');ok('cached balance is correct',b0==E('(()=>{balReset();return S.acc.map(a=>bal(a))})()'))
  E('const x=S.tx.find(t=>t.kind=="out"&&t.acc=="a2");x.amt=+x.amt+10;save()');ok('balance follows an edit',abs(E('bal(ac("a2"))')-(b0[1]-10))<0.01,[E('bal(ac("a2"))'),b0])
  # family pair
  E('S.fam=[{id:"m1",name:"Arun",rel:"self"},{id:"m2",name:"Kavya",rel:"spouse"}];save()')
  E('qForm("out")');ok('add form has receipt and paid-by',pg.locator('#over .rcpt #f_file').count()==1 and pg.locator('#over #f_by').count()==1 and pg.locator('#over #f_sh').count()==1)
  png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
  pg.set_input_files('#over #f_file',files=[{'name':'bill.png','mimeType':'image/png','buffer':png}]);pg.wait_for_timeout(500)
  ok('receipt attached',E('pend.length')==1)
  pg.fill('#f_line','Lulu 200 riyal food');pg.wait_for_timeout(400);pg.select_option('#f_by','m1');pg.check('#f_sh');pg.click('#over [data-act="saveTx"]');pg.wait_for_timeout(300)
  t=E('S.tx[S.tx.length-1]');ok('saved with receipt, payer and shared',t['amt']==200 and t.get('pb')=='m1' and t.get('shared') and len(t.get('att') or [])==1,t)
  ok('receipt file kept on the phone',E('(async()=>!!(await fget(S.tx[S.tx.length-1].att[0].id)))()'))
  E('qForm("out")');pg.fill('#f_line','Carrefour 60 riyal groceries');pg.wait_for_timeout(400);pg.select_option('#f_by','m2');pg.check('#f_sh');pg.click('#over [data-act="saveTx"]');pg.wait_for_timeout(300)
  R=E('(()=>{const r=splitMonth(today().slice(0,7));return {o:r.owe&&{f:r.owe.from.name,t:r.owe.to.name,a:r.owe.amt},n:r.T.length}})()')
  exp=E('(cv(200,"QAR",V())-cv(60,"QAR",V()))/2')
  ok('who owes whom',R['n']==2 and R['o']['f']=='Kavya' and R['o']['t']=='Arun' and abs(R['o']['a']-exp)<0.01,R)
  E('S.cfg.famSeg="split";tab="fam";render()');t=pg.inner_text('#app');ok('shared costs on Family','Kavya owes Arun' in t and 'Shared costs' in t,t[:300])
  pg.click('#app [data-act="splitSettle"]');ok('settle marks month',E('!!S.cfg.settled[today().slice(0,7)]') and 'settled' in pg.inner_text('#app'))
  # edit keeps the receipt
  tid=t2=E('S.tx.find(x=>x.payee=="Lulu"&&x.amt==200).id');E('ACT.editTx("%s")'%tid);ok('edit form shows the receipt',pg.locator('#over #attlist .row').count()==1 and pg.input_value('#f_by')=='m1')
  pg.click('#over [data-act="saveTx"]');pg.wait_for_timeout(200);ok('receipt survives editing',len(E('S.tx.find(x=>x.id=="%s").att'%tid))==1)
  # grace period
  E('S.dates.push({id:"g1",name:"LIC Jeevan",type:"premium",date:plus(-20),day:1,amt:5000,cur:"INR",rep:"yearly"});save()')
  it=E('todoItems().find(x=>x.id=="g1")');ok('grace period shown',it and 'grace period ends' in it['sub'] and it['tone']=='late',it)
  E('S.dates.find(d=>d.id=="g1").date=plus(-35)');it=E('todoItems().find(x=>x.id=="g1")');ok('lapse warning after grace',it and 'may lapse' in it['sub'],it)
  E('S.dates=S.dates.filter(d=>d.id!="g1");nativeNotify()')
  E('S.dates.push({id:"g2",name:"Star Health",type:"premium",date:plus(3),day:1,amt:9000,cur:"INR",rep:"yearly"});save();__calls.length=0;nativeNotify()');pg.wait_for_timeout(400)
  ok('grace reminder scheduled',E('__calls.some(c=>c[1]=="schedule"&&c[2].notifications.some(n=>/Star Health: grace/.test(n.title)))'))
  # spending alerts
  E('''for(let w=1;w<=8;w++)S.tx.push({id:"sp"+w,kind:"out",acc:"a2",amt:50,cur:"QAR",fx:fx(),date:plus(-7*w-1),cat:"Eating out",tags:[]});
       S.tx.push({id:"spn",kind:"out",acc:"a2",amt:400,cur:"QAR",fx:fx(),date:plus(-1),cat:"Eating out",tags:[]});save()''')
  s=E('spikes().find(x=>x.cat=="Eating out")');ok('spike found',s and s['p']>=40,s)
  ok('spike in needs attention',E('todoItems().some(x=>/Eating out: \\d+% more/.test(x.tx))'))
  E('ACT.spikeMute("Eating out")');ok('spike can be muted',not E('spikes().some(x=>x.cat=="Eating out")'))
  # tax pack
  pdf=E('taxPack()');ok('tax pack PDF',pdf.startswith('%PDF') and 'Residential status' in pdf and 'Deductions' in pdf)
  E('settings()');ok('tax pack in settings',pg.locator('#over [data-act="taxPack"]').count()==1);pg.click('#over [data-act="taxPack"]');ok('tax years offered',pg.locator('#over [data-act="taxGo"]').count()==2);pg.click('#over .x')
  # Tamil more
  E('S.cfg.lang="ta";langApply();S.cfg.famSeg="split";tab="fam";lastNav="";render()');t=pg.inner_text('#app');ok('family in Tamil','பகிர்ந்த செலவுகள்' in t and 'நபர்கள்' in t,t[:200])
  h1=E('document.querySelector("#app").innerHTML');E('render()');ok('Tamil still stable',E('document.querySelector("#app").innerHTML')==h1)
  E('S.cfg.lang="";langApply();render()')
  ok('version 28 or later',int(E('VER'))>=28)
finally:
  h.done()
