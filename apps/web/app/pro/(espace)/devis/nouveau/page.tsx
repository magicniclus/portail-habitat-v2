import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EditeurDevis } from '@/features/devis/EditeurDevis';
import { etatInitial } from '@/features/devis/etat';
import { routes } from '@/lib/routes';
import { accesDevis, parametresEditeur } from '@/server/pageDevis';
import { maintenant } from '@/server/temps';

export const metadata: Metadata = { title: 'Nouveau devis', robots: { index: false } };

export default async function PageNouveauDevis() {
  const acces = await accesDevis(routes.proDevisNouveau);
  if (!acces.gerer) redirect(routes.proDevis);
  const { p } = await parametresEditeur(acces.artisanId);
  return (
    <main className="grid gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">Nouveau devis</h1>
      <EditeurDevis
        initial={etatInitial({
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
