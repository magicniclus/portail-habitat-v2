import type { CalqueComportement } from '@ph/core/comportement';
import type { VueComportement } from '@ph/firebase/admin-serveur';

/** Données d'une vue transmises aux composants du navigateur (cartes déjà décodées). */
export type DonneesCartes = Pick<
  VueComportement,
  | 'sessions'
  | 'grilleClics'
  | 'grilleAttention'
  | 'grilleMouvements'
  | 'scroll'
  | 'sections'
  | 'elements'
  | 'sorties'
>;
export type { CalqueComportement };
