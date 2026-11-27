import json,sys
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
try:
  c,pg=h.page(native=True);E=pg.evaluate
  # ---- gifts & moi ----
  E('S.moi.push({id:"m1",dir:"got",person:"Ravi family",place:"Madurai",occ:"Wedding",date:"2024-05-10",cash:5000,cur:"INR",gold:0,gift:""},{id:"m2",dir:"gave",person:"Ravi family",occ:"Housewarming",date:"2025-02-01",cash:1001,cur:"INR",gift:"Silver lamp"});save()')
  ok('give-back amounts end in 1',E('[moiRound(5000),moiRound(1001),moiRound(2500),moiRound(12000)]')==[5001,1001,2501,12001])
  E('S.cfg.famSeg="moi";tab="fam";render()');t=pg.inner_text('#app');ok('segment renamed to Gifts & moi','Gifts & moi' in t)
  ok('family segments scroll instead of wrapping',pg.locator('#app .seg.segx').count()==1)
  E('moiPerson("ravi family")');t=pg.inner_text('#over')
  ok('what to give back',"To give back" in t and "5,001" in t and "5,101" in t and t.count("When they invite you")==1,t[:400])
  ok('items given before, to avoid repeating','Silver lamp' in t and 'Pick something different' in t)
  pg.fill('#f_gi','Likes cricket books');pg.click('#over [data-act="giAdd"]');pg.wait_for_timeout(200);ok('gift idea saved',E('S.gideas[0].idea')=='Likes cricket books' and E('S.gideas[0].person')=='ravi family')
  pg.click('#over [data-act="pdAdd"]');pg.fill('#pd_d',E('(()=>{const d=D(plus(5));return (d.getFullYear()-30)+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")})()'))
  pg.select_option('#pd_r','7');pg.click('#over [data-act="pdSave"]');pg.wait_for_timeout(200)
  d=E('S.pdays[0]');ok('birthday saved with year',d and d['person']=='Ravi family' and d['kind']=='birthday' and d['year']>1900,d)
  it=E('todoItems().find(x=>x.act=="moiPerson")');ok('birthday reminder in needs attention',it and 'birthday' in it['tx'] and 'Silver lamp' in it['sub'],it)
  E('render()');ok('coming birthdays on the gifts page','Birthdays & anniversaries' in pg.inner_text('#app'))
  E('moiPerson("ravi family")');ok('age shown','years old' in pg.inner_text('#over'));pg.click('#over .x')
  E('S.pdays.push({id:"pd2",person:"Selvi",kind:"anniv",md:plus(20).slice(5),year:0,remind:7});save();__calls.length=0;nativeNotify()');pg.wait_for_timeout(400)
  ok('reminder scheduled a week before',E('__calls.some(c=>c[1]=="schedule"&&c[2].notifications.some(n=>/Selvi: wedding anniversary in 7 days/.test(n.title)))'))
  E('moiForm()');ok('gift form has value, photo',pg.locator('#over #m_ival').count()==1 and pg.locator('#over .rcpt #f_file').count()==1)
  pg.select_option('#m_dir','gave');pg.fill('#m_who','Selvi');pg.fill('#m_gift','Saree');pg.fill('#m_ival','2500');pg.click('#over [data-act="moiSave"]');pg.wait_for_timeout(300)
  g=E('S.moi.find(m=>m.person=="Selvi")');ok('item value saved and counted',g and g.get('ival')==2500 and E('moiPeople().find(p=>p.name=="Selvi").gave')==2500,g)
  # ---- cleaner settings ----
  E('settings()');ok('settings grouped into sections',E('[...document.querySelectorAll("#set_more .sgrp h3")].map(h=>h.textContent)')[:5]==['Connections','Look and language','Privacy and security','Tools','Help'])
  ok('rows keep their ids and actions',pg.locator('#set_more #set_gm.srow').count()==1 and pg.locator('#set_more .srow[data-act="taxPack"]').count()==1 and pg.locator('#set_more #set_vault').count()==1)
  ok('value shown on the right','off' in pg.inner_text('#over #set_gm'))
  pg.click('#over #set_tz');pg.wait_for_timeout(200);ok('rows still work and regroup',E('localStorage.getItem("ds-tz")')=='115' and pg.locator('#set_more .sgrp').count()>=5);E('localStorage.removeItem("ds-tz");tzApply()')
  pg.click('#over .x')
  # ---- tool tiles ----
  E('tab="spend";render()');ok('spend tools as tiles',pg.locator('#app .tiles .tile').count()>=6 and pg.locator('#app .tile[data-act="insightsOpen"]').count()==1)
  E('S.cfg.wSeg="plans";tab="invest";render()');ok('plan tools as tiles',pg.locator('#app .tiles .tile[data-act="moneyCal"]').count()==1 and pg.locator('#app .tiles .tile[data-act="ydOpen"]').count()==1)
  # ---- password vault ----
  E('vaultOpen()');ok('vault setup',pg.locator('#over #v_p1').count()==1 and E('window.__n.secure')==True)
  pg.fill('#v_p1','short');pg.fill('#v_p2','short');pg.click('#over [data-act="vMake"]');ok('too short refused',E('vRaw()') is None)
  pg.fill('#v_p1','Kurinji#Valley2026');pg.fill('#v_p2','Kurinji#Valley2026');pg.click('#over [data-act="vMake"]');pg.wait_for_timeout(1500)
  r=E('vRaw()');ok('vault locked with a key from the password',r and r['iter']>=300000 and len(r['salt'])>10 and 'Kurinji' not in json.dumps(r))
  pg.click('#over [data-act="vEdit"]');pg.fill('#v_t','QNB mobile');pg.select_option('#v_c','bank');pg.fill('#v_u','arun.k');pg.fill('#v_p','password1');pg.wait_for_timeout(100)
  ok('weak password warned','Weak' in pg.inner_text('#v_str') or 'Very weak' in pg.inner_text('#v_str'),pg.inner_text('#v_str'))
  pg.click('#over [data-act="vGen"]');gp=pg.input_value('#v_p');ok('strong password made',len(gp)==16 and E('vScore(%s)'%json.dumps(gp))>=3,gp)
  pg.click('#over [data-act="vSave"]');pg.wait_for_timeout(1200)
  r2=E('vRaw()');ok('saved encrypted, nothing readable',gp not in json.dumps(r2) and 'QNB' not in json.dumps(r2))
  pg.click('#over [data-act="vCopyP"]');pg.wait_for_timeout(200);ok('copied as sensitive',E('window.__n.clip')==gp and E('window.__n.clipSens')==True)
  pg.click('#over [data-act="vBack"]');pg.click('#over [data-act="vEdit"]');pg.fill('#v_t','Office email');pg.fill('#v_p',gp);pg.wait_for_timeout(100)
  ok('reuse warned','already used' in pg.inner_text('#v_str'));pg.click('#over [data-act="vSave"]');pg.wait_for_timeout(1200)
  ok('health check finds reuse',E('vHealth().reused.length')==2)
  pg.click('#over [data-act="vBack"]');pg.fill('#v_q','qnb');pg.wait_for_timeout(100);ok('search',pg.locator('#v_list [data-act="vItem"]').count()==1)
  E('vLock()');ok('locked clears memory and screen',E('VLT.key')is None and E('VLT.items')is None and E('window.__n.secure')==False)
  E('vaultOpen()');pg.fill('#v_pw','wrong-password');pg.click('#over [data-act="vOpen"]');pg.wait_for_timeout(1200);ok('wrong password refused',"didn’t open" in pg.inner_text('#over') and E('VLT.key') is None)
  pg.fill('#v_pw','Kurinji#Valley2026');pg.click('#over [data-act="vOpen"]');pg.wait_for_timeout(1200);ok('right password opens',E('VLT.items.length')==2)
  # fingerprint
  E('vSetSheet()');pg.fill('#v_bp','Kurinji#Valley2026');pg.click('#over [data-act="vBioT"]');pg.wait_for_timeout(1500);ok('fingerprint on',E('vBio()') and E('window.__n.vbio')=='Kurinji#Valley2026')
  E('vLock();vaultOpen()');pg.wait_for_timeout(2000);ok('fingerprint unlocks',E('VLT.items&&VLT.items.length')==2)
  # backups carry the locked vault, sync never does
  ok('backup has the locked vault',E('JSON.parse(bkSync()).__vault.ct')==r2['ct'] or E('JSON.parse(bkSync()).__vault.iter')>=300000)
  ok('not in synced data',E('!("vault" in S)') and 'Kurinji' not in E('JSON.stringify(S)'))
  E('localStorage.removeItem("ds-vault")');E('restoreFrom(bkSync.call?JSON.stringify({...JSON.parse(localStorage.getItem("due-and-spend.v1")||"{}"),__vault:%s}):"")'%json.dumps(r2))
  pg.wait_for_timeout(500);ok('restore puts the vault back',E('!!vRaw()'))
  # guide
  E('guideSheet("passwords")');ok('guide lists passwords and gifts',pg.locator('#guide_list [data-id="vault"]').count()==1);E('guideSheet("gifts")');ok('gifts in guide',pg.locator('#guide_list [data-id="gifts"]').count()==1)
  ok('version 32',int(E('VER'))>=32)
finally:
  h.done()
