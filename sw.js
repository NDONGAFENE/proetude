/* Service Worker Pro-Étude — cache pour mode hors-ligne */
const CACHE = 'proetude-v1';
const ASSETS = [
  './',
  './PROETUDE.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// À l'installation : mettre en cache les fichiers de base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(()=>{}))
  );
  self.skipWaiting();
});

// À l'activation : nettoyer les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// À chaque requête :
// - Pour les appels API (serveur Render) : réseau d'abord, sans cache
// - Pour le reste (HTML, icônes) : cache d'abord, réseau en secours
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne pas mettre en cache les requêtes API (données dynamiques)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(() => new Response(
      JSON.stringify({ error: 'Hors-ligne' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )));
    return;
  }

  // Pour les autres : cache d'abord, puis réseau
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Ne mettre en cache que les réponses valides du même domaine
        if (response.ok && url.origin === location.origin) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback : renvoyer la page principale (SPA)
        if (event.request.mode === 'navigate') {
          return caches.match('./PROETUDE.html') || caches.match('./');
        }
      });
    })
  );
});
