export const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const DOMAINS = ['fashion', 'cars'] as const;

export type Cluster = { cluster_id: number; name: string; label: string; share: number[] };
export type Forecast = {
  domain?: string;
  cluster_id: number;
  name: string;
  label: string;
  timeline?: string;
  history: { year: number; share: number }[];
  forecast: { year: number; yhat: number; lower: number; upper: number }[];
  sample_images?: number[];
};
export type Match = {
  cluster_id: number;
  name: string;
  label: string;
  score: number;
  sample_images?: number[];
};

export type SimilarImage = {
  image_id: number;
  score: number;
  cluster_id: number;
  cluster_name: string;
  cluster_label: string;
  url: string;
};

export type SimilarityResponse = {
  matches: Match[];
  similar_images?: SimilarImage[];
};

export type CatalogImage = {
  id: number;
  domain: string;
  path: string;
  url: string;
  taken_on: string;
  cluster_id: number;
  cluster_name: string;
  cluster_label: string;
};

export type CatalogResponse = {
  domain: string;
  cluster_id: number | null;
  total: number;
  limit: number;
  offset: number;
  images: CatalogImage[];
};

export async function getJSON(path: string) {
  const r = await fetch(API + path, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
