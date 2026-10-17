import { lireDevisDepuisDemande } from '@ph/firebase/devis';
import { Banner } from '@ph/ui';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EditeurDevis } from '@/features/devis/EditeurDevis';
import { etatInitial } from '@/features/devis/etat';
import { routes } from '@/lib/routes';
import { servicesEspace } from '@/server/espace';
import { accesDevis, dbDevis, parametresEditeur } from '@/server/pageDevis';
import { maintenant } from '@/server/temps';

export const metadata: Metadata = { title: 'Nouveau devis', robots: { index: false } };

/** Nouveau devis ; `?demande=` : depuis une demande acceptée de « Mes demandes », client repris. */
export default async function PageNouveauDevis({
  searchParams,
}: {
  searchParams: Promise<{ demande?: string }>;
}) {
  const acces = await accesDevis(routes.proDevisNouveau);
  if (!acces.gerer) redirect(routes.proDevis);
  const demandeId = (await searchParams).demande;
  const [{ p }, demande] = await Promise.all([
    parametresEditeur(acces.artisanId),
    demandeId && /^[A-Za-z0-9_-]{1,128}$/.test(demandeId)
      ? lireDevisDepuisDemande(
          dbDevis(),
          acces.artisanId,
          demandeId,
          servicesEspace().nomPrestation,
        )
      : null,
  ]);
  return (
    <main className="grid gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">Nouveau devis</h1>
      {demande ? (
        <Banner tone="info" titre={`En réponse à la demande : ${demande.objet}`}>
          {demande.precisions ||
            'Client repris de la demande. Complétez son adresse avant l’envoi.'}
        </Banner>
      ) : null}
      <EditeurDevis
        initial={etatInitial({
          ...(demande ? { demande } : {}),
          acompteDefautPct: p.acompteDefautPct,
          validiteJours: p.validiteDevisJours,
          tvaDefaut: p.tvaDefaut,
          aujourdHui: maintenant(),
        })}
        parametres={p}
        tvaDefaut={p.tvaDefaut}
      />
    </main>
  );
}
