import { PRIX_FORMULES_HT } from '@ph/core/paiements';
import { formatEuros, formatFourchette } from '@ph/core/format';
import type { Bloc, Ton } from '../blocs';

/**
 * Outils communs aux emails de conversion (CONVERSION §3) : prix réels des formules (PAIEMENTS §2,
 * mensuels, sans engagement), blocs. Les étapes « Visibilité » et « Premium » du moteur vendent
 * Fiche Pro et Tout inclus (D60).
 */

export const ht = (c: number) => formatEuros(c, { suffixe: 'HT' });
export const PRIX = {
  fichePro: PRIX_FORMULES_HT.fiche_pro,
  toutInclus: PRIX_FORMULES_HT.tout_inclus,
};
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
