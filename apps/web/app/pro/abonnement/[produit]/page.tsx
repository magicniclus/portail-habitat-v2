import { peut } from '@ph/core/equipe';
import { NOMS_OFFRE, type ProduitAbonnement } from '@ph/core/facturation';
import { Banner, bouton, Logo } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PaiementOffre } from '@/features/abonnement/PaiementOffre';
import { routes } from '@/lib/routes';
import { sessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Paiement', robots: { index: false } };
export const dynamic = 'force-dynamic';

const PRODUITS: readonly ProduitAbonnement[] = ['premium', 'visibilite'];

/** Maquettes Paiement Offre Premium et Paiement Option Visibilité (ACQ-03, PAY-01). */
export default async function PagePaiement({
  params,
  searchParams,
}: {
  params: Promise<{ produit: string }>;
  searchParams: Promise<{ facturation?: string }>;
}) {
  const produit = (await params).produit as ProduitAbonnement;
  if (!PRODUITS.includes(produit)) notFound();
  const periode = (await searchParams).facturation === 'mensuel' ? 'mensuel' : 'annuel';
  const s = await sessionPro(routes.proAbonnement(produit, periode));
  const active = s.espace.active;
  const dejaActif =
    active?.artisan.plan === 'premium' ||
    (produit === 'visibilite' && active?.artisan.optionVisibilite === true);

  return (
    <div className="min-h-dvh bg-blanc">
      <header className="border-b border-trait px-4 py-3">
        <Link href={routes.proTableauDeBord} aria-label="Portail Habitat Pro, mon espace">
          <Logo variant="pro" />
        </Link>
      </header>
      <main className="mx-auto grid w-full max-w-[560px] gap-5 px-4 py-8">
        <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">{NOMS_OFFRE[produit]}</h1>
        {!active ? (
          <Banner tone="info">Rattachez d&apos;abord une entreprise à votre compte.</Banner>
        ) : dejaActif ? (
          <Banner
            tone="succes"
            titre="Cette offre est déjà active"
            action={
              <Link href={routes.proFacturation} className={bouton({ variant: 'secondaire' })}>
                Voir la facturation
              </Link>
            }
          >
            {active.artisan.nomCommercial} en profite déjà.
          </Banner>
        ) : !peut(active.membre, 'abonnement.gerer') ? (
          <Banner tone="info">
            Seuls le propriétaire et les gérants peuvent souscrire un abonnement pour{' '}
            {active.artisan.nomCommercial}.
          </Banner>
        ) : (
          <PaiementOffre
            produit={produit}
            periodeInitiale={periode}
            zone={[
              active.artisan.ville,
              active.artisan.rayonKm ? `${active.artisan.rayonKm} km` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        )}
      </main>
    </div>
  );
}
