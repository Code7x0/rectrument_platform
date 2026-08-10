import type { NextConfig } from "next";

/**
 * Resume / partner-doc uploads go through Server Actions as FormData.
 * Next 15.5+ also needs proxyClientMaxBodySize or binary FormData is
 * truncated/dropped in production (looks like a client crash on submit).
 * Vercel serverless still caps ~4.5MB — client compresses images to stay under.
 */
const UPLOAD_BODY_LIMIT = "4.5mb";

const nextConfig: NextConfig = {
  transpilePackages: ["pdfjs-dist"],
  experimental: {
    serverActions: {
      bodySizeLimit: UPLOAD_BODY_LIMIT,
    },
    // Keep middleware body allowance aligned with signup uploads.
    middlewareClientMaxBodySize: UPLOAD_BODY_LIMIT,
    // Next 15.5 internal proxy (typed loosely until Next ships the key).
    ...({
      proxyClientMaxBodySize: UPLOAD_BODY_LIMIT,
    } as Record<string, string>),
  },
};

export default nextConfig;
