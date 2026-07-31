import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  webpack: (config) => {
    // Konva ships a Node entry (index-node.js) that requires the native
    // `canvas` package. The preview canvas only ever renders in the browser
    // (client-only dynamic import), so server compilation must not resolve it.
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

export default nextConfig;
