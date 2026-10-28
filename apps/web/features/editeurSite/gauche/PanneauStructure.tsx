'use client';

import {
  LIBELLES_ELEMENT,
  trouverNoeud,
  type Appareil,
  type Element,
  type PageSite,
} from '@ph/core/sites';
import { cn } from '@ph/ui';
import { niveauxEditeur, type NiveauEditeur } from '@ph/ui/tokens';

const extrait = (e: Element) => {
  const p = e.p as Record<string, unknown>;
  const t = String(p.texte ?? p.valeur ?? p.nom ?? p.legende ?? '')
    .replace(/\[([^\]]+)\]\(#L\d+\)/g, '$1')
    .replace(/<\/?[biu]>/g, '');
  return t ? ` · ${t}` : '';
};

interface Ligne {
  id: string;
  label: string;
  niveau: NiveauEditeur;
  prof: number;
  masque: boolean;
}

/**
 * Structure de la page (maquette Editeur de Site) : navigation globale, zones ; la zone de la
 * sélection se déplie jusqu'à ses sections, blocs et contenus. Les puces suivent les couleurs de
 * l'aperçu.
 */
export function PanneauStructure({
  page,
  selection,
  appareil,
  onChoisir,
  navigationMasquee = false,
}: {
  page: PageSite;
  selection: string | null;
  appareil: Appareil;
  onChoisir: (id: string) => void;
  /** Site sans navigation : la ligne reste (pour la réactiver), marquée masquée. */
  navigationMasquee?: boolean;
}) {
  const chaine = new Set(
    selection && selection !== 'nav'
      ? (trouverNoeud(page, selection)?.chaine.map((x) => x.id) ?? [])
      : [],
  );
  const lignes: Ligne[] = [
    {
      id: 'nav',
      label: 'Navigation · globale',
      niveau: 'nav',
      prof: 0,
      masque: page.sansNavigation || navigationMasquee,
    },
  ];
  for (const z of page.sections) {
    lignes.push({
      id: z.id,
      label: z.p.nom || 'Zone',
      niveau: 'zone',
      prof: 0,
      masque: z.p.masque[appareil],
    });
    if (!chaine.has(z.id)) continue;
    z.rows.forEach((r, ri) => {
      const ws = r.cols.map((c) => c.w).join('/');
      lignes.push({
        id: r.id,
        label: `Section ${ri + 1} · ${ws}`,
        niveau: 'section',
        prof: 1,
        masque: r.p.masque[appareil],
      });
      r.cols.forEach((c, ci) => {
        lignes.push({
          id: c.id,
          label: `Bloc ${ci + 1}`,
          niveau: 'bloc',
          prof: 2,
          masque: c.p.masque[appareil],
        });
        for (const e of c.els)
          lignes.push({
            id: e.id,
            label: `${LIBELLES_ELEMENT[e.type]}${extrait(e)}`,
            niveau: 'element',
            prof: 3,
            masque: e.p.masque[appareil],
          });
      });
    });
  }
  return (
    <div className="grid gap-3">
      <p className="m-0 text-[13px] text-neutre-700">
        {page.nom} · navigation + {page.sections.length} zones
      </p>
      <ul className="m-0 grid min-w-0 list-none gap-0.5 p-0">
        {lignes.map((l) => {
          const on = l.id === selection;
          const haut = l.niveau === 'zone' || l.niveau === 'nav';
          return (
            <li key={l.id} className="min-w-0">
              <button
                type="button"
                title={l.label}
                aria-current={on ? 'true' : undefined}
                onClick={() => onChoisir(l.id)}
                className={cn(
                  'flex min-h-11 w-full min-w-0 items-center gap-2 rounded-[7px] pr-2 text-left',
                  haut ? 'text-sm font-bold' : 'text-[13px] font-medium',
                  on ? 'bg-accent-100 font-bold' : 'hover:bg-neutre-100',
                  l.masque && 'opacity-55',
                )}
                style={{ paddingLeft: 8 + l.prof * 14 }}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex-none',
                    l.prof === 0 ? 'size-[9px]' : 'size-[7px]',
                    l.niveau === 'element'
                      ? 'rounded-full'
                      : l.niveau === 'nav'
                        ? 'rotate-45'
                        : 'rounded-[2px]',
                  )}
                  style={{ background: niveauxEditeur[l.niveau] }}
                />
                <span className="min-w-0 flex-1 truncate">{l.label}</span>
                {l.masque ? <span className="text-[11px] text-neutre-600">masqué</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0 text-xs text-neutre-700">
        {(
          [
            ['nav', 'Global'],
            ['zone', 'Zone'],
            ['section', 'Section'],
            ['bloc', 'Bloc'],
            ['element', 'Contenu'],
          ] as const
        ).map(([k, l]) => (
          <li key={k} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn('size-[9px]', k === 'element' ? 'rounded-full' : 'rounded-[2px]')}
              style={{ background: niveauxEditeur[k] }}
            />
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}
