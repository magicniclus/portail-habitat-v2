'use client';

import { DotsThreeVerticalIcon, InfoIcon } from '@phosphor-icons/react';
import { Chargeur } from '@ph/ui';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export interface ActionMenu {
  libelle: string;
  icone: ReactNode;
  /** Lien (téléchargement du PDF) ou action. */
  href?: string;
  /** Une promesse renvoyée : chargeur à la place du « ⋮ » jusqu'à la fin de l'action. */
  onClick?: () => unknown;
  /** Action impossible : grisée, avec la raison (« Suppression impossible »). */
  raison?: string;
}

const item =
  'flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-[8px] border-0 bg-transparent px-3 text-left text-[15px] text-texte no-underline hover:bg-neutre-100 focus-visible:bg-neutre-100 focus-visible:outline-none';

/**
 * Menu « ⋮ » d'une ligne de la liste (captures du propriétaire). Se ferme à Échap, au clic dehors
 * et après un choix ; focus rendu au bouton.
 */
export function MenuActions({ libelle, actions }: { libelle: string; actions: ActionMenu[] }) {
  const [ouvert, setOuvert] = useState(false);
  const [occupe, setOccupe] = useState(false);
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
  const fermer = () => {
    setOuvert(false);
    bouton.current?.focus();
  };
  return (
    <div ref={racine} className="relative">
      <button
        ref={bouton}
        type="button"
        aria-label={libelle}
        aria-expanded={ouvert}
        aria-controls={id}
        {...(occupe ? { 'aria-busy': true } : {})}
        disabled={occupe}
        onClick={() => setOuvert((o) => !o)}
        className="grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-neutre-800 hover:bg-neutre-100 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {occupe ? (
          <Chargeur taille="sm" ton="courant" decoratif />
        ) : (
          <DotsThreeVerticalIcon size={22} weight="bold" aria-hidden="true" />
        )}
      </button>
      {ouvert ? (
        <div
          id={id}
          role="group"
          aria-label={libelle}
          className="absolute top-full right-0 z-20 grid w-max min-w-60 gap-0.5 rounded-[12px] border border-trait bg-blanc p-1.5 shadow-lg"
        >
          {actions.map((a) =>
            a.raison ? (
              <p
                key={a.libelle}
                title={a.raison}
                className="m-0 flex min-h-11 items-center gap-2.5 px-3 text-[15px] text-neutre-500"
              >
                <span aria-hidden="true">{a.icone}</span>
                {a.libelle}
                <InfoIcon size={16} aria-label={a.raison} />
              </p>
            ) : a.href ? (
              <a key={a.libelle} href={a.href} onClick={fermer} className={item}>
                <span aria-hidden="true">{a.icone}</span>
                {a.libelle}
              </a>
            ) : (
              <button
                key={a.libelle}
                type="button"
                onClick={() => {
                  fermer();
                  const r = a.onClick?.();
                  if (r instanceof Promise) {
                    setOccupe(true);
                    void r.finally(() => setOccupe(false));
                  }
                }}
                className={item}
              >
                <span aria-hidden="true">{a.icone}</span>
                {a.libelle}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
