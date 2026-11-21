import { echec, succes, type Resultat } from '../resultat';
import type { Niveau, Piece } from '../schemas/dessinScene';
import type { PieceDetectee } from './detectionPieces';
import { aire, centroide, pointDansPolygone } from './geometrie';

export { detecterPieces, type PieceDetectee } from './detectionPieces';

/**
 * Remet à jour les pièces du niveau après une modification des murs : une pièce détectée
 * garde le nom, le type et les revêtements de la pièce existante qu'elle contient.
 */
export function synchroniserPieces(
  existantes: readonly Piece[],
  detectees: readonly PieceDetectee[],
  nouvelId: () => string,
): Piece[] {
  const prises = new Set<string>();
  return detectees.map((d, i) => {
    const ancienne = existantes.find(
      (p) => !prises.has(p.id) && pointDansPolygone(centroide(p.contour), d.contour),
    );
    if (ancienne) {
      prises.add(ancienne.id);
      return { ...ancienne, contour: d.contour };
    }
    return {
      id: nouvelId(),
      contour: d.contour,
      nom: `Pièce ${i + 1}`,
      type: 'autre',
      sol: { famille: 'aucun' },
      plafond: { famille: 'aucun' },
      zonesBasses: [],
    };
  });
}

/** Surface Carrez (DES-11) : surface au sol moins les zones sous 1,80 m, en mm². */
export function surfaceCarrez(p: Pick<Piece, 'contour' | 'zonesBasses'>): number {
  const basse = p.zonesBasses.reduce((s, z) => s + aire(z), 0);
  return Math.max(0, Math.round(aire(p.contour) - basse));
}

/** Types de pièce (DES-11), dans l'ordre du menu. */
export const LIBELLES_PIECE: Record<Piece['type'], string> = {
  sejour: 'Séjour',
  cuisine: 'Cuisine',
  chambre: 'Chambre',
  salle_de_bain: 'Salle de bains',
  salle_d_eau: 'Salle d’eau',
  wc: 'WC',
  entree: 'Entrée',
  couloir: 'Couloir',
  bureau: 'Bureau',
  buanderie: 'Buanderie',
  dressing: 'Dressing',
  cellier: 'Cellier',
  garage: 'Garage',
  combles: 'Combles',
  autre: 'Autre',
};

/**
 * Type d'une pièce (DES-11). Une pièce encore nommée « Pièce N » prend le nom de son type ;
 * un nom choisi par l'utilisateur est gardé.
 */
export function typerPiece(n: Niveau, pieceId: string, type: Piece['type']): Resultat<Niveau> {
  if (!n.pieces.some((p) => p.id === pieceId)) return echec('INTROUVABLE');
  return succes({
    ...n,
    pieces: n.pieces.map((p) =>
      p.id === pieceId
        ? {
            ...p,
            type,
            nom: /^Pièce \d+$/.test(p.nom) && type !== 'autre' ? LIBELLES_PIECE[type] : p.nom,
          }
        : p,
    ),
  });
}
