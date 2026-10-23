/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: 'standalone',
  allowedDevOrigins: [
    '*.run.app',
    'localhost:3000',
    '127.0.0.1:3000',
  ],
  turbopack: {
    root: __dirname,
  },
};

