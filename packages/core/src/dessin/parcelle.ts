import { echec, succes, type Resultat } from '../resultat';
import type { Point, Scene } from '../schemas/dessinScene';
import { aire } from './geometrie';

/** En dessous (mm²), la parcelle est écrasée : 1 m². */
const AIRE_MIN = 1_000_000;
const arrondi = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) });

/** Remplace les coins de la parcelle, si elle garde une surface. */
function avecCoins(s: Scene, coins: Point[]): Resultat<Scene> {
  if (!s.terrain) return echec('INTROUVABLE', { message: 'Aucune parcelle.' });
  if (aire(coins) < AIRE_MIN)
    return echec('PRECONDITION', { message: 'La parcelle n’aurait plus de surface.' });
  return succes({ ...s, terrain: { ...s.terrain, parcelle: coins } });
}

/** Tire un coin de la parcelle (DES-19) : la limite suit, au mm. */
export function deplacerSommetParcelle(s: Scene, i: number, vers: Point): Resultat<Scene> {
  const coins = s.terrain?.parcelle;
  if (!coins || i < 0 || i >= coins.length) return echec('INTROUVABLE');
  return avecCoins(
    s,
    coins.map((p, j) => (j === i ? arrondi(vers) : p)),
  );
}

/** Déplace toute la parcelle (DES-19), la maison restant en place. */
export function deplacerParcelle(s: Scene, delta: Point): Resultat<Scene> {
  const coins = s.terrain?.parcelle;
  if (!coins) return echec('INTROUVABLE');
  return avecCoins(
    s,
    coins.map((p) => arrondi({ x: p.x + delta.x, y: p.y + delta.y })),
  );
}

/** Ajoute un angle sur le côté qui suit le coin `apres` : terrain en biais, en L… */
export function ajouterSommetParcelle(s: Scene, apres: number, p: Point): Resultat<Scene> {
  const coins = s.terrain?.parcelle;
  if (!coins) return echec('INTROUVABLE');
  return avecCoins(s, [...coins.slice(0, apres + 1), arrondi(p), ...coins.slice(apres + 1)]);
}

/** Retire la parcelle (et ce qui la décrit : cadastre, implantation). */
export function supprimerParcelle(s: Scene): Resultat<Scene> {
  return succes({ ...s, terrain: null });
}
