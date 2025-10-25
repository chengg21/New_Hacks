// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Webpack (production & dev when not using Turbopack)
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // pdfjs-dist sometimes tries to require('canvas') in Node.
      // We don't render to images, so stub it out.
      canvas: false as unknown as string,
    };
    return config;
  },

  // Turbopack (Next 16 dev server)
  experimental: {
    turbo: {
      resolveAlias: {
        canvas: false as unknown as string,
      },
    },
  },
};

export default nextConfig;
