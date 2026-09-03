/*
 * Service worker mínimo y deliberadamente tonto.
 *
 * No cachea código ni respuestas de la app: solo intercepta las navegaciones y,
 * si la red falla, muestra /offline.html. Cachear el HTML o los chunks de Next
 * haría que una versión vieja siguiera viva después de un despliegue, y en una
 * app de orientación legal servir contenido desactualizado es peor que no
 * funcionar. Su otra función es cumplir el requisito de "fetch handler" que
 * algunos navegadores piden para permitir instalar la app.
 */

const OFFLINE_CACHE = "orientador-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== OFFLINE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo navegaciones: el resto (chunks, API, iconos) va directo a la red.
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      const offline = await cache.match(OFFLINE_URL);
      return (
        offline ??
        new Response("Sin conexión.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    }),
  );
});
