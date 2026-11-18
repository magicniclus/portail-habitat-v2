import { COOKIE_SESSION } from '@ph/firebase/serveur';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Editeur } from '@/features/dessin/Editeur';
import { routes } from '@/lib/routes';
import { exigerDessin } from '@/server/pageDessin';

export const metadata: Metadata = { title: 'Mon plan', robots: { index: false } };

/** Éditeur de plan plein écran ; la session est vérifiée par chaque appel à `/api/dessin/*`. */
export default async function PageEditeurPlan({ params }: { params: Promise<{ planId: string }> }) {
  await exigerDessin();
  const { planId } = await params;
  if (!(await cookies()).has(COOKIE_SESSION))
    redirect(routes.connexionSuite(routes.editeurPlan(planId)));
  return <Editeur espace="particulier" planId={planId} />;
}
