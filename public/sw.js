const CACHE='citafuego-static-v2';
const STATIC_ASSETS=['/offline','/icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC_ASSETS)).catch(()=>undefined));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request,{cache:'no-store'}).catch(async()=>await caches.match('/offline')||Response.error()));
    return;
  }
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/')||url.pathname.startsWith('/chats/')||url.pathname.startsWith('/azar/'))return;
  if(url.pathname.startsWith('/_next/static/')||STATIC_ASSETS.includes(url.pathname)){
    event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();void caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;})));
  }
});
self.addEventListener('push',event=>{let data={title:'CitaFuego',body:'Tienes actividad nueva.',url:'/notificaciones'};try{data={...data,...event.data?.json()};}catch{}event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/icon.svg',badge:'/icon.svg',data:{url:data.url}}));});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=event.notification.data?.url||'/notificaciones';event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const client of list){if('focus'in client){client.navigate(url);return client.focus();}}return clients.openWindow(url);}));});
