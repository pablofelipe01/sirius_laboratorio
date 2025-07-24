import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
