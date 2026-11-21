'use client';

import type { Appareil, PageSite } from '@ph/core/sites';
import { cn } from '@ph/ui';
import { niveauxEditeur } from '@ph/ui/tokens';
import { useState } from 'react';
import { LegendeStructure } from './LegendeStructure';
import { lignesStructure, type Ligne } from './lignesStructure';

type Position = 'avant' | 'apres' | 'dans';

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
  onDeplacer,
  navigationMasquee = false,
}: {
  page: PageSite;
  selection: string | null;
  appareil: Appareil;
  onChoisir: (id: string) => void;
  /** Glisser-déposer : `id` avant/après `cible`, ou dans `cible`. */
  onDeplacer: (id: string, cible: string, position: Position) => void;
  /** Site sans navigation : la ligne reste (pour la réactiver), marquée masquée. */
  navigationMasquee?: boolean;
}) {
  const [tout, setTout] = useState(false);
  const [glisse, setGlisse] = useState<Ligne | null>(null);
  const [depot, setDepot] = useState<{ id: string; position: Position } | null>(null);
  const lignes = lignesStructure(page, selection, appareil, navigationMasquee, tout);
  const NIV = ['zone', 'section', 'bloc', 'element'];
  /** Où déposer : avant/après un voisin du même niveau, ou dans le conteneur du dessus. */
  const positionSur = (l: Ligne, e: React.DragEvent): Position | null => {
    if (!glisse || l.id === glisse.id || l.niveau === 'nav') return null;
    const d = NIV.indexOf(glisse.niveau) - NIV.indexOf(l.niveau);
    if (d === 1) return 'dans';
    if (d !== 0) return null;
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientY < r.top + r.height / 2 ? 'avant' : 'apres';
  };
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-[13px] text-neutre-700">
          {page.nom} · navigation + {page.sections.length} zones
        </p>
        <button
          type="button"
          aria-pressed={tout}
          onClick={() => setTout((x) => !x)}
          className="min-h-11 flex-none rounded-[7px] px-2 text-xs font-semibold text-accent-700 hover:bg-neutre-100"
        >
          {tout ? 'Replier' : 'Tout déplier'}
        </button>
      </div>
      <p className="m-0 text-xs text-neutre-600">
        Glissez une ligne pour la déplacer (sur une ligne du même niveau, ou dans son conteneur).
      </p>
      <ul className="m-0 grid min-w-0 list-none gap-0.5 p-0">
        {lignes.map((l) => {
          const on = l.id === selection;
          const haut = l.niveau === 'zone' || l.niveau === 'nav';
          return (
            <li
              key={l.id}
              className={cn(
                'min-w-0 rounded-[7px]',
                depot?.id === l.id &&
                  depot.position === 'avant' &&
                  'shadow-[inset_0_2px_0_var(--accent)]',
                depot?.id === l.id &&
                  depot.position === 'apres' &&
                  'shadow-[inset_0_-2px_0_var(--accent)]',
                depot?.id === l.id &&
                  depot.position === 'dans' &&
                  'bg-accent-100 ring-2 ring-accent',
                glisse?.id === l.id && 'opacity-40',
              )}
              draggable={l.niveau !== 'nav'}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', l.id);
                setGlisse(l);
              }}
              onDragOver={(e) => {
                const position = positionSur(l, e);
                if (!position) return setDepot(null);
                e.preventDefault();
                if (depot?.id !== l.id || depot.position !== position)
                  setDepot({ id: l.id, position });
              }}
              onDrop={(e) => {
                e.preventDefault();
                const position = positionSur(l, e);
                if (glisse && position) onDeplacer(glisse.id, l.id, position);
                setGlisse(null);
                setDepot(null);
              }}
              onDragEnd={() => {
                setGlisse(null);
                setDepot(null);
              }}
            >
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
      <LegendeStructure />
    </div>
  );
}
