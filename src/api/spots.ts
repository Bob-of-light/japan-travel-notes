import type { GeocodeAddress, SpotsData } from '../types';

interface SpotsResponse {
  data: SpotsData;
  editable: boolean;
}

const BASE = import.meta.env.BASE_URL ?? '/';

/** 線上寫入 API（Vercel）。本機開發時為空字串，代表用本機 Node 後端。 */
export const WRITE_API: string = (import.meta.env.VITE_WRITE_API_URL ?? '').replace(/\/+$/, '');

export const PIN_STORAGE_KEY = 'ryoko-pin';

export function loadPin(): string {
  try {
    return localStorage.getItem(PIN_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function savePin(pin: string) {
  try {
    if (pin) localStorage.setItem(PIN_STORAGE_KEY, pin);
    else localStorage.removeItem(PIN_STORAGE_KEY);
  } catch {
    // 無痕模式會失敗，不影響其他功能
  }
}

async function apiFetch(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${WRITE_API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

async function readError(res: Response, fallback: string): Promise<string> {
  const json = await res.json().catch(() => null);
  return json?.error ?? fallback;
}

export async function loadSpots(): Promise<SpotsResponse> {
  // 1. 本機 Node 後端
  try {
    const res = await fetch('/api/spots', { cache: 'no-store' });
    if (res.ok) {
      const json = (await res.json()) as SpotsResponse;
      if (json?.data) return json;
    }
  } catch {
    // 沒有本機後端，繼續往下
  }

  // 2. 線上寫入 API 是否可用
  let onlineWritable = false;
  if (WRITE_API) {
    try {
      const res = await apiFetch('/api/data', { method: 'GET' });
      const json = await res.json().catch(() => null);
      onlineWritable = Boolean(json?.online);
    } catch {
      onlineWritable = false;
    }
  }

  // 3. 靜態檔（GitHub Pages 上線的最新版本）
  const res = await fetch(`${BASE}data/spots.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('找不到景點資料');
  const data = (await res.json()) as SpotsData;

  return { data, editable: onlineWritable };
}

export async function saveSpots(data: SpotsData, message?: string): Promise<SpotsData> {
  if (WRITE_API) {
    return saveRemote(data, message);
  }
  return saveLocal(data);
}

async function saveLocal(data: SpotsData): Promise<SpotsData> {
  const res = await fetch('/api/spots', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? '儲存失敗');
  return (json as SpotsResponse).data;
}

async function saveRemote(data: SpotsData, message?: string): Promise<SpotsData> {
  const pin = loadPin();
  const text = JSON.stringify(data, null, 2) + '\n';

  // 先做 base64，避免中文字元在 JSON 傳遞過程中被破壞
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const contentBase64 = btoa(binary);

  const res = await apiFetch('/api/data', {
    method: 'POST',
    headers: { 'X-Pin': pin },
    body: JSON.stringify({
      data,
      contentBase64,
      message: message || `更新旅遊筆記（${data.spots.length} 個景點）`,
    }),
  });

  if (!res.ok) throw new Error(await readError(res, '儲存失敗'));
  return data;
}

/**
 * 驗證 PIN 是否正確。
 * ⚠️ 絕對不能帶任何會被寫入的資料，這裡用 dryRun 讓伺服器只驗證不寫檔。
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const res = await fetch(`${WRITE_API}/api/data?dryRun=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Pin': pin },
    body: JSON.stringify({ dryRun: true }),
  }).catch(() => null);

  if (!res) return false;
  // 200 = 密碼正確；401 = 密碼錯誤
  return res.status === 200;
}

export async function uploadImage(spotId: string, name: string, blob: Blob): Promise<string> {
  if (WRITE_API) {
    return uploadRemote(spotId, name, blob);
  }
  return uploadLocal(spotId, name, blob);
}

async function uploadLocal(spotId: string, name: string, blob: Blob): Promise<string> {
  const res = await fetch(
    `/api/upload?spotId=${encodeURIComponent(spotId)}&name=${encodeURIComponent(name)}`,
    { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? '圖片上傳失敗');
  return json.src as string;
}

async function uploadRemote(spotId: string, name: string, blob: Blob): Promise<string> {
  const base64 = await blobToBase64(blob);
  const res = await apiFetch('/api/image', {
    method: 'POST',
    headers: { 'X-Pin': loadPin() },
    body: JSON.stringify({ spotId, name, contentBase64: base64 }),
  });
  if (!res.ok) throw new Error(await readError(res, '圖片上傳失敗'));
  const json = await res.json();
  return json.src as string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('圖片讀取失敗'));
    reader.readAsDataURL(blob);
  });
}

/** 本機 Node 後端或線上 Vercel 函式，依 WRITE_API 是否有設定決定 */
function endpoint(localPath: string): string {
  return WRITE_API ? `${WRITE_API}${localPath}` : localPath;
}

async function postLocal<T>(path: string, body: unknown, pin?: string): Promise<T> {
  const res = await fetch(endpoint(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(pin ? { 'X-Pin': pin } : {}) },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json as T;
}

/** 跟隨 Google Maps 短網址的轉址 */
export async function resolveMapUrl(url: string): Promise<string> {
  const json = await postLocal<{ url: string }>('/api/resolve-url', { url });
  return json.url;
}

/** 座標反查日文地址 */
export async function reverseGeocode(lat: number, lon: number): Promise<GeocodeAddress> {
  const json = await postLocal<{ address: GeocodeAddress }>('/api/geocode', { lat, lon });
  return json.address;
}