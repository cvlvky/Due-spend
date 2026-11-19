import json,subprocess,sys,time
sys.path.insert(0,'test')
from seed import legacy
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
errs=[];fails=[]
def ok(n,c,x=''):
    print(('PASS ' if c else 'FAIL ')+n+(' :: '+str(x) if (x!='' and not c) else ''))
    if not c: fails.append(n)
SEED="if(!localStorage.getItem('seeded')){localStorage.setItem('due-and-spend.v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(legacy))
users={};docs={}
def fb_user(e,p,op):
    if op=='new':
        if e in users: return 'exists'
        users[e]={'p':p,'v':False}; return 'ok'
    if op=='in':
        u=users.get(e)
        if not u or u['p']!=p: return 'bad'
        return 'verified' if u['v'] else 'unverified'
    if op=='check': return 'verified' if users.get(e,{}).get('v') else 'unverified'
    return 'ok'
# stand-in for Firebase that enforces "confirmed email must be in members"
FAKE='''window.Capacitor={isNativePlatform:()=>true,addListener(){},nativePromise:async(p,m)=>p=="LocalNotifications"?(m=="getPending"?{notifications:[]}:{display:"granted"}):{}};
(()=>{const A={currentUser:null,_cb:null,onAuthStateChanged(cb){this._cb=cb;setTimeout(()=>cb(this.currentUser),0)},
  _set(e,v){const self=this;this.currentUser={email:e,emailVerified:v,sendEmailVerification:async()=>{window.__mail=(window.__mail||0)+1},reload:async function(){this.emailVerified=(await fb_user(e,"","check"))=="verified"},getIdToken:async()=>"t"};this._cb&&this._cb(this.currentUser)},
  async createUserWithEmailAndPassword(e,p){if(await fb_user(e,p,"new")!="ok")throw{code:"auth/email-already-in-use"};this._set(e,false)},
  async signInWithEmailAndPassword(e,p){const r=await fb_user(e,p,"in");if(r=="bad")throw{code:"auth/invalid-credential"};this._set(e,r=="verified")},
  async signOut(){this.currentUser=null;this._cb&&this._cb(null)},async sendPasswordResetEmail(){}};
 const allowed=d=>A.currentUser&&A.currentUser.emailVerified&&(!d||(d.members||[]).includes(A.currentUser.email));
 const ref=id=>({async get(){const v=await fb_get(id),d=v?JSON.parse(v):null;if(!allowed(d))throw{code:"permission-denied"};return{exists:!!d,data:()=>d,metadata:{hasPendingWrites:false}}},
   async set(d,opt){const v=await fb_get(id),old=v?JSON.parse(v):null;if(!A.currentUser||!A.currentUser.emailVerified||(old?!old.members.includes(A.currentUser.email):!(d.members||[]).includes(A.currentUser.email)))throw{code:"permission-denied"};
     if(opt&&opt.merge&&d.members&&d.members.__u){d={...old,members:[...new Set([...(old.members||[]),d.members.__u])]}}await fb_set(id,JSON.stringify(d))},
   onSnapshot(next,err){let last="?",dead=false;const t=setInterval(async()=>{if(dead)return;const v=await fb_get(id);if(v===last)return;last=v;const d=v?JSON.parse(v):null;if(!allowed(d)){dead=true;clearInterval(t);return err({code:"permission-denied"})}next({exists:!!d,data:()=>d,metadata:{hasPendingWrites:false}})},200);return()=>{dead=true;clearInterval(t)}}});
 const FS={collection:()=>({doc:ref}),async runTransaction(fn){let w=null;await fn({get:r=>r.get(),set:(r,d)=>{w=[r,d]}});if(w)await w[0].set(w[1])}};
 window.firebase={apps:[],initializeApp(c){this.apps.push(c)},auth:Object.assign(()=>A,{GoogleAuthProvider:function(){}}),firestore:Object.assign(()=>FS,{FieldValue:{arrayUnion:x=>({__u:x})}})}})();'''
def mk(b,seed):
    c=b.new_context(viewport={'width':390,'height':844},has_touch=True)
    c.expose_function('fb_user',fb_user); c.expose_function('fb_get',lambda i: docs.get(i)); c.expose_function('fb_set',lambda i,v: docs.__setitem__(i,v))
    c.add_init_script(FAKE+(SEED if seed else ''))
    pg=c.new_page(); pg.on('console',lambda m: errs.append((m.type,m.text)) if m.type in('error','warning') and 'Failed to load resource' not in m.text else None); pg.on('pageerror',lambda e: errs.append(('pageerror',str(e))))
    pg.goto('http://localhost:8765/due-and-spend.html'); pg.wait_for_selector('#nav button'); return c,pg
def opensync(pg):
    pg.click('button[data-act="settings"]'); pg.click('#over button[data-act="syncOpen"]')
def setup(pg):
    opensync(pg); pg.fill('#f_cfg','apiKey: "k", authDomain: "x.firebaseapp.com", projectId: "p"'); pg.fill('#f_sp','home-test'); pg.click('#over button[data-act="syncSave"]'); pg.wait_for_selector('#f_se')
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    cA,A=mk(b,True); setup(A)
    ok('no Google button inside the phone app',A.locator('#over button[data-act="syncIn"]').count()==0)
    A.fill('#f_se','me@example.com'); A.fill('#f_sp2','short'); A.click('#over button[data-act="syncEmailNew"]'); ok('short password refused','me@example.com' not in users)
    A.fill('#f_sp2','longpassword1'); A.click('#over button[data-act="syncEmailNew"]'); A.wait_for_function('window.__mail>=1'); time.sleep(1.5)
    ok('account created, nothing uploaded before email is confirmed',users['me@example.com']['v']==False and len(docs)==0 and 'confirmed' in A.evaluate('sstat'),A.evaluate('sstat'))
    A.click('#over button[data-act="syncVerified"]'); time.sleep(.5); ok('unconfirmed email still blocked',len(docs)==0)
    users['me@example.com']['v']=True; A.click('#over button[data-act="syncVerified"]'); A.wait_for_function('sstat.startsWith("Synced")',timeout=15000)
    d=json.loads(docs['home-test']); ok('first upload after confirming',d['members']==['me@example.com'] and len(json.loads(d['data'])['tx'])==40)
    A.fill('#f_em','wife@example.com'); A.click('#over button[data-act="addMember"]'); A.wait_for_timeout(500); ok('invite adds member',json.loads(docs['home-test'])['members']==['me@example.com','wife@example.com'])
    # second phone: a stranger is refused, the invited person gets the data
    cB,B=mk(b,False); setup(B); users['other@example.com']={'p':'longpassword1','v':True}; B.fill('#f_se','other@example.com'); B.fill('#f_sp2','longpassword1'); B.click('#over button[data-act="syncEmailIn"]'); B.wait_for_function('sstat.includes("Sync error")',timeout=10000)
    ok('someone not invited gets nothing',B.evaluate('S.tx.length')==0,B.evaluate('sstat'))
    B.fill('#f_sp2','wrongpass99'); B.fill('#f_se','wife@example.com'); users['wife@example.com']={'p':'herpassword1','v':True}; B.click('#over button[data-act="syncEmailIn"]'); B.wait_for_timeout(400); ok('wrong password message','Wrong email or password' in B.inner_text('#toast'))
    B.fill('#f_sp2','herpassword1'); B.click('#over button[data-act="syncEmailIn"]'); B.wait_for_function('S.tx.length==40',timeout=15000); ok('invited person receives the records',B.evaluate('S.acc.length')==3)
    B.evaluate('addTx({kind:"out",acc:"a1",amt:55,cur:"INR",date:today(),cat:"From wife"});save()'); A.wait_for_function('S.tx.some(x=>x.cat=="From wife")',timeout=15000); ok('her entry reaches the first phone',True)
    A.evaluate('removeTx(S.tx.find(x=>x.cat=="From wife").id);save()'); B.wait_for_function('!S.tx.some(x=>x.cat=="From wife")',timeout=15000); ok('a delete reaches the other phone',A.evaluate('S.tx.length')==B.evaluate('S.tx.length'))
    A.evaluate('S.cfg.rate=26.8;S.cfg.rateAt=today();S.cfg.fixedCats="Rent, Family";save()'); B.wait_for_function('S.cfg.rate==26.8&&S.cfg.fixedCats=="Rent, Family"',timeout=15000); ok('settings reach the other phone',True)
    B.evaluate('S.cfg.chal=15000;save()'); A.wait_for_function('S.cfg.chal==15000',timeout=15000); ok('settings sync both ways',A.evaluate('S.cfg.rate')==26.8)
    cB.close()
    # reinstall: a fresh phone signs in with the same details and gets everything back
    cR,R=mk(b,False); setup(R); R.fill('#f_se','wife@example.com'); R.fill('#f_sp2','herpassword1'); R.click('#over button[data-act="syncEmailIn"]'); R.wait_for_function('S.tx.length==40&&S.cfg.rate==26.8&&S.cfg.chal==15000',timeout=15000)
    ok('after reinstall, records and settings come back',R.evaluate('S.acc.length')==3 and R.evaluate('S.cfg.fixedCats')=='Rent, Family')
    cA.close(); cR.close(); b.close()
finally: srv.terminate()
print('\n%d failed'%len(fails),fails); print('console problems:',len(errs)); [print(e) for e in errs[:12]]
