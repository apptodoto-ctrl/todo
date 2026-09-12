import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TOdo — Sistema de Terapia Ocupacional",
  description: "Sistema de gestión profesional para terapeutas ocupacionales",
  applicationName: "TOdo",
  // Al agregarla a la pantalla de inicio se abre sin la barra del navegador
  appleWebApp: {
    capable: true,
    title: "TOdo",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Permite dibujar bajo el notch y la barra de gestos del iPhone
  viewportFit: "cover",
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-900" suppressHydrationWarning>{children}</body>
    </html>
  );
}
