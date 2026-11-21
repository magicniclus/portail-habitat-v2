import type { Metadata } from 'next';
import { PageArticle } from '@/server/pageArticle';

export const metadata: Metadata = { title: 'Nouvel article', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function PageNouvelArticle() {
  return <PageArticle />;
}
