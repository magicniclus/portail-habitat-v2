import type { ReactNode } from 'react';

/** Petits blocs partagés des panneaux de Plans (inspecteurs, menus). */

/** Surtitre en petites capitales (« SÉLECTION », « EXPORTER »…). */
export const surtitre = 'm-0 text-xs font-bold tracking-wide text-neutre-700 uppercase';

/** Tuile « libellé / valeur » d'une liste `dl` (surface, périmètre, couverture…). */
export function Info({
  libelle,
  valeur,
  large,
  grande,
}: {
  libelle: string;
  valeur: ReactNode;
  /** Sur toute la largeur de la grille. */
  large?: boolean;
  /** Valeur en plus gros (surface d'une pièce). */
  grande?: boolean;
}) {
  return (
    <div className={`rounded-lg bg-neutre-100 px-2.5 py-2 text-sm ${large ? 'col-span-2' : ''}`}>
      <dt className="text-neutre-700">{libelle}</dt>
      <dd className={`m-0 font-bold ${grande ? 'text-[17px]' : ''}`}>{valeur}</dd>
    </div>
  );
}

/** En-tête d'un inspecteur : « SÉLECTION » puis le nom de l'élément. */
export function TitreSelection({ sur = 'Sélection', titre }: { sur?: string; titre: string }) {
  return (
    <div>
      <p className={surtitre}>{sur}</p>
      <h2 className="m-0 text-xl font-bold">{titre}</h2>
    </div>
  );
}
