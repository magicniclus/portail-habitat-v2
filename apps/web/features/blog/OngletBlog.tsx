import { bouton, cn } from '@ph/ui';
import Link from 'next/link';
import { FenetreOffre } from '@/features/offres/FenetreOffre';
import { routes } from '@/lib/routes';
import type { OngletBlogDonnees } from '@/server/blog';
import { ClassementBlog } from './ClassementBlog';
import { ListeArticles } from './ListeArticles';

export const VUES_BLOG = [
  ['articles', 'Articles'],
  ['classement', 'Catégories et tags'],
  ['corbeille', 'Corbeille'],
] as const;
export type VueBlog = (typeof VUES_BLOG)[number][0];

const lienVue = (v: VueBlog) =>
  (v === 'articles'
    ? routes.proSiteOnglet('blog')
    : `${routes.proSiteOnglet('blog')}&vue=${v}`) as ReturnType<typeof routes.proSiteOnglet>;

/**
 * Onglet Blog de Mon site (maquette Site Internet Artisan, BLOG §1, §2, §5). Sans Site Pro :
 * onglet visible, toute action payante ouvre la fenêtre d'offre (BLOG-01). Pas de pilote
 * automatique ni d'article en un clic tant que D70 n'est pas tranchée.
 */
export function OngletBlog({ donnees: d, vue }: { donnees: OngletBlogDonnees; vue: VueBlog }) {
  const actif = d.credits.max > 0;
  const enLigne = d.articles.filter((a) => !a.supprimeLe);
  const publies = enLigne.filter((a) => a.statut === 'publie').length;
  const nbCorbeille = d.articles.length - enLigne.length;
  return (
    <section aria-labelledby="titre-blog" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titre-blog" className="m-0 text-xl">
            Blog
          </h2>
          <p className="m-0 text-[15px] text-neutre-800">
            {enLigne.length} article{enLigne.length > 1 ? 's' : ''} · {publies} publié
            {publies > 1 ? 's' : ''} · visibles sur votre site seulement.
          </p>
        </div>
        {actif ? (
          <Link href={routes.proBlogNouvelArticle} className={bouton()}>
            Écrire un article
          </Link>
        ) : (
          <FenetreOffre formule="site_pro" raison="Le blog est inclus dans Site Pro.">
            Écrire un article
          </FenetreOffre>
        )}
      </div>
      {actif ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-trait p-3">
          <span className="grid gap-1">
            <span className="text-sm text-neutre-800">Articles rédigés par l’IA ce mois-ci</span>
            <strong>
              {d.credits.utilises} / {d.credits.max}
            </strong>
          </span>
          {!d.credits.toutInclus ? (
            <FenetreOffre
              formule="tout_inclus"
              raison="Avec Tout inclus, l’IA rédige 15 articles par mois."
            >
              Tout inclus : 15 articles / mois
            </FenetreOffre>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 rounded-2xl border border-accent-300 bg-accent-100 p-4">
          <strong>Le blog est inclus dans Site Pro et Tout inclus</strong>
          <p className="m-0 text-[15px]">
            Écrivez vos conseils, l’IA vous aide : 5 articles rédigés par mois avec Site Pro, 15
            avec Tout inclus. Contrôle SEO et mentions légales compris.
          </p>
          <div>
            <FenetreOffre formule="site_pro" raison="Le blog est inclus dans Site Pro.">
              Passer à Site Pro
            </FenetreOffre>
          </div>
        </div>
      )}
      <nav aria-label="Vues du blog" className="flex flex-wrap gap-2">
        {VUES_BLOG.map(([v, l]) => (
          <Link
            key={v}
            href={lienVue(v)}
            aria-current={vue === v ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center rounded-control px-3 font-semibold no-underline',
              vue === v ? 'bg-accent-100 text-accent-800' : 'text-neutre-800',
            )}
          >
            {v === 'corbeille' && nbCorbeille ? `${l} (${nbCorbeille})` : l}
          </Link>
        ))}
      </nav>
      {vue === 'classement' ? (
        <ClassementBlog donnees={d} />
      ) : (
        <ListeArticles donnees={d} actif={actif} corbeille={vue === 'corbeille'} />
      )}
    </section>
  );
}
