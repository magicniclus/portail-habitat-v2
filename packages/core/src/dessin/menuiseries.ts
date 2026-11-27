import { echec, succes, type Resultat } from '../resultat';
import type { Mur, Niveau, Ouverture, Point } from '../schemas/dessinScene';
import { pointDansPolygone } from './geometrie';
import { longueurMur } from './murs';

/**
 * Menuiseries (DES-13, DES-14, lot 15h) : remplissage et matériau par défaut, place des portes
 * coulissantes (galandage dans la cloison, applique devant le mur), côté pièce.
 */
export type Remplissage = NonNullable<Ouverture['remplissage']>;
export type MateriauMenuiserie = NonNullable<Ouverture['materiau']>;

/** Épaisseur minimale d'une cloison qui reçoit un châssis à galandage (standard 72 mm). */
export const EPAISSEUR_MIN_GALANDAGE = 72;

const VITRES: readonly Ouverture['type'][] = [
  'fenetre',
  'fenetre_double',
  'fenetre_oscillo',
  'fenetre_fixe',
  'oeil_de_boeuf',
  'porte_fenetre',
  'baie_coulissante',
];

export const remplissageDe = (o: Ouverture): Remplissage =>
  o.remplissage ?? (VITRES.includes(o.type) ? 'vitre' : 'plein');
export const materiauDe = (o: Ouverture): MateriauMenuiserie => o.materiau ?? 'pvc';

export const LIBELLES_REMPLISSAGE: Record<Remplissage, string> = {
  plein: 'Plein',
  vitre: 'Vitré',
  semi_vitre: 'Semi-vitré',
  cassettes: 'À cassettes',
};
export const LIBELLES_MATERIAU_MENUISERIE: Record<MateriauMenuiserie, string> = {
  pvc: 'PVC',
  bois: 'Bois',
  alu: 'Aluminium',
};

/**
 * Bandes du mur occupées par le vantail ouvert d'une porte coulissante, en mm depuis a :
 * dans la cloison (galandage) ou devant elle (applique). `sens` gauche = vers a.
 */
export function zonesCoulissement(o: Ouverture): [number, number][] {
  const fin = o.position + o.largeur;
  if (o.type === 'porte_galandage_double')
    return [
      [o.position - o.largeur / 2, o.position],
      [fin, fin + o.largeur / 2],
    ];
  if (o.type !== 'porte_galandage' && o.type !== 'porte_coulissante') return [];
  return o.sens === 'gauche' ? [[o.position - o.largeur, o.position]] : [[fin, fin + o.largeur]];
}

const recouvre = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1];
/** Bandes occupées par une ouverture : la baie et, pour un coulissant, sa poche ou son rail. */
const bandes = (o: Ouverture): [number, number][] => [
  [o.position, o.position + o.largeur],
  ...zonesCoulissement(o),
];

/** Message si la porte coulissante ne peut pas se ranger, sinon `null`. */
export function placeCoulissant(n: Niveau, o: Ouverture, m: Mur): string | null {
  const zones = zonesCoulissement(o);
  if (!zones.length) return null;
  const galandage = o.type !== 'porte_coulissante';
  if (galandage && m.epaisseur < EPAISSEUR_MIN_GALANDAGE)
    return `Cloison trop fine pour un galandage (7,2 cm au moins, ici ${m.epaisseur / 10} cm).`;
  const L = Math.round(longueurMur(m));
  const autres = n.ouvertures.filter((x) => x.id !== o.id && x.murId === o.murId);
  for (const z of zones)
    if (z[0] < 0 || z[1] > L || autres.some((x) => bandes(x).some((b) => recouvre(b, z))))
      return 'Pas assez de place dans le mur pour ranger la porte de ce côté.';
  return null;
}

/** Une autre ouverture empiète-t-elle sur la poche ou le rail d'un coulissant du mur ? */
export const dansUnCoulissement = (n: Niveau, o: Ouverture): boolean =>
  n.ouvertures.some(
    (x) =>
      x.id !== o.id &&
      x.murId === o.murId &&
      zonesCoulissement(x).some((z) => recouvre(z, [o.position, o.position + o.largeur])),
  );

/** +1 si la pièce est du côté de la normale gauche du mur (face A), sinon -1. */
export function versInterieur(n: Pick<Niveau, 'pieces'>, m: Mur, o: Ouverture): 1 | -1 {
  const l = longueurMur(m);
  const u = { x: (m.b.x - m.a.x) / l, y: (m.b.y - m.a.y) / l };
  const s = o.position + o.largeur / 2;
  const d = m.epaisseur / 2 + 100;
  const devant: Point = { x: m.a.x + u.x * s - u.y * d, y: m.a.y + u.y * s + u.x * d };
  return n.pieces.some((p) => pointDansPolygone(devant, p.contour)) ? 1 : -1;
}

/**
 * Même couleur pour toutes les menuiseries du niveau (portes, fenêtres, baies) ; les simples
 * ouvertures et les arches, sans menuiserie, ne changent pas. Couleur hexadécimale à six chiffres.
 */
export function colorerMenuiseries(n: Niveau, couleur: string): Resultat<Niveau> {
  const c = couleur.toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(c)) return echec('ENTREE_INVALIDE', { message: 'Couleur invalide.' });
  const sans = new Set<Ouverture['type']>(['ouverture_libre', 'arche']);
  if (!n.ouvertures.some((o) => !sans.has(o.type)))
    return echec('PRECONDITION', { message: 'Aucune porte ni fenêtre sur ce niveau.' });
  return succes({
    ...n,
    ouvertures: n.ouvertures.map((o) => (sans.has(o.type) ? o : { ...o, couleur: c })),
  });
}
