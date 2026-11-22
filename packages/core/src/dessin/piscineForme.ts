import { echec, type Resultat } from '../resultat';
import type { Niveau, Point } from '../schemas/dessinScene';
import type { Contexte } from './commandes';
import { ajouterPiscine, modifierExterieur, type FormePiscine } from './exterieur';
import { radians } from './geometrie';

/** En dessous (mm), le tracé est un clic : la piscine prend sa taille par défaut. */
const TRACE_MIN = 500;
const COTE_MIN = 1_000;

/** Rectangle a–b → centre, longueur (grand côté), largeur et rotation de la piscine. */
function cadre(a: Point, b: Point, forme: FormePiscine) {
  const [dx, dy] = [Math.abs(b.x - a.x), Math.abs(b.y - a.y)];
  const ronde = forme === 'ronde';
  const grand = Math.max(COTE_MIN, Math.round(ronde ? Math.min(dx, dy) : Math.max(dx, dy)));
  const petit = Math.max(COTE_MIN, Math.round(Math.min(dx, dy)));
  return {
    position: { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) },
    longueur: grand,
    largeur: ronde ? grand : petit,
    rotation: dx >= dy ? 0 : 900,
  };
}

/**
 * Piscine tracée comme un sol (DES-20) : deux coins opposés, posée sur la terrasse, le gazon
 * ou n'importe quel sol ; un simple clic la pose à sa taille par défaut.
 */
export function tracerPiscine(
  n: Niveau,
  a: Point,
  b: Point,
  forme: FormePiscine,
  ctx: Contexte,
): Resultat<Niveau & { elementId: string }> {
  const clic = Math.abs(b.x - a.x) < TRACE_MIN && Math.abs(b.y - a.y) < TRACE_MIN;
  if (clic) return ajouterPiscine(n, b, forme, ctx);
  const { position, ...taille } = cadre(a, b, forme);
  return ajouterPiscine(n, position, forme, ctx, taille);
}

/**
 * Coin d'une piscine tiré à la souris (DES-20) : le coin opposé reste en place, la piscine
 * s'étire comme un rectangle de sol (dans son propre sens).
 */
export function redimensionnerPiscine(
  n: Niveau,
  id: string,
  coin: number,
  vers: Point,
): Resultat<Niveau> {
  const p = n.exterieur.piscines.find((x) => x.id === id);
  if (!p) return echec('INTROUVABLE');
  const t = radians(p.rotation);
  const u = { x: Math.cos(t), y: Math.sin(t) };
  const v = { x: -Math.sin(t), y: Math.cos(t) };
  // Coins 0 à 3 : (-,-), (+,-), (+,+), (-,+) dans le repère de la piscine.
  const signes = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const;
  const [sa, sb] = signes[(coin + 2) % 4]!;
  const fixe = {
    x: p.position.x + (u.x * sa * p.longueur) / 2 + (v.x * sb * p.largeur) / 2,
    y: p.position.y + (u.y * sa * p.longueur) / 2 + (v.y * sb * p.largeur) / 2,
  };
  const d = { x: vers.x - fixe.x, y: vers.y - fixe.y };
  const longueur = Math.max(COTE_MIN, Math.round(Math.abs(d.x * u.x + d.y * u.y)));
  const largeur = Math.max(COTE_MIN, Math.round(Math.abs(d.x * v.x + d.y * v.y)));
  const ronde = p.forme === 'ronde';
  return modifierExterieur(n, 'piscine', id, {
    position: { x: Math.round((fixe.x + vers.x) / 2), y: Math.round((fixe.y + vers.y) / 2) },
    longueur: ronde ? Math.max(longueur, largeur) : longueur,
    largeur: ronde ? Math.max(longueur, largeur) : Math.min(largeur, 25_000),
  });
}
