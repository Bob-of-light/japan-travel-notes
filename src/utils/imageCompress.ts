/**
 * 瀏覽器端圖片壓縮：縮到最大邊 1600px、轉 JPEG 品質 0.82。
 * 重新編碼的同時會去掉原始檔的 EXIF／GPS 資訊。
 */
export interface CompressResult {
  blob: Blob;
  width: number;
  height: number;
  originalBytes: number;
}

const MAX_SIZE = 1600;
const QUALITY = 0.82;
const MAX_INPUT_BYTES = 40 * 1024 * 1024;

export async function compressImage(
  file: File,
  maxSize = MAX_SIZE,
  quality = QUALITY,
): Promise<CompressResult> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(`${file.name} 太大了（${formatBytes(file.size)}），請用 40MB 以下的照片`);
  }

  const bitmap = await loadImage(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if ('close' in bitmap) bitmap.close();
    throw new Error('這個瀏覽器不支援圖片處理，請改用 Chrome');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ('close' in bitmap) bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error(`${file.name} 壓縮失敗`);

  return { blob, width, height, originalBytes: file.size };
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // HEIC 等 createImageBitmap 處理不了的格式，改走 <img>
    }
  }
  return loadViaImgElement(file);
}

function loadViaImgElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`${file.name} 不是能開啟的圖片格式`));
    };
    img.src = url;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}