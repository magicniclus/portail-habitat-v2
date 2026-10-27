import { lireBibliotheque, lireClients, lireDevisDepuisDemande } from '@ph/firebase/devis';
import { Banner } from '@ph/ui';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EditeurDevis } from '@/features/devis/EditeurDevis';
import { etatInitial } from '@/features/devis/etat';
import { routes } from '@/lib/routes';
import { servicesEspace } from '@/server/espace';
import { accesDevis, dbDevis, entrepriseFeuille, parametresEditeur } from '@/server/pageDevis';
import { maintenant } from '@/server/temps';

export const metadata: Metadata = { title: 'Nouveau devis', robots: { index: false } };

/**
 * Nouveau devis ; `?demande=` : depuis une demande acceptée de « Mes demandes », client repris ;
 * `?modele=` : lignes et titre d'un modèle.
 */
export default async function PageNouveauDevis({
  searchParams,
}: {
  searchParams: Promise<{ demande?: string; modele?: string }>;
}) {
  const acces = await accesDevis(routes.proDevisNouveau);
  if (!acces.gerer) redirect(routes.proDevis);
  const q = await searchParams;
  const demandeId = q.demande;
  const [{ p }, biblio, clients, demande] = await Promise.all([
    parametresEditeur(acces.artisanId),
    lireBibliotheque(dbDevis(), acces.artisanId),
    lireClients(dbDevis(), acces.artisanId),
    demandeId && /^[A-Za-z0-9_-]{1,128}$/.test(demandeId)
      ? lireDevisDepuisDemande(
          dbDevis(),
          acces.artisanId,
          demandeId,
          servicesEspace().nomPrestation,
        )
      : null,
  ]);
  const modele = q.modele ? biblio.modeles.find((m) => m.id === q.modele) : undefined;
  const entreprise = await entrepriseFeuille(acces.artisanId, p);
  return (
    <main>
      <EditeurDevis
        entreprise={entreprise}
        aujourdHui={maintenant()}
        bandeau={
          demande ? (
            <Banner tone="info" titre={`En réponse à la demande : ${demande.objet}`}>
              {demande.precisions ||
                'Client repris de la demande. Complétez son adresse avant l’envoi.'}
            </Banner>
          ) : null
        }
        initial={etatInitial({
          ...(demande ? { demande } : {}),
          ...(modele ? { modele } : {}),
          acompteDefautPct: p.acompteDefautPct,
          validiteJours: p.validiteDevisJours,
          tvaDefaut: p.tvaDefaut,
          aujourdHui: maintenant(),
        })}
        parametres={p}
        tvaDefaut={p.tvaDefaut}
        bibliotheque={biblio.prestations}
        clients={clients}
      />
    </main>
  );
}
