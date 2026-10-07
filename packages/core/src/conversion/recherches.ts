import { slugifier } from '../format';
import type { EtapeCycle } from './index';

const J = 86_400_000;

/** Fiches considérées en « 1re page » de l'annuaire : à la une, puis les premières de la liste. */
export const PREMIERE_PAGE = 10;
/** `vis-recherches-manquees` : au moins 10 recherches en 7 jours sans la fiche en 1re page. */
export const SEUIL_RECHERCHES_MANQUEES = 10;
const ESPACEMENT = 14 * J;

/** Compteur `recherchesSecteur/{jour}_{metier}_{ville}` : une écriture par recherche. */
export function idRechercheSecteur(jour: string, metier: string, ville: string): string {
  return `${jour}_${metier}_${slugifier(ville)}`;
}

export function idsPremierePage(r: {
  premium: readonly { id: string }[];
  standards: readonly { id: string }[];
}): string[] {
  return [...r.premium, ...r.standards].slice(0, PREMIERE_PAGE).map((a) => a.id);
}

export interface CompteurRecherches {
  jour: string;
  metier: string;
  ville: string;
  n: number;
  premierePage: Record<string, number>;
}

/**
 * Recherches « métier + ville » du secteur d'une fiche (métier principal, commune du siège) sur
 * 7 et 30 jours, et celles des 7 derniers jours où elle n'était pas en 1re page.
 */
export function recherchesDuSecteur(
  compteurs: readonly CompteurRecherches[],
  a: { id: string; metier: string; ville: string },
  maintenant: number,
): { recherches7j: number; manquees7j: number; recherches30j: number } {
  const jour = (j: number) => new Date(maintenant - j * J).toISOString().slice(0, 10);
  const [depuis7, depuis30, ville] = [jour(7), jour(30), slugifier(a.ville)];
  let recherches7j = 0;
  let vues7j = 0;
  let recherches30j = 0;
  for (const c of compteurs) {
    if (c.metier !== a.metier || slugifier(c.ville) !== ville || c.jour < depuis30) continue;
    recherches30j += c.n;
    if (c.jour < depuis7) continue;
    recherches7j += c.n;
    vues7j += c.premierePage[a.id] ?? 0;
  }
  return { recherches7j, manquees7j: Math.max(0, recherches7j - vues7j), recherches30j };
}

/** Signal « T » de la séquence S4 : fiche gratuite en ligne, au plus une fois tous les 14 jours. */
export function signalRecherchesManquees(
  etape: EtapeCycle,
  manquees7j: number,
  o: { maintenant: number; dernier?: number },
): boolean {
  return (
    etape === 'gratuit_actif' &&
    manquees7j >= SEUIL_RECHERCHES_MANQUEES &&
    (o.dernier === undefined || o.maintenant - o.dernier >= ESPACEMENT)
  );
}

/** Robots, aperçus de liens et navigateurs sans interface : jamais comptés. */
export function estRobot(userAgent: string): boolean {
  return (
    !userAgent ||
    /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit/i.test(userAgent)
  );
}
