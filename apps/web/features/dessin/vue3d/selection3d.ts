import type { EtatEditeur } from '../etat';

/** Sélection faite en 2D, montrée en 3D : la 3D ne sert qu'à voir, on n'y modifie rien. */
export type Selection3D = EtatEditeur['selection'] | undefined;
