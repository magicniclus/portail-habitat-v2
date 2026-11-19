import { echec, succes, type Resultat } from '../resultat';
import type { Niveau, Scene } from '../schemas/dessinScene';
import { ajouterMur, type Contexte } from './commandes';
import { mursDepuisForme } from './formes';
import { pointDansPolygone } from './geometrie';
import { nouvelleScene } from './migrations';
import { ajouterNiveau } from './niveaux';
import { MODELES, type Modele, type NiveauModele } from './modelesDonnees';
import { detecterPieces, synchroniserPieces, typerPiece } from './pieces';

export { MODELES };

/** Modèles de départ (DES-01) : construits à partir de `MODELES` (modelesDonnees.ts). */

/** Cloisons tracées puis pièces typées d'après le point de chaque pièce. */
function amenager(n: Niveau, m: NiveauModele, ctx: Contexte): Resultat<Niveau> {
  let suite = n;
  for (const [a, b] of m.cloisons) {
    const r = ajouterMur(suite, { a, b, type: 'cloison' }, ctx);
    if (!r.ok) return r;
    suite = r.data;
  }
  for (const [point, type] of m.pieces) {
    const piece = suite.pieces.find((x) => pointDansPolygone(point, x.contour));
    if (!piece) return echec('PRECONDITION', { message: 'Modèle incohérent.' });
    const r = typerPiece(suite, piece.id, type);
    if (!r.ok) return r;
    suite = r.data;
  }
  return succes(suite);
}

/** Scène d'un modèle : rez-de-chaussée, puis les étages au-dessus, murs extérieurs repris. */
export function sceneModele(
  id: Modele['id'],
  ctx: Contexte,
  modeles: readonly Modele[] = MODELES,
): Resultat<Scene> {
  const m = modeles.find((x) => x.id === id);
  if (!m) return echec('INTROUVABLE');
  const s = nouvelleScene(ctx.nouvelId);
  const rdc = s.niveaux[0]!;
  const murs = mursDepuisForme(
    { forme: 'rectangle', largeur: m.largeur, profondeur: m.profondeur },
    { epaisseur: 200, hauteur: rdc.hauteurSousPlafond, nouvelId: ctx.nouvelId },
  );
  if (!murs.ok) return murs;
  const base: Niveau = {
    ...rdc,
    murs: murs.data,
    pieces: synchroniserPieces([], detecterPieces(murs.data), () => ctx.nouvelId('p')),
  };
  const premier = amenager(base, m.niveaux[0]!, ctx);
  if (!premier.ok) return premier;
  let scene: Scene = { ...s, niveaux: [premier.data] };
  for (const plan of m.niveaux.slice(1)) {
    const r = ajouterNiveau(scene, { type: 'etage', copierMurs: true }, ctx);
    if (!r.ok) return r;
    const { niveauId, ...avec } = r.data;
    const n = amenager(
      avec.niveaux.find((x) => x.id === niveauId)!,
      plan,
      ctx,
    );
    if (!n.ok) return n;
    scene = { ...avec, niveaux: avec.niveaux.map((x) => (x.id === niveauId ? n.data : x)) };
  }
  return succes(scene);
}
