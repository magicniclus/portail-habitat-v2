import { normaliser } from '@ph/core/recherche';
import { PROJETS_POPULAIRES } from './contenu';

export interface SaisieProjet {
  projet: string;
  cp: string;
  delai: string;
  /** Prestation retenue par un chip (ou, au lot 7, par la recherche). */
  prestation?: string;
}

/**
 * Destination du formulaire du hero (ACC-03) : le simulateur, prestation et code postal préremplis.
 * Sans prestation reconnue, le texte libre part au simulateur qui ouvre l'étape « Prestation ».
 */
export function cibleProjet(s: SaisieProjet): string {
  const projet = s.projet.trim();
  const prestation =
    s.prestation ??
    PROJETS_POPULAIRES.find((p) => normaliser(p.libelle) === normaliser(projet))?.prestation;
  const p = new URLSearchParams();
  if (prestation) p.set('prestation', prestation);
  else if (projet) p.set('projet', projet.slice(0, 120));
  if (/^\d{5}$/.test(s.cp.trim())) p.set('cp', s.cp.trim());
  if (s.delai) p.set('delai', s.delai);
  const q = p.toString();
  return q ? `/simulateur?${q}` : '/simulateur';
}
