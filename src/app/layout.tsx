import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Liga das Igrejas",
    template: "%s · Liga das Igrejas",
  },
  description:
    "Plataforma para organizar campeonatos esportivos entre igrejas: equipes, atletas, tabelas, resultados e classificação.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Liga Igrejas",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#14432f",
  width: "device-width",
  initialScale: 1,
  // Comportamento de aplicativo: sem zoom automático ao focar campos
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
        <PwaInstallBanner />
      </body>
    </html>
  );
}
