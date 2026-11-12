import type { MetadataRoute } from 'next';
import { DOMAINS, SITE, getJSON, type Cluster } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: SITE },
    { url: `${SITE}/explore` },
    { url: `${SITE}/lens-scan` },
    { url: `${SITE}/trends` },
    { url: `${SITE}/reports` },
    { url: `${SITE}/settings` },
    { url: `${SITE}/about` },
  ];
  for (const d of DOMAINS) {
    const r = await getJSON(`/trends?domain=${d}`).catch(() => null);
    (r?.clusters ?? []).forEach((c: Cluster) =>
      pages.push({ url: `${SITE}/${d}/${c.cluster_id}` })
    );
  }
  return pages;
}
