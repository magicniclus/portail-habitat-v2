import type { Champ, Reponse } from '@ph/core/simulateur';

export interface PrestationSimulateur {
  id: string;
  nom: string;
  pitch: string;
  /** Tracé SVG 24 × 24 (maquette). */
  icone: string;
  famille: string;
  /** Parcours dédié (diagnostics) : la carte y mène au lieu d'ouvrir les questions. */
  lien?: string;
  champs: Champ[];
}

export interface CatalogueSimulateur {
  familles: { id: string; nom: string }[];
  prestations: PrestationSimulateur[];
}

export type Acces = 'facile' | 'etage' | 'difficile';

export interface Chantier {
  codePostal: string;
  acces: Acces;
}

export type Reponses = Record<string, Reponse>;

export const LIBELLES_ACCES: Record<Acces, string> = {
  facile: 'Rez-de-chaussée ou ascenseur',
  etage: 'Étage sans ascenseur',
  difficile: 'Accès difficile / rue étroite',
};
