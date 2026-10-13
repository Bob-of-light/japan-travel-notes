import type { Spot, TransportLeg } from '../types';

const enc = encodeURIComponent;

export function mapEmbedUrl(spot: Spot): string {
  const q = spot.mapQuery || spot.nameJa || spot.name || spot.address || '';
  const zoom = 16;
  return `https://maps.google.com/maps?q=${enc(q)}&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed`;
}

export function mapSearchUrl(spot: Spot): string {
  const q = spot.mapQuery || spot.nameJa || spot.name || spot.address || '';
  return `https://www.google.com/maps/search/?api=1&query=${enc(q)}`;
}

/** Google Maps 乘車（大眾運輸）路線規劃 */
export function googleDirUrl(leg: TransportLeg, spot: Spot): string {
  const destination = leg.toStation || spot.mapQuery || spot.nameJa || spot.name;
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
  const to = (leg.toStation || spot.mapQuery || spot.nameJa || spot.name).replace(/站$/, '');
  if (!from || !to) return null;
  return `https://transit.yahoo.co.jp/search/result/${enc(from)}-${enc(to)}`;
}

export function transportSummary(leg: TransportLeg): string {
  const parts: string[] = [];
  if (leg.line) parts.push(leg.line);
  if (leg.mode && !leg.line?.includes(leg.mode)) parts.push(leg.mode);
  return parts.join(' ');
}