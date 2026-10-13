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