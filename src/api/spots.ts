import type { SpotsData } from '../types';

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