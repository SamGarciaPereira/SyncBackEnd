import type { NextConfig } from "next";

// Endereço do front. Com cookies de sessão, o CORS não pode usar "*".
const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

const nextConfig: NextConfig = {
  distDir: "dist",
  // O pdfkit lê as fontes padrão do disco: não pode ser empacotado pelo Next.
  serverExternalPackages: ["pdfkit"],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: allowedOrigin },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PATCH,DELETE,OPTIONS",
          },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
