import type { SymboleObjet } from './catalogue';
import { formeBain } from './formes3dBain';
import { formeBureau } from './formes3dBureau';
import { formeCuisine } from './formes3dCuisine';
import { formeExterieur } from './formes3dExterieur';
import { formeMobilier } from './formes3dMobilier';
import { formeSejour } from './formes3dSejour';
import { formeTable } from './formes3dTables';
import { boite, cylindre, facade, pieds, sphere, type Primitive } from './formes3dOutils';

/**
 * Volumes simples et reconnaissables des meubles en 3D (DES-33, D88 en attendant les modèles) :
 * quelques boîtes, cylindres et prismes dans le repère de l'objet (formes3dOutils.ts).
 */
export type { Primitive, Teinte } from './formes3dOutils';

export function formeObjet3D(
  symbole: SymboleObjet,
  d: { l: number; p: number; h: number },
  /** Variante du catalogue (`ObjetCatalogue.style`) : tiroirs, gaz, îlot, angle… */
  style?: string,
): Primitive[] {
  const { l, p, h } = d;
  const simple =
    formeCuisine(symbole, d, style) ??
    formeBain(symbole, d, style) ??
    formeSejour(symbole, d, style) ??
    formeTable(symbole, d, style) ??
    formeBureau(symbole, d, style) ??
    formeMobilier(symbole, d) ??
    formeExterieur(symbole, d, style);
  if (simple) return simple;
  switch (symbole) {
    case 'lit': {
      const matelas = Math.min(250, h * 0.5);
      return [
        boite(0, 0, 0, l, p, h - matelas, 'principal'),
        boite(0, 30, h - matelas, l - 40, p - 100, matelas, 'clair'),
        boite(0, -p / 2 + 40, 0, l, 80, Math.max(h + 450, 900), 'principal'),
        boite(0, -p / 2 + 300, h, l - 200, 350, 120, 'textile'),
      ];
    }
    case 'table':
      return [boite(0, 0, h - 40, l, p, 40, 'plateau'), ...pieds(l, p, h - 40)];
    case 'table_ronde':
      return [cylindre(0, 0, h - 40, l, 40, 'plateau'), cylindre(0, 0, 0, 80, h - 40, 'sombre')];
    case 'chaise':
      return [
        boite(0, 0, 430, l, p, 40),
        boite(0, -p / 2 + 20, 470, l, 40, h - 470),
        ...pieds(l, p, 430, 10, 30),
      ];
    case 'armoire':
      return [
        boite(0, 0, 0, l, p, h),
        boite(0, p / 2, h * 0.45, 20, 10, 300, 'poignee'),
        ...facade(l, p, 0, h, 600, 'aucune'),
      ];
    case 'rond':
      return [cylindre(0, 0, 0, Math.min(l, p), h, 'principal')];
    case 'plante': {
      // Tronc (ou tige) puis couronne arrondie.
      const d = Math.min(l, p);
      const pied = h * 0.3;
      return [
        cylindre(0, 0, 0, Math.max(60, d * 0.1), pied + h * 0.1, 'sombre'),
        sphere(pied, l, p, h - pied, 'vegetal'),
      ];
    }
    case 'prise':
    case 'interrupteur':
      return [
        boite(0, 0, 0, l, p, h, 'clair'),
        ...(symbole === 'prise'
          ? [-l / 5, l / 5].map((x) => boite(x, p / 2 + 2, h / 2 - 6, 10, 4, 12, 'sombre'))
          : [boite(0, p / 2 + 4, h * 0.2, l * 0.55, 8, h * 0.6, 'principal')]),
      ];
    case 'point_lumineux':
      return [cylindre(0, 0, 0, Math.min(l, p), Math.max(h, 30), 'clair')];
    case 'tapis':
      return [boite(0, 0, 0, l, p, Math.max(h, 10), 'textile')];
    default:
      return [boite(0, 0, 0, l, p, Math.max(h, 10))];
  }
}
