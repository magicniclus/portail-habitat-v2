import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { guideParSlug } from '@/features/planMaison/contenu';
import { PageGuidePlan } from '@/features/planMaison/PageGuidePlan';
import { routes } from '@/lib/routes';
import { exigerDessinPublic } from '@/server/pageDessin';

type Props = { params: Promise<{ sujet: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = guideParSlug((await params).sujet);
  if (!guide) return {};
  return {
    title: guide.titre,
    description: guide.description,
    alternates: { canonical: routes.planMaisonGuide(guide.slug) },
    openGraph: {
      title: guide.titre,
      description: guide.description,
      images: ['/landing/captures/plans-3d.webp'],
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function PageGuide({ params }: Props) {
  await exigerDessinPublic();
  const guide = guideParSlug((await params).sujet);
  if (!guide) notFound();
  return <PageGuidePlan guide={guide} />;
}
