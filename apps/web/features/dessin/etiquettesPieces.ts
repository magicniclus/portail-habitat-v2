import { formatSurface, placeEtiquette, surfaceCarrez, type Niveau } from '@ph/core/dessin';

/** Boîte occupée par un texte sur le plan (mm) : sert à écarter les textes qui se chevauchent. */
export type Boite = { x0: number; y0: number; x1: number; y1: number };
export const recouvre = (a: Boite, b: Boite) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Largeur moyenne d'un caractère, en fraction de la taille du texte. */
const CHASSE = 0.58;
/** Taille du nom (px à l'écran) : normale, et la plus petite encore lisible. */
const [NORMALE, MINIMUM] = [14, 9];

export interface EtiquettePiece {
  id: string;
  x: number;
  nom: { texte: string; y: number; taille: number };
  surface: { texte: string; y: number; taille: number } | null;
  boite: Boite;
}

/**
 * Étiquettes des pièces, comme sur un plan d'architecte : au point le plus dégagé de la pièce,
 * à la taille qui y tient (jamais au-delà de 14 px, jamais en dessous de 9 px). La surface
 * s'efface d'abord quand la place manque, puis le nom : rien ne déborde ni ne se chevauche.
 */
export function etiquettesDesPieces(
  n: Pick<Niveau, 'pieces'>,
  mmParPx: number,
  avecSurface: boolean,
): EtiquettePiece[] {
  return n.pieces.flatMap((p) => {
    const { centre: c, rayon } = placeEtiquette(p.contour);
    const place = 2 * rayon * 0.9;
    const t = Math.min(NORMALE * mmParPx, place / (p.nom.length * CHASSE));
    if (t < MINIMUM * mmParPx) return [];
    const texteSurface = formatSurface(surfaceCarrez(p));
    const ts = t * 0.9;
    const surface = avecSurface && texteSurface.length * CHASSE * ts <= place && t * 2.4 <= place;
    const ecart = surface ? t * 0.65 : 0;
    const l = Math.max(p.nom.length * CHASSE * t, surface ? texteSurface.length * CHASSE * ts : 0);
    const h = surface ? t * 2.4 : t * 1.2;
    return [
      {
        id: p.id,
        x: c.x,
        nom: { texte: p.nom, y: c.y - ecart, taille: t },
        surface: surface ? { texte: texteSurface, y: c.y + ecart, taille: ts } : null,
        boite: { x0: c.x - l / 2, y0: c.y - h / 2, x1: c.x + l / 2, y1: c.y + h / 2 },
      },
    ];
  });
}
