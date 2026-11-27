import json,sys,base64,io
sys.path.insert(0,'test')
from h import H
import pypdf
h=H();ok=h.ok
try:
  c,pg=h.page();E=pg.evaluate
  # ---- family members, owner and nominee ----
  E('tab="fam";render()');t=pg.inner_text('#app');ok('family screen','Family' in t and ('Moi register' in t or 'Gifts & moi' in t) and 'Hand loans' in t and 'Emergency pack' in t)
  for nm,rel in (("Arun","self"),("Meena","spouse"),("Anika","daughter")):
    pg.click('[data-act="famAdd"]');pg.fill('#fm_name',nm);pg.select_option('#fm_rel',rel);pg.click('#over [data-act="famSave"]');pg.wait_for_timeout(100)
  ids=E('Object.fromEntries(S.fam.map(m=>[m.name,m.id]))');ok('three members added',len(ids)==3)
  E('editAcc("a1")') if False else None
  E('accForm(S.acc.find(a=>a.id=="a1"))');pg.wait_for_selector('#over #f_own');ok('owner and nominee on accounts',pg.locator('#over #f_nomi').count()==1)
  pg.select_option('#f_own',ids['Arun']);pg.fill('#f_nomi','Meena');pg.click('#over [data-act="saveAcc"]');pg.wait_for_timeout(150)
  ok('account owner and nominee saved',E('ac("a1").own')==ids['Arun'] and E('ac("a1").nomi')=='Meena')
  E('dForm(S.dates.find(d=>d.id=="d1"))');pg.wait_for_selector('#over #f_own');ok('policies get owner only (nominee field already there)',pg.locator('#over #f_nomi').count()==0)
  pg.select_option('#f_own',ids['Arun']);pg.click('#over [data-act="saveDate"]');pg.wait_for_timeout(150);ok('policy owner saved',E('S.dates.find(d=>d.id=="d1").own')==ids['Arun'])
  E('saForm()');pg.select_option('#f_ty','ssy');pg.fill('#f_name','Selvamagal');pg.fill('#f_open',E('addM(today(),-3)'));pg.fill('#f_plan','1000');pg.select_option('#f_own',ids['Anika']);pg.click('#over [data-act="saSave"]');pg.wait_for_timeout(200)
  ok('new scheme gets its owner',E('S.sacc[0].own')==ids['Anika'] and E('S.sacc[0].name')=='Selvamagal')
  pg.click('#over .x') if pg.locator('#over .x').count() else None
  w=E('ownWorth("%s")'%ids['Arun']);ok('per-person net worth',abs(w-E('cv(bal(ac("a1")),"INR",V())'))<1,w)
  E('tab="fam";render()');t=pg.inner_text('#app');ok('people list with worth and counts','Arun' in t and '1 account' in t and '1 policy or due' in t and 'Family / joint' in t,t[:600])
  pg.click('[data-act="famView"][data-id="%s"]'%ids['Arun']);t=pg.inner_text('#over');ok('member sheet','SBI Savings' in t and 'Nominee Meena' in t and 'LIC Jeevan Anand' in t,t[:500]);pg.click('#over .x')
  E('tab="invest";render()');ok('wealth by person','By person' in pg.inner_text('#app'))
  # ---- moi register ----
  E('S.cfg.famSeg="moi";tab="fam";render()');b1=E('bal(ac("a1"))')
  pg.click('[data-act="moiAdd"]');pg.fill('#m_who','Ravi');pg.fill('#m_place','Madurai');pg.select_option('#m_occ','Wedding');pg.fill('#m_date',E('addM(today(),-2)'));pg.fill('#m_cash','5001');pg.select_option('#m_acc','a1');pg.click('#over [data-act="moiSave"]');pg.wait_for_timeout(150)
  ok('gift given recorded as spending',abs(E('bal(ac("a1"))')-(b1-5001))<0.01 and E('S.tx.some(t=>t.cat=="Gifts"&&t.payee=="Ravi"&&t.link&&t.link.t=="moi")'))
  E('moiForm(null,{person:"Ravi"})');pg.select_option('#m_dir','got');pg.select_option('#m_occ','Housewarming');pg.fill('#m_date',E('addM(today(),-30)'));pg.fill('#m_cash','2001');pg.fill('#m_gold','2');pg.click('#over [data-act="moiSave"]');pg.wait_for_timeout(150)
  E('moiForm(null,{person:"Selvi family"})');pg.fill('#m_date',E('plus(4)'));pg.select_option('#m_occ','Engagement');pg.fill('#m_cash','3000');pg.click('#over [data-act="moiSave"]');pg.wait_for_timeout(150)
  t=pg.inner_text('#app');ok('moi totals, people and coming up','Coming up' in t and 'Selvi family' in t and 'Ravi' in t and '₹5,001' in t,t[:700])
  pg.fill('#moi_q','madu');pg.wait_for_timeout(100);ok('find a person',pg.locator('#moiL .row').count()==1)
  pg.click('#moiL .row');t=pg.inner_text('#over');ok('person sheet with what they gave','When they invite you' in t and '₹2,001' in t and '2 g gold' in t,t[:500]);pg.click('#over .x')
  E('tab="home";render()');t=pg.inner_text('#app');ok('upcoming function in alerts and family card','Selvi family: Engagement' in t and 'next: Selvi family engagement' in t,t[:900])
  mid=E('S.moi.find(m=>m.person=="Ravi"&&m.dir=="gave").id');E('moiForm(S.moi.find(m=>m.id=="%s"))'%mid);pg.click('#over [data-act="moiDel"]');pg.click('#over [data-act="moiDel"]');pg.wait_for_timeout(150)
  ok('deleting the gift removes its spending entry',abs(E('bal(ac("a1"))')-b1)<0.01)
  # ---- hand loans ----
  E('S.cfg.famSeg="lend";tab="fam";render()');nw0=E('nwv("INR")');b1=E('bal(ac("a1"))')
  pg.click('[data-act="lendAdd"][data-id="lent"]');pg.fill('#l_who','Kumar');pg.fill('#l_ph','+91 98765 43210');pg.fill('#l_amt','5000');pg.fill('#l_due',E('plus(5)'));pg.select_option('#l_acc','a1');pg.click('#over [data-act="lendSave"]');pg.wait_for_timeout(150)
  ok('lent money leaves the account, net worth unchanged',abs(E('bal(ac("a1"))')-(b1-5000))<0.01 and abs(E('nwv("INR")')-nw0)<0.01,[E('nwv("INR")'),nw0])
  t=pg.inner_text('#app');ok('hand loans summary','People owe you' in t and 'Kumar' in t and 'In 5 days' in t,t[:500])
  ok('txn shows a plain minus',E('txRow(S.tx.find(t=>t.cat=="Lent to Kumar"))').count('+−')==0)
  ok('due date in upcoming and radar',E('upcoming(today(),plus(10),true).some(u=>u.src=="lend"&&u.a==5000)') and any(e['n']=='Back from Kumar' for r in E('radar(30)') for e in r['L']))
  pg.click('[data-act="lendView"]');pg.fill('#lp_amt','2000');pg.select_option('#lp_acc','a1');pg.click('#over [data-act="lendPay"]');pg.wait_for_timeout(150)
  x=E('S.lend[0]');ok('repayment',abs(E('bal(ac("a1"))')-(b1-3000))<0.01 and E('lOut(S.lend[0])')==3000 and abs(E('nwv("INR")')-nw0)<0.01)
  E('window.__opened=[];window.open=u=>{window.__opened.push(u)};0');pg.click('#over [data-act="lendWa"]');u=E('window.__opened[0]')
  ok('WhatsApp reminder with number and polite text',u.startswith('https://wa.me/919876543210?text=') and 'gentle%20reminder' in u and '3%2C000' in u,u)
  pg.click('#over .x');pg.click('[data-act="lendAdd"][data-id="borrowed"]');pg.fill('#l_who','Anand');pg.fill('#l_amt','1000');pg.select_option('#l_cur','QAR');pg.click('#over [data-act="lendSave"]');pg.wait_for_timeout(150)
  ok('borrowed without an account lowers net worth',abs(E('nwv("INR")')-(nw0-1000*E('fx()')))<0.01)
  lid=E('S.lend[0].id');E('lendForm(S.lend[0])');pg.click('#over [data-act="lendDel"]');pg.click('#over [data-act="lendDel"]');pg.wait_for_timeout(150)
  ok('deleting the loan puts the money back',abs(E('bal(ac("a1"))')-b1)<0.01 and not E('S.tx.some(t=>t.link&&t.link.t=="lend")'))
  E('ACT.fab()');acts=E('$$("#over .fgrid [data-act]").map(b=>b.getAttribute("data-act"))');ok('add menu: moi, hand loan, scheme, family',all(a in acts for a in ('moiAdd','lendAdd','saAdd','famGo')),acts);pg.click('#over .x')
  E('tab="home";render()');pg.fill('input[data-gs]','anand');pg.press('input[data-gs]','Enter');pg.wait_for_timeout(200);ok('search finds hand loans',pg.locator('#over [data-act="lendView"]').count()>=1);pg.click('#over .x')
  # ---- emergency pack ----
  E('S.cfg.famSeg="ep";tab="fam";render()');pg.fill('#ep_note','Original papers are in the blue file at home.');pg.fill('#ec_n0','Brother Karthik');pg.fill('#ec_p0','+91 90000 11111');pg.select_option('#ep_bal','1')
  pg.fill('#ep_pw','abc');pg.click('[data-act="epMake"]');ok('short password refused',not E('S.cfg.ep&&S.cfg.ep.at'))
  pg.fill('#ep_pw','Family@2026')
  with pg.expect_download() as dl:pg.click('[data-act="epMake"]')
  d=dl.value;path=d.path();raw=open(path,'rb').read();ok('PDF downloaded and dated',raw.startswith(b'%PDF-1.4') and E('S.cfg.ep.at')==E('today()') and d.suggested_filename.startswith('family-emergency-pack-'))
  r=pypdf.PdfReader(io.BytesIO(raw));ok('PDF is encrypted',r.is_encrypted)
  ok('wrong password is rejected',r.decrypt('wrong')==0)
  r=pypdf.PdfReader(io.BytesIO(raw));res=r.decrypt('Family@2026');txt="\n".join(p.extract_text() for p in r.pages)
  ok('right password opens it',res>0 and 'Family emergency pack' in txt,res)
  ok('pack contents',all(k in txt for k in ['Read this first','blue file','Brother Karthik','SBI Savings','nominee Meena','LIC Jeevan Anand','P-1122','nominee Spouse','Selvamagal','We owe Anand QAR 1,000','Gratuity' if False else 'Loans','Anand']),txt[:1500])
  ok('balances included when asked','balance INR' in txt)
  ok('pack details synced',E('prefsOut().ep.contacts[0].n')=='Brother Karthik')
  # md5 sanity against known values
  ok('md5 matches known digests',E('hex8(md5(lat1("")))')=='d41d8cd98f00b204e9800998ecf8427e' and E('hex8(md5(lat1("The quick brown fox jumps over the lazy dog")))')=='9e107d9d372bb6826bd81d3542a419d6' and E('hex8(md5(lat1("a".repeat(1000))))')=='cabe45dcc9ae5b66ba86600cca6b8ba8')
  c.close()
finally:
  h.done()
