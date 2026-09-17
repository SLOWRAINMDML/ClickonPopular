const CACHE='lumen-loop-v6';
const ASSETS=['./','./index.html','./styles.css','./monetization.css','./mobile-v3.css','./liveops.css','./engagement.css','./config.js','./liveops.json','./src/app.js','./src/game.js','./src/audio.js','./src/monetization.js','./src/telemetry.js','./src/liveops.js','./src/service-client.js','./src/engagement.js','./assets/icon.svg','./assets/lumen-core.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()] )));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url); if(url.origin!==location.origin)return;
  const isDocument=e.request.mode==='navigate'||e.request.destination==='document';
  const liveConfig=url.pathname.endsWith('/liveops.json');
  const codeAsset=['script','style','worker'].includes(e.request.destination);
  if(isDocument||liveConfig||codeAsset){
    e.respondWith(fetch(e.request,{cache:'no-cache'}).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
      return res;
    }).catch(()=>caches.match(e.request).then(r=>r||(isDocument?caches.match('./index.html'):Response.error()))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
    return res;
  })));
});
