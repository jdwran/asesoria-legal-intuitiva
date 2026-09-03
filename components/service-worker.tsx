"use client";

import { useEffect } from "react";

/**
 * Registra el service worker que permite instalar la app y muestra
 * /offline.html cuando no hay red. Ver public/sw.js: no cachea código, así que
 * también es seguro tenerlo activo en desarrollo.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("No fue posible registrar el service worker.", error);
    });
  }, []);

  return null;
}
