import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude Puppeteer and Chromium from bundling to avoid 250MB function size limit on Vercel
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "puppeteer"],
};

export default nextConfig;
