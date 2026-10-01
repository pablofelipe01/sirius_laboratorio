import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sirius/solicitudes se distribuye en TypeScript, sin build: lo transpila la
  // app que lo consume. Sin esta línea Next intenta ejecutar sus .ts tal cual.
  transpilePackages: ["@sirius/solicitudes"],
  images: {
    remotePatterns: [
      // Fotos de los EPP del catálogo de SST (/epp). Son adjuntos de Airtable
      // servidos con URL firmada: se muestran con `unoptimized` porque esas
      // URLs expiran y el optimizador las cachearía hasta romperlas.
      { protocol: "https", hostname: "*.airtableusercontent.com" },
    ],
  },
  compiler: {
    // Remover console.log en producción
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"]
    } : false,
  },
  experimental: {
    // Optimizar bundle size
    optimizePackageImports: ['@headlessui/react', 'framer-motion', 'react-icons']
  }
};

export default nextConfig;
