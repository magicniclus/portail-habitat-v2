import { echec, succes, type Resultat } from '../resultat';
import type { Niveau, Revetement } from '../schemas/dessinScene';
import { pointDansPolygone } from './geometrie';
import { devant } from './revetements';

type Face = { murId: string; face: 'a' | 'b' };

/** Pièce devant une face de mur, ou `null` si la face donne dehors. */
export function pieceDevant(n: Niveau, murId: string, face: 'a' | 'b') {
  const m = n.murs.find((x) => x.id === murId);
  if (!m) return null;
  const p = devant(m, face);
  return n.pieces.find((x) => pointDansPolygone(p, x.contour)) ?? null;
}

/** Faces des murs qui donnent dehors (façades du bâtiment). */
export function facesExterieures(n: Niveau): Face[] {
  return n.murs.flatMap((m) =>
    m.type === 'separation'
      ? []
      : (['a', 'b'] as const)
          .filter((face) => !pieceDevant(n, m.id, face))
          .map((face) => ({ murId: m.id, face })),
  );
}

/**
 * Tous les murs extérieurs du bâtiment en une fois (DES-28) : seules les faces qui donnent
 * dehors changent. Chaque face garde ensuite son propre revêtement, modifiable seule.
 */
export function revetirMursExterieurs(n: Niveau, r: Revetement): Resultat<Niveau> {
  const faces = facesExterieures(n);
  if (!faces.length) return echec('INTROUVABLE', { message: 'Aucun mur extérieur.' });
  return succes({
    ...n,
    murs: n.murs.map((m) =>
      faces
        .filter((f) => f.murId === m.id)
        .reduce((acc, f) => ({ ...acc, [f.face === 'a' ? 'faceA' : 'faceB']: r }), m),
    ),
  });
}
