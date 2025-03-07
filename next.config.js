/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn2.steamgriddb.com',
      },
      {
        protocol: 'https',
        hostname: 'images.igdb.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.cloudflare.steamstatic.com',
      },
    ],
  },
  typescript: {
    // 忽略 TypeScript 构建错误
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
