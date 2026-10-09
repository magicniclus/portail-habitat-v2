/**
 * Mesure du comportement (COMPORTEMENT §1 à §4) : constantes et calculs partagés entre le
 * traceur du navigateur (`@ph/tracker`), la route `/api/t` et l'agrégation de nuit.
 * Aucune dépendance : le traceur doit rester sous 6 Ko compressé.
 */

export type Appareil = 'ordinateur' | 'tablette' | 'mobile';

/** Largeur de la mise en page de référence par gabarit (`x` y est ramené). */
export const LARGEURS_REFERENCE: Readonly<Record<Appareil, number>> = {
  ordinateur: 1280,
  tablette: 768,
  mobile: 390,
};

/** Côté d'une cellule des cartes de chaleur, en px de la mise en page de référence. */
export const TAILLE_CELLULE = 20;
/** Curseur immobile au moins ce temps : arrêt (carte d'attention). */
export const PAUSE_MIN_MS = 600;
/** Arrêt sur un élément suivi sans clic dans les 5 s : hésitation. */
export const HESITATION_MIN_MS = 2000;
export const HESITATION_FENETRE_MS = 5000;
/** Clics de rage : au moins 3 clics en 700 ms dans un rayon de 30 px. */
export const RAGE = { clics: 3, fenetreMs: 700, rayonPx: 30 } as const;
/** Trajet : un point toutes les 100 ms si le curseur a bougé de plus de 8 px, 40 points gardés. */
export const TRAJET = { intervalleMs: 100, deplacementMinPx: 8, pointsMax: 40 } as const;
/** Replay : événements compacts `[t, code, x, y]`, plafonnés pour tenir dans un seul envoi. */
export const REPLAY_EVENEMENTS_MAX = 2000;
export const CODES_REPLAY = { mouvement: 0, clic: 1, defilement: 2 } as const;
/** Échantillonnage par défaut (surchargé par `config/comportement`). */
export const ECHANTILLONS_DEFAUT = { visites: 1, trajets: 0.1, replays: 0.05 } as const;

/** Gabarits d'agrégation : `≥ 1200`, `768–1199`, `< 768`. */
export function appareilPour(largeur: number): Appareil {
  if (largeur >= 1200) return 'ordinateur';
  return largeur >= 768 ? 'tablette' : 'mobile';
}

/**
 * Abscisse ramenée à la mise en page de référence : `x` (px dans le document) devient une part
 * de la largeur du document, appliquée à la largeur de référence du gabarit.
 */
export function abscisseReference(x: number, largeurDocument: number, appareil: Appareil) {
  const ref = LARGEURS_REFERENCE[appareil];
  if (largeurDocument <= 0) return 0;
  return Math.min(ref - 1, Math.max(0, Math.round((x / largeurDocument) * ref)));
}

/** Clé de cellule `colonne:ligne` d'une carte creuse. */
export function cleCellule(xReference: number, y: number) {
  return `${Math.floor(xReference / TAILLE_CELLULE)}:${Math.floor(Math.max(0, y) / TAILLE_CELLULE)}`;
}

/** Profondeur de défilement en % arrondie au palier de 5 % inférieur. */
export function palierProfondeur(basVisible: number, hauteurDocument: number) {
  if (hauteurDocument <= 0) return 100;
  const pct = Math.min(100, Math.max(0, (basVisible / hauteurDocument) * 100));
  return Math.floor(pct / 5) * 5;
}

/**
 * Pages publiques suivies (COMPORTEMENT §1) : identifiant → espace. Les espaces connectés ne
 * sont jamais suivis. `/api/t` refuse toute autre page.
 */
export const PAGES_SUIVIES = {
  accueil: 'particulier',
  annuaire: 'particulier',
  simulateur: 'particulier',
  'acquisition-artisans': 'pro',
  diagnostic: 'diag',
} as const satisfies Record<string, 'particulier' | 'pro' | 'diag'>;
export type PageSuivie = keyof typeof PAGES_SUIVIES;

/** Résumés de visite conservés 35 jours (COMPORTEMENT §7). */
export const DUREE_SESSION_JOURS = 35;
/** Replays : au plus 300 par jour (COUTS §2). */
export const REPLAYS_MAX_JOUR = 300;

/**
 * Échantillonnage côté serveur, stable pour une session : toutes les pages vues d'un même
 * visiteur sont gardées ou écartées ensemble (hachage FNV-1a de l'identifiant).
 */
export function visiteRetenue(sessionId: string, echantillon: number) {
  if (echantillon >= 1) return true;
  let h = 0x811c9dc5;
  for (let i = 0; i < sessionId.length; i++) h = Math.imul(h ^ sessionId.charCodeAt(i), 0x01000193);
  return (h >>> 0) % 10_000 < echantillon * 10_000;
}

/** Robots, navigateurs automatisés et aperçus de liens : jamais mesurés. */
export const estRobot = (agent: string | null) =>
  !agent ||
  /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python|java\//i.test(
    agent,
  );
