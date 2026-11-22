import type { SymboleObjet } from './catalogue';
import {
  boite,
  cylindre,
  douce,
  pan,
  pieds,
  type Dimensions,
  type Primitive,
} from './formes3dOutils';

/**
 * Tables et tables basses au dessin simple et soigné : plateau à la couleur choisie (teinte
 * `principal`), piètements variés (bois incliné, métal en U ou en trapèze, pied central,
 * tulipe, tréteaux, verre). Variantes par `style` du catalogue.
 */

/** Plateau en stade (ovale) : un rectangle et deux demi-ronds. */
const stade = (l: number, p: number, z: number, e: number, teinte: Primitive['teinte']) => [
  boite(0, 0, z, Math.max(1, l - p), p, e, teinte),
  cylindre(-l / 2 + p / 2, 0, z, p, e, teinte),
  cylindre(l / 2 - p / 2, 0, z, p, e, teinte),
];

/** Pieds inclinés vers l'extérieur (scandinave) : quatre jambes en bois. */
function piedsInclines(l: number, p: number, h: number): Primitive[] {
  const ecart = 60;
  const long = Math.hypot(ecart, h);
  const angle = Math.atan2(h, ecart);
  return [-1, 1].flatMap((i) =>
    [-1, 1].map((j) =>
      pan(
        i * (l / 2 - 120),
        j * (p / 2 - 110 - ecart / 2),
        h / 2,
        45,
        long,
        45,
        j < 0 ? angle : -angle,
        'bois',
      ),
    ),
  );
}

/** Pied en U métal à chaque bout (industriel) ou en trapèze. */
function piedsU(l: number, p: number, h: number, trapeze = false): Primitive[] {
  return [-1, 1].flatMap((i) => {
    const x = i * (l / 2 - 90);
    const bas = trapeze ? p * 0.7 : p - 120;
    const haut = p - 120;
    const dy = (haut - bas) / 2;
    const montant = (j: number) =>
      trapeze
        ? pan(
            x,
            j * (bas / 2 + dy / 2),
            h / 2,
            40,
            Math.hypot(dy, h),
            40,
            j < 0 ? Math.atan2(h, -dy) : -Math.atan2(h, -dy),
            'sombre',
          )
        : boite(x, j * (haut / 2 - 20), 0, 40, 40, h, 'sombre');
    return [
      montant(-1),
      montant(1),
      boite(x, 0, h - 40, 40, haut, 40, 'sombre'),
      boite(x, 0, 0, 40, bas, 30, 'sombre'),
    ];
  });
}

function table(l: number, p: number, h: number, style?: string): Primitive[] | null {
  const ep = h < 550 ? 35 : 40;
  const dessus = (teinte: Primitive['teinte'] = 'principal') =>
    douce(0, 0, h - ep, l, p, ep, 8, teinte);
  switch (style) {
    case 'scandinave':
      return [dessus(), ...piedsInclines(l, p, h - ep)];
    case 'industrielle':
      return [douce(0, 0, h - 50, l, p, 50, 6), ...piedsU(l, p, h - 50)];
    case 'trapeze':
      return [dessus(), ...piedsU(l, p, h - ep, true)];
    case 'massive':
      return [douce(0, 0, h - 70, l, p, 70, 10), ...pieds(l, p, h - 70, 30, 110, 'principal')];
    case 'verre':
      return [boite(0, 0, h - 12, l, p, 12, 'verre'), ...pieds(l, p, h - 12, 40, 30, 'metal')];
    case 'ovale':
      return [
        ...stade(l, p, h - ep, ep, 'principal'),
        ...pieds(l * 0.8, p * 0.7, h - ep, 0, 45, 'bois'),
      ];
    case 'extensible':
      return [
        dessus(),
        ...[-1, 1].map((i) => boite((i * l) / 6, 0, h - 2, 6, p - 20, 3, 'sombre')),
        ...pieds(l, p, h - ep, 40, 70, 'principal'),
      ];
    case 'etagere':
      return [
        dessus(),
        boite(0, 0, 120, l - 80, p - 80, 25),
        ...pieds(l, p, h - ep, 20, 45, 'principal'),
      ];
    case 'bloc':
      return [boite(0, 0, 0, l - 60, p - 60, h - ep, 'sombre'), dessus()];
    case 'travertin':
      return [...stade(l, p, h - 60, 60, 'clair'), ...stade(l * 0.75, p * 0.6, 0, h - 60, 'clair')];
    case 'coffre':
      return [
        douce(0, 0, 0, l, p, h, 12),
        boite(0, p / 2 + 2, h * 0.4, l - 80, 4, 8, 'sombre'),
        boite(0, p / 2 + 12, h * 0.7, 160, 16, 16, 'poignee'),
      ];
    case 'gigogne':
      return [
        cylindre(-l / 2 + p / 2, 0, h - ep, p, ep, 'principal'),
        ...[-1, 1].map((i) => boite(-l / 2 + p / 2 + i * p * 0.3, 0, 0, 25, 25, h - ep, 'sombre')),
        cylindre(l / 2 - p * 0.35, p * 0.15, h * 0.75 - ep, p * 0.7, ep, 'bois'),
        ...[-1, 1].map((i) =>
          boite(l / 2 - p * 0.35 + i * p * 0.2, p * 0.15, 0, 25, 25, h * 0.75 - ep, 'sombre'),
        ),
      ];
    default:
      return null;
  }
}

function tableRonde(l: number, p: number, h: number, style?: string): Primitive[] | null {
  const d = Math.min(l, p);
  const ep = h < 550 ? 35 : 40;
  switch (style) {
    case 'tulipe':
      return [
        cylindre(0, 0, h - ep, d, ep, 'principal'),
        cylindre(0, 0, 0, d * 0.5, 30, 'clair'),
        cylindre(0, 0, 30, d * 0.12, h - ep - 30, 'clair'),
      ];
    case 'trois-pieds':
      return [
        cylindre(0, 0, h - ep, d, ep, 'principal'),
        ...[0, 1, 2].map((k) => {
          const a = (k * 2 * Math.PI) / 3;
          return cylindre(Math.cos(a) * d * 0.3, Math.sin(a) * d * 0.3, 0, 45, h - ep, 'bois');
        }),
      ];
    case 'marbre':
      return [cylindre(0, 0, h - ep, d, ep, 'clair'), cylindre(0, 0, 0, d * 0.45, h - ep, 'clair')];
    case 'basse-plateau':
      return [
        cylindre(0, 0, h - ep, d, ep, 'principal'),
        cylindre(0, 0, 0, d * 0.85, 30, 'principal'),
        cylindre(0, 0, 30, d * 0.08, h - ep - 30, 'sombre'),
      ];
    default:
      return null;
  }
}

/** Plateau et piètement bois des tables : suivent la couleur choisie (sinon le chêne). */
const enBois = (f: Primitive): Primitive =>
  f.teinte === 'principal' ? { ...f, teinte: 'plateau' } : f;

export function formeTable(
  symbole: SymboleObjet,
  d: Dimensions,
  style?: string,
): Primitive[] | null {
  if (symbole === 'table') return table(d.l, d.p, d.h, style)?.map(enBois) ?? null;
  if (symbole === 'table_ronde') return tableRonde(d.l, d.p, d.h, style)?.map(enBois) ?? null;
  return null;
}
