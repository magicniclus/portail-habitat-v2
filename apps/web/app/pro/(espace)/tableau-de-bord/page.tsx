import { accueilPro } from '@ph/core/espace-pro';
import { peut } from '@ph/core/equipe';
import { appAdmin } from '@ph/firebase/admin';
import { tableauDeBordPro } from '@ph/firebase/comptes';
import { Banner, bouton, EmptyState } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  CarteCompletude,
  EtapesEnLigne,
  Indicateurs,
} from '@/features/espacePro/BlocsTableauDeBord';
import { ADRESSES_PRO } from '@/features/espacePro/adresses';
import { routes } from '@/lib/routes';
import { sessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Tableau de bord', robots: { index: false } };

/** Tableau de bord (maquette Espace Artisan Dashboard) ; fiche hors ligne → étapes de mise en ligne (ONB-06). */
export default async function PageTableauDeBord({
  searchParams,
}: {
  searchParams: Promise<{ bienvenue?: string }>;
}) {
  const s = await sessionPro(routes.proTableauDeBord);
  const active = s.espace.active;
  if (!active)
    return (
      <main className="p-[clamp(16px,3vw,32px)]">
        <EmptyState
          titre="Aucune entreprise active"
          action={
            <Link href={routes.proInscription} className={bouton()}>
              Inscrire mon entreprise
            </Link>
          }
        >
          Votre accès à l&apos;entreprise a été retiré ou suspendu. Inscrivez votre entreprise ou
          demandez à son propriétaire de vous inviter.
        </EmptyState>
      </main>
    );
  const accueil = accueilPro(active.membre);
  if (accueil !== 'tableauDeBord') redirect(ADRESSES_PRO[accueil]);

  const t = await tableauDeBordPro(getFirestore(appAdmin()), active.artisanId, s.uid);
  const { bienvenue } = await searchParams;
  const prenom = s.nomAffiche.split(' ')[0];
  return (
    <main className="grid gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      {bienvenue ? (
        <Banner tone="succes" titre="Votre espace est créé">
          Bienvenue sur Portail Habitat Pro. Un email récapitulatif vous a été envoyé.
        </Banner>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 mb-1.5 text-[clamp(26px,3vw,34px)] leading-[1.1]">Bonjour {prenom}</h1>
          <p className="m-0 text-base text-neutre-800">
            Voici l&apos;activité de {active.artisan.nomCommercial} sur Portail Habitat.
          </p>
        </div>
        {peut(active.membre, 'demandes.repondre') ? (
          <Link href={routes.proDemandes} className={bouton()}>
            Voir les nouvelles demandes
          </Link>
        ) : null}
      </div>
      {t.enLigne ? null : <EtapesEnLigne m={t.miseEnLigne} />}
      <Indicateurs i={t.indicateurs} completude={t.completude.pourcent} />
      <CarteCompletude c={t.completude} />
    </main>
  );
}
