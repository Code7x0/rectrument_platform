import type { NextConfig } from "next";

/**
 * Resume / partner-doc uploads go through Server Actions as FormData.
 * Next defaults the Server Action body limit to 1MB — typical .docx resumes
 * exceeded that while small PDFs worked, and failures looked like "nothing happened".
 */
const UPLOAD_BODY_LIMIT = "10mb";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: UPLOAD_BODY_LIMIT,
    },
    // Keep middleware body allowance aligned with resume/doc max (8–10MB).
    middlewareClientMaxBodySize: UPLOAD_BODY_LIMIT,
  },
};

export default nextConfig;
