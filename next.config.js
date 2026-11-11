/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/team-sulav',
        destination: '/',
        permanent: false,
      },
    ];
  },
  allowedDevOrigins: [
    '*.run.app',
    'localhost:3000',
    '127.0.0.1:3000',
  ],
  turbopack: {
    root: __dirname,
  },
};
