import type { Metadata } from 'next';
import { LANDING_PLAN } from '@/features/planMaison/contenu';
import { PagePlanMaison } from '@/features/planMaison/PagePlanMaison';
import { routes } from '@/lib/routes';
import { exigerDessinPublic } from '@/server/pageDessin';

export const metadata: Metadata = {
  title: LANDING_PLAN.titre,
  description: LANDING_PLAN.description,
  alternates: { canonical: routes.planMaison },
  openGraph: {
    title: LANDING_PLAN.titre,
    description: LANDING_PLAN.description,
    images: ['/landing/captures/plans-3d.webp'],
  },
};

// Comme /dessin : ouverte avec la page publique Plans (flags `dessin` et `dessinPublic`).
export const dynamic = 'force-dynamic';

export default async function PagePlanMaisonGratuit() {
  await exigerDessinPublic();
  return <PagePlanMaison />;
}
