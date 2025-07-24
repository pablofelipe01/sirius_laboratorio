import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DataLab - Sistema de Producción de Microorganismos | Sirius Regenerative Solutions",
  description: "Sistema de gestión y control de procesos de producción de microorganismos para Sirius Regenerative Solutions S.A.S ZOMAC. Plataforma especializada con IA y trazabilidad completa.",
  keywords: ["microorganismos", "producción", "laboratorio", "biotecnología", "Sirius Regenerative Solutions", "DataLab"],
  authors: [{ name: "Sirius Regenerative Solutions S.A.S ZOMAC" }],
  icons: {
    icon: [
      { url: "/LABI, el robot científico.png", type: "image/png" },
      { url: "/favicon.png", type: "image/png" }
    ],
    shortcut: "/favicon.png",
    apple: "/LABI, el robot científico.png",
  },
  openGraph: {
    title: "DataLab - Sistema de Producción de Microorganismos | Sirius Regenerative Solutions",
    description: "Sistema especializado para la producción y gestión de microorganismos con IA y trazabilidad completa.",
    type: "website",
    locale: "es_MX",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/LABI, el robot científico.png" />
        <meta name="theme-color" content="#1e40af" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
