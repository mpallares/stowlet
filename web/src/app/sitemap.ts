import type { MetadataRoute } from 'next';
import { LEGAL_LAST_UPDATED, SITE_URL } from '@/config';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const legal = new Date(LEGAL_LAST_UPDATED);
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/support`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: legal, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: legal, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
