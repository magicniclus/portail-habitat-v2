'use client';

import type { PrestationBiblio } from '@ph/firebase/devis';
import { CaretDownIcon, PlusIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';

const item =
  'flex min-h-11 w-full items-center rounded-[8px] px-3 text-left text-[15px] hover:bg-neutre-100 focus-visible:bg-neutre-100 focus-visible:outline-none';

/**
 * « + Ligne simple | ▾ » (captures) : le bouton ajoute une ligne chiffrée ; la flèche ouvre la
 * ligne de texte et les lignes types enregistrées. Échap et clic dehors referment le menu.
 */
export function AjoutLigne({
  ligneSimple,
  ligneTexte,
  lignesTypes,
  ligneType,
}: {
  ligneSimple: () => void;
  ligneTexte: () => void;
  lignesTypes: PrestationBiblio[];
  ligneType: (p: PrestationBiblio) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const racine = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: PointerEvent) => {
      if (!racine.current?.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    document.addEventListener('pointerdown', dehors);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('pointerdown', dehors);
      document.removeEventListener('keydown', echap);
    };
  }, [ouvert]);
  const choisir = (f: () => void) => () => {
    f();
    setOuvert(false);
  };
  return (
    <div ref={racine} className="relative w-fit print:hidden">
      <div className="flex items-stretch rounded-pill border border-trait bg-blanc shadow-sm">
        <button
          type="button"
          onClick={ligneSimple}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-l-pill border-0 bg-transparent pr-3 pl-4 text-[15px] font-semibold text-accent-700 hover:bg-accent-100 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <PlusIcon size={18} weight="bold" aria-hidden="true" />
          Ligne simple
        </button>
        <span aria-hidden="true" className="my-2 w-px bg-trait" />
        <button
          type="button"
          aria-label="Autres lignes"
          aria-expanded={ouvert}
          aria-controls={id}
          onClick={() => setOuvert((o) => !o)}
          className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-r-pill border-0 bg-transparent text-accent-700 hover:bg-accent-100 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <CaretDownIcon size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>
      {ouvert ? (
        <div
          id={id}
          role="group"
          aria-label="Autres lignes"
          className="absolute top-full left-0 z-30 mt-1 grid max-h-80 w-72 gap-0.5 overflow-y-auto rounded-[12px] border border-trait bg-blanc p-1.5 shadow-lg"
        >
          <button type="button" className={item} onClick={choisir(ligneTexte)}>
            + Ligne de texte (titre, précision)
          </button>
          {lignesTypes.length ? (
            <p className="m-0 px-3 pt-2 pb-1 text-xs font-bold tracking-[0.06em] text-neutre-700 uppercase">
              Lignes types
            </p>
          ) : null}
          {lignesTypes.map((p) => (
            <button key={p.id} type="button" className={item} onClick={choisir(() => ligneType(p))}>
              {p.type === 'texte' ? `¶ ${p.designation}` : p.designation}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
