/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'tesseract.js'],
  },
  // Vercel deployment optimizations
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
};

module.exports = nextConfig;
