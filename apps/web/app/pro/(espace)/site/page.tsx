import { etatPublication } from '@ph/core/sites';
import { bouton, cn, StatusBadge } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { OngletBlog, VUES_BLOG, type VueBlog } from '@/features/blog/OngletBlog';
import { BoutonPublier } from '@/features/monSite/ActionsSite';
import { CreationSite } from '@/features/monSite/CreationSite';
import { ListePages } from '@/features/monSite/ListePages';
import { OngletDomaine } from '@/features/monSite/OngletDomaine';
import { OngletFormulaire } from '@/features/monSite/OngletFormulaire';
import { OngletStats } from '@/features/monSite/OngletStats';
import { OngletSuivi } from '@/features/monSite/OngletSuivi';
import { routes } from '@/lib/routes';
import { ongletBlog } from '@/server/blog';
import { accesSite, DOMAINE_BASE, statsDuSite, tableauSite, visitesDuMois } from '@/server/sites';

export const metadata: Metadata = { title: 'Mon site internet', robots: { index: false } };

const ONGLETS = [
  { cle: 'pages', libelle: 'Pages' },
  { cle: 'blog', libelle: 'Blog' },
  { cle: 'domaine', libelle: 'Domaine' },
  { cle: 'stats', libelle: 'Statistiques' },
  { cle: 'formulaire', libelle: 'Formulaire' },
  { cle: 'suivi', libelle: 'Suivi et publicité' },
] as const;
type Onglet = (typeof ONGLETS)[number]['cle'];

/** Maquette Site Internet Artisan : tableau de bord du site (SITE_INTERNET §3). */
export default async function PageMonSite({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; vue?: string }>;
}) {
  const acces = await accesSite(routes.proSite);
  const q = await searchParams;
  const demande = q.onglet;
  const onglet: Onglet = ONGLETS.some((o) => o.cle === demande) ? (demande as Onglet) : 'pages';
  const t = await tableauSite(acces.artisanId);
  const etat = etatPublication({
    versionPubliee: t.site.versionPubliee,
    modifie: t.modifieDepuisPublication,
  });
  const ongletCls = (actif: boolean) =>
    cn(
      'flex min-h-11 items-center border-b-[3px] px-3.5 text-[15px] whitespace-nowrap no-underline',
      actif
        ? 'border-accent font-bold text-texte'
        : 'border-transparent font-medium text-neutre-700 hover:text-texte',
    );
  return (
    <main className="grid content-start pb-12">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b border-trait bg-blanc px-[clamp(16px,3vw,32px)] py-3">
        {/* Titre déjà affiché dans la barre de l’espace pro : gardé pour les lecteurs d’écran. */}
        <h1 className="sr-only">Mon site internet</h1>
        {t.url ? (
          <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-neutre-800">
            <span className="max-w-full truncate">{t.url.replace('https://', '')}</span>
            <StatusBadge statut={etat} />
          </span>
        ) : null}
        {t.site.existe ? (
          <span className="ml-auto flex flex-wrap items-center gap-2">
            {t.url && t.site.versionPubliee ? (
              <a
                href={t.url}
                target="_blank"
                rel="noopener"
                className={bouton({ variant: 'fantome' })}
              >
                Voir le site
              </a>
            ) : null}
            <Link href={routes.proSiteEditeur()} className={bouton({ variant: 'secondaire' })}>
              Ouvrir l’éditeur
            </Link>
            {t.modifieDepuisPublication ? (
              <BoutonPublier
                libelle={t.site.versionPubliee ? 'Publier les modifications' : 'Publier'}
              />
            ) : null}
          </span>
        ) : null}
      </div>
      {!t.site.existe ? (
        <div className="px-[clamp(16px,3vw,32px)] pt-6">
          <p className="m-0 mb-4 text-base text-neutre-800">
            Un site à votre nom, créé depuis votre fiche, sans cookie et sans engagement.
          </p>
          <CreationSite proposition={t.proposition} domaine={DOMAINE_BASE} />
        </div>
      ) : (
        <>
          <nav
            aria-label="Rubriques du site"
            className="flex gap-1 overflow-x-auto border-b border-trait bg-blanc px-[clamp(16px,3vw,32px)]"
          >
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
          <div className="grid w-full max-w-[1100px] gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)]">
            {onglet === 'pages' ? (
              <ListePages
                pages={t.pages}
                visites={await visitesDuMois(acces.artisanId)}
                {...(t.url ? { url: t.url } : {})}
              />
            ) : null}
            {onglet === 'blog' ? (
              <OngletBlog
                donnees={await ongletBlog(acces.artisanId)}
                vue={VUES_BLOG.some(([v]) => v === q.vue) ? (q.vue as VueBlog) : 'articles'}
              />
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
            {onglet === 'suivi' ? <OngletSuivi initial={t.suivi} /> : null}
          </div>
        </>
      )}
    </main>
  );
}
