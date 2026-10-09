import { CATALOGUE_STRIPE } from '@ph/core/facturation';
import { formatEuros, formatFourchette } from '@ph/core/format';
import type { Bloc, Ton } from '../blocs';

/** Outils communs aux emails de conversion (CONVERSION §3) : prix réels du catalogue, blocs. */

const montant = (cle: string) => CATALOGUE_STRIPE.find((p) => p.cle === cle)?.montantHt ?? 0;
export const ht = (c: number) => formatEuros(c, { suffixe: 'HT' });
export const PRIX = {
  visibiliteAn: montant('visibilite_annuel'),
  visibiliteMois: montant('visibilite_mensuel'),
  premiumAn: montant('premium_annuel'),
  premiumMois: montant('premium_mensuel'),
};
/** Prix annuel ramené au mois, arrondi au centime (« 6,66 € HT / mois »). */
export const parMois = (annuel: number) => Math.round(annuel / 12);
export const fourchette = (min: number, max: number) => `${formatFourchette(min, max)} TTC`;

export const surtitre = (texte: string): Bloc => ({ type: 'surtitre', texte });
export const lien = (texte: string, url: string): Bloc => ({ type: 'lien', texte, url });
export const code = (texte: string): Bloc => ({ type: 'code', texte });
export const stats = (liste: [string, string, string][]): Bloc => ({
  type: 'stats',
  stats: liste.map(([valeur, evolution, libelle]) => ({
    valeur,
    ...(evolution ? { evolution } : {}),
    libelle,
  })),
});
export const lignes = (liste: [string, string, Ton, string][]): Bloc => ({
  type: 'statuts',
  lignes: liste.map(([nom, statut, ton, valeur]) => ({ nom, statut, ton, valeur })),
});

/** Base de tous les emails de conversion. */
export interface BaseConversion {
  prenom?: string;
  nomCommercial?: string;
  /** Métier en clair (« plombier ») et commune du siège. */
  metier: string;
  ville: string;
  lien: string;
}

export const EX_BASE: BaseConversion = {
  prenom: 'Julien',
  nomCommercial: 'Bertrand Rénovation',
  metier: 'plombier',
  ville: 'Bordeaux',
  lien: 'https://portailhabitat.fr/pro/abonnement',
};
