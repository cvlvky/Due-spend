"""Version 34: one Payment review page, password import from CSV, day calendar, entry filters, insights, password list (made-up data only)."""
import json,sys,time,datetime
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
GOOGLE='name,url,username,password,note\nGmail,https://accounts.google.com,ravi.test@example.com,Xy9#kLm2Qw!z,\nQNB Mobile,https://www.qnb.com,ravitest,Qnb#2024secure,"PIN hint: blue, then 4"\nNoon,https://www.noon.com,ravi.test@example.com,12345678,\n'
BITWARDEN='folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\nSocial,1,login,Twitter,,,0,twitter.com,me@example.com,password123,\nFinance,,login,My Bank,"Bank, branch 2",,0,https://mybank.example,me2,S3cure!Pass#99,JBSWY3DPEHPK3PXP\n,,note,Secure Note,just a note,,,,,,\n'
LASTPASS='url,username,password,totp,extra,name,grouping,fav\nhttps://www.talabat.com,ravi@example.com,Talabat!2026x,,,Talabat,Shopping,0\n'
FIREFOX='"url","username","password","httpRealm","formActionOrigin","guid","timeCreated","timeLastUsed","timePasswordChanged"\n"https://portal.metrash.example","28400000000","Metr@sh-2026-ok",,"https://portal.metrash.example","{a}","1","1","1"\n'
KEEPASS='"Account","Login Name","Password","Web Site","Comments"\n"Home Wi-Fi","admin","WifiPass!77","",""\n'
try:
  c,pg=h.page(native=True);E=pg.evaluate
  E('S.cfg.ntfAuto=true;save()')
  # ---------- Payment review: one page with three tabs, easy to find ----------
  E('S.cfg.payLog=[{id:"a",t:Date.now(),act:"add",via:"phone",amt:45,cur:"QAR",kind:"out",payee:"Saffron Cafe",from:"QNB",date:today(),tx:""},{id:"b",t:Date.now()-36e5,act:"skip",via:"app",amt:33,cur:"QAR",kind:"out",payee:"SNACK BAR",from:"QNB",date:today(),tx:"",p:{kind:"out",amt:33,cur:"QAR",payee:"SNACK BAR",date:today()},body:"x"}];S.cfg.smsq=[];save();tab="home";render()')
  pg.wait_for_timeout(200);ok('Home shows the Payment review card',pg.locator('#app .prcard').count()==1 and "1 approved · 1 ignored" in pg.inner_text('#app .prcard'))
  pg.click('#app .prcard');pg.wait_for_selector('#over .prtabs');t=pg.inner_text('#over')
  ok('with nothing waiting it opens on Approved',"Payment review" in pg.inner_text('#over h2') and pg.locator('#over .prtabs button.on').inner_text().startswith("Approved") and "Saffron Cafe" in t and "SNACK BAR" not in t,t[:300])
  pg.click('#over [data-act="prTab"][data-id="no"]');pg.wait_for_timeout(150);t=pg.inner_text('#over')
  ok('Ignored tab',"SNACK BAR" in t and "Saffron Cafe" not in t and pg.locator('#over [data-act="revAdd"]').count()==1)
  pg.click('#over [data-act="prTab"][data-id="wait"]');pg.wait_for_timeout(150);t=pg.inner_text('#over')
  ok('Waiting tab',"No payments waiting" in t and pg.locator('#over .prtabs').count()==1,t[:300])
  E('S.cfg.smsq=[{id:"w1",from:"QNB",body:"Your card ending 4821 was used for QAR 12.00 at TEA TIME",p:{kind:"out",amt:12,cur:"QAR",payee:"TEA TIME",date:today(),acc:"a2"},src:"n"}];save()')
  E('payReview()');pg.wait_for_timeout(150);ok('with payments waiting it opens on Waiting',pg.locator('#over .prtabs button.on').inner_text().startswith("Waiting") and "TEA TIME" in pg.inner_text('#over'))
  pg.click('#over .x');E('settings()');pg.wait_for_timeout(200)
  ok('Settings has Payment review at the top',pg.locator('#over .setpay [data-act="payReview"]').count()==1 and pg.locator('#over .setpay [data-act="trackHub"]').count()==1)
  pg.click('#over .x');E('tab="spend";render()');pg.wait_for_timeout(200);ok('Spending has it too',pg.locator('#app .prcard').count()==1)
  E('ACT.homeEdit()');pg.wait_for_timeout(150);ok('Home sections include Payment review and Insights',pg.locator('#over [data-home="pay"]').count()==1 and pg.locator('#over [data-home="ins"]').count()==1)
  pg.uncheck('#over [data-home="pay"]');pg.click('#over [data-act="homeSave"]');E('tab="home";render()');pg.wait_for_timeout(150);ok('and can be hidden',pg.locator('#app .prcard').count()==0)
  E('S.cfg.homeOff=[];save();render()')
  # ---------- Spending: calendar and filters ----------
  E('tab="spend";render()');pg.wait_for_timeout(200)
  ok('the heatmap is now a calendar with amounts',pg.locator('#app .cal .cday').count()>=28 and pg.locator('#app .cday .co').count()>=1 and "Calendar" in pg.inner_text('#app'))
  day=E('[...document.querySelectorAll("#app .cday")].find(b=>b.querySelector(".co")).dataset.id')
  pg.click('#app .cday[data-id="%s"]'%day);pg.wait_for_timeout(200)
  ok('tapping a day shows its entries',pg.locator('#app .cdet .row').count()>=1 and pg.locator('#app .cday.sel').count()==1)
  pg.click('#app .cdet [data-act="calAdd"]');pg.wait_for_selector('#over #f_date');ok('Add for this day uses that date',pg.input_value('#over #f_date')==day);pg.click('#over .x')
  ok('filter chips above the entries',pg.locator('#app .fchips .fchip').count()>=5)
  n_all=pg.locator('#app .dh').count();pg.click('#app .fchip[data-act="entK"][data-id="in"]');pg.wait_for_timeout(150)
  kinds=E('[...document.querySelectorAll("#app [data-act=editTx]")].filter(r=>!r.closest(".cdet")).map(r=>S.tx.find(x=>x.id==r.dataset.id)).filter(Boolean).map(x=>x.kind)')
  ok('Income shows only income',kinds and set(kinds)=={"in"},kinds)
  cat=E('document.querySelector("#app .fchip[data-act=entC]").dataset.id');pg.click('#app .fchip[data-act="entC"]');pg.wait_for_timeout(150)
  cats=E('[...document.querySelectorAll("#app [data-act=editTx]")].filter(r=>!r.closest(".cdet")).map(r=>S.tx.find(x=>x.id==r.dataset.id)).filter(Boolean).map(x=>x.cat)')
  ok('a category chip shows only that category',cats and set(cats)=={cat},[cat,cats[:5]])
  ok('the count line can reset',"Show all" in pg.inner_text('#app'));pg.click('#app .lnk[data-act="entK"]');pg.wait_for_timeout(150);ok('Show all brings everything back',pg.locator('#app .fchip.on').inner_text()=="All")
  # ---------- Insights ----------
  E('tab="home";render()');pg.wait_for_timeout(150)
  ok('Insights on Home',pg.locator('#app .ins .insc').count()>=2,pg.inner_text('#app .ins') if pg.locator('#app .ins').count() else "none")
  # ---------- Passwords: import from CSV ----------
  E('vCreate("Test-master-1")');pg.wait_for_timeout(300);E('vList()');pg.wait_for_timeout(200)
  ok('the vault offers Import from CSV',pg.locator('#over [data-act="vImp"]').count()==1)
  def imp(txt,name):
    pg.click('#over [data-act="vImp"]') if pg.locator('#over [data-act="vImp"]').count() else E('ACT.vImp()')
    pg.wait_for_selector('#over #v_csv');pg.set_input_files('#over #v_csv',files=[{"name":name,"mimeType":"text/csv","buffer":txt.encode()}]);pg.wait_for_function('(document.querySelector("#v_impout")||{}).innerHTML.length>0')
    return pg.inner_text('#over #v_impout')
  t=imp(GOOGLE,"Google Passwords.csv");ok('Google Password Manager file: preview',"3" in t and "New" in t and "Gmail" in t,t)
  pg.click('#over [data-act="vImpGo"]');pg.wait_for_timeout(400)
  I=E('VLT.items');ok('imported with names, users and websites',len(I)==3 and any(x['title']=="QNB Mobile" and x['user']=="ravitest" and x['pass']=="Qnb#2024secure" and x['cat']=="bank" and "blue, then 4" in x['note'] for x in I),I)
  ok('it is saved locked',E('vRaw()!=null&&!String(localStorage.getItem("ds-vault")).includes("Qnb#2024secure")'))
  ok('the toast says to delete the file',"delete the CSV file" in pg.inner_text('#toast'))
  E('vList()');pg.wait_for_timeout(150);t=imp(GOOGLE,"again.csv");ok('the same file again adds nothing',"Nothing new" in t or "0\nNew" in t,t)
  E('vList()');t=imp(BITWARDEN,"bitwarden_export.csv");ok('Bitwarden file',"2" in t,t);pg.click('#over [data-act="vImpGo"]');pg.wait_for_timeout(300)
  I=E('VLT.items');b=[x for x in I if x['title']=="My Bank"]
  ok('Bitwarden: folder, notes with commas and the 2-step key kept',b and b[0]['cat']=="bank" and "Bank, branch 2" in b[0]['note'] and "JBSWY3DPEHPK3PXP" in b[0]['note'],b)
  ok('a secure note without a login is left out',not any(x['title']=="Secure Note" for x in I))
  E('vList()');imp(LASTPASS,"lastpass.csv");pg.click('#over [data-act="vImpGo"]');pg.wait_for_timeout(300)
  E('vList()');imp(FIREFOX,"logins.csv");pg.click('#over [data-act="vImpGo"]');pg.wait_for_timeout(300)
  E('vList()');imp(KEEPASS,"keepass.csv");pg.click('#over [data-act="vImpGo"]');pg.wait_for_timeout(300)
  I=E('VLT.items');names={x['title']:x for x in I}
  ok('LastPass, Firefox and KeePass files',"Talabat" in names and names["Talabat"]['cat']=="shop" and "portal.metrash.example" in names and names["portal.metrash.example"]['cat']=="gov" and "Home Wi-Fi" in names and names["Home Wi-Fi"]['cat']=="wifi",list(names))
  CH='name,url,username,password\nQNB Mobile,https://www.qnb.com,ravitest,NewQnb#2026!\n'
  E('vList()');t=imp(CH,"changed.csv");ok('a changed password is shown, not added twice',"Different password" in t and pg.locator('#over #v_rep').count()==1,t)
  pg.check('#over #v_rep');pg.click('#over [data-act="vImpGo"]');pg.wait_for_timeout(300)
  q=[x for x in E('VLT.items') if x['title']=="QNB Mobile"];ok('and updated only when you ask',len(q)==1 and q[0]['pass']=="NewQnb#2026!",q)
  E('vList()');t=imp("a,b,c\n1,2,3\n","bad.csv");ok('a file without passwords is explained',"no password column" in t,t)
  # ---------- Passwords: the list ----------
  E('vList()');pg.wait_for_timeout(200)
  ok('A to Z with letters and coloured initials',pg.locator('#over .vhdr').count()>=3 and pg.locator('#over .vav').count()==len(E('VLT.items')))
  ok('weak ones are marked',pg.locator('#over .vwk').count()>=1)
  ok('the checkup shows weak, used twice and old',pg.locator('#over .vcks .vck').count()==3 and "Weak" in pg.inner_text('#over .vcks'))
  pg.click('#over .vcks .vck');pg.wait_for_timeout(150);ok('a checkup tile opens the list',"Password check" in pg.inner_text('#over'))
  E('vLock()')
  for tb in ['home','dates','acc','spend','rep']:
    E('tab=%s;render()'%json.dumps(tb));ok('tab '+tb+' renders','couldn’t be shown' not in pg.inner_text('#app'))
  E('S.cfg.lang="ta";tab="spend";render()');pg.wait_for_timeout(150);ok('Tamil: calendar still shows',pg.locator('#app .cal .cday').count()>=28);E('S.cfg.lang="";save()')
finally:
  h.done()
