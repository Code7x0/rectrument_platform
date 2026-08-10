import type { NextConfig } from "next";

/**
 * Resume / partner-doc uploads go through Server Actions as FormData.
 * Partner signup can send 4 files (resume + PAN + Aadhaar + agreement);
 * phone photos alone often exceed the old 10MB combined limit and
 * arrived with missing files — looking like a validation glitch.
 */
const UPLOAD_BODY_LIMIT = "32mb";

const nextConfig: NextConfig = {
  transpilePackages: ["pdfjs-dist"],
  experimental: {
    serverActions: {
      bodySizeLimit: UPLOAD_BODY_LIMIT,
    },
    // Keep middleware body allowance aligned with multi-file signup uploads.
    middlewareClientMaxBodySize: UPLOAD_BODY_LIMIT,
  },
};

export default nextConfig;
