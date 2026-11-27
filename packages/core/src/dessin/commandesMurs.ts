import { echec, succes, type Resultat } from '../resultat';
import type { Mur, Niveau } from '../schemas/dessinScene';
import { avecPieces, fusionnerMurs, scinderMur, type Contexte } from './commandes';
import { longueurMur } from './murs';

/**
 * Réglages d'un mur (DES-07) et outils de découpe (DES-09) branchés dans l'éditeur : épaisseur,
 * hauteur, type, porteur ; couper au milieu ; fusionner avec le voisin aligné.
 */
export type ModificationMur = Partial<Pick<Mur, 'epaisseur' | 'hauteur' | 'type' | 'porteur'>>;

export function modifierMur(
  n: Niveau,
  murId: string,
  modif: ModificationMur,
  ctx: Contexte,
): Resultat<Niveau> {
  const m = n.murs.find((x) => x.id === murId);
  if (!m) return echec('INTROUVABLE');
  if (modif.epaisseur !== undefined && (modif.epaisseur < 20 || modif.epaisseur > 1_000))
    return echec('ENTREE_INVALIDE', { message: 'Épaisseur entre 2 et 100 cm.' });
  if (modif.hauteur !== undefined && (modif.hauteur < 100 || modif.hauteur > 20_000))
    return echec('ENTREE_INVALIDE', { message: 'Hauteur entre 10 cm et 20 m.' });
  const mur: Mur = { ...m, ...modif };
  return succes(avecPieces({ ...n, murs: n.murs.map((x) => (x.id === murId ? mur : x)) }, ctx));
}

/** Coupe le mur en son milieu (deux murs identiques), hors d'une porte ou d'une fenêtre. */
export const couperMurAuMilieu = (n: Niveau, murId: string, ctx: Contexte): Resultat<Niveau> => {
  const m = n.murs.find((x) => x.id === murId);
  if (!m) return echec('INTROUVABLE');
  return scinderMur(n, murId, Math.round(longueurMur(m) / 2), ctx);
};

/** Mur voisin avec lequel celui-ci peut fusionner (même type et épaisseur, aligné, jointif). */
export function voisinFusionnable(n: Niveau, murId: string, ctx: Contexte): string | null {
  for (const x of n.murs) if (x.id !== murId && fusionnerMurs(n, murId, x.id, ctx).ok) return x.id;
  return null;
}
