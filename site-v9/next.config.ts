import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export estático: mesmo padrão do site-v8 (Dockerfile.v8), servido por
  // nginx dentro do container do EasyPanel. O site inteiro é client-side
  // (WebGL, GSAP, Lenis) — nenhuma rota depende de servidor Next.js.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
