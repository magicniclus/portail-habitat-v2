import type { Metadata } from 'next';
import { Editeur } from '@/features/dessin/Editeur';
import { routes } from '@/lib/routes';
import { accesDessinPro } from '@/server/pageDessin';

export const metadata: Metadata = { title: 'Plan', robots: { index: false } };

/** Éditeur de plan plein écran, hors du menu de l'espace pro (comme l'éditeur du site). */
export default async function PageEditeurPlanPro({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  await accesDessinPro(routes.proEditeurPlan(planId));
  return <Editeur espace="entreprise" planId={planId} />;
}
