'use client';

import { COULEURS_TEXTE, resoudreCouleur, type Theme } from '@ph/core/sites';
import {
  HighlighterIcon,
  LinkSimpleIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  TextStrikethroughIcon,
  TextSuperscriptIcon,
} from '@phosphor-icons/react';
import { useState, type MouseEvent, type ReactNode } from 'react';

const outil =
  'grid min-h-11 min-w-11 place-items-center rounded-[6px] px-2 text-[13px] font-bold text-neutre-800 hover:bg-neutre-100 aria-pressed:bg-neutre-200';

const NOMS_COULEUR: Record<keyof typeof COULEURS_TEXTE, string> = {
  ka: 'Couleur d’accent',
  kp: 'Couleur principale',
  ks: 'Sombre',
  kb: 'Blanc',
};

export interface ActionsBarreTexte {
  commande: (e: MouseEvent, c: string) => void;
  envelopper: (e: MouseEvent, balise: 'mark' | keyof typeof COULEURS_TEXTE) => void;
  effacer: (e: MouseEvent) => void;
  lier: (e: MouseEvent) => void;
}

function Outil({
  titre,
  onMouseDown,
  children,
  className = '',
  presse,
}: {
  titre: string;
  onMouseDown: (e: MouseEvent) => void;
  children: ReactNode;
  className?: string;
  presse?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${outil} ${className}`}
      onMouseDown={onMouseDown}
      title={titre}
      aria-label={titre}
      {...(presse !== undefined ? { 'aria-pressed': presse } : {})}
    >
      {children}
    </button>
  );
}

/**
 * Barre de mise en forme du texte : gras, italique, souligné, barré, exposant, surligné, couleur
 * du thème, listes (textes seulement), lien, effacer. Tout agit sur la sélection.
 */
export function BarreTexte({
  a,
  listes,
  palette,
}: {
  a: ActionsBarreTexte;
  listes: boolean;
  palette: Theme['palette'];
}) {
  const [couleurs, setCouleurs] = useState(false);
  const sep = <span aria-hidden="true" className="mx-1 h-5 w-px bg-trait" />;
  return (
    <div
      role="toolbar"
      aria-label="Mise en forme"
      className="border-b border-trait bg-neutre-100 p-0.5"
    >
      <div className="flex flex-wrap items-center gap-0.5">
        <Outil titre="Gras (Ctrl B)" onMouseDown={(e) => a.commande(e, 'bold')}>
          B
        </Outil>
        <Outil
          titre="Italique (Ctrl I)"
          className="italic"
          onMouseDown={(e) => a.commande(e, 'italic')}
        >
          I
        </Outil>
        <Outil
          titre="Souligné (Ctrl U)"
          className="underline"
          onMouseDown={(e) => a.commande(e, 'underline')}
        >
          U
        </Outil>
        <Outil titre="Barré" onMouseDown={(e) => a.commande(e, 'strikeThrough')}>
          <TextStrikethroughIcon size={17} weight="bold" aria-hidden="true" />
        </Outil>
        <Outil titre="Exposant (m², 1er)" onMouseDown={(e) => a.commande(e, 'superscript')}>
          <TextSuperscriptIcon size={17} weight="bold" aria-hidden="true" />
        </Outil>
        <Outil titre="Surligner" onMouseDown={(e) => a.envelopper(e, 'mark')}>
          <HighlighterIcon size={17} weight="bold" aria-hidden="true" />
        </Outil>
        <Outil
          titre="Couleur du texte"
          presse={couleurs}
          onMouseDown={(e) => {
            e.preventDefault();
            setCouleurs((x) => !x);
          }}
        >
          <span className="grid justify-items-center leading-none">
            A
            <span aria-hidden="true" className="mt-0.5 h-1 w-4 rounded-full bg-accent" />
          </span>
        </Outil>
        {listes ? (
          <>
            {sep}
            <Outil titre="Liste à puces" onMouseDown={(e) => a.commande(e, 'insertUnorderedList')}>
              <ListBulletsIcon size={18} weight="bold" aria-hidden="true" />
            </Outil>
            <Outil titre="Liste numérotée" onMouseDown={(e) => a.commande(e, 'insertOrderedList')}>
              <ListNumbersIcon size={18} weight="bold" aria-hidden="true" />
            </Outil>
          </>
        ) : null}
        {sep}
        <Outil titre="Lien" onMouseDown={a.lier}>
          <LinkSimpleIcon size={17} weight="bold" aria-hidden="true" />
        </Outil>
        <Outil titre="Retirer la mise en forme" onMouseDown={a.effacer}>
          Effacer
        </Outil>
      </div>
      {couleurs ? (
        <div className="flex flex-wrap items-center gap-1 border-t border-trait px-1 pt-1">
          {(Object.keys(COULEURS_TEXTE) as (keyof typeof COULEURS_TEXTE)[]).map((k) => (
            <button
              key={k}
              type="button"
              title={NOMS_COULEUR[k]}
              aria-label={NOMS_COULEUR[k]}
              onMouseDown={(e) => {
                a.envelopper(e, k);
                setCouleurs(false);
              }}
              className="grid size-11 place-items-center rounded-[8px] hover:bg-neutre-200"
            >
              <span
                aria-hidden="true"
                className="size-6 rounded-full ring-1 ring-black/15"
                style={{ background: resoudreCouleur(COULEURS_TEXTE[k], palette) ?? undefined }}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
