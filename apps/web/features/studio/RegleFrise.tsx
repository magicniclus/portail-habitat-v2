'use client';

import { LARGEUR_EN_TETE } from './EnTetePiste';

/** Règle du temps en haut de la frise : un clic (ou un glisser) place la tête de lecture. */
export function RegleFrise(p: {
  largeur: number;
  px: number;
  tete: number;
  onTete: (ms: number) => void;
}) {
  const { largeur, px } = p;
  const pas = px > 0.08 ? 1_000 : px > 0.02 ? 5_000 : 10_000;
  const placer = (x: number, el: HTMLElement) =>
    p.onTete(Math.max(0, (x - el.getBoundingClientRect().left) / px));
  return (
    <div className="sticky top-0 z-30 flex h-6 border-b border-montage-trait bg-montage-panneau">
      <div
        className="sticky left-0 z-10 shrink-0 bg-montage-panneau"
        style={{ width: LARGEUR_EN_TETE }}
      />
      <div
        role="slider"
        tabIndex={0}
        aria-label="Position de lecture"
        aria-valuemin={0}
        aria-valuemax={Math.round(largeur / px)}
        aria-valuenow={Math.round(p.tete)}
        className="relative cursor-pointer"
        style={{ width: largeur }}
        onPointerDown={(e) => {
          const el = e.currentTarget;
          el.setPointerCapture(e.pointerId);
          placer(e.clientX, el);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) placer(e.clientX, e.currentTarget);
        }}
      >
        {Array.from({ length: Math.ceil(largeur / px / pas) }, (_, i) => (
          <span
            key={i}
            className="absolute top-0 h-full border-l border-montage-trait pl-1 text-[10px] text-montage-texte-doux"
            style={{ left: i * pas * px }}
          >
            {(i * pas) / 1000}s
          </span>
        ))}
      </div>
    </div>
  );
}
