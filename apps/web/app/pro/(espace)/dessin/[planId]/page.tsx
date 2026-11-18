import type { Metadata } from 'next';
import { Editeur } from '@/features/dessin/Editeur';
import { routes } from '@/lib/routes';
import { accesDessinPro } from '@/server/pageDessin';

export const metadata: Metadata = { title: 'Dessin', robots: { index: false } };

export default async function PageEditeurPro({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  await accesDessinPro(routes.proUnPlan(planId));
  return (
    // Sous 1024 px, la navigation du bas de l'espace pro est réservée sous l'éditeur.
    <div className="max-lg:[--marge-bas-dessin:calc(3.5rem+env(safe-area-inset-bottom))]">
      <Editeur espace="entreprise" planId={planId} />
    </div>
  );
}
