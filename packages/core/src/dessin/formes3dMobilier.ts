import type { SymboleObjet } from './catalogue';
import {
  boite,
  cylindre,
  pieds,
  repartir,
  type Dimensions,
  type Primitive,
} from './formes3dOutils';

/** Plinthe, caisson et plan de travail d'un meuble bas de cuisine (hauteur totale h). */
const caissonCuisine = (l: number, p: number, h: number) => [
  boite(0, 10, 0, l, p - 20, 100, 'sombre'),
  boite(0, 0, 100, l, p, h - 140),
  boite(0, 15, h - 40, l, p + 30, 40, 'clair'),
];

/** Traits verticaux des portes sur la face avant (y = +p/2). */
const portes = (l: number, p: number, z: number, h: number, largeurPorte = 500) => {
  const n = Math.max(1, Math.round(l / largeurPorte));
  return repartir(l, n + 1)
    .slice(1, -1)
    .map((x) => boite(x, p / 2 + 2, z + 20, 8, 4, h - 40, 'sombre'));
};

/**
 * Mobilier au dessin simple (cuisine, séjour, rangement) : volumes lisibles, sans détail
 * superflu, pour l'îlot, les tabourets, la table haute, les buffets, les étagères, le banc et
 * le four.
 */
export function formeMobilier(symbole: SymboleObjet, d: Dimensions): Primitive[] | null {
  const { l, p, h } = d;
  switch (symbole) {
    case 'ilot': {
      // Caisson côté cuisine, plan débordant côté salle (y > 0) pour s'asseoir.
      const caisson = Math.max(400, p - 300);
      const y = -(p - caisson) / 2;
      return [
        boite(0, y + 10, 0, l - 20, caisson - 20, 100, 'sombre'),
        boite(0, y, 100, l, caisson, h - 140),
        boite(0, 0, h - 40, l, p, 40, 'clair'),
        ...portes(l, caisson, 100, h - 140, 600).map((b) => ({
          ...b,
          centre: { ...b.centre, y: y - caisson / 2 - 2 },
        })),
      ];
    }
    case 'tabouret': {
      const diam = Math.min(l, p);
      return [
        cylindre(0, 0, 0, diam * 0.8, 20, 'metal'),
        cylindre(0, 0, 20, 40, h - 70, 'metal'),
        cylindre(0, 0, h * 0.35, diam * 0.75, 15, 'metal'),
        cylindre(0, 0, h - 50, diam, 50, 'textile'),
      ];
    }
    case 'table_haute':
      return [
        boite(0, 0, h - 40, l, p, 40),
        ...pieds(l, p, h - 40, 40, 40, 'metal'),
        boite(0, -(p - 40) / 2 + 40, 300, l - 160, 20, 20, 'metal'),
        boite(0, (p - 40) / 2 - 40, 300, l - 160, 20, 20, 'metal'),
      ];
    case 'buffet': {
      const piedsH = Math.min(150, h * 0.15);
      return [
        ...pieds(l, p, piedsH, 40, 30),
        boite(0, 0, piedsH, l, p, h - piedsH - 20),
        boite(0, 0, h - 20, l, p, 20, 'clair'),
        ...portes(l, p, piedsH, h - piedsH - 20),
      ];
    }
    case 'etagere': {
      const tablettes = Math.max(2, Math.round(h / 350));
      return [
        boite(-l / 2 + 10, 0, 0, 20, p, h),
        boite(l / 2 - 10, 0, 0, 20, p, h),
        ...Array.from({ length: tablettes + 1 }, (_, i) =>
          boite(0, 0, (i * (h - 20)) / tablettes, l - 40, p, 20, 'clair'),
        ),
      ];
    }
    case 'banc':
      return [
        boite(0, 0, h - 50, l, p, 50),
        boite(-l / 2 + 100, 0, 0, 50, p - 40, h - 50, 'sombre'),
        boite(l / 2 - 100, 0, 0, 50, p - 40, h - 50, 'sombre'),
      ];
    case 'four':
      return [
        ...caissonCuisine(l, p, h),
        boite(0, p / 2 + 5, 180, l - 60, 10, 520, 'sombre'),
        boite(0, p / 2 + 10, 280, l - 200, 4, 300, 'verre'),
        boite(0, p / 2 + 25, 640, l - 200, 20, 20, 'metal'),
      ];
    default:
      return null;
  }
}
