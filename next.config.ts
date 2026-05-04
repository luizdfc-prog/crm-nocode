import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript é verificado localmente e no CI — skip no build da Vercel
    // evita timeout de 52s no check separado do Next.js 16 com Turbopack
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
