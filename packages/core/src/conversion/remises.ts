import { minuitParis } from '../admin/annonces';
import { remisePossible } from './index';

/**
 * Codes promo personnels (CONVERSION §1.4 et §6, D32c ⏳) : Stripe, usage unique, expiration
 * réelle. Valeurs par défaut ; une remise au plus tous les 90 jours par entreprise.
 */
const OFFRES: Record<
  string,
  { pourcentage: number; dureeMois: number; jours: number; produit?: 'visibilite' }
> = {
  'vis-offre-lancement': { pourcentage: 30, dureeMois: 12, jours: 3, produit: 'visibilite' },
  'vis-offre-relance': { pourcentage: 30, dureeMois: 12, jours: 3, produit: 'visibilite' },
  'reconquete-1': { pourcentage: 30, dureeMois: 12, jours: 7 },
};
/** Ces modèles reprennent le code encore valable de l'email précédent. */
const REPRISES = new Set(['vis-offre-rappel']);

export const modeleAvecCode = (modele: string) => modele in OFFRES || REPRISES.has(modele);

const jourParis = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(ms);

/** Dernière minute (23 h 59, heure de Paris) du jour situé `jours` jours après `maintenant`. */
export function finValidite(maintenant: number, jours: number): number {
  const [a, m, j] = jourParis(maintenant).split('-').map(Number) as [number, number, number];
  const lendemain = new Date(Date.UTC(a, m - 1, j + jours + 1)).toISOString().slice(0, 10);
  return minuitParis(lendemain) - 60_000;
}

/** « vendredi 16 octobre à 23 h 59 » (1er pour le premier du mois). */
export function libelleExpiration(ms: number): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(ms)
      .map((x) => [x.type, x.value]),
  );
  const jour = p.day === '1' ? '1er' : p.day;
  return `${p.weekday} ${jour} ${p.month} à ${p.hour} h ${p.minute}`;
}

/** Code lisible et unique : 8 lettres du nom, le pourcentage, 4 caractères aléatoires. */
export function codePersonnel(nom: string, pourcentage: number, alea: string): string {
  const base = nom
    .normalize('NFD')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8);
  return `${base || 'PRO'}${pourcentage}${alea.toUpperCase()}`;
}

export interface CodeActif {
  code: string;
  pourcentage: number;
  produit: 'visibilite' | 'premium';
  expire: number;
  utilise: boolean;
}

export type DecisionRemise =
  | { type: 'aucune' }
  | { type: 'refus' }
  | ({ type: 'reprise' } & CodeActif)
  | {
      type: 'nouveau';
      pourcentage: number;
      dureeMois: number;
      expire: number;
      produit: 'visibilite' | 'premium';
    };

export function decisionRemise(
  modele: string,
  e: {
    maintenant: number;
    derniereRemise?: number;
    codeActif?: CodeActif;
    produit?: 'visibilite' | 'premium';
  },
): DecisionRemise {
  if (REPRISES.has(modele)) {
    const c = e.codeActif;
    return c && !c.utilise && c.expire > e.maintenant
      ? { type: 'reprise', ...c }
      : { type: 'refus' };
  }
  const offre = OFFRES[modele];
  if (!offre) return { type: 'aucune' };
  if (
    !remisePossible({
      pourcentage: offre.pourcentage,
      maintenant: e.maintenant,
      ...(e.derniereRemise !== undefined ? { derniereRemise: e.derniereRemise } : {}),
    })
  )
    return { type: 'refus' };
  return {
    type: 'nouveau',
    pourcentage: offre.pourcentage,
    dureeMois: offre.dureeMois,
    expire: finValidite(e.maintenant, offre.jours),
    produit: offre.produit ?? e.produit ?? 'visibilite',
  };
}
