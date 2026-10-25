import { devisAExpirer } from '@ph/core/devis';
import { lireBibliotheque, lireDevisListe, lireFacturesListe } from '@ph/firebase/devis';
import { Banner, bouton, cn } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BibliothequePrestations } from '@/features/devis/BibliothequePrestations';
import { ExpirerDevis } from '@/features/devis/ExpirerDevis';
import { ListeDevis, ListeFactures } from '@/features/devis/Listes';
import { ModelesDevis } from '@/features/devis/ModelesDevis';
import { routes } from '@/lib/routes';
import { accesDevis, dbDevis, parametresEditeur } from '@/server/pageDevis';
import { maintenant } from '@/server/temps';

export const metadata: Metadata = { title: 'Devis & factures', robots: { index: false } };

/** Maquette Devis et Factures : listes des devis et des factures, gratuites pour toutes les formules. */
export default async function PageDevis({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const acces = await accesDevis(routes.proDevis);
  const demande = (await searchParams).onglet;
  const onglet = demande === 'factures' || demande === 'modeles' ? demande : 'devis';
  const [devis, factures, biblio, { saisis, p }] = await Promise.all([
    onglet === 'devis' ? lireDevisListe(dbDevis(), acces.artisanId) : [],
    onglet === 'factures' ? lireFacturesListe(dbDevis(), acces.artisanId) : [],
    onglet === 'modeles' ? lireBibliotheque(dbDevis(), acces.artisanId) : null,
    parametresEditeur(acces.artisanId),
  ]);
  const instant = maintenant();
  const horsValidite = devis
    .filter((d) =>
      devisAExpirer(
        { ...d, validiteLe: d.validiteLe ? new Date(d.validiteLe) : undefined },
        instant,
      ),
    )
    .map((d) => d.id);
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
          {acces.facturer ? (
            <Link href={routes.proFactureNouvelle} className={bouton({ variant: 'secondaire' })}>
              + Nouvelle facture
            </Link>
          ) : null}
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
      <nav aria-label="Devis, factures et modèles" className="flex flex-wrap gap-2">
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
        <Link
          href={`${routes.proDevis}?onglet=modeles` as typeof routes.proDevis}
          className={ongletCls(onglet === 'modeles')}
          aria-current={onglet === 'modeles' ? 'page' : undefined}
        >
          Modèles
        </Link>
      </nav>
      {onglet === 'devis' && acces.gerer && horsValidite.length ? (
        <ExpirerDevis ids={horsValidite.slice(0, 100)} />
      ) : null}
      {onglet === 'devis' ? <ListeDevis devis={devis} /> : null}
      {onglet === 'factures' ? <ListeFactures factures={factures} /> : null}
      {biblio ? (
        <div className="grid gap-8">
          <ModelesDevis modeles={biblio.modeles} peutGerer={acces.gerer} />
          <BibliothequePrestations
            prestations={biblio.prestations}
            peutGerer={acces.gerer}
            tvaDefaut={p.tvaDefaut}
          />
        </div>
      ) : null}
      {onglet === 'factures' && factures.length ? (
        <p className="m-0 text-sm text-neutre-700">
          Relances automatiques du client à J−3, J+1 et J+15. Pénalités calculées selon vos{' '}
          <Link href={routes.proDevisParametres}>paramètres</Link>.
        </p>
      ) : null}
    </main>
  );
}
