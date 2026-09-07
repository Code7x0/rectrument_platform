import type { NextConfig } from "next";

/**
 * Partner/candidate resume uploads go through Server Actions (FormData).
 * Client validation allows 8MB; keep the action body limit above that so
 * multipart overhead does not reject valid resumes (Vercel still caps ~4.5MB).
 */
const UPLOAD_BODY_LIMIT = "10mb" as const;

const nextConfig: NextConfig = {
  transpilePackages: ["pdfjs-dist"],
  experimental: {
    serverActions: {
      bodySizeLimit: UPLOAD_BODY_LIMIT,
    },
    // Next.js 15.5 — proxyClientMaxBodySize is not recognized here yet.
    middlewareClientMaxBodySize: UPLOAD_BODY_LIMIT,
  },
};

export default nextConfig;
