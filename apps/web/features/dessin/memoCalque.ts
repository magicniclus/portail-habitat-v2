import type { Niveau } from '@ph/core/dessin';
import { memo, type ComponentType } from 'react';
import type { EtatEditeur } from './etat';

/**
 * Calque du plan qui ne se redessine que si ses données changent (DES-48, 500 murs et 1 000
 * objets). Le calque ne **voit** que les champs listés (`Pick`) : lire un autre champ du niveau
 * ou de l'état est une erreur de typage, donc jamais un rendu périmé. Ses autres propriétés sont
 * comparées par identité (les rappels doivent être stables).
 */
export function memoCalque<
  KN extends keyof Niveau,
  KE extends keyof EtatEditeur,
  A extends Record<string, unknown>,
>(
  Calque: ComponentType<{ niveau: Pick<Niveau, KN>; etat: Pick<EtatEditeur, KE> } & A>,
  champsNiveau: readonly KN[],
  champsEtat: readonly KE[],
) {
  type P = { niveau: Pick<Niveau, KN>; etat: Pick<EtatEditeur, KE> } & A;
  return memo(Calque, (avant: P, apres: P) => {
    const cles = new Set([...Object.keys(avant), ...Object.keys(apres)]);
    for (const k of cles)
      if (k !== 'niveau' && k !== 'etat' && avant[k as keyof P] !== apres[k as keyof P])
        return false;
    return (
      champsNiveau.every((c) => avant.niveau[c] === apres.niveau[c]) &&
      champsEtat.every((c) => avant.etat[c] === apres.etat[c])
    );
  });
}
