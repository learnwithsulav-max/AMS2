/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    agentUpgrade: 'security',
  },
  turbopack: {
    root: __dirname,
  },
};
