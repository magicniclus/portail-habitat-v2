'use client';

import type { Cote, useLargeursPanneaux } from './useLargeursPanneaux';

/** Séparateur vertical : tirer (ou flèches du clavier) pour régler la largeur d'un panneau. */
export function SeparateurPanneau(p: {
  cote: Cote;
  largeurs: ReturnType<typeof useLargeursPanneaux>;
}) {
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={p.cote === 'gauche' ? 'Largeur de la bibliothèque' : 'Largeur des réglages'}
      aria-valuenow={p.largeurs[p.cote]}
      onPointerDown={p.largeurs.tirer(p.cote)}
      onKeyDown={p.largeurs.clavier(p.cote)}
      className="hidden cursor-col-resize touch-none bg-montage-trait hover:bg-montage-selection focus-visible:bg-montage-selection lg:block"
    />
  );
}
