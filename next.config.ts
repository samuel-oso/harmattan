import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // the "Network" address the dev server prints on this machine; without it the page loads there but never runs
  allowedDevOrigins: ["127.0.2.2"],
};

export default nextConfig;
