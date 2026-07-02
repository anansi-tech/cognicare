/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  compiler: {
    reactRemoveProperties: true,
    removeConsole: process.env.NODE_ENV === "production",
  },
  eslint: {
    // Allow production builds to complete even with ESLint errors.
    // TODO: remove once the codebase is lint-clean.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
