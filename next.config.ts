import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Carpeta autocontenida en .next/standalone para la imagen de Docker.
  output: "standalone",
};

export default nextConfig;
