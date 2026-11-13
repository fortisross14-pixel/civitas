// CIVITAS service worker: makes the game installable and playable offline.
// Paths are relative to this file, so it works at "/" (Vercel) and at
// "/<repo>/" (GitHub Pages). Saves live in localStorage and are never touched.
const VERSION='civitas-v1.8.0';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png','./icons/favicon-64.png'];
const FONT_HOSTS=['fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  // Pages: network first so a new release shows up, cached shell when offline.
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(VERSION).then(c=>c.put('./index.html',copy));return res;}).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));
    return;
  }
  // Fonts: stale-while-revalidate, so offline play keeps its typography.
  if(FONT_HOSTS.includes(url.hostname)){
    event.respondWith(caches.open(VERSION).then(cache=>cache.match(req).then(hit=>{const net=fetch(req).then(res=>{if(res.ok||res.type==='opaque')cache.put(req,res.clone());return res;}).catch(()=>hit);return hit||net;})));
    return;
  }
  // Same-origin assets: Vite fingerprints file names, so cache-first is safe.
  if(url.origin===self.location.origin){
    event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy));}return res;})));
  }
});
