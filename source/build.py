import glob,io,os,json,zipfile,sys
if os.path.exists('extras/gmail-reader.gs'):
    open('src/0997-gscript.js','w',encoding='utf-8').write('/* the Gmail reader script, so it can be copied from inside the app */\nconst GSCRIPT='+json.dumps(open('extras/gmail-reader.gs',encoding='utf-8').read())+';\n')
src=sorted(glob.glob('src/[0-9]*.js'))
js="\n".join(open(f,encoding='utf-8').read() for f in src)
css=open('src/base.css',encoding='utf-8').read()+open('src/extra.css',encoding='utf-8').read()
HEAD='''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Personal Diary</title>%s
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
%s</style></head><body>
<main id="app"><p class="sub">Opening your data…</p></main>
<nav><div id="nav"></div></nav>
<div id="over"></div><div id="view"></div><div id="lock"></div><div id="toast"></div>
<script>
%s%s
</script></body></html>
'''
PWA='''\n<link rel="manifest" href="manifest.json">\n<meta name="theme-color" content="#0f6b5c">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Personal Diary">\n<link rel="apple-touch-icon" href="icon-192.png">'''
SW='\nif("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));'
assert '</script' not in js.lower()
os.makedirs('dist/pwa',exist_ok=True)
open('dist/due-and-spend.html','w',encoding='utf-8').write(HEAD%("",css,js,""))
open('dist/pwa/index.html','w',encoding='utf-8').write(HEAD%(PWA,css,js,SW))
print('built',len(js),'js chars;',len(HEAD%("",css,js,"")),'page chars')
