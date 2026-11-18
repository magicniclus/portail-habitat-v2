import { peut } from '@ph/core/equipe';
import { lirePlanJoint } from '@ph/firebase/dessin';
import { Banner } from '@ph/ui';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Visionneuse } from '@/features/dessin/Visionneuse';
import { routes } from '@/lib/routes';
import { servicesDessin } from '@/server/dessin';
import { exigerDessin } from '@/server/pageDessin';
import { sessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Plan du client', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * Plan joint par le client à sa demande (DES-44), en lecture seule et plein écran : seulement
 * pour l'entreprise qui a accepté la demande, et tant que le client ne l'a pas retiré.
 */
export default async function PagePlanDemande({
  params,
}: {
  params: Promise<{ demandeId: string }>;
}) {
  await exigerDessin();
  const { demandeId } = await params;
  const s = await sessionPro(routes.proPlanDemande(demandeId));
  const active = s.espace.active;
  if (!active || !peut(active.membre, 'demandes.repondre')) redirect(routes.proTableauDeBord);
  const r = await lirePlanJoint(servicesDessin(), active.artisanId, demandeId)
    .then((plan) => ({ plan }))
    .catch((e: Error) => ({ erreur: e.message }));
  if ('erreur' in r)
    return (
      <main className="mx-auto grid max-w-xl gap-4 px-4 py-10">
        <Banner tone="info" titre="Plan indisponible">
          {r.erreur}
        </Banner>
      </main>
    );
  return <Visionneuse titre={r.plan.titre} scene={r.plan.scene} />;
}
