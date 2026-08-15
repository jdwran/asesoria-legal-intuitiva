import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-CO"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
