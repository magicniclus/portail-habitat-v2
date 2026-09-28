import type { MetadataRoute } from 'next';
import { pagesDuSitemap } from '@/features/vitrine/indexation';

export default function sitemap(): MetadataRoute.Sitemap {
  return pagesDuSitemap(new Date());
}
