import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Garante que o banco SQLite gerado no build acompanhe as funções serverless
  outputFileTracingIncludes: {
    "/**": ["./prisma/dev.db"],
  },
};

export default nextConfig;
