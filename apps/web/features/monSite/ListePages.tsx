import { libelleScoreSeo, STATUTS_PAGE } from '@ph/core/sites';
import { bouton, StatusBadge } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import type { LignePage } from '@/server/sites';

/** Onglet Pages : statut, adresse, score SEO, présence dans le menu ; l'édition se fait dans l'éditeur. */
export function ListePages({ pages, url }: { pages: LignePage[]; url?: string }) {
  return (
    <section aria-labelledby="pages-site" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="pages-site" className="m-0 text-xl">
            Pages du site
          </h2>
          <p className="m-0 text-[15px] text-neutre-800">
            {pages.length} page{pages.length > 1 ? 's' : ''} · création, mise en page et
            référencement se font dans l’éditeur.
          </p>
        </div>
        <Link href={routes.proSiteEditeur()} className={bouton({ variant: 'secondaire' })}>
          Nouvelle page
        </Link>
      </div>
      <ul className="m-0 grid list-none gap-3 p-0">
        {pages.map((p) => {
          const seo = libelleScoreSeo(p.score);
          return (
            <li
              key={p.id}
              className="grid gap-3 rounded-[12px] border border-trait bg-blanc p-4 min-[760px]:grid-cols-[minmax(0,1fr)_auto] min-[760px]:items-center"
            >
              <div className="grid gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-[17px]">{p.nom}</strong>
                  <StatusBadge statut={STATUTS_PAGE[p.statut]} />
                  {p.menu ? <span className="text-sm text-neutre-800">· dans le menu</span> : null}
                </div>
                <span className="text-sm break-all text-neutre-800">
                  {url ? `${url}/${p.slug}` : `/${p.slug}`}
                </span>
                <span className="text-sm">
                  SEO {p.score}/100 · <StatusBadge statut={seo} />
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={routes.proSiteEditeur(p.id)}
                  className={bouton({ variant: 'secondaire' })}
                >
                  Modifier
                </Link>
                <Link
                  href={
                    `${routes.proSiteEditeur(p.id)}&panneau=seo` as ReturnType<
                      typeof routes.proSiteEditeur
                    >
                  }
                  className={bouton({ variant: 'fantome' })}
                >
                  SEO
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
