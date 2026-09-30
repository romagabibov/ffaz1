import { optimizeImage } from './imageOptimizer';
import { apiFetch, getAuthToken } from './apiClient';

export type UploadStage = 'optimizing' | 'uploading' | 'ready' | 'error';
export type UploadPurpose = 'avatar' | 'post' | 'feed' | 'chat' | 'cv' | 'id_document' | 'other';

/**
 * Upload a media file via multipart/form-data to /api/upload
 * with pre-flight canvas optimization, real-time stage progress reporting,
 * and reliable server file persistence to prevent Firestore document size limit errors.
 */
export async function uploadMediaFile(
  file: File,
  onProgress?: (stage: UploadStage, percent: number) => void,
  purpose: UploadPurpose = 'other'
): Promise<string> {
  // Stage 1: Pre-flight optimization (for images only)
  onProgress?.('optimizing', 15);
  let fileToUpload = file;
  if (file.type && file.type.startsWith('image/') && !file.type.includes('gif')) {
    try {
      fileToUpload = await optimizeImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.80,
        maxFileSizeKB: 300,
        preferWebP: true,
      });
      onProgress?.('optimizing', 40);
    } catch (optErr) {
      console.warn('Image pre-optimization skipped due to error, proceeding with original:', optErr);
      onProgress?.('optimizing', 40);
    }
  } else {
    onProgress?.('optimizing', 40);
  }

  // Stage 2: Network Upload using XMLHttpRequest for real upload progress (40% - 95%)
  onProgress?.('uploading', 45);

  const token = await getAuthToken();
  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

  try {
    const uploadPromise = new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${apiBase}/api/upload`);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const pct = 45 + Math.round((event.loaded / event.total) * 50);
            onProgress?.('uploading', Math.min(95, pct));
          } else {
            onProgress?.('uploading', 75);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data && data.url) {
              onProgress?.('ready', 100);
              return resolve(data.url);
            }
          } catch {
            // ignore
          }
        }
        reject(new Error(`Server returned status ${xhr.status}: ${xhr.responseText}`));
      };

      xhr.onerror = () => reject(new Error('Network error during XHR upload'));
      xhr.ontimeout = () => reject(new Error('Upload timeout'));

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('purpose', purpose);
      xhr.send(formData);
    });

    return await uploadPromise;
  } catch (uploadErr) {
    console.warn('XHR upload failed, attempting fetch API fallback:', uploadErr);
  }

  // Stage 3: Fetch API fallback to server
  try {
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('purpose', purpose);
    const res = await apiFetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        onProgress?.('ready', 100);
        return data.url;
      }
    }
  } catch (fetchErr) {
    console.warn('Fetch upload also failed:', fetchErr);
  }

  throw new Error('Не удалось загрузить файл на сервер. Пожалуйста, проверьте подключение к сети.');
}

/**
 * Uploads a base64 Data URL string to the server and converts it to a lightweight URL.
 * This is crucial to prevent Firestore document size limit overflows (1MB).
 */
export async function uploadBase64Media(dataUrl: string, purpose: UploadPurpose = 'other'): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  try {
    const res = await apiFetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, purpose }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('Failed to convert base64 image to server file URL:', err);
  }

  return dataUrl;
}

/**
 * Scans HTML content for embedded base64 images/videos (<img src="data:..." />)
 * and uploads them to the server, replacing them with lightweight server URLs.
 * Ensures articles never exceed Firestore's 1,048,576 bytes limit.
 */
export async function sanitizeAndPersistHtmlMedia(htmlContent: string): Promise<string> {
  if (!htmlContent || (!htmlContent.includes('data:image/') && !htmlContent.includes('data:video/'))) {
    return htmlContent;
  }

  let sanitized = htmlContent;
  const base64Regex = /src=["'](data:(?:image|video)\/[^"']+)["']/g;
  const matches: string[] = [];
  let match;

  while ((match = base64Regex.exec(htmlContent)) !== null) {
    if (match[1] && !matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }

  for (const rawDataUrl of matches) {
    try {
      const serverUrl = await uploadBase64Media(rawDataUrl, 'post');
      if (serverUrl && serverUrl !== rawDataUrl) {
        sanitized = sanitized.split(rawDataUrl).join(serverUrl);
      }
    } catch (err) {
      console.warn('Could not sanitize base64 in HTML:', err);
    }
  }

  return sanitized;
}

/**
 * Batch upload multiple files with progress reporting.
 */
export async function uploadBatchMediaFiles(
  files: File[],
  onProgress?: (completed: number, total: number) => void,
  purpose: UploadPurpose = 'other'
): Promise<string[]> {
  const urls: string[] = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const url = await uploadMediaFile(files[i], undefined, purpose);
    if (url) {
      urls.push(url);
    }
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return urls;
}

/**
 * Delete media files from Cloudinary and server when a news item or post is deleted.
 */
export async function deleteMediaUrls(urls: string[]): Promise<void> {
  if (!urls || urls.length === 0) return;
  const cleanUrls = urls.filter(u => typeof u === 'string' && u.trim());
  if (cleanUrls.length === 0) return;

  try {
    const res = await apiFetch('/api/delete-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: cleanUrls }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log('Media files cleaned up successfully:', data);
    }
  } catch (err) {
    console.warn('deleteMediaUrls call failed:', err);
  }
}

/**
 * Extracts all media URLs (cover, gallery images, videos, and embedded in-text images/videos)
 * from a news article object.
 */
export function extractAllMediaUrlsFromNews(item: any): string[] {
  if (!item) return [];
  const urls = new Set<string>();

  if (item.imageUrl && typeof item.imageUrl === 'string') {
    urls.add(item.imageUrl.trim());
  }
  if (item.videoUrl && typeof item.videoUrl === 'string') {
    urls.add(item.videoUrl.trim());
  }

  if (Array.isArray(item.images)) {
    item.images.forEach((img: any) => {
      if (typeof img === 'string' && img.trim()) {
        urls.add(img.trim());
      } else if (img && typeof img === 'object' && img.url) {
        urls.add(img.url.trim());
      }
    });
  }

  if (Array.isArray(item.videos)) {
    item.videos.forEach((vid: any) => {
      if (typeof vid === 'string' && vid.trim()) {
        urls.add(vid.trim());
      } else if (vid && typeof vid === 'object' && vid.url) {
        urls.add(vid.url.trim());
      }
    });
  }

  const content = item.content || item.bio || '';
  if (typeof content === 'string' && content) {
    const srcRegex = /src=["']([^"']+)["']/g;
    let match;
    while ((match = srcRegex.exec(content)) !== null) {
      if (match[1] && (match[1].includes('cloudinary.com') || match[1].includes('/uploads/'))) {
        urls.add(match[1].trim());
      }
    }
  }

  return Array.from(urls);
}
