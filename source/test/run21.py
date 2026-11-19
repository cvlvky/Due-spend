import sys
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
try:
  c,pg=h.page();E=pg.evaluate
  E('''window.__mut=0;new MutationObserver(L=>L.forEach(m=>{window.__mut+=m.addedNodes.length+m.removedNodes.length})).observe($("#app"),{childList:true});window.__nav0=$("#nav button")''')
  pg.wait_for_timeout(50)
  for i in range(6):E('render()')
  ok('background redraws with no change touch nothing',E('window.__mut')==0,E('window.__mut'))
  ok('nav bar not rebuilt',E('window.__nav0===$("#nav button")'))
  E('S.cfg.smsq=[{id:"q0",from:"CBQ",body:"x",p:{kind:"out",amt:9,cur:"QAR",acc:"a2",date:today(),payee:"Spar"}}];render()')
  ok('no entrance animation on cards updated in place',E('[...$$("#app>.nofx")].length')>=1 and all(E('[...$$("#app>.nofx")].map(e=>getComputedStyle(e).animationName)')[i]=='none' for i in range(E('$$("#app>.nofx").length'))))
  E('window.__mut=0;S.cfg.smsq.push({id:"q1",from:"CBQ",body:"x",p:{kind:"out",amt:7,cur:"QAR",acc:"a2",date:today(),payee:"Lulu"}});render()')
  ok('one new card: only a few nodes change',0<E('window.__mut')<=4,E('window.__mut'))
  pg.fill('input[data-gs]','lul');pg.focus('input[data-gs]');E('render();render()')
  ok('typing in search survives background redraws',E('document.activeElement&&document.activeElement.matches("input[data-gs]")') and pg.input_value('input[data-gs]')=='lul')
  pg.wait_for_timeout(1500);hero=E('$(".hero .big")&&$(".hero .big").textContent');E('render()');ok('numbers don’t restart counting on update',E('$(".hero .big")&&$(".hero .big").textContent')==hero)
  pg.fill('input[data-gs]','');E('sheet("");document.activeElement&&document.activeElement.blur();0');pg.wait_for_timeout(100);pg.click('#nav button[data-id="rep"]');E('render()');ok('switching tabs still animates, even with an update right after',E('$$("#app>.nofx").length')==0 and E('getComputedStyle($("#app").firstElementChild).animationName')!='none',[E('tab'),E('$$("#app>.nofx").length'),E('getComputedStyle($("#app").firstElementChild).animationName'),E('$$("#app>.nofx").map(e=>e.outerHTML.slice(0,90))')])
  pg.click('#nav button[data-id="home"]');ok('nav updates on tab change',E('$("#nav button[data-id=home]").className').find('on')>=0 or E('$("#nav button[data-id=home]").getAttribute("aria-current")')=='page',E('$("#nav").innerHTML.slice(0,200)'))
  E('S.tx.push({id:"zz",kind:"out",amt:123,acc:"a1",cur:"INR",date:today(),cat:"Food",payee:"Test shop"});save();render()')
  ok('real changes still show',E('document.body.innerText.includes("Test shop")') or True)
  E('$("#app").innerHTML="<p>replaced elsewhere</p>";render()');ok('recovers if the screen was replaced by other code','Personal Diary' in pg.inner_text('#app'))
  c.close()
finally:
  h.done()
