/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @react-pdf/renderer v4 is ESM-only; bundling it causes React reconciler
  // conflicts. Keep it as an external so the API route loads it directly.
  serverExternalPackages: ["@react-pdf/renderer"],
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
