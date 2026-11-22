import type { SymboleObjet } from './catalogue';
import {
  boite,
  cylindre,
  pan,
  pieds,
  repartir,
  type Dimensions,
  type Primitive,
} from './formes3dOutils';

/** Toit à deux pans en prisme (faîtage le long de x), du bas `z` jusqu'à `z + h`. */
const prisme = (z: number, l: number, p: number, h: number, teinte: Primitive['teinte']) =>
  ({
    forme: 'prisme',
    centre: { x: 0, y: 0, z: z + h / 2 },
    taille: { l, p, h },
    teinte,
  }) satisfies Primitive;

/** Poteaux aux coins (et le long de la profondeur si elle est grande). */
const poteaux = (l: number, p: number, h: number, c: number, teinte: Primitive['teinte']) => {
  const ys = repartir(p, p > 4_200 ? 3 : 2, c / 2);
  return [-1, 1].flatMap((i) => ys.map((y) => boite((i * (l - c)) / 2, y, 0, c, c, h, teinte)));
};

/**
 * Aménagements extérieurs au dessin simple : pergola à lames, carport, serre vitrée, abri de
 * jardin, transat, parasol, jardinière.
 */
export function formeExterieur(symbole: SymboleObjet, d: Dimensions): Primitive[] | null {
  const { l, p, h } = d;
  switch (symbole) {
    case 'pergola': {
      const lames = Math.max(4, Math.round(l / 160));
      return [
        ...poteaux(l, p, h - 120, 120, 'principal'),
        boite(0, -(p - 80) / 2, h - 320, l, 80, 200),
        boite(0, (p - 80) / 2, h - 320, l, 80, 200),
        ...repartir(l, lames, 20).map((x) => boite(x, 0, h - 120, 40, p, 120)),
      ];
    }
    case 'carport':
      return [
        ...poteaux(l, p, h - 180, 100, 'sombre'),
        boite(0, 0, h - 180, l, p, 30, 'sombre'),
        boite(0, 0, h - 150, l, p, 150),
      ];
    case 'serre': {
      const murs = Math.round(h * 0.62);
      // Chevrons métalliques sur les deux pans vitrés, pour lire le toit.
      const [demi, monte] = [(p - 20) / 2, h - murs];
      const [pente, long] = [Math.atan2(monte, demi), Math.hypot(demi, monte)];
      const chevrons = repartir(l, Math.max(3, Math.round(l / 700)), 25).flatMap((x) => [
        pan(x, -demi / 2, murs + monte / 2, 50, long, 30, pente, 'metal'),
        pan(x, demi / 2, murs + monte / 2, 50, long, 30, -pente, 'metal'),
      ]);
      return [
        boite(0, 0, 0, l, p, 120, 'sombre'),
        boite(0, 0, 120, l - 20, p - 20, murs - 120, 'verre'),
        ...poteaux(l, p, murs, 50, 'metal'),
        boite(0, 0, murs - 40, l, p, 40, 'metal'),
        prisme(murs, l - 20, p - 20, h - murs, 'verre'),
        boite(0, 0, h - 40, l, 50, 40, 'metal'),
        ...chevrons,
      ];
    }
    case 'abri': {
      const murs = Math.round(h * 0.75);
      return [
        boite(0, 0, 0, l, p - 200, murs),
        prisme(murs, l, p, h - murs, 'sombre'),
        boite(
          0,
          (p - 200) / 2 + 5,
          0,
          Math.min(900, l * 0.4),
          10,
          Math.min(1_900, murs - 100),
          'sombre',
        ),
      ];
    }
    case 'transat': {
      const assise = 300;
      const longueur = Math.max(300, (h - assise - 40) / Math.sin(Math.PI / 3.2));
      const recul = Math.cos(Math.PI / 3.2) * longueur;
      return [
        ...pieds(l, p, assise, 40, 30, 'sombre'),
        boite(0, recul / 2, assise, l, p - recul, 60, 'textile'),
        pan(
          0,
          -p / 2 + recul / 2,
          assise + (h - assise) / 2,
          l,
          longueur,
          60,
          -Math.PI / 3.2,
          'textile',
        ),
      ];
    }
    case 'parasol': {
      const diam = Math.min(l, p);
      return [
        cylindre(0, 0, 0, 500, 80, 'sombre'),
        cylindre(0, 0, 80, 50, h - 80, 'metal'),
        cylindre(0, 0, h - 320, diam, 80, 'textile'),
        cylindre(0, 0, h - 240, diam * 0.45, 140, 'textile'),
      ];
    }
    case 'jardiniere': {
      const plantes = Math.max(1, Math.round(l / 400));
      const diam = Math.min(p * 0.7, l / plantes - 40, 350);
      return [
        boite(0, 0, 0, l, p, h),
        boite(0, 0, h - 40, l - 60, p - 60, 30, 'sombre'),
        ...repartir(l, plantes, l / plantes / 2).map((x) =>
          cylindre(x, 0, h - 10, diam, 250, 'vegetal'),
        ),
      ];
    }
    default:
      return null;
  }
}
