/**
 * Blocs d'un email (EMAILS §3). Un modèle n'est qu'une liste de blocs : aucun style dans les modèles.
 * Les 14 blocs de la documentation, plus `code` (code promo ou de vérification) et `lien` (lien secondaire).
 */
export type Ton = 'info' | 'ok' | 'warn' | 'danger' | 'neutre';

export type Bloc =
  | { type: 'surtitre'; texte: string }
  | { type: 'titre'; texte: string; niveau?: 1 | 2 }
  | { type: 'paragraphe'; texte: string }
  | { type: 'citation'; texte: string }
  | { type: 'bouton'; texte: string; url: string }
  | { type: 'lien'; texte: string; url: string }
  | { type: 'code'; texte: string }
  | { type: 'recap'; lignes: { cle: string; valeur: string; fort?: boolean }[] }
  | { type: 'alerte'; texte: string; ton: Ton }
  | { type: 'etapes'; etapes: { texte: string; fait: boolean }[] }
  | { type: 'progression'; libelle: string; pourcent: number }
  | { type: 'stats'; stats: { valeur: string; evolution?: string; libelle: string }[] }
  | { type: 'carteArtisan'; initiales: string; nom: string; meta: string; labels: string }
  | { type: 'etoiles'; url: string }
  | { type: 'statuts'; lignes: { nom: string; statut: string; ton: Ton; valeur: string }[] }
  | { type: 'note'; texte: string };

export const titre = (texte: string): Bloc => ({ type: 'titre', texte });
export const sousTitre = (texte: string): Bloc => ({ type: 'titre', texte, niveau: 2 });
export const para = (texte: string): Bloc => ({ type: 'paragraphe', texte });
export const bouton = (texte: string, url: string): Bloc => ({ type: 'bouton', texte, url });
export const note = (texte: string): Bloc => ({ type: 'note', texte });
export const alerte = (texte: string, ton: Ton = 'info'): Bloc => ({ type: 'alerte', texte, ton });
export const recap = (lignes: [string, string, boolean?][]): Bloc => ({
  type: 'recap',
  lignes: lignes.map(([cle, valeur, fort]) => ({ cle, valeur, ...(fort ? { fort } : {}) })),
});
export const etapes = (liste: [string, boolean][]): Bloc => ({
  type: 'etapes',
  etapes: liste.map(([texte, fait]) => ({ texte, fait })),
});
