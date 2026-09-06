const CACHE='formacao-cidada-v1.3.0';
const APP_ASSETS=[
  './app.html','./manifest.webmanifest','./assets/css/student.css','./assets/js/config.js','./assets/js/content.js','./assets/js/demo-data.js','./assets/js/student.js'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_ASSETS)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});return response}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./app.html'))));
});
