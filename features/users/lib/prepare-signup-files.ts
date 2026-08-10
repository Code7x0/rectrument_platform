/**
 * Client-only helpers for partner signup uploads.
 * Files are sent one-at-a-time, so each may be up to ~4MB (Vercel limit).
 */

const IMAGE_TYPE = /^image\/(jpeg|jpg|png|webp)$/i;
/** Soft per-file target after compression (bytes). */
const TARGET_IMAGE_BYTES = 1_200_000;
/** Per-file hard limit for a single Server Action request. */
export const SIGNUP_MAX_FILE_BYTES = 4_000_000;

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
    const maxEdge = 1800;
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
    let quality = 0.85;
    let blob = await canvasToBlob(canvas, outputType, quality);
    while (blob && blob.size > maxBytes && quality > 0.45) {
      quality -= 0.1;
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

export async function prepareSignupFile(file: File): Promise<File> {
  return compressImageForUpload(file);
}
