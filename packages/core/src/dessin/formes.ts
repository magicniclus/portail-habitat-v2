import { echec, succes, type Resultat } from '../resultat';
import { mur as schemaMur, type Mur, type Point } from '../schemas/dessinScene';
import { arrondir, decalerVersInterieur } from './geometrie';

/**
 * Création d'un plan depuis une forme (DES-01) : l'utilisateur saisit les cotes HORS TOUT,
 * les murs sont tracés sur leur axe (décalés de la demi-épaisseur vers l'intérieur).
 */
export type Forme =
  | { forme: 'rectangle'; largeur: number; profondeur: number }
  | /** Angle haut droit retiré. */ {
      forme: 'L';
      largeur: number;
      profondeur: number;
      decoupe: { largeur: number; profondeur: number };
    }
  | /** Échancrure centrée en haut. */ {
      forme: 'U';
      largeur: number;
      profondeur: number;
      decoupe: { largeur: number; profondeur: number };
    }
  | /** Deux angles bas retirés, de même taille. */ {
      forme: 'T';
      largeur: number;
      profondeur: number;
      decoupe: { largeur: number; profondeur: number };
    };

/** Il reste au moins 1 m de bâti de chaque côté d'une découpe. */
const MARGE = 1_000;

function contourExterieur(f: Forme): Point[] | null {
  const { largeur: L, profondeur: P } = f;
  if (f.forme === 'rectangle')
    return [
      { x: 0, y: 0 },
      { x: L, y: 0 },
      { x: L, y: P },
      { x: 0, y: P },
    ];
  const { largeur: dl, profondeur: dp } = f.decoupe;
  if (dl <= 0 || dp <= 0 || dp > P - MARGE) return null;
  if (f.forme === 'L') {
    if (dl > L - MARGE) return null;
    return [
      { x: 0, y: 0 },
      { x: L - dl, y: 0 },
      { x: L - dl, y: dp },
      { x: L, y: dp },
      { x: L, y: P },
      { x: 0, y: P },
    ];
  }
  if (f.forme === 'U') {
    if (dl > L - 2 * MARGE) return null;
    const a = (L - dl) / 2;
    return [
      { x: 0, y: 0 },
      { x: a, y: 0 },
      { x: a, y: dp },
      { x: a + dl, y: dp },
      { x: a + dl, y: 0 },
      { x: L, y: 0 },
      { x: L, y: P },
      { x: 0, y: P },
    ];
  }
  if (2 * dl > L - MARGE) return null;
  return [
    { x: 0, y: 0 },
    { x: L, y: 0 },
    { x: L, y: P - dp },
    { x: L - dl, y: P - dp },
    { x: L - dl, y: P },
    { x: dl, y: P },
    { x: dl, y: P - dp },
    { x: 0, y: P - dp },
  ];
}

export function mursDepuisForme(
  f: Forme,
  options: { epaisseur: number; hauteur: number; nouvelId: (prefixe: string) => string },
): Resultat<Mur[]> {
  const { epaisseur, hauteur } = options;
  if (f.largeur < 2 * epaisseur + MARGE || f.profondeur < 2 * epaisseur + MARGE)
    return echec('ENTREE_INVALIDE', { message: 'Les dimensions sont trop petites.' });
  const exterieur = contourExterieur(f);
  if (!exterieur)
    return echec('ENTREE_INVALIDE', { message: 'La découpe ne laisse pas assez de place.' });
  const axes = decalerVersInterieur(
    exterieur,
    exterieur.map(() => epaisseur / 2),
  ).map(arrondir);
  return succes(
    axes.map((a, i) =>
      schemaMur.parse({
        id: options.nouvelId('m'),
        a,
        b: axes[(i + 1) % axes.length],
        epaisseur,
        hauteur,
        type: 'mur',
        porteur: true,
      }),
    ),
  );
}
