import { isUsableImage, toDataUrl, toRawBase64 } from '@/lib/slide-image';

/** 480px is optimal for the ~4" slide visual container at standard presentation DPI. */
const MAX_DIMENSION = 480;
const JPEG_QUALITY = 0.65;
/** When an image cannot be re-encoded, send it as is only if it is small. */
const FALLBACK_MAX_CHARS = 150000;

/** Scales width and height down to fit a maxDimension square, keeping the aspect ratio; never scales up. */
export function fitWithin(width: number, height: number, maxDimension: number): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) return { width, height };
  if (width > height) return { width: maxDimension, height: Math.round((height * maxDimension) / width) };
  return { width: Math.round((width * maxDimension) / height), height: maxDimension };
}

/** Re-encodes a slide image for export, retaining PNG when transparent; returns raw base64. Browser only. */
export async function compressImageForExport(base64: string): Promise<string> {
  if (typeof window === 'undefined') return base64;
  if (!isUsableImage(base64)) return base64;
  const fallback = () => (base64.length > FALLBACK_MAX_CHARS ? '' : base64);
  return new Promise((resolve) => {
    const img = new Image();
    // Only set crossOrigin for remote http(s) URLs; setting on data: URIs taints canvas in WebKit
    if (base64.startsWith('http://') || base64.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        const { width, height } = fitWithin(img.width, img.height, MAX_DIMENSION);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(fallback());
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let transparent = false;
        try {
          const pixels = ctx.getImageData(0, 0, width, height).data;
          for (let alpha = 3; alpha < pixels.length; alpha += 4) {
            if (pixels[alpha] < 255) {
              transparent = true;
              break;
            }
          }
        } catch {
          // Pixel access can be unavailable or blocked. JPEG needs an opaque background.
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve(toRawBase64(transparent ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', JPEG_QUALITY)));
      } catch {
        resolve(fallback());
      }
    };
    img.onerror = () => resolve(fallback());
    img.src = toDataUrl(base64);
  });
}
