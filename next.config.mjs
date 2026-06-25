// Pin the server process timezone (Miami / Eastern). Vercel reserves the TZ env
// var, so we set it here at config load — before any date logic runs — so the
// server's Date math matches the practice timezone instead of UTC.
process.env.TZ = "America/New_York";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
