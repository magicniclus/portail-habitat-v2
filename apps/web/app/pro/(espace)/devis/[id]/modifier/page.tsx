import { lireBibliotheque, lireClients, lireDevisComplet } from '@ph/firebase/devis';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { EditeurDevis } from '@/features/devis/EditeurDevis';
import { etatInitial } from '@/features/devis/etat';
import { routes } from '@/lib/routes';
import { accesDevis, dbDevis, entrepriseFeuille, parametresEditeur } from '@/server/pageDevis';
import { maintenant } from '@/server/temps';

export const metadata: Metadata = { title: 'Modifier le devis', robots: { index: false } };

/** Éditeur pleine page d'un brouillon ; un devis envoyé ne se modifie plus (récapitulatif). */
export default async function PageModifierDevis({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acces = await accesDevis(routes.proModifierDevis(id));
  const [d, { p }, biblio, clients] = await Promise.all([
    lireDevisComplet(dbDevis(), acces.artisanId, id),
    parametresEditeur(acces.artisanId),
    lireBibliotheque(dbDevis(), acces.artisanId),
    lireClients(dbDevis(), acces.artisanId),
  ]);
  if (!d) notFound();
  if (d.statut !== 'brouillon' || !acces.gerer) redirect(routes.proUnDevis(id));
  return (
    <main>
      <EditeurDevis
        entreprise={await entrepriseFeuille(acces.artisanId, p)}
        aujourdHui={maintenant()}
        initial={etatInitial({
          devis: d,
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
