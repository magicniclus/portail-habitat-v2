import type { Bloc } from './blocs';

/** Un modèle : sujet (< 60 caractères), preheader, blocs, SMS éventuel, données d'exemple (EMAILS §3). */
export interface Modele<D extends object = Record<string, unknown>> {
  sujet: (d: D) => string;
  preheader: (d: D) => string;
  blocs: (d: D) => Bloc[];
  sms?: (d: D) => string;
  exemple: D;
}

export const modele = <D extends object>(m: Modele<D>): Modele<D> => m;

export const bonjour = (prenom?: string) => (prenom ? `Bonjour ${prenom}, ` : 'Bonjour, ');
