import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // De geheime deellink: niet indexeren en de code niet via de Referer lekken
  async headers() {
    return [
      {
        source: "/lijst/:code*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
