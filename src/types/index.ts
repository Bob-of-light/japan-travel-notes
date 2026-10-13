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
  phone?: string;
  website?: string;
  hours?: string;
  closed?: string;
  description?: string;
  transport?: TransportLeg[];
  images?: SpotImage[];
  updatedAt?: string;
}

export interface SpotsData {
  version: number;
  updatedAt?: string;
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