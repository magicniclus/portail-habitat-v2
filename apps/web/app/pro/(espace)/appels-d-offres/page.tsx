import { peut } from '@ph/core/equipe';
import { lireAppelsOffresPro } from '@ph/firebase/matching';
import { bouton } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppelsOffresPro } from '@/features/appelsOffres/AppelsOffresPro';
import { routes } from '@/lib/routes';
import { servicesEspace } from '@/server/espace';
import { flagActif } from '@/server/flags';
import { sessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Appels d’offres', robots: { index: false } };

/** Maquette « Appels d Offres » : chantiers anonymisés de la zone, à débloquer (PRO-04 à 06). */
export default async function PageAppelsOffres() {
  const s = await sessionPro(routes.proAppelsOffres);
  const active = s.espace.active;
  if (!active || !peut(active.membre, 'demandes.repondre')) redirect(routes.proTableauDeBord);
  const [d, paiementsOuverts] = await Promise.all([
    lireAppelsOffresPro(servicesEspace().db, active.artisanId, Date.now),
    flagActif('appelsOffresPayants'),
  ]);
  return (
    <main className="grid gap-5 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 mb-1.5 text-[clamp(26px,3vw,34px)] leading-[1.1]">Appels d’offres</h1>
          <p className="m-0 text-base text-neutre-800">
            {d.cartes.length} chantier{d.cartes.length > 1 ? 's' : ''} ouvert
            {d.cartes.length > 1 ? 's' : ''}
            {d.zone ? ` autour de ${d.zone}` : ''}. Vous choisissez ceux auxquels vous répondez.
          </p>
        </div>
        <Link href={routes.proFiche} className={bouton({ variant: 'secondaire' })}>
          Modifier ma zone
        </Link>
      </div>
      <AppelsOffresPro
        d={d}
        peutDebloquer={peut(active.membre, 'leads.debloquer')}
        peutAcheterPack={peut(active.membre, 'abonnement.gerer')}
        paiementsOuverts={paiementsOuverts}
      />
    </main>
  );
}
