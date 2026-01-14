import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Si tu veux absolument Webpack côté client, tu peux garder cette partie
  // sinon, Turbopack gère la majorité des cas automatiquement
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        stream: false,
        crypto: false,
      };
    }
    return config;
  },

  // Remplacement de la clé expérimentale obsolète
  serverExternalPackages: ["fs"],

  // Headers CORS
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ],
      },
    ];
  },

  // Indique explicitement à Next.js qu'on utilise Turbopack
  turbopack: {},
};

export default nextConfig;
