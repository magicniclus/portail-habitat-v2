/**
 * Briques des volumes simples des meubles en 3D (formes3d.ts) : boîtes et cylindres dans le
 * repère de l'objet. x le long de la largeur l, y en profondeur (dos à y = -p/2), z vers le
 * haut depuis le dessous de l'objet.
 */
export type Teinte = 'principal' | 'clair' | 'sombre' | 'verre' | 'metal' | 'textile' | 'vegetal';

export interface Primitive {
  /** Prisme : toit à deux pans, faîtage le long de x, base p, hauteur h. */
  forme: 'boite' | 'cylindre' | 'prisme';
  centre: { x: number; y: number; z: number };
  /** Boîte : l × p × h ; cylindre : diamètre l (et p), hauteur h. */
  taille: { l: number; p: number; h: number };
  teinte: Teinte;
  /** Boîte inclinée (pans de toit, dossier) : radians autour de l'axe x, > 0 = monte vers +y. */
  pente?: number;
}

export type Dimensions = { l: number; p: number; h: number };

export const boite = (
  x: number,
  y: number,
  z: number,
  l: number,
  p: number,
  h: number,
  teinte: Teinte = 'principal',
): Primitive => ({
  forme: 'boite',
  centre: { x, y, z: z + h / 2 },
  taille: { l, p, h },
  teinte,
});

export const cylindre = (
  x: number,
  y: number,
  z: number,
  d: number,
  h: number,
  teinte: Teinte,
): Primitive => ({
  forme: 'cylindre',
  centre: { x, y, z: z + h / 2 },
  taille: { l: d, p: d, h },
  teinte,
});

/** Plaque inclinée posée par son centre (x, y, z) : pans de toit, dossiers. */
export const pan = (
  x: number,
  y: number,
  z: number,
  l: number,
  p: number,
  e: number,
  pente: number,
  teinte: Teinte,
): Primitive => ({
  forme: 'boite',
  centre: { x, y, z },
  taille: { l, p, h: e },
  teinte,
  pente,
});

/** Quatre pieds aux coins, en retrait de `r`. */
export const pieds = (l: number, p: number, h: number, r = 40, d = 40, teinte: Teinte = 'sombre') =>
  [-1, 1].flatMap((i) =>
    [-1, 1].map((j) =>
      boite((i * (l - d)) / 2 - i * r, (j * (p - d)) / 2 - j * r, 0, d, d, h, teinte),
    ),
  );

/** Positions régulières de `n` éléments sur une longueur, du premier bord au dernier. */
export const repartir = (longueur: number, n: number, bord = 0) =>
  Array.from({ length: n }, (_, i) =>
    n === 1 ? 0 : -longueur / 2 + bord + (i * (longueur - 2 * bord)) / (n - 1),
  );
