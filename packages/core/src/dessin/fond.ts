import { echec, succes, type Resultat } from '../resultat';
import type { Point, Scene } from '../schemas/dessinScene';
import { distance } from './geometrie';

/** Plan importé en calque (DES-01, D91) : position, opacité et mise à l'échelle par deux points. */
export type FondImage = NonNullable<Scene['fondImage']>;

/** Échelle initiale : 1 pixel de l'image = 1 cm, à corriger par la mise à l'échelle. */
export const ECHELLE_DEFAUT = 10_000;

export function poserFond(s: Scene, e: { storagePath: string; niveauId: string }): Scene {
  return {
    ...s,
    fondImage: {
      storagePath: e.storagePath,
      mmPour1000Px: ECHELLE_DEFAUT,
      position: { x: 0, y: 0 },
      rotation: 0,
      opacite: 50,
      niveauId: e.niveauId,
    },
  };
}

/** Taille réelle de l'image sur le plan, en mm. */
export const tailleFond = (
  f: Pick<FondImage, 'mmPour1000Px'>,
  largeurPx: number,
  hauteurPx: number,
) => ({
  l: Math.round((largeurPx * f.mmPour1000Px) / 1000),
  h: Math.round((hauteurPx * f.mmPour1000Px) / 1000),
});

/**
 * Mise à l'échelle : deux points cliqués sur le plan (en mm, à l'échelle actuelle) et leur
 * distance réelle. L'image est agrandie ou réduite autour de sa position.
 */
export function mettreFondAEchelle(
  s: Scene,
  a: Point,
  b: Point,
  distanceReelle: number,
): Resultat<Scene> {
  const f = s.fondImage;
  if (!f) return echec('INTROUVABLE');
  const mesuree = distance(a, b);
  if (mesuree < 10 || !Number.isInteger(distanceReelle) || distanceReelle <= 0)
    return echec('ENTREE_INVALIDE', {
      message: 'Choisissez deux points éloignés et une distance.',
    });
  const facteur = distanceReelle / mesuree;
  const mmPour1000Px = Math.round(f.mmPour1000Px * facteur);
  if (mmPour1000Px < 1 || mmPour1000Px > 10_000_000)
    return echec('ENTREE_INVALIDE', { message: 'Échelle hors limites.' });
  return succes({ ...s, fondImage: { ...f, mmPour1000Px } });
}

export function reglerFond(
  s: Scene,
  modif: Partial<Pick<FondImage, 'opacite' | 'position'>>,
): Scene {
  if (!s.fondImage) return s;
  const opacite =
    modif.opacite === undefined
      ? s.fondImage.opacite
      : Math.min(100, Math.max(0, Math.round(modif.opacite)));
  return { ...s, fondImage: { ...s.fondImage, ...modif, opacite } };
}

export const retirerFond = (s: Scene): Scene => ({ ...s, fondImage: null });
