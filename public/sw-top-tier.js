const CACHE='citafuego-shell-v1';
const OFFLINE='/citafuego-offline.html';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([OFFLINE,'/'])));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/'))return;event.respondWith(fetch(req).catch(async()=>{const cached=await caches.match(req);if(cached)return cached;return caches.match(OFFLINE);}));});
