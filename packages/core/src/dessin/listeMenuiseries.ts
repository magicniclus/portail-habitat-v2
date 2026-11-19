import type { Niveau } from '../schemas/dessinScene';
import {
  LIBELLES_MATERIAU_MENUISERIE,
  LIBELLES_REMPLISSAGE,
  materiauDe,
  remplissageDe,
} from './menuiseries';
import { CATALOGUE_OUVERTURES } from './ouvertures';

/**
 * Liste des menuiseries pour le chiffrage (DES-43) : une ligne par modèle identique (type,
 * dimensions, remplissage, matériau), avec le nombre.
 */
export function listeMenuiseries(
  n: Pick<Niveau, 'ouvertures'>,
): { libelle: string; nombre: number }[] {
  const lignes = new Map<string, number>();
  for (const o of n.ouvertures) {
    if (CATALOGUE_OUVERTURES[o.type].famille === 'libre') continue;
    const r = remplissageDe(o);
    const libelle = [
      `${CATALOGUE_OUVERTURES[o.type].libelle} ${Math.round(o.largeur / 10)} × ${Math.round(o.hauteur / 10)} cm`,
      LIBELLES_REMPLISSAGE[r].toLowerCase(),
      o.petitsBois && r !== 'plein'
        ? `${o.petitsBois.colonnes * o.petitsBois.rangees} carreaux`
        : null,
      LIBELLES_MATERIAU_MENUISERIE[materiauDe(o)],
      o.imposte ? 'avec imposte' : null,
      o.volet ? `volet ${o.volet}` : null,
    ]
      .filter(Boolean)
      .join(', ');
    lignes.set(libelle, (lignes.get(libelle) ?? 0) + 1);
  }
  return [...lignes]
    .map(([libelle, nombre]) => ({ libelle, nombre }))
    .sort((a, b) => a.libelle.localeCompare(b.libelle));
}
