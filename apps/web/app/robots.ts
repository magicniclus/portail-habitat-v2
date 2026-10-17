import type { MetadataRoute } from 'next';
import { reglesRobots } from '@/features/vitrine/indexation';

export default function robots(): MetadataRoute.Robots {
  return reglesRobots(process.env.VERCEL_ENV === 'production');
}
