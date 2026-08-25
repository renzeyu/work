import type { NextConfig } from "next";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  assetPrefix: basePath,
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
