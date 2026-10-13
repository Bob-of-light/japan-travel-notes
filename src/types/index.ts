export type IndexMode = 'category' | 'area';

export interface TransportLeg {
  mode?: string;
  line?: string;
  direction?: string;
  fromStation?: string;
  toStation?: string;
  rideMin?: number;
  walkMin?: number;
  note?: string;
}

export interface SpotImage {
  /** 相對於 public/ 的路徑，例如 images/super-potato/1.jpg */
  src: string;
  caption?: string;
}

export interface Spot {
  id: string;
  name: string;
  nameJa?: string;
  area: string;
  categories: string[];
  address?: string;
  mapQuery?: string;
  /** true = 完全不顯示地圖 */
  hideMap?: boolean;
  phone?: string;
  website?: string;
  hours?: string;
  closed?: string;
  description?: string;
  transport?: TransportLeg[];
  images?: SpotImage[];
  updatedAt?: string;
}

export interface SpotsSettings {
  /** 常用出發地，例如「上野站」。空字串代表尚未設定。 */
  origin?: string;
}

export interface SpotsData {
  version: number;
  updatedAt?: string;
  settings?: SpotsSettings;
  categories: string[];
  spots: Spot[];
}

export interface IndexLeaf {
  kind: 'spot';
  spot: Spot;
  count: 1;
}

export interface IndexBranch {
  kind: 'branch';
  name: string;
  count: number;
  children: IndexNode[];
}

export type IndexNode = IndexLeaf | IndexBranch;

export interface IndexTree {
  mode: IndexMode;
  roots: IndexBranch[];
  total: number;
}

/** Google Maps 連結解析結果 */
export interface ParsedMapLink {
  /** 座標形式的查詢字串，例如 "35.6994,139.7707" */
  coord?: string;
  /** 從網址帶出的地點名稱 */
  name?: string;
  /** 只從連結拿到搜尋文字，沒有座標 */
  query?: string;
  /** 需要後端跟隨轉址才能取得座標 */
  needsResolve?: boolean;
  /** 原始網址（需要跟隨轉址時會帶回來） */
  url?: string;
}

/** Nominatim 反查地址 */
export interface GeocodeAddress {
  postcode?: string;
  prefecture?: string;
  city?: string;
  quarter?: string;
  neighbourhood?: string;
  houseNumber?: string;
  building?: string;
  /** 組合好的日本格式地址 */
  formatted: string;
}