/**
 * Client-only helpers to keep partner signup FormData under Vercel’s ~4.5MB
 * serverless body limit when users attach phone photos.
 */

const IMAGE_TYPE = /^image\/(jpeg|jpg|png|webp)$/i;
/** Soft per-file target after compression (bytes). */
const TARGET_IMAGE_BYTES = 900_000;
/** Hard combined payload budget for all signup files (bytes). */
export const SIGNUP_MAX_TOTAL_BYTES = 4_000_000;

export function isCompressibleImage(file: File): boolean {
  return IMAGE_TYPE.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Downscale / recompress large phone photos. Non-images are returned unchanged.
 */
export async function compressImageForUpload(
  file: File,
  maxBytes = TARGET_IMAGE_BYTES,
): Promise<File> {
  if (!isCompressibleImage(file) || file.size <= maxBytes) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const outputType = "image/jpeg";
    let quality = 0.82;
    let blob = await canvasToBlob(canvas, outputType, quality);
    while (blob && blob.size > maxBytes && quality > 0.45) {
      quality -= 0.12;
      blob = await canvasToBlob(canvas, outputType, quality);
    }

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
    return new File([blob], `${baseName}.jpg`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

export async function prepareSignupFiles(files: {
  resume: File;
  pan: File;
  aadhaar: File;
  agreement: File;
}): Promise<{
  resume: File;
  pan: File;
  aadhaar: File;
  agreement: File;
  totalBytes: number;
}> {
  const [resume, pan, aadhaar, agreement] = await Promise.all([
    compressImageForUpload(files.resume),
    compressImageForUpload(files.pan),
    compressImageForUpload(files.aadhaar),
    compressImageForUpload(files.agreement),
  ]);

  const totalBytes =
    resume.size + pan.size + aadhaar.size + agreement.size;

  return { resume, pan, aadhaar, agreement, totalBytes };
}
