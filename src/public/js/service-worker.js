const CACHE_NAME = 'collabnote-cache-v1';
const urlsToCache = [
    '/',
    '/css/critical.css',
    '/css/style.css',
    'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
}); 