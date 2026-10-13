import type { GeocodeAddress, ParsedMapLink, SpotsData } from '../types';

interface SpotsResponse {
  data: SpotsData;
  editable: boolean;
}

export async function loadSpots(): Promise<SpotsResponse> {
  try {
    const res = await fetch('/api/spots', { cache: 'no-store' });
    if (res.ok) {
      const json = (await res.json()) as SpotsResponse;
      if (json?.data) return json;
    }
  } catch {
    // 沒有後端（例如 GitHub Pages 靜態版），改讀靜態檔
  }

  const res = await fetch(`${import.meta.env.BASE_URL}data/spots.json`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('找不到景點資料');
  return { data: (await res.json()) as SpotsData, editable: false };
}

export async function saveSpots(data: SpotsData): Promise<SpotsData> {
  const res = await fetch('/api/spots', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error ?? '儲存失敗');
  }
  return (json as SpotsResponse).data;
}

/** 上傳一張已經壓縮好的 JPEG */
export async function uploadImage(spotId: string, name: string, blob: Blob): Promise<string> {
  const res = await fetch(
    `/api/upload?spotId=${encodeURIComponent(spotId)}&name=${encodeURIComponent(name)}`,
    { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob },
  );

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? '圖片上傳失敗');
  return json.src as string;
}

/** 跟隨 Google Maps 短網址的轉址 */
export async function resolveMapUrl(url: string): Promise<string> {
  const res = await fetch('/api/resolve-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? '短網址解析失敗');
  return json.url as string;
}

/** 座標反查日文地址 */
export async function reverseGeocode(lat: number, lon: number): Promise<GeocodeAddress> {
  const res = await fetch('/api/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lon }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? '地址查詢失敗');
  return json.address as GeocodeAddress;
}

export type { ParsedMapLink };