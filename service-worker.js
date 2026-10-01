/* ============================================================
   CircuitLab — service worker
   Estrategia: red primero, caché como respaldo.
   Así la app funciona sin internet, pero en cuanto hay servidor
   siempre se ve la última versión (con "caché primero" los equipos
   se quedaban pegados a una versión antigua).
   ============================================================ */
var CACHE = 'circuitlab-v52';

var ARCHIVOS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/components.css',
  './css/education.css',
  './js/core/util.js',
  './js/core/audio.js',
  './js/core/state.js',
  './js/components/img_placas.js',
  './js/components/catalog.js',
  './js/components/catalog2.js',
  './js/components/breadboard.js',
  './js/components/arduino.js',
  './js/components/microbit.js',
  './js/components/personalizar.js',
  './js/simulation/electricity.js',
  './js/simulation/circuit-engine.js',
  './js/simulation/validation.js',
  './js/simulation/interpreter.js',
  './js/simulation/runtime.js',
  './js/editor/zoom.js',
  './js/editor/selection.js',
  './js/editor/wires.js',
  './js/editor/workspace.js',
  './js/editor/codeeditor.js',
  './js/editor/blocks.js',
  './js/storage/projects.js',
  './js/storage/cuenta.js',
  './js/ui/notifications.js',
  './js/ui/dialogs.js',
  './js/ui/panels.js',
  './js/ui/assistant.js',
  './js/ui/multimetro.js',
  './js/ui/sonar.js',
  './js/ui/scope.js',
  './js/ui/teacher.js',
  './js/education/examples.js',
  './js/education/lessons.js',
  './js/education/exercises.js',
  './js/education/challenges.js',
  './js/education/faults.js',
  './js/app.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/logo.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // add uno a uno: si falta un archivo no se cae la instalación entera
      return Promise.all(ARCHIVOS.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' })).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (llaves) {
      return Promise.all(llaves.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;      // recursos externos: no se tocan

  e.respondWith(
    fetch(e.request).then(function (net) {
      if (net && net.status === 200) {
        var copia = net.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      }
      return net;
    }).catch(function () {
      // sin red: se busca en la caché ignorando el ?v= de la versión
      return caches.match(e.request, { ignoreSearch: true }).then(function (resp) {
        return resp || caches.match('./index.html');
      });
    })
  );
});

/* Permite forzar la actualización desde la propia página */
self.addEventListener('message', function (e) {
  if (e.data === 'actualizar') self.skipWaiting();
});
