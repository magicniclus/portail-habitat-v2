import {
  detecterPieces,
  mursDepuisForme,
  nouvelleScene,
  synchroniserPieces,
  type Forme,
  type Scene,
} from '@ph/core/dessin';
import { contexteNavigateur } from './etat';

/** Forme de départ d'un nouveau plan, ou plan vide. */
export type ChoixDepart = 'vide' | Forme['forme'];

/** Scène de départ (DES-01) : forme hors tout en cm, murs de 20 cm, pièce détectée. */
export function sceneDepuisChoix(
  choix: ChoixDepart,
  d: { largeur: number; profondeur: number; decoupeL: number; decoupeP: number },
): { ok: true; scene: Scene } | { ok: false; message: string } {
  const scene = nouvelleScene(contexteNavigateur.nouvelId);
  if (choix === 'vide') return { ok: true, scene };
  const forme: Forme =
    choix === 'rectangle'
      ? { forme: 'rectangle', largeur: d.largeur, profondeur: d.profondeur }
      : {
          forme: choix,
          largeur: d.largeur,
          profondeur: d.profondeur,
          decoupe: { largeur: d.decoupeL, profondeur: d.decoupeP },
        };
  const niveau = scene.niveaux[0]!;
  const r = mursDepuisForme(forme, {
    epaisseur: 200,
    hauteur: niveau.hauteurSousPlafond,
    nouvelId: contexteNavigateur.nouvelId,
  });
  if (!r.ok) return { ok: false, message: r.message };
  const pieces = synchroniserPieces([], detecterPieces(r.data), () =>
    contexteNavigateur.nouvelId('p'),
  );
  return {
    ok: true,
    scene: { ...scene, niveaux: [{ ...niveau, murs: r.data, pieces }] },
  };
}
