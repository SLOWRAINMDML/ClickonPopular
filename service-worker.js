const CACHE='lumen-loop-v3';
const ASSETS=['./','./index.html','./styles.css',
  './monetization.css',
  './mobile-v3.css','./config.js','./src/app.js','./src/game.js','./src/audio.js','./src/monetization.js',
  './src/mobile-v3.js','./src/telemetry.js','./assets/icon.svg','./assets/lumen-core.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
  self.clients.claim()
])));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin)return;
  const isDocument=e.request.mode==='navigate' || e.request.destination==='document';
  if(isDocument){
    e.respondWith(fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return res;}).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;})));
});
