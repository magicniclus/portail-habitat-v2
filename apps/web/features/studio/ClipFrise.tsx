'use client';

import { LIBELLES_CALQUE, type Clip, type Frise, type Piste } from '@ph/core/studio';
import type { PointerEvent as EvtPointeur } from 'react';

const COULEURS: Record<Clip['source']['type'] | 'audio', string> = {
  media: 'bg-montage-piste-ecran',
  prise: 'bg-montage-piste-camera',
  capture: 'bg-montage-piste-capture',
  carton: 'bg-montage-piste-carton',
  effet: 'bg-montage-piste-animation',
  audio: 'bg-montage-piste-audio',
};

/** Nom affiché d'un clip (média importé, passage de la prise, capture, carton, effet). */
export function nomClip(f: Pick<Frise, 'medias' | 'captures'>, c: Clip): string {
  const s = c.source;
  if (s.type === 'media') return f.medias.find((m) => m.id === s.mediaId)?.nom ?? 'Média absent';
  if (s.type === 'prise')
    return { ecran: 'Écran', camera: 'Caméra', voix: 'Voix' }[s.fichier] ?? 'Prise';
  if (s.type === 'capture') return `Capture ${s.captureId}`;
  if (s.type === 'carton') return s.texte;
  return LIBELLES_CALQUE[s.calque.type];
}

/** Courbe d'automation (volume pour le son, opacité pour l'image) dessinée sur le clip. */
function Courbe({ clip, param }: { clip: Clip; param: 'volume' | 'opacite' }) {
  const pts = clip.automations?.[param];
  if (!pts?.length) return null;
  const y = (v: number) => 100 - (v / (param === 'volume' ? 2 : 1)) * 100;
  const d = [
    `M0 ${y(pts[0]!.v)}`,
    ...pts.map((p) => `L${(p.t / clip.duree) * 100} ${y(p.v)}`),
    `L100 ${y(pts.at(-1)!.v)}`,
  ].join(' ');
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full text-montage-tete"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      {pts.map((p) => (
        <circle
          key={p.t}
          cx={(p.t / clip.duree) * 100}
          cy={y(p.v)}
          r={3}
          fill="currentColor"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

/**
 * Un clip sur sa piste : glisser pour le déplacer (aussi vers une autre piste), poignées pour
 * le rogner, fondus et automations visibles.
 */
export function ClipFrise({
  frise,
  piste,
  clip: c,
  px,
  selectionne,
  onSelection,
  onDeplacer,
  onRognerDebut,
  onRognerFin,
}: {
  frise: Frise;
  piste: Piste;
  clip: Clip;
  px: number;
  selectionne: boolean;
  onSelection: () => void;
  onDeplacer: (e: EvtPointeur<HTMLElement>) => void;
  onRognerDebut: (e: EvtPointeur<HTMLElement>) => void;
  onRognerFin: (e: EvtPointeur<HTMLElement>) => void;
}) {
  const audio = piste.type === 'audio';
  const nom = nomClip(frise, c);
  const largeur = Math.max(6, c.duree * px);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selectionne}
      aria-label={`Clip ${nom}`}
      onPointerDown={(e) => {
        onSelection();
        if (!piste.verrou) onDeplacer(e);
      }}
      onKeyDown={(e) => (e.key === 'Enter' ? onSelection() : undefined)}
      className={`absolute top-1 bottom-1 overflow-hidden rounded-[6px] text-[11px] font-semibold text-blanc outline-none select-none ${COULEURS[audio ? 'audio' : c.source.type]} ${selectionne ? 'ring-2 ring-montage-selection' : 'ring-1 ring-black/30'} ${piste.verrou ? 'cursor-not-allowed opacity-70' : 'cursor-grab'} ${piste.muet || c.muet ? 'opacity-40' : ''}`}
      style={{ left: c.debut * px, width: largeur }}
    >
      {c.fondus?.entree ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-black/50 to-transparent"
          style={{ width: c.fondus.entree * px }}
        />
      ) : null}
      {c.fondus?.sortie ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 bg-gradient-to-l from-black/50 to-transparent"
          style={{ width: c.fondus.sortie * px }}
        />
      ) : null}
      <Courbe clip={c} param={audio ? 'volume' : 'opacite'} />
      <span className="relative block truncate px-2 pt-1">
        {c.vitesse && c.vitesse !== 1 ? `${c.vitesse}× · ` : ''}
        {nom}
      </span>
      {selectionne && !piste.verrou ? (
        <>
          <span
            aria-hidden="true"
            onPointerDown={onRognerDebut}
            className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-montage-selection/80"
          />
          <span
            aria-hidden="true"
            onPointerDown={onRognerFin}
            className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-montage-selection/80"
          />
        </>
      ) : null}
    </div>
  );
}
