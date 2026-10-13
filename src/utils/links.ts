import type { Spot, TransportLeg } from '../types';
import { buildMapQuery } from './parseMapLink';

const enc = encodeURIComponent;

/** 把 public/ 下的相對路徑轉成可用的網址（考慮 GitHub Pages 的 base 路徑） */
export function assetUrl(src: string): string {
  if (/^https?:\/\//i.test(src) || src.startsWith('data:')) return src;
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base}${src.replace(/^\//, '')}`;
}

/** 地圖優先用座標，沒有就用「名稱＋地名」讓 Google 自己找 */
export function mapEmbedUrl(spot: Spot): string {
  const query = buildMapQuery(spot);
  return `https://maps.google.com/maps?q=${enc(query)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
}

export function mapSearchUrl(spot: Spot): string {
  return `https://www.google.com/maps/search/?api=1&query=${enc(buildMapQuery(spot))}`;
}

/** 路線規劃用「文字地點」而不是座標，Google／Yahoo 都能處理 */
export function spotDestination(spot: Spot): string {
  return spot.nameJa || spot.name || spot.mapQuery || spot.address || '';
}

export function googleDirUrl(leg: TransportLeg, spot: Spot): string {
  const destination = leg.toStation || spotDestination(spot);
  const origin = leg.fromStation;
  if (!origin) {
    return `https://www.google.com/maps/dir/?api=1&destination=${enc(destination)}&travelmode=transit`;
  }
  return `https://www.google.com/maps/dir/?api=1&origin=${enc(origin)}&destination=${enc(
    destination,
  )}&travelmode=transit`;
}

/** Yahoo!乘換案内：即時到站、時刻表、遅延資訊 */
export function yahooTransitUrl(leg: TransportLeg, spot: Spot): string | null {
  const from = leg.fromStation?.replace(/站$/, '');
  const to = (leg.toStation || spotDestination(spot)).replace(/站$/, '');
  if (!from || !to) return null;
  return `https://transit.yahoo.co.jp/search/result/${enc(from)}-${enc(to)}`;
}

/** 只知道出發地與目的地時產生查詢連結（沒有詳細路線時用） */
export function originGoogleDirUrl(origin: string, spot: Spot): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${enc(origin)}&destination=${enc(
    spotDestination(spot),
  )}&travelmode=transit`;
}

export function originYahooUrl(origin: string, spot: Spot): string {
  const from = origin.replace(/站$/, '');
  const to = spotDestination(spot).replace(/站$/, '');
  return `https://transit.yahoo.co.jp/search/result/${enc(from)}-${enc(to)}`;
}

/** 從資料裡撈出出現過的車站地名，當出發地的輸入建議 */
export function collectStationHints(spots: Spot[]): string[] {
  const set = new Set<string>();
  for (const spot of spots) {
    for (const leg of spot.transport ?? []) {
      if (leg.fromStation) set.add(leg.fromStation);
      if (leg.toStation) set.add(leg.toStation);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
}