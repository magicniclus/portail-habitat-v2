import { lireBibliotheque, lireBrouillonFacture, lireClients } from '@ph/firebase/devis';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EditeurFacture } from '@/features/devis/EditeurFacture';
import { etatBrouillonFacture } from '@/features/devis/etat';
import { routes } from '@/lib/routes';
import { accesDevis, dbDevis, entrepriseFeuille, parametresEditeur } from '@/server/pageDevis';
import { maintenant } from '@/server/temps';

export const metadata: Metadata = { title: 'Brouillon de facture', robots: { index: false } };

/** Brouillon de facture rouvert dans l'éditeur pleine page ; émise, elle n'est plus modifiable. */
export default async function PageModifierFacture({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acces = await accesDevis(routes.proModifierFacture(id));
  if (!acces.facturer) redirect(routes.proDevis);
  const [b, { p }, biblio, clients] = await Promise.all([
    lireBrouillonFacture(dbDevis(), acces.artisanId, id),
    parametresEditeur(acces.artisanId),
    lireBibliotheque(dbDevis(), acces.artisanId),
    lireClients(dbDevis(), acces.artisanId),
  ]);
  if (!b) redirect(routes.proFactureClient(id));
  const aujourdHui = maintenant();
  return (
    <main>
      <EditeurFacture
        initial={etatBrouillonFacture(b, { tvaDefaut: p.tvaDefaut, aujourdHui })}
        parametres={p}
        tvaDefaut={p.tvaDefaut}
        bibliotheque={biblio.prestations}
        clients={clients}
        entreprise={await entrepriseFeuille(acces.artisanId, p)}
        aujourdHui={aujourdHui}
      />
    </main>
  );
}
