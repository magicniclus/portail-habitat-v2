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
