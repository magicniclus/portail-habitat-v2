import type { Metadata } from 'next';
import { PageArticle } from '@/server/pageArticle';

export const metadata: Metadata = { title: 'Article du blog', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function PageModifierArticle({ params }: { params: Promise<{ id: string }> }) {
  return <PageArticle articleId={(await params).id} />;
}
