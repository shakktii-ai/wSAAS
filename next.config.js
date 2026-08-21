/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com', 'platform-lookaside.fbsbx.com', 'graph.facebook.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['kafkajs'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('kafkajs');
    }
    return config;
  },
};

module.exports = nextConfig;
