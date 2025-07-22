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
  title: "DataLab - Plataforma de IA para Centro de Investigación Regenerativa",
  description: "Plataforma de IA y automatización para el Centro de Investigación Regenerativa (CIR). Captura, estructura y analiza datos de producción con trazabilidad completa y analítica avanzada.",
  keywords: ["investigación regenerativa", "inteligencia artificial", "automatización de laboratorio", "trazabilidad", "analítica científica", "CIR"],
  authors: [{ name: "DataLab - Centro CIR" }],
  openGraph: {
    title: "DataLab - Plataforma de IA para Centro de Investigación Regenerativa",
    description: "Plataforma especializada en IA y automatización para investigación regenerativa con trazabilidad completa.",
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
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
