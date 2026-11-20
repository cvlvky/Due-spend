import json,sys,re,gzip
sys.path.insert(0,'test')
from h import H
h=H();ok=h.ok
try:
  c,pg=h.page(native=True);E=pg.evaluate
  D={'files':{},'n':0,'calls':[]}
  def drive(route):
    r=route.request;u=r.url;m=r.method;D['calls'].append((m,u.split('?')[0]))
    if r.headers.get('authorization','')[:10]!='Bearer tok':return route.fulfill(status=401,body='{"error":{"message":"no"}}')
    if '/upload/drive/v3/files' in u and m=='POST':
      body=r.post_data_buffer;D['n']+=1;fid='f%d'%D['n']
      meta=json.loads(re.search(rb'\r\n\r\n(\{.*?\})\r\n',body,re.S).group(1));data=body.split(b'\r\n\r\n',2)[2].rsplit(b'\r\n--',1)[0]
      D['files'][fid]={'id':fid,'name':meta['name'],'parents':meta['parents'],'data':data,'createdTime':'2026-11-%02dT10:00:00Z'%(min(28,D['n'])),'size':str(len(data)),'app':meta.get('appProperties',{})}
      return route.fulfill(status=200,content_type='application/json',body=json.dumps({'id':fid}))
    if m=='POST' and u.split('?')[0].endswith('/drive/v3/files'):
      nm=json.loads(r.post_data)['name'];k='fdir' if nm=='Files' else 'dir';D['files'][k]={'id':k,'folder':1};return route.fulfill(status=200,content_type='application/json',body=json.dumps({'id':k}))
    if m=='GET' and u.split('?')[0].endswith('/drive/v3/files'):
      from urllib.parse import unquote
      qq=unquote(u)
      if 'folder' in qq:
        k='fdir' if "name='Files'" in qq else 'dir';return route.fulfill(status=200,content_type='application/json',body=json.dumps({'files':[{'id':k}] if k in D['files'] else []}))
      mm2=re.search(r"value='([^']+)'",qq)
      if mm2:return route.fulfill(status=200,content_type='application/json',body=json.dumps({'files':[{'id':f['id']} for f in D['files'].values() if f.get('app',{}).get('att')==mm2.group(1)]}))
      L=sorted([f for k,f in D['files'].items() if k not in('dir','fdir') and 'fdir' not in f.get('parents',[])],key=lambda f:f['createdTime'],reverse=True)
      return route.fulfill(status=200,content_type='application/json',body=json.dumps({'files':[{k:f[k] for k in ('id','name','size','createdTime')} for f in L]}))
    mm=re.search(r'/drive/v3/files/(\w+)',u)
    if mm:
      fid=mm.group(1)
      if m=='DELETE':D['files'].pop(fid,None);return route.fulfill(status=204,body='')
      if 'alt=media' in u:return route.fulfill(status=200,body=D['files'][fid]['data'],content_type='application/gzip')
      return route.fulfill(status=200,content_type='application/json',body=json.dumps({'id':fid,'trashed':fid not in D['files']}))
    route.fulfill(status=404,body='{}')
  pg.route(re.compile(r'https://www\.googleapis\.com/.*'),drive)
  E('settings()');ok('drive backup in settings',pg.locator('#over #set_gd').count()==1 and 'off' in pg.inner_text('#over #set_gd'))
  pg.click('#over #set_gd');pg.click('#over [data-act="gdStart"]');pg.wait_for_timeout(1500)
  files=[f for k,f in D['files'].items() if k not in ('dir','fdir') and 'fdir' not in f.get('parents',[])]
  ok('first backup uploaded into folder',len(files)==1 and files[0]['parents']==['dir'] and files[0]['name'].startswith('personal-diary-'),D['calls'])
  data=json.loads(gzip.decompress(files[0]['data']))
  ok('backup is the full data',len(data['tx'])==E('S.tx.length') and 'acc' in data)
  ok('status shows last backup','Last backup' in pg.inner_text('#over'),pg.inner_text('#over')[:300])
  # later backups do not ask again (token cached), prune to 15
  for i in range(16):E('localStorage.removeItem("ds-gd-last")');E('gdBackup(false,"t")');pg.wait_for_timeout(250)
  pg.wait_for_timeout(800);n=len([1 for k,f in D['files'].items() if k not in ('dir','fdir') and 'fdir' not in f.get('parents',[])]);ok('keeps the last 15',n==15,n)
  # automatic: skipped if done recently, runs if older
  c0=D['n'];E('gdAuto()');pg.wait_for_timeout(500);ok('auto skips when recent',D['n']==c0)
  E('localStorage.setItem("ds-gd-last",new Date(Date.now()-2*864e5).toISOString());GD.tok=""');E('gdAuto()');pg.wait_for_timeout(1200);ok('auto backs up when old, silently',D['n']==c0+1)
  # silent sign-in needed -> todo item
  E('localStorage.setItem("ds-gd-last",new Date(Date.now()-4*864e5).toISOString());GD.tok="";window.__n.gdDeny=1');E('gdAuto()');pg.wait_for_timeout(800)
  ok('asks to sign in again via needs attention',E('todoItems().some(x=>/needs you to sign in/.test(x.tx)&&x.act=="gdNow")'))
  E('window.__n.gdDeny=0')
  E('ACT.gdNow()');pg.wait_for_timeout(1200);ok('back up now clears it',not E('todoItems().some(x=>/Drive backup/.test(x.tx))'))
  # expired token -> retried
  E('GD.tok="bad";GD.at=Date.now()');c0=D['n'];E('ACT.gdNow()');pg.wait_for_timeout(1200);ok('expired token renewed',D['n']==c0+1)
  # restore
  n0=E('S.tx.length');E('S.tx.push({id:"zz",kind:"out",acc:"a1",amt:1,cur:"INR",fx:fx(),date:today(),cat:"Test",tags:[]});save()')
  E('ACT.gdRestore()');pg.wait_for_timeout(1200);ok('restore lists backups',pg.locator('#over [data-act="gdPick"]').count()==15)
  pg.once('dialog',lambda d:d.accept());pg.locator('#over [data-act="gdPick"]').first.click();pg.wait_for_timeout(1500)
  ok('restored from Drive',E('S.tx.length')==n0 and not E('S.tx.some(x=>x.id=="zz")'),E('S.tx.length'))
  # attached files go to Drive and come back
  E('''(async()=>{const b=new Blob([new Uint8Array([1,2,3,4,5])],{type:"image/jpeg"});await fput("idc1",b);S.docs.push({id:"dq",name:"QID card",att:[{id:"idc1",name:"qid front.jpg",type:"image/jpeg"}]});
       await fput("rc1",new Blob(["receipt"],{type:"image/jpeg"}));S.tx.push({id:"tq",kind:"out",acc:"a2",amt:5,cur:"QAR",fx:fx(),date:today(),cat:"Food",tags:[],att:[{id:"rc1",name:"bill.jpg",type:"image/jpeg"}]});save()})()''')
  E('ACT.gdNow()');pg.wait_for_timeout(1800)
  up=[f for f in D['files'].values() if f.get('app',{}).get('att') in ('idc1','rc1')]
  ok('ID card and receipt uploaded to Drive Files folder',len(up)==2 and all(f['parents']==['fdir'] for f in up) and any(f['data']==bytes([1,2,3,4,5]) for f in up),[(f.get('name'),f.get('parents')) for f in up])
  E('ACT.gdNow()');pg.wait_for_timeout(1500);ok('files not uploaded twice',len([f for f in D['files'].values() if f.get('app',{}).get('att')=='idc1'])==1)
  ok('no more files-not-backed-up reminder',not E('todoItems().some(x=>/attached files? (isn’t|aren’t) in a backup/.test(x.tx))'))
  E('(async()=>{await fdel("idc1");localStorage.removeItem("ds-gd-fmap")})()');pg.wait_for_timeout(300)
  n=E('gdFilesDown(false)');ok('missing file brought back from Drive',n==1 and E('(async()=>{const b=await fget("idc1");return b?b.size:0})()')==5,n)
  E('gdSheet()');ok('drive screen shows documents in Drive','Documents and photos' in pg.inner_text('#over') and 'of 2 in Drive' in pg.inner_text('#over'),pg.inner_text('#over')[-200:])
  # off
  E('gdSheet()');pg.click('#over [data-act="gdOff"]');ok('turned off',not E('gdOn()'))
  E('gdSheet()');pg.click('#over [data-act="gdStart"]');pg.wait_for_timeout(100)
  E('ACT.gdOff();window.__n.gdCancel=1');pg.wait_for_timeout(1000);E('ACT.gdStart()');pg.wait_for_timeout(800);ok('cancelled sign-in leaves it off',not E('gdOn()'))
finally:
  h.done()
