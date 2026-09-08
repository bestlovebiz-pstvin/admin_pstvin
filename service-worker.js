/* Universal Accounts App — offline service worker.
   The app itself is entirely self-contained (all data lives in this browser's
   localStorage, nothing is sent to any server), so all this worker needs to do
   is make sure the app shell (this HTML file, the manifest, the icons) is
   available even with no network connection — exactly like opening a file
   that's already on your device.

   To ship an update: bump CACHE_VERSION below. Old caches are cleared
   automatically the next time the app is opened. */
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'universal-accounts-' + CACHE_VERSION;

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_FILES);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(name){ return name !== CACHE_NAME; })
             .map(function(name){ return caches.delete(name); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

/* Network-first for the app shell so you always get the latest version when
   you're online, falling back to the cached copy the moment you're not —
   opening the app on a plane or with no signal still works. */
self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return; // never touch cross-origin (e.g. Google Fonts) — let those fail/succeed on their own

  event.respondWith(
    fetch(event.request).then(function(response){
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
      return response;
    }).catch(function(){
      return caches.match(event.request).then(function(cached){
        return cached || caches.match('./index.html');
      });
    })
  );
});
