import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/service-worker";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const configuredUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  process.env.VERCEL_URL;
const siteUrl = configuredUrl
  ? configuredUrl.startsWith("http")
    ? configuredUrl
    : `https://${configuredUrl}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Orientador Legal — De tu historia a un expediente listo para actuar",
  description:
    "Organiza tu caso, entiende tus derechos, encuentra ayuda gratuita y prepara documentos con fuentes oficiales de Colombia.",
  openGraph: {
    type: "website",
    locale: "es_CO",
    title: "Orientador Legal",
    description: "De tu historia a un expediente listo para actuar.",
    images: [
      {
        url: "/og.png",
        width: 1731,
        height: 909,
        alt: "Orientador Legal: un expediente visual conecta hechos, pruebas y acciones.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orientador Legal",
    description: "De tu historia a un expediente listo para actuar.",
    images: ["/og.png"],
  },
  applicationName: "Orientador Legal",
  appleWebApp: {
    capable: true,
    title: "Orientador",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

/**
 * `viewportFit: "cover"` deja que la app pinte bajo el notch y la barra de
 * gestos cuando está instalada; las pantallas compensan con `env(safe-area-*)`.
 * No se limita el zoom a propósito: bloquearlo rompe la accesibilidad de quien
 * necesita agrandar el texto.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#173f6b",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-CO"
      className="h-dvh antialiased"
    >
      {/* El fondo va también en body: instalada con viewportFit cover, la franja
          bajo el notch la pinta el body, no la pantalla. */}
      <body className="flex min-h-dvh flex-col bg-[#f4f3ee]">
        <TooltipProvider>{children}</TooltipProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
