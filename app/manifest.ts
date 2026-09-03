import type { MetadataRoute } from "next";

/**
 * Manifest de la versión instalable (PWA). Se sirve en /manifest.webmanifest.
 *
 * `display: "standalone"` es lo que hace que, instalada, abra sin barra de
 * navegador. El icono `maskable` va aparte del normal: Android recorta el icono
 * a la forma del lanzador y, sin margen propio, le corta el escudo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orientador Legal",
    short_name: "Orientador",
    description:
      "Organiza tu caso, entiende tus derechos y encuentra ayuda gratuita con fuentes oficiales de Colombia.",
    lang: "es-CO",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f3ee",
    theme_color: "#173f6b",
    categories: ["government", "utilities", "education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
