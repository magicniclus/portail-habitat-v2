import {
  detecterPieces,
  mursDepuisForme,
  nouvelleScene,
  sceneModele,
  synchroniserPieces,
  type MODELES,
  type Forme,
  type Scene,
} from '@ph/core/dessin';
import { contexteNavigateur } from './etat';

/** Forme de départ d'un nouveau plan, modèle (DES-01), ou plan vide. */
export type ChoixDepart = 'vide' | Forme['forme'] | `modele:${(typeof MODELES)[number]['id']}`;

/** Scène de départ (DES-01) : forme hors tout en cm, murs de 20 cm, pièce détectée. */
export function sceneDepuisChoix(
  choix: ChoixDepart,
  d: { largeur: number; profondeur: number; decoupeL: number; decoupeP: number },
): { ok: true; scene: Scene } | { ok: false; message: string } {
  const scene = nouvelleScene(contexteNavigateur.nouvelId);
  if (choix === 'vide') return { ok: true, scene };
  if (choix.startsWith('modele:')) {
    const id = choix.slice('modele:'.length) as (typeof MODELES)[number]['id'];
    const m = sceneModele(id, contexteNavigateur);
    return m.ok ? { ok: true, scene: m.data } : { ok: false, message: m.message };
  }
  const f = choix as Forme['forme'];
  const forme: Forme =
    f === 'rectangle'
      ? { forme: 'rectangle', largeur: d.largeur, profondeur: d.profondeur }
      : {
          forme: f,
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
