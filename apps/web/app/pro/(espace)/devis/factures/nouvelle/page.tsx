import { lireBibliotheque } from '@ph/firebase/devis';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EditeurFacture } from '@/features/devis/EditeurFacture';
import { etatInitial } from '@/features/devis/etat';
import { routes } from '@/lib/routes';
import { accesDevis, dbDevis, entrepriseFeuille, parametresEditeur } from '@/server/pageDevis';
import { maintenant } from '@/server/temps';

export const metadata: Metadata = { title: 'Nouvelle facture', robots: { index: false } };

/** « Nouvelle facture » sans devis : même feuille A4 que le devis, émise d'un coup. */
export default async function PageNouvelleFacture() {
  const acces = await accesDevis(routes.proFactureNouvelle);
  if (!acces.facturer) redirect(routes.proDevis);
  const [{ p }, biblio] = await Promise.all([
    parametresEditeur(acces.artisanId),
    lireBibliotheque(dbDevis(), acces.artisanId),
  ]);
  const aujourdHui = maintenant();
  return (
    <main>
      <EditeurFacture
        initial={{
          ...etatInitial({
            acompteDefautPct: 0,
            validiteJours: p.validiteDevisJours,
            tvaDefaut: p.tvaDefaut,
            aujourdHui,
          }),
          datePrestationLe: new Date(aujourdHui).toISOString().slice(0, 10),
        }}
        parametres={p}
        tvaDefaut={p.tvaDefaut}
        bibliotheque={biblio.prestations}
        entreprise={await entrepriseFeuille(acces.artisanId, p)}
        aujourdHui={aujourdHui}
      />
    </main>
  );
}
