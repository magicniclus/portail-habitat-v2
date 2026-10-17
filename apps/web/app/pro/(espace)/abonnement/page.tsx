import { peut } from '@ph/core/equipe';
import {
  formuleDeOffre,
  offreProposee,
  optionBlogPossible,
  PRIX_FORMULES_HT,
} from '@ph/core/paiements';
import { Banner, bouton } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CreditsPacks } from '@/features/abonnement/CreditsPacks';
import { FenetreOptionBlog } from '@/features/abonnement/FenetreOptionBlog';
import { FenetrePaiement } from '@/features/abonnement/FenetrePaiement';
import { MoyenPaiement } from '@/features/abonnement/MoyenPaiement';
import { OptionBlog } from '@/features/abonnement/OptionBlog';
import { VotreFormule } from '@/features/abonnement/VotreFormule';
import { ListeFactures } from '@/features/facturation/Facturation';
import { routes } from '@/lib/routes';
import { facturationBloquee, lireMonAbonnement, remiseConversion } from '@/server/facturation';
import { sessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Abonnement et paiements', robots: { index: false } };

/**
 * Maquette Mon Abonnement (PAIEMENTS §4) : formule, crédits, carte et factures ; `?offre=` ouvre
 * directement la fenêtre de paiement (PAY-02). CON-02 : propriétaire ou gérant Tout inclus sans
 * second facteur → activation demandée avant l'accès.
 */
export default async function PageAbonnement({
  searchParams,
}: {
  searchParams: Promise<{ offre?: string; code?: string }>;
}) {
  const q = await searchParams;
  const s = await sessionPro(
    `${routes.proAbonnement}${q.offre ? `?offre=${encodeURIComponent(q.offre)}` : ''}`,
  );
  const active = s.espace.active;
  if (!active) redirect(routes.proTableauDeBord);
  const titre = (
    <div>
      <h1 className="m-0 mb-1.5 text-[clamp(26px,3vw,34px)] leading-[1.1]">
        Abonnement et paiements
      </h1>
      <p className="m-0 text-base text-neutre-800">Votre formule, vos crédits et vos factures.</p>
    </div>
  );
  if (facturationBloquee(s))
    return (
      <main className="grid max-w-[860px] gap-5 px-[clamp(16px,3vw,32px)] py-10">
        {titre}
        <Banner
          tone="attention"
          titre="Activez la double authentification"
          action={
            <Link href={`${routes.proCompte}#securite`} className={bouton()}>
              Activer maintenant
            </Link>
          }
        >
          Pour protéger vos paiements, la double authentification est obligatoire avant
          d&apos;accéder à l&apos;abonnement.
        </Banner>
      </main>
    );
  const gerer = peut(active.membre, 'abonnement.gerer');
  const formule = active.artisan.formule;
  const m = await lireMonAbonnement(active.artisanId);
  // `?offre=blog` (D71) : fenêtre de l'option si la formule la permet ; sans site, Site Pro d'abord.
  const optionBlog = gerer && q.offre === 'blog' && optionBlogPossible(formule) && !m.optionBlog;
  const voulue = !gerer
    ? null
    : q.offre === 'blog'
      ? optionBlogPossible(formule) || formule === 'tout_inclus'
        ? null
        : offreProposee(formule, 'site_pro')
      : formuleDeOffre(q.offre);
  const code = voulue && q.code ? await remiseConversion(q.code, active.artisanId, voulue) : null;
  return (
    <main className="grid max-w-[860px] gap-6 px-[clamp(16px,3vw,32px)] py-10">
      {titre}
      {code === 'invalide' ? (
        <Banner tone="attention">Ce code n’est plus valable. Le tarif normal s’applique.</Banner>
      ) : null}
      <VotreFormule formule={formule} abonnement={m.abonnements[0]} gerer={gerer} />
      {m.optionBlog ? <OptionBlog gerer={gerer} /> : null}
      <CreditsPacks solde={m.soldeCredits} peutAcheter={gerer} />
      <MoyenPaiement carte={m.carte} email={m.emailFacturation} gerer={gerer && !!m.carte} />
      <ListeFactures factures={m.factures} />
      {voulue && voulue !== formule ? (
        <FenetrePaiement
          key={voulue}
          formule={voulue}
          actuelle={formule}
          prixActuelHt={formule === 'gratuit' ? 0 : PRIX_FORMULES_HT[formule]}
          code={code && code !== 'invalide' ? code : null}
        />
      ) : null}
      {optionBlog ? <FenetreOptionBlog /> : null}
    </main>
  );
}
