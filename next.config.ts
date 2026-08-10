import type { NextConfig } from "next";

/**
 * Partner signup uploads one file per Server Action request (to Airtable).
 * Next 15.5 needs proxyClientMaxBodySize or binary FormData can be dropped.
 * Vercel serverless request body cap is ~4.5MB per request.
 */
const UPLOAD_BODY_LIMIT = "4.5mb";

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
