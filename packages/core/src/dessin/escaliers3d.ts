import type { Point } from '../schemas/dessinScene';
import { longueurVolee, type Escalier } from './escaliers';
import { radians } from './geometrie';
import type { Pave } from './volumes';

/**
 * Escaliers en 3D (DES-15, DES-33) : marches pleines jusqu'au sol, ou marches seules sur un
 * limon central (dessous ouvert). Matériau : bois, métal ou béton.
 */

/** Épaisseur d'une marche d'escalier ouvert, selon le matériau (mm). */
const EPAISSEUR_MARCHE = { bois: 40, metal: 30, beton: 80 } as const;

/** Ligne de foulée de l'escalier, dans son repère (même repère que `empriseLocale`). */
function foulee(e: Escalier): Point[] {
  const l = e.largeur;
  const L = longueurVolee(e);
  if (e.type === 'helicoidal') {
    const c = Math.max(2 * l, 1400);
    const r = c / 2 - l / 2;
    return Array.from({ length: 25 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 24) * (Math.PI * 1.75);
      return { x: c / 2 + r * Math.cos(a), y: c / 2 + r * Math.sin(a) };
    });
  }
  if (e.type === 'quart_bas' || e.type === 'quart_haut') {
    const branche = Math.max(l, L - l);
    return [
      { x: l / 2, y: 0 },
      { x: l / 2, y: branche + l / 2 },
      { x: l + branche, y: branche + l / 2 },
    ];
  }
  if (e.type === 'deux_quarts') {
    const branche = Math.max(l, (L - l) / 2);
    return [
      { x: l / 2, y: 0 },
      { x: l / 2, y: branche + l / 2 },
      { x: (3 * l) / 2, y: branche + l / 2 },
      { x: (3 * l) / 2, y: 0 },
    ];
  }
  return [
    { x: l / 2, y: 0 },
    { x: l / 2, y: L + e.giron },
  ];
}

/** Repère de l'escalier → plan : rotation puis position, altitude ajoutée. */
export function versPlan(e: Escalier, altitude: number) {
  const rot = radians(e.rotation);
  const [c, s] = [Math.cos(rot), Math.sin(rot)];
  return (p: Point, z: number) => ({
    x: e.position.x + p.x * c - p.y * s,
    y: e.position.y + p.x * s + p.y * c,
    z: altitude + z,
  });
}

/** Centres des marches sur la ligne de foulée (repère de l'escalier) et leur direction. */
export function pasDeFoulee(e: Escalier) {
  const chemin = foulee(e);
  const longueurs = chemin
    .slice(1)
    .map((p, i) => Math.hypot(p.x - chemin[i]!.x, p.y - chemin[i]!.y));
  const total = longueurs.reduce((s, x) => s + x, 0);
  const pas = total / e.nbMarches;
  const centres = Array.from({ length: e.nbMarches }, (_, i) => {
    let d = (i + 0.5) * pas;
    let k = 0;
    while (k < longueurs.length - 1 && d > longueurs[k]!) d -= longueurs[k++]!;
    const [a, b] = [chemin[k]!, chemin[k + 1]!];
    const t = d / longueurs[k]!;
    return {
      local: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
      sens: Math.atan2(b.y - a.y, b.x - a.x),
    };
  });
  return { depart: chemin[0]!, pas, centres };
}

/**
 * Marches (DES-33, DES-34) réparties sur la ligne de foulée : la marche i a son dessus à
 * (i + 1) × hauteur de marche. Pleines jusqu'au sol, ou simples dalles si le dessous est
 * ouvert. Placées sur le plan comme l'emprise.
 */
export function marchesEscalier(e: Escalier, altitude: number): Pave[] {
  const { pas, centres } = pasDeFoulee(e);
  const hMarche = e.hauteurAMonter / e.nbMarches;
  const plan = versPlan(e, altitude);
  const rot = radians(e.rotation);
  const largeur = e.type === 'helicoidal' ? Math.max(2 * e.largeur, 1400) / 2 - 100 : e.largeur;
  const ouvert = e.structure === 'ouverte';
  const ep = EPAISSEUR_MARCHE[e.materiau ?? 'bois'];
  return centres.map(({ local, sens }, i) => {
    const dessus = (i + 1) * hMarche;
    const h = ouvert ? Math.min(ep, dessus) : dessus;
    return {
      centre: plan(local, dessus - h / 2),
      // La marche est en travers de la foulée : l = largeur, p = giron.
      taille: { l: largeur, p: pas, h },
      angle: sens + rot - Math.PI / 2,
    };
  });
}
