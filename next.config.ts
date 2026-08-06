import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Évite l'ambiguïté si un package-lock existe plus haut dans l'arborescence
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
