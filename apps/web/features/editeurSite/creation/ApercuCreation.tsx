'use client';

import {
  resoudreCouleur,
  texteSur,
  type Element,
  type Navigation,
  type PageSite,
  type Theme,
} from '@ph/core/sites';
import { POLICES } from '../gauche/PanneauStyles';

/** Premier texte d'un type sur la page (titre du bandeau, phrase d'accroche). */
function premier(p: PageSite | undefined, type: Element['type']): string {
  for (const s of p?.sections ?? [])
    for (const r of s.rows)
      for (const c of r.cols)
        for (const e of c.els)
          if (e.type === type && 'texte' in e.p)
            return e.p.texte.replace(/<[^>]+>|\[|\]\(#L\d+\)/g, '');
  return '';
}

/**
 * « Aperçu en direct » de la création assistée (maquette Editeur de Site) : le haut de l'accueil
 * avec le nom, les couleurs, la police et la forme des boutons du site ; suit chaque choix et
 * chaque page créée.
 */
export function ApercuCreation({
  theme,
  navigation,
  pages,
}: {
  theme: Theme;
  navigation: Navigation;
  pages: Record<string, PageSite>;
}) {
  const p = theme.palette;
  const c = (j: 'primaire' | 'accent' | 'clair' | 'sombre') => resoudreCouleur(j, p) ?? 'gray';
  const famille = POLICES.find(([id]) => id === theme.polices)?.[2] ?? 'inherit';
  const rayon = `${Math.min(theme.rayonBoutons, 999)}px`;
  const bouton = {
    background: c('primaire'),
    color: texteSur(c('primaire')) === 'blanc' ? 'white' : c('sombre'),
    borderRadius: rayon,
  };
  const accueil = pages.accueil;
  const autres = Object.values(pages)
    .filter((x) => x !== accueil && x.type !== 'mentions')
    .slice(0, 3);
  return (
    <div className="grid content-start gap-3">
      <span className="text-xs font-bold tracking-wide text-neutre-600 uppercase">
        Aperçu en direct
      </span>
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-[12px] border border-trait bg-blanc shadow-sm"
      >
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="grid size-7 flex-none place-items-center rounded-[6px] text-[11px] font-bold"
              style={{ ...bouton, borderRadius: 6 }}
            >
              {(navigation.logo.initiales || navigation.nom.slice(0, 2)).toUpperCase()}
            </span>
            <span className="truncate text-[13px] font-bold" style={{ color: c('sombre') }}>
              {navigation.nom}
            </span>
          </span>
          <span className="flex-none px-2.5 py-1 text-[11px] font-bold" style={bouton}>
            {navigation.cta.texte || 'Devis gratuit'}
          </span>
        </div>
        <div className="grid gap-2 px-4 py-5" style={{ background: c('clair') }}>
          <span
            className="text-[10px] font-bold tracking-wide uppercase"
            style={{ color: c('accent') }}
          >
            {premier(accueil, 'surtitre') || 'Votre métier · votre ville'}
          </span>
          <span
            className="text-xl leading-tight font-bold"
            style={{ fontFamily: famille, color: c('sombre') }}
          >
            {premier(accueil, 'titre') || navigation.nom}
          </span>
          <span className="line-clamp-2 text-xs" style={{ color: c('sombre') }}>
            {premier(accueil, 'texte')}
          </span>
          <span className="w-fit px-3 py-1.5 text-[11px] font-bold" style={bouton}>
            Demander un devis
          </span>
        </div>
        {autres.length ? (
          <div className="grid grid-cols-3 gap-2 p-3.5">
            {autres.map((x) => (
              <span
                key={x.slug}
                className="truncate rounded-[6px] p-2 text-[11px] font-semibold"
                style={{ background: c('clair'), color: c('sombre') }}
              >
                {x.nom}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <span className="text-[13px] leading-[19px] text-neutre-700">
        L’aperçu suit vos choix et chaque page créée. Rien n’est publié sans vous.
      </span>
    </div>
  );
}
