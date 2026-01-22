import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
