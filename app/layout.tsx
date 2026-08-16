import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
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

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? requestHeaders.get("host");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" ? "http" : "https";
  const siteUrl = configuredUrl
    ? configuredUrl.startsWith("http")
      ? configuredUrl
      : `https://${configuredUrl}`
    : host && /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)
      ? `${protocol}://${host}`
      : "http://localhost:3000";

  return {
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
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-CO"
      className={`${geistSans.variable} ${geistMono.variable} min-h-[100dvh] antialiased`}
    >
      <body className="flex min-h-[100dvh] flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
