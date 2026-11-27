"""Deposits: maturity worked out for bank FDs and post office schemes, or taken from the certificate (made-up data)."""
import json,sys
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
def form(pg,E,name,amt,sd,dk,md='',rt=''):
  if dk in ('bank','bankp'):
    E('iForm()');pg.fill('#f_name',name);pg.select_option('#f_kind2','fd');pg.fill('#f_inv',str(amt));pg.fill('#f_sd',sd);pg.dispatch_event('#f_sd','change')
    if md:pg.fill('#f_md',md);pg.dispatch_event('#f_md','change')
    if rt:pg.fill('#f_rt',rt);pg.dispatch_event('#f_rt','change')
    pg.select_option('#f_dk',dk)
  else:
    E('poForm(null,{dk:"%s"})'%dk);pg.fill('#f_name',name);pg.fill('#f_inv',str(amt));pg.dispatch_event('#f_inv','input');pg.fill('#f_sd',sd);pg.dispatch_event('#f_sd','change')
    if rt:pg.fill('#f_rt',rt);pg.dispatch_event('#f_rt','change')
  pg.wait_for_timeout(100)
try:
  c,pg=h.page(native=True);E=pg.evaluate
  # Post office Time Deposit, 5 years
  form(pg,E,'PO TD test',200000,'2026-08-08','potd')
  ok('rate and maturity date filled in',pg.input_value('#f_rt')=='7.5' and pg.input_value('#f_md')=='2031-08-08',[pg.input_value('#f_rt'),pg.input_value('#f_md')])
  t=pg.inner_text('#f_depsum');ok('explains what it pays',"Interest of ₹15,427 a year, 5 times (₹77,136 in all)" in t and "On 8 Aug 2031 you get ₹2,00,000 back" in t and "pays it once a year" in t,t)
  pg.click('#over [data-act="saveInv"]');pg.wait_for_timeout(200)
  x=E('S.inv.find(q=>q.name=="PO TD test")');ok('saved with the kind',x['dk']=='potd' and x['rt']==7.5 and x['mdate']=='2031-08-08',x)
  ok('maturity: money back with the last year’s interest',round(E('fdEst(S.inv.find(q=>q.name=="PO TD test"))'))==215427)
  v=E('invVal(S.inv.find(q=>q.name=="PO TD test"))');ok('worth today: money plus interest since August',200000<v<206000,v)
  E('S.cfg.wSeg="sch";tab="invest";render()');r=pg.inner_text('#app');seg=r[r.find("PO TD test"):][:300];ok('Schemes card shows what it pays',"Interest a year" in seg and "₹15,427" in seg and "est. ₹" not in seg,seg)
  # NSC
  form(pg,E,'NSC test',200000,'2026-08-08','nsc');t=pg.inner_text('#f_depsum')
  ok('NSC: 7.7%, interest added each year',pg.input_value('#f_rt')=='7.7' and "Maturity amount: ₹2,89,807 on 8 Aug 2031" in t,t)
  pg.fill('#f_mamt','290000');pg.dispatch_event('#f_mamt','change');t=pg.inner_text('#f_depsum')
  ok('certificate amount used',"Maturity amount: ₹2,90,000" in t and "the app works out ₹2,89,807" in t,t)
  pg.click('#over [data-act="saveInv"]');pg.wait_for_timeout(200);ok('certificate amount saved',E('S.inv.find(q=>q.name=="NSC test").mamt')==290000 and round(E('fdEst(S.inv.find(q=>q.name=="NSC test"))'))==290000)
  # KVP doubles in 115 months
  form(pg,E,'KVP test',100000,'2026-08-08','kvp');ok('KVP: doubles on the date',pg.input_value('#f_md')=='2036-03-08' and "Maturity amount: ₹2,00,000 on 8 Mar 2036" in pg.inner_text('#f_depsum'),[pg.input_value('#f_md'),pg.inner_text('#f_depsum')])
  E('sheet("")')
  # monthly and quarterly income
  form(pg,E,'MIS test',200000,'2026-08-08','mis');ok('MIS: monthly interest',"Interest of ₹1,233 a month, 60 times" in pg.inner_text('#f_depsum'),pg.inner_text('#f_depsum'))
  form(pg,E,'SCSS test',200000,'2026-08-08','scss');ok('SCSS: quarterly interest',pg.input_value('#f_rt')=='8.2' and "Interest of ₹4,100 a quarter, 20 times" in pg.inner_text('#f_depsum'),pg.inner_text('#f_depsum'))
  # a bank FD with its own rate
  form(pg,E,'Bank FD test',200000,'2026-08-08','bank','2031-08-08','7');ok('bank FD compounds every quarter',"Maturity amount: ₹2,82,956 on 8 Aug 2031" in pg.inner_text('#f_depsum'),pg.inner_text('#f_depsum'))
  # a rate typed in the general form is kept when it moves to the post office form
  form(pg,E,'Typed rate',100000,'2026-08-08','bank','2029-08-08','7.25');pg.select_option('#f_dk','po');pg.wait_for_timeout(150)
  ok('post office form opens with what was typed',E('!!$("#f_poform")') and pg.input_value('#f_name')=='Typed rate' and pg.input_value('#f_inv')=='100000' and pg.input_value('#f_rt')=='7.25' and pg.input_value('#f_term')=='3',[pg.input_value('#f_rt'),pg.input_value('#f_term')])
  # opened before the rate table: asks for the rate
  form(pg,E,'Old PO',50000,'2019-05-01','nsc');ok('older deposits ask for the rate',pg.input_value('#f_rt')=='' and "opened before April 2020" in pg.inner_text('#f_depsum'))
  ok('a time deposit only runs 1, 2, 3 or 5 years',E('[...$("#f_term").options].map(o=>o.value).join()')=='1,2,3,5')
  E('sheet("")')
  # an FD saved before this version: same estimate, now worth more than put in
  E('S.inv.push({id:"ofd",name:"Old FD",kind:"fd",cur:"INR",inv:100000,val:0,sd:"2024-01-01",mdate:"2027-01-01",rt:7});save()')
  ok('older FD keeps its estimate',round(E('fdEst(S.inv.find(q=>q.id=="ofd"))'))==round(100000*(1+7/400)**12))
  ok('older FD grows in value',E('invVal(S.inv.find(q=>q.id=="ofd"))')>100000)
  ok('other investments unchanged',E('S.inv.filter(x=>x.kind!="fd").every(x=>invVal(x)==(+x.val||+x.inv||0))'))
  # a post office deposit saved before this version, with no kind or rate: worked out from its name
  E('S.inv.push({id:"pod",name:"Post office savings",kind:"fd",cur:"INR",inv:200000,val:0,sd:"2026-08-08",mdate:"2031-08-08",rt:0});save()')
  ok('named post office deposit worked out without opening it',round(E('fdEst(S.inv.find(q=>q.id=="pod"))'))==215427 and 200000<E('invVal(S.inv.find(q=>q.id=="pod"))')<206000)
  E('S.cfg.wSeg="sch";tab="invest";render()');r=pg.inner_text('#app');seg=r[r.find("Post office savings"):][:300];ok('its card shows the yearly interest',"₹15,427" in seg and "Interest a year" in seg,seg)
  E('iForm(S.inv.find(q=>q.id=="pod"))');pg.wait_for_timeout(100);t=pg.inner_text('#f_depsum')
  ok('form picks the kind from the name and fills the official rate',pg.input_value('#f_dk')=='potd' and pg.input_value('#f_rt')=='7.5' and pg.input_value('#f_md')=='2031-08-08',[pg.input_value('#f_dk'),pg.input_value('#f_rt'),pg.input_value('#f_md')])
  ok('says the kind came from the name',"₹15,427 a year" in t and "picked from the name" in t,t)
  pg.click('#over [data-act="saveInv"]');pg.wait_for_timeout(200);x=E('S.inv.find(q=>q.id=="pod")');ok('saving keeps the kind and rate',x['dk']=='potd' and x['rt']==7.5,x)
  # the general form: a post office name suggests the post office form
  E('iForm()');pg.fill('#f_name','Family NSC');ok('typing NSC suggests the post office form',pg.is_visible('#f_pohint') and pg.input_value('#f_dk')=='')
  pg.fill('#f_name','Family savings');ok('a name that says nothing leaves it to you',not pg.is_visible('#f_pohint'))
  E('iForm()');pg.fill('#f_name','Post office RD');ok('a recurring deposit is not taken for a time deposit',not pg.is_visible('#f_pohint'))
  E('iForm()');pg.select_option('#f_dk','bank');pg.fill('#f_name','Post office TD');ok('a kind chosen by hand stays',pg.input_value('#f_dk')=='bank' and not pg.is_visible('#f_pohint'))
  E('sheet("")')
finally:
  h.done()
