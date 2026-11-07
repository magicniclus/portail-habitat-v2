import type { ReactNode } from 'react';

/** Largeur de la colonne des noms de pistes (fixe pendant le défilement horizontal). */
export const LARGEUR_ETIQUETTE = 112;

/** Une piste de la frise : son nom à gauche (toujours visible), son contenu à droite. */
export function LigneFrise({
  libelle,
  icone,
  hauteur,
  largeur,
  children,
}: {
  libelle: string;
  icone?: ReactNode;
  hauteur?: number;
  largeur: number;
  children: ReactNode;
}) {
  return (
    <div
      className="flex border-b border-montage-trait"
      style={hauteur ? { height: hauteur } : undefined}
    >
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-montage-trait bg-montage-panneau px-3 text-xs text-montage-texte-doux"
        style={{ width: LARGEUR_ETIQUETTE }}
      >
        {icone}
        {libelle}
      </div>
      <div className="relative" style={{ width: largeur }}>
        {children}
      </div>
    </div>
  );
}
