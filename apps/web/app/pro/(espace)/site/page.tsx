import { etatPublication } from '@ph/core/sites';
import { bouton, cn, StatusBadge } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BoutonPublier } from '@/features/monSite/ActionsSite';
import { CreationSite } from '@/features/monSite/CreationSite';
import { ListePages } from '@/features/monSite/ListePages';
import { OngletDomaine } from '@/features/monSite/OngletDomaine';
import { OngletFormulaire } from '@/features/monSite/OngletFormulaire';
import { OngletStats } from '@/features/monSite/OngletStats';
import { routes } from '@/lib/routes';
import { accesSite, DOMAINE_BASE, statsDuSite, tableauSite } from '@/server/sites';

export const metadata: Metadata = { title: 'Mon site internet', robots: { index: false } };

const ONGLETS = [
  { cle: 'pages', libelle: 'Pages' },
  { cle: 'domaine', libelle: 'Domaine' },
  { cle: 'stats', libelle: 'Statistiques' },
  { cle: 'formulaire', libelle: 'Formulaire' },
] as const;
type Onglet = (typeof ONGLETS)[number]['cle'];

/** Maquette Site Internet Artisan : tableau de bord du site (SITE_INTERNET §3). */
export default async function PageMonSite({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const acces = await accesSite(routes.proSite);
  const demande = (await searchParams).onglet;
  const onglet: Onglet = ONGLETS.some((o) => o.cle === demande) ? (demande as Onglet) : 'pages';
  const t = await tableauSite(acces.artisanId);
  const etat = etatPublication({
    versionPubliee: t.site.versionPubliee,
    modifie: t.modifieDepuisPublication,
  });
  const ongletCls = (actif: boolean) =>
    cn(
      'flex min-h-11 items-center rounded-control px-4 font-semibold whitespace-nowrap no-underline',
      actif ? 'bg-accent-100 text-accent-800' : 'text-neutre-800',
    );
  return (
    <main className="grid gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1.5">
          <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">Mon site internet</h1>
          {t.url ? (
            <p className="m-0 flex flex-wrap items-center gap-2 text-base text-neutre-800">
              <span className="break-all">{t.url.replace('https://', '')}</span>
              <StatusBadge statut={etat} />
            </p>
          ) : (
            <p className="m-0 text-base text-neutre-800">
              Un site à votre nom, créé depuis votre fiche, sans cookie et sans engagement.
            </p>
          )}
        </div>
        {t.site.existe ? (
          <div className="flex flex-wrap items-start gap-3">
            {t.url && t.site.versionPubliee ? (
              <a
                href={t.url}
                target="_blank"
                rel="noopener"
                className={bouton({ variant: 'secondaire' })}
              >
                Voir le site
              </a>
            ) : null}
            <Link href={routes.proSiteEditeur()} className={bouton({ variant: 'secondaire' })}>
              Ouvrir l’éditeur
            </Link>
            {t.modifieDepuisPublication ? (
              <BoutonPublier
                libelle={t.site.versionPubliee ? 'Publier les modifications' : 'Publier le site'}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {!t.site.existe ? (
        <CreationSite proposition={t.proposition} domaine={DOMAINE_BASE} />
      ) : (
        <>
          <nav aria-label="Rubriques du site" className="-mx-1 flex gap-2 overflow-x-auto px-1">
            {ONGLETS.map((o) => (
              <Link
                key={o.cle}
                href={routes.proSiteOnglet(o.cle)}
                className={ongletCls(onglet === o.cle)}
                aria-current={onglet === o.cle ? 'page' : undefined}
              >
                {o.libelle}
              </Link>
            ))}
          </nav>
          {onglet === 'pages' ? (
            <ListePages pages={t.pages} {...(t.url ? { url: t.url } : {})} />
          ) : null}
          {onglet === 'domaine' ? <OngletDomaine site={t.site} domaine={DOMAINE_BASE} /> : null}
          {onglet === 'stats' ? (
            <OngletStats
              stats={await statsDuSite(acces.artisanId, t.site.offre === 'site_pro')}
              pages={t.pages}
              sitePro={t.site.offre === 'site_pro'}
            />
          ) : null}
          {onglet === 'formulaire' ? (
            <OngletFormulaire
              sitePro={t.site.offre === 'site_pro'}
              {...(t.champs ? { champs: t.champs } : {})}
            />
          ) : null}
        </>
      )}
    </main>
  );
}
