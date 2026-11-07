import type { ControleSeo } from '@ph/core/blog';
import type { ChampsArticle } from './useArticle';

/**
 * Panneau SEO (BLOG §3) : score, aperçu Google, points bloquants (empêchent de publier ou de
 * planifier) puis recommandations.
 */
export function PanneauSeo({
  c,
  seo,
  hote,
  slug,
}: {
  c: ChampsArticle;
  seo: ControleSeo;
  hote: string;
  slug: string;
}) {
  const groupes = [
    { titre: 'Obligatoire pour publier', items: seo.bloquants, icone: '!', cls: 'text-danger' },
    { titre: 'Recommandé', items: seo.recommandations, icone: '○', cls: 'text-attention' },
  ];
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <span className="grid size-14 place-items-center rounded-full bg-accent-100 text-xl font-bold text-accent-800">
          {seo.score}
        </span>
        <span>
          <strong className="block">
            {seo.bloquants.length
              ? `${seo.bloquants.length} point(s) bloquant(s)`
              : 'Prêt à être publié'}
          </strong>
          <span className="text-sm text-neutre-800">Score SEO sur 100</span>
        </span>
      </div>
      <div className="grid gap-1 rounded-[12px] border border-trait p-3" aria-label="Aperçu Google">
        <span className="text-sm text-neutre-800 break-all">
          {hote} › blog › {slug}
        </span>
        <span className="text-lg text-info">{c.titre || 'Titre de l’article'}</span>
        <span className="text-sm text-neutre-800">{c.meta || 'Méta-description…'}</span>
      </div>
      {groupes.map((g) => (
        <section key={g.titre} className="grid gap-1">
          <h3 className="m-0 text-base">{g.titre}</h3>
          {g.items.length ? (
            <ul className="m-0 grid list-none gap-1 p-0">
              {g.items.map((i) => (
                <li key={i.cle} className="flex gap-2 text-[15px]">
                  <span aria-hidden="true" className={g.cls}>
                    {g.icone}
                  </span>
                  {i.libelle}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[15px] text-succes">✓ Tout est bon.</p>
          )}
        </section>
      ))}
    </div>
  );
}
