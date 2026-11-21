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
  AccueilNeuf,
  CarteCompletude,
  EtatFiche,
  Indicateurs,
} from '@/features/espacePro/BlocsTableauDeBord';
import { RemplirFicheIa } from '@/features/fichePro/RemplirFicheIa';
import { ADRESSES_PRO } from '@/features/espacePro/adresses';
import { routes } from '@/lib/routes';
import { ApercuStatistiques } from '@/features/statistiques/ApercuStatistiques';
import { sessionPro } from '@/server/sessionPro';
import { statistiquesFiche } from '@/server/statistiques';

export const metadata: Metadata = { title: 'Tableau de bord', robots: { index: false } };

/**
 * Tableau de bord (maquette Espace Artisan Dashboard). Espace tout neuf : accueil « votre espace
 * est prêt » et un seul bouton (rédiger la fiche avec l'IA) ; état de la fiche et de l'assurance
 * dans les deux cas (décision du 15/11/2026).
 */
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

  // Statistiques pour tous les artisans, abonnés ou non (décision du 06/11/2026).
  const voitStats = peut(active.membre, 'statistiques.voir');
  const [t, stats] = await Promise.all([
    tableauDeBordPro(getFirestore(appAdmin()), active.artisanId),
    voitStats ? statistiquesFiche(active.artisanId, '30j') : null,
  ]);
  const { bienvenue } = await searchParams;
  // Pas d'adresse email en guise de prénom (compte sans nom renseigné).
  const prenom = s.nomAffiche.includes('@') ? '' : (s.nomAffiche.split(' ')[0] ?? '');
  const etat = <EtatFiche enLigne={t.enLigne} assurance={t.assurance} />;
  if (t.neuf)
    return (
      <main className="grid max-w-[880px] gap-5 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
        <AccueilNeuf
          prenom={prenom}
          action={
            peut(active.membre, 'fiche.modifier') ? (
              <RemplirFicheIa vide libelle="Rédiger ma fiche avec l’IA" grand />
            ) : null
          }
        />
        {etat}
      </main>
    );
  return (
    <main className="grid gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      {bienvenue ? (
        <Banner tone="succes" titre="Votre espace est créé">
          Bienvenue sur Portail Travaux Pro. Un email récapitulatif vous a été envoyé.
        </Banner>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 mb-1.5 text-[clamp(26px,3vw,34px)] leading-[1.1]">
            Bonjour{prenom ? ` ${prenom}` : ''}
          </h1>
          <p className="m-0 text-base text-neutre-800">
            Voici l&apos;activité de {active.artisan.nomCommercial} sur Portail Travaux.
          </p>
        </div>
        {peut(active.membre, 'demandes.repondre') ? (
          <Link href={routes.proDemandes} className={bouton()}>
            Voir les nouvelles demandes
          </Link>
        ) : null}
      </div>
      {t.enLigne && t.assurance === 'verifiee' ? null : etat}
      <Indicateurs i={t.indicateurs} completude={t.completude.pourcent} />
      {/* Fiche complète : plus de barre de progression, les graphiques prennent sa place. */}
      {t.completude.pourcent < 100 ? <CarteCompletude c={t.completude} /> : null}
      {stats ? <ApercuStatistiques s={stats} /> : null}
    </main>
  );
}
