import type { DroitsFormule } from '../paiements/droits';

/** Bannières de la fiche avec la visibilité payante (Fiche Pro, Fiche + Site, Tout inclus). */
export const BANNIERES_MAX_VISIBILITE = 5;

/** Nombre de bannières permis : 5 avec la fiche mise en avant, 1 sinon. */
export const bannieresMax = (d: Pick<DroitsFormule, 'ficheMiseEnAvant'>) =>
  d.ficheMiseEnAvant ? BANNIERES_MAX_VISIBILITE : 1;

/**
 * Liste après l'ajout d'une bannière : remplacement s'il n'en est permis qu'une, ajout en fin
 * sinon ; `null` si la liste est pleine.
 */
export function ajouterBanniere(actuelles: string[], url: string, max: number): string[] | null {
  if (max <= 1) return [url];
  if (actuelles.includes(url)) return actuelles;
  return actuelles.length >= max ? null : [...actuelles, url];
}

/** Partie de la bannière gardée visible quand elle est rognée : centre par défaut. */
export const CADRAGES_BANNIERE = ['haut', 'centre', 'bas'] as const;
export type CadrageBanniere = (typeof CADRAGES_BANNIERE)[number];
const POSITIONS = { haut: 'top', centre: 'center', bas: 'bottom' } as const;

/** Valeur CSS `object-position` du cadrage choisi. */
export const positionBanniere = (c: CadrageBanniere | undefined) => POSITIONS[c ?? 'centre'];
