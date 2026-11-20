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
      meta=json.loads(re.search(rb'\r\n\r\n(\{.*?\})\r\n',body,re.S).group(1));data=body.split(b'Content-Type: application/gzip\r\n\r\n',1)[1].rsplit(b'\r\n--',1)[0]
      D['files'][fid]={'id':fid,'name':meta['name'],'parents':meta['parents'],'data':data,'createdTime':'2026-11-%02dT10:00:00Z'%(min(28,D['n'])),'size':str(len(data))}
      return route.fulfill(status=200,content_type='application/json',body=json.dumps({'id':fid}))
    if m=='POST' and u.split('?')[0].endswith('/drive/v3/files'):
      D['files']['dir']={'id':'dir','folder':1};return route.fulfill(status=200,content_type='application/json',body='{"id":"dir"}')
    if m=='GET' and u.split('?')[0].endswith('/drive/v3/files'):
      if 'folder' in u: return route.fulfill(status=200,content_type='application/json',body=json.dumps({'files':[{'id':'dir'}] if 'dir' in D['files'] else []}))
      L=sorted([f for k,f in D['files'].items() if k!='dir'],key=lambda f:f['createdTime'],reverse=True)
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
  files=[f for k,f in D['files'].items() if k!='dir']
  ok('first backup uploaded into folder',len(files)==1 and files[0]['parents']==['dir'] and files[0]['name'].startswith('personal-diary-'),D['calls'])
  data=json.loads(gzip.decompress(files[0]['data']))
  ok('backup is the full data',len(data['tx'])==E('S.tx.length') and 'acc' in data)
  ok('status shows last backup','Last backup' in pg.inner_text('#over'),pg.inner_text('#over')[:300])
  # later backups do not ask again (token cached), prune to 15
  for i in range(16):E('localStorage.removeItem("ds-gd-last")');E('gdBackup(false,"t")');pg.wait_for_timeout(250)
  pg.wait_for_timeout(800);n=len([1 for k in D['files'] if k!='dir']);ok('keeps the last 15',n==15,n)
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
  # off
  E('gdSheet()');pg.click('#over [data-act="gdOff"]');ok('turned off',not E('gdOn()'))
  E('gdSheet()');pg.click('#over [data-act="gdStart"]');pg.wait_for_timeout(100)
  E('ACT.gdOff();window.__n.gdCancel=1');pg.wait_for_timeout(1000);E('ACT.gdStart()');pg.wait_for_timeout(800);ok('cancelled sign-in leaves it off',not E('gdOn()'))
finally:
  h.done()
