/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // tfjs ships optional node bindings it never needs in the browser build
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, crypto: false };
    return config;
  },
};
export default nextConfig;
