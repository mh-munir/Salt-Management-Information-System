import type { NextConfig } from "next";
import { STATIC_ASSET_CACHE_CONTROL } from "./lib/cache-control";
import { getCsvEnv } from "./lib/env";

const imageRemoteHosts = getCsvEnv("NEXT_IMAGE_REMOTE_HOSTS");

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      ...imageRemoteHosts.map((hostname) => ({
        protocol: "https" as const,
        hostname,
      })),
      ...(process.env.NODE_ENV !== "production"
        ? [
            { protocol: "http" as const, hostname: "localhost" },
            { protocol: "http" as const, hostname: "127.0.0.1" },
          ]
        : []),
    ],
  },
  async redirects() {
    return [
      {
        source: "/auth/login",
        destination: "/login",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
      {
        source: "/((?!_next/static|_next/image).+\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2))",
        headers: [
          { key: "Cache-Control", value: STATIC_ASSET_CACHE_CONTROL },
        ],
      },
    ];
  },
};

export default nextConfig;
