'use client';

import { tempsMontage, type Frise } from '@ph/core/studio';
import {
  ImageIcon,
  MusicNotesIcon,
  UploadSimpleIcon,
  VideoCameraIcon,
} from '@phosphor-icons/react';
import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { GLISSE_STUDIO, type ClipGlisse } from './glisserFrise';

const ICONES = {
  video: <VideoCameraIcon size={18} aria-hidden="true" />,
  audio: <MusicNotesIcon size={18} aria-hidden="true" />,
  image: <ImageIcon size={18} aria-hidden="true" />,
};
const TUILE =
  'grid min-h-14 content-center gap-1 rounded-[8px] border border-montage-trait bg-montage-surface p-2 text-left text-xs text-montage-texte hover:border-montage-selection';
/** Durée d'un clip sans durée propre (image, texte, effet, carton). */
export const DUREE_FIXE = 3_000;

/** Tuile à glisser sur la frise (ou à cliquer : posée à la tête de lecture). */
export function Tuile(p: {
  clip: ClipGlisse;
  onPoser: (c: ClipGlisse) => void;
  children: ReactNode;
  classe?: string;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(GLISSE_STUDIO, JSON.stringify(p.clip));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => p.onPoser(p.clip)}
      className={`${TUILE} ${p.classe ?? ''}`}
    >
      {p.children}
    </button>
  );
}

/** Onglet Médias : zone d'import (glisser ou bouton), envois en cours, médias importés. */
export function MediasFrise(p: {
  frise: Frise;
  envois: { nom: string; avancement: number }[];
  onPoser: (c: ClipGlisse) => void;
  onFichiers: (fichiers: File[]) => void;
}) {
  const [survol, setSurvol] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const deposer = (e: DragEvent) => {
    e.preventDefault();
    setSurvol(false);
    if (e.dataTransfer.files.length) p.onFichiers([...e.dataTransfer.files]);
  };
  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={deposer}
        className={`grid justify-items-center gap-2 rounded-[10px] border border-dashed p-4 text-center text-xs ${survol ? 'border-montage-selection bg-montage-survol' : 'border-montage-trait'}`}
      >
        <UploadSimpleIcon size={22} aria-hidden="true" />
        <span>Déposez vos vidéos, sons et images</span>
        <button
          type="button"
          onClick={() => champ.current?.click()}
          className="min-h-10 rounded-[8px] bg-montage-selection px-3 font-bold text-montage-fond"
        >
          Importer
        </button>
        <input
          ref={champ}
          type="file"
          multiple
          accept="video/*,audio/*,image/png,image/jpeg,image/webp"
          aria-label="Importer des médias"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) p.onFichiers([...e.target.files]);
            e.target.value = '';
          }}
        />
        <span className="text-montage-texte-doux">Vidéo 1 Go · son 200 Mo · image 20 Mo</span>
      </div>
      {p.envois.map((e) => (
        <div key={e.nom} className="grid gap-1 text-xs" role="status">
          <span className="truncate">{e.nom}</span>
          <progress
            value={e.avancement}
            max={1}
            className="h-1.5 w-full accent-montage-selection"
          />
        </div>
      ))}
      {p.frise.medias.map((m) => (
        <Tuile
          key={m.id}
          onPoser={p.onPoser}
          clip={{
            source: { type: 'media', mediaId: m.id, debutSource: 0 },
            duree: m.dureeMs || DUREE_FIXE,
          }}
        >
          <span className="flex items-center gap-2 font-semibold">
            {ICONES[m.type]}
            <span className="truncate">{m.nom}</span>
          </span>
          <span className="text-montage-texte-doux">
            {m.type === 'image' ? 'Image' : tempsMontage(m.dureeMs)}
          </span>
        </Tuile>
      ))}
    </>
  );
}
