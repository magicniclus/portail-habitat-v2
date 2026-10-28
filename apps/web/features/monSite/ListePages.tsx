import { libelleScoreSeo, STATUTS_PAGE } from '@ph/core/sites';
import { formatNombre } from '@ph/core/format';
import { bouton, cn, StatusBadge } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import type { LignePage } from '@/server/sites';
import { ReglagesPage } from './ReglagesPage';

const COULEUR_SCORE = {
  succes: 'text-succes',
  attention: 'text-neutre-800',
  danger: 'text-danger',
};
const editeur = (id: string, panneau?: string) =>
  (panneau
    ? `${routes.proSiteEditeur(id)}&panneau=${panneau}`
    : routes.proSiteEditeur(id)) as ReturnType<typeof routes.proSiteEditeur>;

/**
 * Onglet Pages (maquette Site Internet Artisan) : statut, adresse, score SEO, visites du mois,
 * présence dans le menu, Modifier, SEO, Dépublier ; création et mise en page dans l'éditeur.
 */
export function ListePages({
  pages,
  url,
  visites,
}: {
  pages: LignePage[];
  url?: string;
  visites: Record<string, number>;
}) {
  const publiees = pages.filter((p) => p.statut === 'publiee').length;
  return (
    <section aria-labelledby="pages-site" className="grid max-w-[1100px] gap-6">
      <div className="grid gap-1.5">
        <h2 id="pages-site" className="m-0 text-[clamp(26px,3vw,32px)] leading-[1.15]">
          Pages du site
        </h2>
        <p className="m-0 text-base text-neutre-800">
          {pages.length} page{pages.length > 1 ? 's' : ''} · {publiees} publiée
          {publiees > 1 ? 's' : ''} · le menu suit l’ordre ci-dessous
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-[12px] border border-accent-300 bg-accent-100 px-[18px] py-4">
        <span className="grid flex-[1_1_300px] gap-0.5">
          <span className="text-base font-bold">
            Création, mise en page et référencement se font dans l’éditeur
          </span>
          <span className="text-sm text-neutre-800">
            L’IA peut recréer tout le site depuis votre fiche, ou générer une seule page (ex. «
            Plombier à Pessac »).
          </span>
        </span>
        <Link href={routes.proSiteCreationIa} className={bouton({ variant: 'secondaire' })}>
          Créer avec l’IA
        </Link>
        <Link href={editeur('accueil', 'pages')} className={bouton({ variant: 'secondaire' })}>
          Nouvelle page
        </Link>
        <Link href={editeur('accueil', 'modeles')} className={bouton({ variant: 'secondaire' })}>
          Modèles de site
        </Link>
      </div>
      <ul className="m-0 grid list-none gap-2.5 p-0">
        {pages.map((p) => {
          const seo = libelleScoreSeo(p.score);
          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3.5 rounded-[12px] border border-trait bg-blanc px-4 py-3.5"
            >
              <span className="grid min-w-0 flex-[1_1_240px] gap-[3px]">
                <span className="flex flex-wrap items-center gap-2.5">
                  <strong className="text-base">{p.nom}</strong>
                  <StatusBadge statut={STATUTS_PAGE[p.statut]} />
                </span>
                <span className="text-[13px] break-all text-neutre-700">
                  {url ? `${url.replace('https://', '')}/${p.slug}` : `/${p.slug}`}
                </span>
              </span>
              <span className="grid w-28 gap-0.5">
                <span className="text-xs text-neutre-600">SEO</span>
                <span className={cn('text-[15px] font-bold', COULEUR_SCORE[seo.tone])}>
                  {seo.tone === 'succes' ? '✓' : '!'} {p.score}/100
                </span>
                <span className={cn('text-xs font-semibold', COULEUR_SCORE[seo.tone])}>
                  {seo.libelle}
                </span>
              </span>
              <span className="grid w-20 gap-0.5">
                <span className="text-xs text-neutre-600">Visites</span>
                <span className="text-[15px] font-bold">{formatNombre(visites[p.id] ?? 0)}</span>
              </span>
              <ReglagesPage page={p}>
                <Link
                  href={editeur(p.id)}
                  className={bouton({ variant: 'secondaire', taille: 'sm' })}
                >
                  Modifier
                </Link>
                <Link
                  href={editeur(p.id, 'seo')}
                  className="flex min-h-11 items-center px-1.5 text-sm font-semibold text-accent-800 no-underline hover:underline"
                >
                  SEO
                </Link>
              </ReglagesPage>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
