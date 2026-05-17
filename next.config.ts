import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // We serve user uploads from /uploads/* via the same origin. next/image gets
  // the optimization path; pattern allow-lists are required after v16.
  images: {
    localPatterns: [{ pathname: "/uploads/**" }],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "media.discordapp.net" },
    ],
  },

  // Tunnel terminates TLS at Cloudflare; Next sees plain HTTP behind a proxy.
  // Trust the proxy so URL generation uses the canonical host.
  // (Next 16 reads X-Forwarded-* by default when behind a known proxy host.)
  experimental: {
    serverActions: {
      // Allow large multipart uploads for artist submissions.
      bodySizeLimit: "64mb",
    },
  },
};

export default nextConfig;
