// Service Worker para PWA
const CACHE_NAME = 'tinpay-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles-new.css',
  './storage-new.js',
  './dashboard-new.js',
  './income-new.js',
  './expenses-new.js',
  './app-new.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
