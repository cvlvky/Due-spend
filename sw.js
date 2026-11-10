const C="ds-v3";
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(["./","index.html","manifest.json","icon-192.png","icon-512.png"])));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;
e.respondWith(fetch(e.request).then(n=>{if(n.ok||n.type==="opaque"){const cp=n.clone();caches.open(C).then(c=>c.put(e.request,cp)).catch(()=>{})}return n}).catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))))});
