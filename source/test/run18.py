import json,sys,time,math,os
sys.path.insert(0,'test')
from h import H
from seed import legacy
h=H();ok=h.ok
docs={}
def fb_commit(R,W,email):
    R=json.loads(R);W=json.loads(W)
    for k,v in R.items():
        if docs.get(k)!=v: return 'conflict'
    for k,v in W:
        old=docs.get(k);oldm=json.loads(old)['members'] if old else None
        if v is None:
            if oldm is not None and email not in oldm: return 'denied'
        elif (oldm is not None and email not in oldm) or (oldm is None and email not in json.loads(v).get('members',[])): return 'denied'
    for k,v in W:
        if v is None: docs.pop(k,None)
        else: docs[k]=v
    if os.environ.get('DBG'):
        for k,v in W:
            if k=='home':
                d=json.loads(v);print('COMMIT',email,'gen',d.get('gen'),'n',d.get('n'),'tx',len(json.loads(d['data'])['tx']) if d.get('data') else '?')
    return 'ok'
FAKE='''(()=>{const A={currentUser:{email:window.__me,emailVerified:true,getIdToken:async()=>"t"},onAuthStateChanged(cb){setTimeout(()=>cb(this.currentUser),0)},async signOut(){}};
 const allowed=d=>!d||(d.members||[]).includes(A.currentUser.email);
 const ref=id=>({id,async get(){const v=await fb_get(id),d=v?JSON.parse(v):null;if(d&&!allowed(d))throw{code:"permission-denied"};return{exists:!!d,data:()=>d,metadata:{hasPendingWrites:false}}},
   async set(d,opt){const v=await fb_get(id),old=v?JSON.parse(v):null;if(old?!old.members.includes(A.currentUser.email):!(d.members||[]).includes(A.currentUser.email))throw{code:"permission-denied"};
     if(opt&&opt.merge&&d.members&&d.members.__u){d={...old,members:[...new Set([...(old.members||[]),d.members.__u])]}}await fb_set(id,JSON.stringify(d))},
   async delete(){const v=await fb_get(id),old=v?JSON.parse(v):null;if(old&&!old.members.includes(A.currentUser.email))throw{code:"permission-denied"};await fb_del(id)},
   onSnapshot(next,err){let last="?",dead=false;const t=setInterval(async()=>{if(dead)return;const v=await fb_get(id);if(v===last)return;last=v;const d=v?JSON.parse(v):null;if(d&&!allowed(d)){dead=true;clearInterval(t);return err({code:"permission-denied"})}next({exists:!!d,data:()=>d,metadata:{hasPendingWrites:false}})},150);return()=>{dead=true;clearInterval(t)}}});
 const FS={collection:()=>({doc:ref}),async runTransaction(fn){for(let a=0;a<8;a++){const R={},W=[];await fn({get:async r=>{R[r.id]=await fb_get(r.id);return r.get()},set:(r,d)=>W.push([r.id,JSON.stringify(d)]),delete:r=>W.push([r.id,null])});
   const res=await fb_commit(JSON.stringify(R),JSON.stringify(W),A.currentUser.email);if(res=="ok"){window.__writes=(window.__writes||0)+1;return}if(res=="denied")throw{code:"permission-denied"};window.__retries=(window.__retries||0)+1}throw{code:"aborted"}}};
 window.firebase={apps:[],initializeApp(c){this.apps.push(c)},auth:Object.assign(()=>A,{GoogleAuthProvider:function(){}}),firestore:Object.assign(()=>FS,{FieldValue:{arrayUnion:x=>({__u:x})}})}})();'''
def phone(seed,me,lim=None):
    c=h.b.new_context(viewport={'width':360,'height':740})
    c.expose_function('fb_get',lambda i: docs.get(i));c.expose_function('fb_set',lambda i,v: docs.__setitem__(i,v));c.expose_function('fb_del',lambda i: docs.pop(i,None));c.expose_function('fb_commit',fb_commit)
    d=json.loads(json.dumps(legacy)) if seed else {"acc":[],"tx":[],"cfg":{"rate":26,"view":"INR"}}
    c.add_init_script('window.__me=%s;'%json.dumps(me)+FAKE+"if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(d)))
    pg=c.new_page();pg.on('pageerror',lambda e: h.errs.append(('pageerror',str(e))));pg.goto('http://localhost:8765/due-and-spend.html');pg.wait_for_selector('#nav button')
    if lim:pg.evaluate('SYLIM=%d'%lim)
    pg.evaluate('''SY.cfg={apiKey:"k",authDomain:"x.firebaseapp.com",projectId:"p"};SY.space="home";SY.on=true;SY.members=["a@x.com","b@x.com"];syv();syncStart()''')
    return c,pg
try:
  # ---------------- verdict, flow chart, return plan ----------------
  c,pg=h.page();E=pg.evaluate
  X=E('verdict(addMon(today().slice(0,7),-1))');ok('verdict for last month',X['label'] in ('Good month','OK month','Tough month') and 0<=X['sc']<=100 and len(X['pts'])>=3,X)
  t=pg.inner_text('#app');ok('home shows this month so far','so far:' in t and '/100' in t,t[:500])
  pg.click('[data-act="verdict"] .hbl');pg.wait_for_selector('#over h3');t=pg.inner_text('#over')
  ok('verdict sheet sections','How it went' in t and 'Coming up in 30 days' in t and 'Savings rate' in t,t[:900])
  pg.click('#over [data-act="verdict"] >> nth=0');pg.wait_for_timeout(150);ok('previous month navigation',E('$("#over h2").textContent')==E('mlong(addMon(today().slice(0,7),-1))'))
  pg.click('#over .x')
  m=E('addMon(today().slice(0,7),-1)');g=E('flowData("%s")'%m)
  ok('flow data: income, spending, sent home',g['incQ']>0 and g['spQ']>0 and g['sent']>0 and g['spI']>0,g)
  G=E('flowGraph(flowData("%s"))'%m);src=sum(l['v'] for l in G['L'] if l['s']=='q_inc');
  ok('flow adds up: all Qatar income is allocated',abs(src-g['incQ'])<1,[src,g['incQ']])
  sent_in=sum(l['v'] for l in G['L'] if l['t']=='q_sent');sent_out=sum(l['v'] for l in G['L'] if l['s']=='q_sent')
  ok('money sent in equals money used in India',abs(sent_in-sent_out)<1 and abs(sent_in-g['sent'])<1,[sent_in,sent_out,g['sent']])
  ok('three columns: Qatar, sent home, India',max(n['col'] for n in G['N'])==2)
  E('mon=addMon(today().slice(0,7),-1);tab="rep";render()');t=pg.inner_text('#app');ok('reports show verdict and flow','Where the money went' in t and pg.locator('#app svg path').count()>=5,t[:400])
  pg.screenshot(path='shots/s-flow.png',full_page=False)
  # return plan
  E('S.cfg.grat=null;S.cfg.ret={exp:60000,yrs:30,infl:6,r1:8,r2:7,save:150000,big:[{n:"House",a:5000000}]};save()')
  P=E('retPlan()');now=E('nwv("INR")')
  need0=sum(60000*12*(1.06**k)/(1.07**k) for k in range(30))+5000000
  ok('needed today matches the formula',abs(P['needNow']-need0)<1,[P['needNow'],need0])
  W=now;can=None
  for n in range(0,481):
    if n>0: W=W*(1+0.08/12)+150000
    nd=sum(60000*12*(1.06**(n/12))*(1.06**k)/(1.07**k) for k in range(30))+5000000*(1.06**(n/12))
    if W>=nd: can=n;break
  ok('return date matches an independent calculation',P['can']==can,[P['can'],can])
  E('S.cfg.ret.when=addM(today(),24);save()');P=E('retPlan()');ok('target date: extra saving needed',P['gap']>0 and P['extra']>0,P['extra'])
  pg.click('#nav button[data-id="invest"]');t=pg.inner_text('#app');ok('wealth card','Return-to-India plan' in t and 'more a month' in t,t[:300])
  pg.click('[data-act="retForm"]');pg.wait_for_selector('#r_exp');pg.fill('#r_exp','80000');pg.fill('#rb_n1','Education');pg.fill('#rb_a1','2000000');pg.click('#over [data-act="retSave"]');pg.wait_for_timeout(200)
  ok('plan saved and synced',E('S.cfg.ret.exp')==80000 and len(E('S.cfg.ret.big'))==2 and E('prefsOut().ret.exp')==80000)
  ok('plan sheet has the chart','what you’ll have' in pg.inner_text('#over') and pg.locator('#over polyline').count()==2)
  c.close()
  # ---------------- cloud: compressed and split data ----------------
  cA,A=phone(True,"a@x.com",lim=1000);A.wait_for_function('sstat.startsWith("Synced")',timeout=15000)
  d=json.loads(docs['home']);ok('large data is compressed and split',d['data']=='' and d['n']>=2 and all(('home__p%d'%i) in docs for i in range(d['n'])),{k:d[k] for k in ('n','z') if k in d})
  ok('each piece carries the members',all(json.loads(docs['home__p%d'%i])['members']==d['members'] and json.loads(docs['home__p%d'%i])['h']==d['h'] for i in range(d['n'])))
  cB,B=phone(False,"b@x.com",lim=1000);B.wait_for_function('S.tx.length>=40',timeout=15000);ok('second phone rebuilds the data from the pieces',B.evaluate('S.acc.length')==3)
  B.evaluate('addTx({kind:"out",acc:"a1",amt:77,cur:"INR",date:today(),cat:"Pieces test"});save()');A.wait_for_function('S.tx.some(x=>x.cat=="Pieces test")',timeout=15000);ok('edits round-trip through pieces',True)
  n_before=json.loads(docs['home'])['n'];B.evaluate('SYLIM=700000');A.evaluate('SYLIM=700000;S.tx=S.tx.slice(0,5);S.del=[];SY.force=true;save()');A.wait_for_function('!SY.force',timeout=15000);A.wait_for_timeout(1500)
  d=json.loads(docs['home']);ok('back to one plain document; old pieces removed',d['n']==0 and d['data'].startswith('{') and not any(k.startswith('home__p') for k in docs),[d['n'],[k for k in docs]])
  try:
    B.wait_for_function('S.tx.length==5',timeout=15000);ok('other phone follows',True)
  except Exception as e:
    print('DBG B',B.evaluate('[S.tx.length,SY.gen,sstat,SY.dirty,SY.force,snapSeq]'),json.loads(docs['home'])['gen'],json.loads(docs['home'])['by']);raise
  B.evaluate('SYLIM=500');A.evaluate('SYLIM=500;S.tx=S.tx.concat(Array.from({length:3},(_,i)=>({id:"zz"+i,kind:"out",acc:"a1",amt:1,cur:"INR",date:today(),cat:"Z"})));save()');A.wait_for_function('!SY.dirty',timeout=15000);A.wait_for_timeout(1500)
  d=json.loads(docs['home']);ok('small limit again: compressed and split',d['data']=='' and (d['z']!='' or d['n']>0),[d['n'],len(d.get('z',''))])
  B.wait_for_function('S.tx.length==8',timeout=15000);ok('compressed copy read on the other phone',True)
  cA.close();cB.close()
  # old-format document from an older app version is still read
  docs.clear();docs['home']=json.dumps({"data":json.dumps({"acc":legacy["acc"],"tx":[{"id":"o1","kind":"out","amt":5,"acc":"a1","cur":"INR","date":"2026-01-01","cat":"Old"}],"del":[]}),"members":["a@x.com"],"by":"a@x.com","ts":1,"gen":0})
  cC,C=phone(False,"a@x.com");C.wait_for_function('S.tx.some(x=>x.cat=="Old")',timeout=15000);ok('older phone’s data format still works',True);cC.close()
finally:
  h.done()
