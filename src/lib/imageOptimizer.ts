/**
 * High-performance client-side image optimization engine.
 * Protects against memory crashes, network saturation, and Firestore document limits
 * by downscaling large smartphone photos (12-48MP, 8-30MB) to crisp, ultra-efficient
 * WebP/JPEG format (typically 90KB - 250KB) in milliseconds before uploading.
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxFileSizeKB?: number;
  preferWebP?: boolean;
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 1800,
  maxHeight: 1800,
  quality: 0.82,
  maxFileSizeKB: 450,
  preferWebP: true,
};

/**
 * Optimizes a single image file in the browser using HTML5 Canvas.
 */
export async function optimizeImage(
  file: File,
  options?: ImageOptimizationOptions
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip non-image or vector formats (SVG, GIF animations)
  if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
    return file;
  }

  return new Promise((resolve) => {
    // If the file is already tiny (< 100KB) and in modern format, keep as is
    if (file.size < 100 * 1024 && (file.type === 'image/webp' || file.type === 'image/jpeg')) {
      return resolve(file);
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        let { width, height } = img;

        // Calculate proportional scale
        if (width > opts.maxWidth || height > opts.maxHeight) {
          const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          return resolve(file); // Fallback to original if canvas fails
        }

        // High quality bicubic filtering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw white background in case of transparent pngs converted to jpeg
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        // Determine target mime type
        const targetMime = opts.preferWebP ? 'image/webp' : 'image/jpeg';
        const targetExt = opts.preferWebP ? '.webp' : '.jpg';
        const cleanBaseName = file.name.replace(/\.[^/.]+$/, '');
        const newFileName = `${cleanBaseName}_opt${targetExt}`;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }

            // If the blob is still heavier than desired and quality can be reduced
            if (blob.size > opts.maxFileSizeKB * 1024 && opts.quality > 0.65) {
              canvas.toBlob(
                (secondBlob) => {
                  const finalBlob = secondBlob || blob;
                  const optimizedFile = new File([finalBlob], newFileName, {
                    type: targetMime,
                    lastModified: Date.now(),
                  });
                  resolve(optimizedFile);
                },
                targetMime,
                0.68
              );
            } else {
              const optimizedFile = new File([blob], newFileName, {
                type: targetMime,
                lastModified: Date.now(),
              });
              resolve(optimizedFile);
            }
          },
          targetMime,
          opts.quality
        );
      } catch (err) {
        console.warn('Canvas optimization encountered error, falling back to original:', err);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      console.warn('Failed to load image into Canvas, using original file');
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Optimizes a batch of images with concurrency control to prevent browser thread freeze.
 */
export async function optimizeImageBatch(
  files: File[],
  options?: ImageOptimizationOptions,
  onProgress?: (processed: number, total: number) => void
): Promise<File[]> {
  const total = files.length;
  if (total === 0) return [];

  let processed = 0;
  const results: File[] = [];

  for (const file of files) {
    try {
      const optimized = await optimizeImage(file, options);
      results.push(optimized);
    } catch {
      results.push(file);
    }
    processed++;
    if (onProgress) {
      onProgress(processed, total);
    }
  }

  return results;
}
