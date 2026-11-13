self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // Permite que o app funcione como PWA instalável
});
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
