import type { NextConfig } from "next";

/**
 * Partner/candidate resume uploads go through Server Actions (FormData).
 * Client validation allows 8MB; keep the action body limit above that so
 * multipart overhead does not reject valid resumes (Vercel still caps ~4.5MB).
 */
const UPLOAD_BODY_LIMIT = process.env.UPLOAD_BODY_LIMIT ?? "10mb";

const nextConfig: NextConfig = {
  transpilePackages: ["pdfjs-dist"],
  experimental: {
    serverActions: {
      bodySizeLimit: UPLOAD_BODY_LIMIT,
    },
    middlewareClientMaxBodySize: UPLOAD_BODY_LIMIT,
    ...({
      proxyClientMaxBodySize: UPLOAD_BODY_LIMIT,
    } as Record<string, string>),
  },
};

export default nextConfig;
