const cacheName='simplexbudget-v3';
const shell=['./','./index.html','./style.css','./app.js','./icons.js','./charts.js','./model.js','./vault.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(shell)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('simplexbudget-')&&key!==cacheName).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==location.origin)return;
  const isShell=shell.some(path=>new URL(path,self.registration.scope).href===url.href);
  if(event.request.mode==='navigate'&&url.pathname===new URL(self.registration.scope).pathname){
    event.respondWith(fetch(event.request).catch(()=>caches.open(cacheName).then(cache=>cache.match('./'))));
  } else if(isShell){
    event.respondWith(caches.open(cacheName).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
  }
});
