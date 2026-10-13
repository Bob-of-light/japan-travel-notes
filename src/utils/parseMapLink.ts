import type { ParsedMapLink } from '../types';

const LAT = /(-?\d{1,3}\.\d{4,})/;

function isCoordPair(value: string): boolean {
  const m = value.match(/^(-?\d{1,3}\.\d{3,}),(-?\d{1,3}\.\d{3,})$/);
  if (!m) return false;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/** 從網址路徑 /place/<NAME>/ 取出地點名稱 */
function nameFromPath(pathname: string): string | undefined {
  const m = pathname.match(/\/place\/([^/]+)/);
  if (!m) return undefined;
  const raw = m[1];
  const plus = raw.match(/^(.*?)\/data/);
  const cleaned = decodeURIComponent(plus ? plus[1] : raw)
    .replace(/\+/g, ' ')
    .replace(/[!,*~'()]/g, ' ')
    .trim();
  return cleaned || undefined;
}

/**
 * 解析 Google Maps 網址，盡量取出座標與地點名稱。
 * 支援 /place/X/@lat,lng,17z、?q=lat,lng、?ll=lat,lng、/maps?q=<文字> 等常見格式。
 */
export function parseMapLink(raw: string): ParsedMapLink | null {
  const input = raw.trim();
  if (!input) return null;

  let url: URL;
  try {
    url = new URL(input.startsWith('http') ? input : `https://${input}`);
  } catch {
    return null;
  }

  if (!/(^|\.)(google\.[a-z.]+|goo\.gl)$/i.test(url.hostname)) return null;

  const result: ParsedMapLink = {};

  // 1. 短網址需要後端跟隨轉址
  if (/(^|\.)goo\.gl$/i.test(url.hostname) && url.pathname.length <= 12) {
    result.needsResolve = true;
    result.url = url.toString();
    return result;
  }

  const name = nameFromPath(url.pathname);
  if (name) result.name = name;

  // 2. @lat,lng,zoomz
  const at = url.pathname.match(/@(-?\d{1,3}\.\d{3,}),(-?\d{1,3}\.\d{3,})/);
  if (at) {
    result.coord = `${at[1]},${at[2]}`;
    return result;
  }

  // 3. 查詢參數裡的座標（q / ll / center）
  for (const key of ['q', 'll', 'query', 'center', 'destination']) {
    const v = url.searchParams.get(key);
    if (v && isCoordPair(v)) {
      result.coord = v;
      return result;
    }
  }

  // 4. 只有搜尋文字
  for (const key of ['q', 'query']) {
    const v = url.searchParams.get(key);
    if (v && !isCoordPair(v)) {
      result.query = v;
      return result;
    }
  }

  return result.name || result.query ? result : null;
}

/** 產生可直接丟進 Google 地圖嵌入的查詢字串 */
export function buildMapQuery(spot: {
  mapQuery?: string;
  nameJa?: string;
  name?: string;
  area?: string;
}): string {
  if (spot.mapQuery) return spot.mapQuery;
  const label = spot.nameJa || spot.name || '';
  if (!label) return '';
  return spot.area ? `${label} ${spot.area}` : label;
}