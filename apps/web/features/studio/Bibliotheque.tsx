'use client';

import {
  LIBELLES_CALQUE,
  NOMS_SCENES,
  SCENES_CAPTURE,
  STYLES_TEXTE,
  TYPES_CALQUE,
  type SceneCapture,
} from '@ph/core/studio';
import { CardsIcon, FilmStripIcon, SparkleIcon, TextTIcon } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';

type Onglet = 'medias' | 'texte' | 'animations' | 'cartons';
const ONGLETS: { id: Onglet; libelle: string; icone: ReactNode }[] = [
  { id: 'medias', libelle: 'Médias', icone: <FilmStripIcon size={20} aria-hidden="true" /> },
  { id: 'texte', libelle: 'Texte', icone: <TextTIcon size={20} aria-hidden="true" /> },
  { id: 'animations', libelle: 'Effets', icone: <SparkleIcon size={20} aria-hidden="true" /> },
  { id: 'cartons', libelle: 'Cartons', icone: <CardsIcon size={20} aria-hidden="true" /> },
];
const STYLES: Record<(typeof STYLES_TEXTE)[number], { libelle: string; classe: string }> = {
  accroche: { libelle: 'Accroche', classe: 'text-xl font-black uppercase' },
  titre: { libelle: 'Titre', classe: 'text-lg font-bold' },
  chiffre: { libelle: '24 h', classe: 'text-2xl font-black' },
  note: { libelle: 'Petite note', classe: 'text-xs' },
};
const TUILE =
  'grid min-h-16 content-center gap-1 rounded-[8px] border border-montage-trait bg-montage-surface p-2 text-left text-xs text-montage-texte hover:border-montage-selection';

/**
 * Bibliothèque à gauche de l'éditeur : un clic pose l'élément à la tête de lecture (médias de
 * Portail Travaux, textes, effets animés, cartons plein écran).
 */
export function Bibliotheque({
  scenesFilmees,
  onCapture,
  onTexte,
  onAnimation,
  onCarton,
}: {
  /** Scènes déjà filmées par le robot (les autres le seront à l'enregistrement). */
  scenesFilmees: readonly SceneCapture[];
  onCapture: (scene: SceneCapture) => void;
  onTexte: (style: (typeof STYLES_TEXTE)[number]) => void;
  onAnimation: (type: (typeof TYPES_CALQUE)[number]) => void;
  onCarton: () => void;
}) {
  const [onglet, setOnglet] = useState<Onglet>('medias');
  return (
    <div className="grid h-full min-h-0 grid-cols-[64px_minmax(0,1fr)]">
      <div
        role="tablist"
        aria-label="Bibliothèque"
        aria-orientation="vertical"
        className="grid content-start gap-1 border-r border-montage-trait p-1.5"
      >
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={onglet === o.id}
            onClick={() => setOnglet(o.id)}
            className="grid min-h-14 justify-items-center content-center gap-0.5 rounded-[8px] text-[11px] text-montage-texte-doux hover:bg-montage-survol aria-selected:bg-montage-survol aria-selected:text-montage-selection"
          >
            {o.icone}
            {o.libelle}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        aria-label={`Bibliothèque : ${ONGLETS.find((o) => o.id === onglet)!.libelle}`}
        className="grid min-h-0 content-start gap-2 overflow-y-auto p-3"
      >
        <p className="m-0 text-xs text-montage-texte-doux">
          Un clic l’ajoute à la tête de lecture.
        </p>
        {onglet === 'medias' ? (
          <div className="grid gap-2">
            {NOMS_SCENES.map((s) => (
              <button key={s} type="button" className={TUILE} onClick={() => onCapture(s)}>
                <span className="font-semibold">{SCENES_CAPTURE[s].libelle}</span>
                <span className="text-montage-texte-doux">
                  {scenesFilmees.includes(s) ? 'Filmée' : 'Filmée à l’enregistrement'}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {onglet === 'texte' ? (
          <div className="grid grid-cols-2 gap-2">
            {STYLES_TEXTE.map((s) => (
              <button
                key={s}
                type="button"
                className={`${TUILE} justify-items-center text-center`}
                onClick={() => onTexte(s)}
              >
                <span className={STYLES[s].classe}>{STYLES[s].libelle}</span>
              </button>
            ))}
          </div>
        ) : null}
        {onglet === 'animations' ? (
          <div className="grid grid-cols-2 gap-2">
            {TYPES_CALQUE.filter((t) => t !== 'texte').map((t) => (
              <button
                key={t}
                type="button"
                className={`${TUILE} justify-items-center text-center`}
                onClick={() => onAnimation(t)}
              >
                {LIBELLES_CALQUE[t]}
              </button>
            ))}
          </div>
        ) : null}
        {onglet === 'cartons' ? (
          <button
            type="button"
            className={`${TUILE} min-h-24 justify-items-center text-center`}
            onClick={onCarton}
          >
            <span className="text-base font-bold">Votre texte</span>
            <span className="text-montage-texte-doux">Carton plein écran</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
