const CACHE='lumen-loop-v2';
const ASSETS=['./','./index.html','./styles.css',
  './monetization.css','./config.js','./src/app.js','./src/game.js','./src/audio.js','./src/monetization.js','./src/telemetry.js','./assets/icon.svg','./assets/lumen-core.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;if(new URL(e.request.url).origin!==location.origin)return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;}).catch(()=>caches.match('./index.html'))));});
