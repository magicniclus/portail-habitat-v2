import { lireDevisListe, lireFacturesListe } from '@ph/firebase/devis';
import { Banner, bouton, cn } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ListeDevis, ListeFactures } from '@/features/devis/Listes';
import { routes } from '@/lib/routes';
import { accesDevis, dbDevis, parametresEditeur } from '@/server/pageDevis';

export const metadata: Metadata = { title: 'Devis & factures', robots: { index: false } };

/** Maquette Devis et Factures : listes des devis et des factures, gratuites pour toutes les formules. */
export default async function PageDevis({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const acces = await accesDevis(routes.proDevis);
  const onglet = (await searchParams).onglet === 'factures' ? 'factures' : 'devis';
  const [devis, factures, { saisis }] = await Promise.all([
    onglet === 'devis' ? lireDevisListe(dbDevis(), acces.artisanId) : [],
    onglet === 'factures' ? lireFacturesListe(dbDevis(), acces.artisanId) : [],
    parametresEditeur(acces.artisanId),
  ]);
  const ongletCls = (actif: boolean) =>
    cn(
      'flex min-h-11 items-center rounded-control px-4 font-semibold no-underline',
      actif ? 'bg-accent-100 text-accent-800' : 'text-neutre-800',
    );
  return (
    <main className="grid gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 mb-1.5 text-[clamp(26px,3vw,34px)] leading-[1.1]">Devis & factures</h1>
          <p className="m-0 text-base text-neutre-800">
            Mentions obligatoires vérifiées avant chaque envoi. Gratuit, sans limite.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={routes.proDevisParametres} className={bouton({ variant: 'secondaire' })}>
            Paramètres
          </Link>
          {acces.gerer ? (
            <Link href={routes.proDevisNouveau} className={bouton()}>
              + Nouveau devis
            </Link>
          ) : null}
        </div>
      </div>
      {!saisis ? (
        <Banner
          tone="attention"
          titre="Complétez vos paramètres de facturation"
          action={
            <Link href={routes.proDevisParametres} className={bouton({ variant: 'secondaire' })}>
              Compléter
            </Link>
          }
        >
          Identité, assurance décennale et médiateur figurent sur chaque devis : sans eux, l’envoi
          est bloqué.
        </Banner>
      ) : null}
      <nav aria-label="Devis ou factures" className="flex gap-2">
        <Link
          href={routes.proDevis}
          className={ongletCls(onglet === 'devis')}
          aria-current={onglet === 'devis' ? 'page' : undefined}
        >
          Devis
        </Link>
        <Link
          href={`${routes.proDevis}?onglet=factures` as typeof routes.proDevis}
          className={ongletCls(onglet === 'factures')}
          aria-current={onglet === 'factures' ? 'page' : undefined}
        >
          Factures
        </Link>
      </nav>
      {onglet === 'devis' ? <ListeDevis devis={devis} /> : <ListeFactures factures={factures} />}
    </main>
  );
}
