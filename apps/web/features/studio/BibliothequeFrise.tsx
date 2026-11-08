'use client';

import {
  calqueParDefaut,
  LIBELLES_CALQUE,
  STYLES_TEXTE,
  TYPES_CALQUE,
  type Calque,
  type Frise,
} from '@ph/core/studio';
import {
  ArrowsLeftRightIcon,
  MonitorIcon,
  VideoCameraIcon,
  CardsIcon,
  FilmStripIcon,
  MagicWandIcon,
  RobotIcon,
  SparkleIcon,
  TextTIcon,
} from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { DUREE_FIXE, MediasFrise, Tuile } from './MediasFrise';
import type { ClipGlisse, RetoucheGlissee } from './glisserFrise';
import { RetouchesBibliotheque } from './RetouchesBibliotheque';

type Onglet =
  | 'medias'
  | 'tournage'
  | 'ecrans'
  | 'texte'
  | 'effets'
  | 'transitions'
  | 'video'
  | 'cartons'
  | 'ia';
const ONGLETS: { id: Onglet; libelle: string; icone: ReactNode }[] = [
  { id: 'medias', libelle: 'Médias', icone: <FilmStripIcon size={20} aria-hidden="true" /> },
  { id: 'tournage', libelle: 'Tournage', icone: <VideoCameraIcon size={20} aria-hidden="true" /> },
  { id: 'ecrans', libelle: 'Écrans', icone: <MonitorIcon size={20} aria-hidden="true" /> },
  { id: 'texte', libelle: 'Texte', icone: <TextTIcon size={20} aria-hidden="true" /> },
  { id: 'effets', libelle: 'Animations', icone: <SparkleIcon size={20} aria-hidden="true" /> },
  {
    id: 'transitions',
    libelle: 'Transitions',
    icone: <ArrowsLeftRightIcon size={20} aria-hidden="true" />,
  },
  { id: 'video', libelle: 'Effets', icone: <MagicWandIcon size={20} aria-hidden="true" /> },
  { id: 'cartons', libelle: 'Cartons', icone: <CardsIcon size={20} aria-hidden="true" /> },
  { id: 'ia', libelle: 'IA', icone: <RobotIcon size={20} aria-hidden="true" /> },
];

const effet = (calque: Calque): ClipGlisse => ({
  source: { type: 'effet', calque: { ...calque, debut: 0, fin: DUREE_FIXE } },
  duree: DUREE_FIXE,
});

/**
 * Bibliothèque de l'éditeur libre : médias importés (glisser depuis l'ordinateur ou bouton
 * « Importer »), captures filmées, textes, effets animés et cartons. Glisser une tuile sur une
 * piste, ou cliquer pour la poser à la tête de lecture.
 */
export function BibliothequeFrise(p: {
  frise: Frise;
  envois: { nom: string; avancement: number }[];
  onPoser: (c: ClipGlisse) => void;
  onFichiers: (fichiers: File[]) => void;
  /** Onglet Écrans de Portail Travaux. */
  ecrans: ReactNode;
  /** Onglet Tournage. */
  tournage: ReactNode;
  /** Contenu de l'onglet IA. */
  ia: ReactNode;
  onRetouche: (r: RetoucheGlissee) => void;
}) {
  const [onglet, setOnglet] = useState<Onglet>('medias');
  return (
    <div className="grid h-full min-h-0 grid-cols-[64px_minmax(0,1fr)]">
      <div
        role="tablist"
        aria-label="Bibliothèque"
        aria-orientation="vertical"
        className="grid min-h-0 content-start gap-1 overflow-y-auto border-r border-montage-trait p-1.5"
      >
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={onglet === o.id}
            onClick={() => setOnglet(o.id)}
            className="grid min-h-14 content-center justify-items-center gap-0.5 rounded-[8px] text-[11px] text-montage-texte-doux hover:bg-montage-survol aria-selected:bg-montage-survol aria-selected:text-montage-selection"
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
        {onglet === 'ia' ? (
          p.ia
        ) : onglet === 'tournage' ? (
          p.tournage
        ) : onglet === 'ecrans' ? (
          p.ecrans
        ) : onglet === 'transitions' || onglet === 'video' ? null : (
          <p className="m-0 text-xs text-montage-texte-doux">
            Glissez sur une piste, ou cliquez pour poser à la tête de lecture.
          </p>
        )}
        {onglet === 'medias' ? (
          <>
            <MediasFrise
              frise={p.frise}
              envois={p.envois}
              onPoser={p.onPoser}
              onFichiers={p.onFichiers}
            />
          </>
        ) : null}
        {onglet === 'texte' ? (
          <div className="grid grid-cols-2 gap-2">
            {STYLES_TEXTE.map((s) => (
              <Tuile
                key={s}
                onPoser={p.onPoser}
                classe="justify-items-center text-center"
                clip={effet({
                  ...(calqueParDefaut('texte', DUREE_FIXE) as Extract<Calque, { type: 'texte' }>),
                  style: s,
                })}
              >
                <span className="font-semibold capitalize">{s}</span>
              </Tuile>
            ))}
          </div>
        ) : null}
        {onglet === 'effets' ? (
          <div className="grid grid-cols-2 gap-2">
            {TYPES_CALQUE.filter((t) => t !== 'texte').map((t) => (
              <Tuile
                key={t}
                onPoser={p.onPoser}
                classe="justify-items-center text-center"
                clip={effet(calqueParDefaut(t, DUREE_FIXE))}
              >
                {LIBELLES_CALQUE[t]}
              </Tuile>
            ))}
          </div>
        ) : null}
        {onglet === 'transitions' || onglet === 'video' ? (
          <RetouchesBibliotheque
            genre={onglet === 'transitions' ? 'transition' : 'effet'}
            onRetouche={p.onRetouche}
          />
        ) : null}
        {onglet === 'cartons' ? (
          <Tuile
            onPoser={p.onPoser}
            classe="min-h-24 justify-items-center text-center"
            clip={{ source: { type: 'carton', texte: 'Votre texte' }, duree: DUREE_FIXE }}
          >
            <span className="text-base font-bold">Votre texte</span>
            <span className="text-montage-texte-doux">Carton plein écran</span>
          </Tuile>
        ) : null}
      </div>
    </div>
  );
}
