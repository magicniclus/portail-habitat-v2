'use client';

import { LIBELLES_NATURE_LIGNE, NATURES_LIGNE, type NatureLigne } from '@ph/core/devis';
import { IconButton } from '@ph/ui';
import { DotsThreeVerticalIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';

const item =
  'flex min-h-11 w-full items-center gap-2 rounded-[8px] px-3 text-left text-[15px] hover:bg-neutre-100 focus-visible:bg-neutre-100 focus-visible:outline-none disabled:opacity-50';

/**
 * Menu « ⋯ » d'une ligne : prestation ou fourniture (lignes chiffrées), « Enregistrer comme ligne
 * type », supprimer. Se ferme à Échap, au clic dehors et après un choix ; focus rendu au bouton.
 */
export function MenuLigne({
  n,
  nature,
  onNature,
  enregistrer,
  supprimer,
}: {
  n: number;
  nature: NatureLigne | null;
  onNature: (v: NatureLigne) => void;
  enregistrer: (() => void) | null;
  supprimer: (() => void) | null;
}) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const racine = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: PointerEvent) => {
      if (!racine.current?.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOuvert(false);
      bouton.current?.focus();
    };
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
    bouton.current?.focus();
  };
  return (
    <div ref={racine} className="relative">
      <IconButton
        ref={bouton}
        aria-label={`Actions de la ligne ${n}`}
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={() => setOuvert((o) => !o)}
        icone={<DotsThreeVerticalIcon size={20} weight="bold" />}
      />
      {ouvert ? (
        <div
          id={id}
          role="group"
          aria-label={`Actions de la ligne ${n}`}
          className="absolute top-full right-0 z-30 mt-1 grid w-64 gap-0.5 rounded-[12px] border border-trait bg-blanc p-1.5 shadow-lg"
        >
          {nature ? (
            <div role="radiogroup" aria-label="Nature" className="grid grid-cols-2 gap-1 p-1">
              {NATURES_LIGNE.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={nature === v}
                  onClick={choisir(() => onNature(v))}
                  className={`min-h-11 rounded-[8px] border text-sm font-semibold ${
                    nature === v ? 'border-accent bg-accent-100 text-accent-800' : 'border-trait'
                  }`}
                >
                  {LIBELLES_NATURE_LIGNE[v]}
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className={item}
            disabled={!enregistrer}
            onClick={enregistrer ? choisir(enregistrer) : undefined}
          >
            Enregistrer comme ligne type
          </button>
          <button
            type="button"
            className={`${item} text-danger`}
            disabled={!supprimer}
            onClick={supprimer ? choisir(supprimer) : undefined}
          >
            Supprimer la ligne
          </button>
        </div>
      ) : null}
    </div>
  );
}
