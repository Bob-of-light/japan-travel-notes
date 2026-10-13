/**
 * POST → 用座標反查日文地址（OpenStreetMap Nominatim，免金鑰）。
 *
 * 記憶體快取 + 每分鐘最多 3 次（對方規範是每秒 1 次）。
 * 個人使用量很小，足夠且友善。
 */
import { applyCors, fail } from './_shared.js';

const ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
const cache = new Map();

let lastCall = 0;

function waitForTurn() {
  const now = Date.now();
  const gap = 350 - (now - lastCall);
  if (gap > 0) return new Promise((r) => setTimeout(r, gap));
  lastCall = Date.now();
  return Promise.resolve();
}

const PREFECTURE_SUFFIX = /(都|道|府|県)$/;

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, '不支援的方法');

  const { lat, lon } = req.body ?? {};
  const latNum = Number(lat);
  const lonNum = Number(lon);

  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum) ||
      Math.abs(latNum) > 90 || Math.abs(lonNum) > 180) {
    return fail(res, 400, '座標不合法');
  }

  const key = `${latNum.toFixed(5)},${lonNum.toFixed(5)}`;
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expires) {
    return res.status(200).json({ address: hit.value, cached: true });
  }

  try {
    await waitForTurn();

    const url = `${ENDPOINT}?lat=${latNum}&lon=${lonNum}&format=json&addressdetails=1&accept-language=ja`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ryoko-japan-notes/1.0 (personal travel notes)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`Nominatim 回應 ${response.status}`);

    const json = await response.json();
    const a = json.address ?? {};
    const parts = String(json.display_name ?? '').split(',').map((s) => s.trim());
    const prefecture = parts.find((p) => PREFECTURE_SUFFIX.test(p)) ?? a.state ?? '';

    const address = {
      postcode: a.postcode ?? '',
      prefecture,
      city: a.city ?? a.city_district ?? '',
      quarter: a.quarter ?? '',
      neighbourhood: a.neighbourhood ?? a.suburb ?? '',
      houseNumber: a.house_number ?? '',
      building: a.building ?? '',
      formatted: '',
    };

    // neighbourhood 通常已包含 quarter，避免重複（外神田二丁目 / 外神田）
    const quarter =
      address.quarter && !address.neighbourhood?.startsWith(address.quarter) ? address.quarter : '';
    const street = [address.neighbourhood, address.houseNumber].filter(Boolean).join('');
    const body = [address.prefecture, address.city, quarter, street].filter(Boolean).join('');

    address.formatted =
      [
        address.postcode ? `〒${address.postcode}` : '',
        body,
        address.building ? `（${address.building}）` : '',
      ]
        .filter(Boolean)
        .join(' ') || String(json.display_name ?? '');

    cache.set(key, { value: address, expires: Date.now() + CACHE_TTL });
    if (cache.size > 300) cache.delete(cache.keys().next().value);

    res.status(200).json({ address, cached: false });
  } catch (err) {
    fail(res, 502, `地址查詢失敗：${err.message}`);
  }
}