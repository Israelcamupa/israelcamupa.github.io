const CACHE_NAME = 'voxdoc-v1.2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/CSS/bootstrap.min.css',
  '/JS/bootstrap.bundle.min.js',
  '/JS/tesseract.min.js',
  '/JS/tesseract-core.wasm.js',
  '/JS/worker.min.js',
  // Idiomas OCR (adicionar conforme necessário)
  '/JS/lang-data/por.traineddata.gz',
  '/JS/lang-data/eng.traineddata.gz',
  // Bibliotecas opcionais (carregamento lazy)
  '/JS/pdf.min.js',
  '/JS/pdf.worker.min.js', 
  '/JS/mammoth.browser.min.js',
  '/JS/lame.min.js'
];

// Install: cache assets estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando assets estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: limpar caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.filter(name => name !== CACHE_NAME)
             .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: estratégia híbrida
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Assets estáticos: Cache-first
  if (STATIC_ASSETS.some(path => url.pathname.endsWith(path))) {
    event.respondWith(
      caches.match(request).then(cached => 
        cached || fetch(request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return resp;
        })
      )
    );
    return;
  }
  
  // Arquivos de idioma OCR: Cache-first com fallback network
  if (url.pathname.includes('/lang-data/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return resp;
        }).catch(() => cached); // Fallback para cache se offline
      })
    );
    return;
  }
  
  // API/OCR online: Network-first com fallback
  if (request.mode === 'cors' || url.hostname !== location.hostname) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }
  
  // Default: Network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Background sync para OCR offline (opcional)
self.addEventListener('sync', event => {
  if (event.tag === 'ocr-sync') {
    event.waitUntil(processPendingOCR());
  }
});

async function processPendingOCR() {
  // Implementar fila de OCR pendente quando voltar online
  console.log('[SW] Processando OCR pendente...');
}