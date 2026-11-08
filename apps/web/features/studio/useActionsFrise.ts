'use client';

import {
  captureDeScene,
  clipParId,
  couperClip,
  modifierClip,
  nouvelIdFrise,
  poserClip,
  supprimerClip,
  type Frise,
  type SceneCapture,
} from '@ph/core/studio';
import type { ClipGlisse, RetoucheGlissee } from './glisserFrise';

const ids = (f: Frise) => f.pistes.flatMap((x) => x.clips.map((y) => y.id));

/**
 * Gestes de l'éditeur sur le brouillon : poser un élément, un écran de Portail Travaux, couper,
 * supprimer, appliquer une transition ou un effet vidéo (au clip visé ou au clip choisi).
 */
export function useActionsFrise(o: {
  frise: Frise;
  changer: (f: Frise) => void;
  tete: number;
  selection: string | null;
  setSelection: (id: string | null) => void;
  erreur: (texte: string) => void;
}) {
  const f = o.frise;
  const poser = (c: ClipGlisse, pisteId = '', debut = o.tete) => {
    const id = nouvelIdFrise('c', ids(f));
    const suite = poserClip(f, pisteId, { id, debut: Math.round(debut), ...c });
    if (suite === f) return o.erreur('Plus de place : 16 pistes au plus.');
    o.changer(suite);
    o.setSelection(id);
  };
  const ecran = (scene: SceneCapture) => {
    const r = captureDeScene(f, scene);
    if (!r) return o.erreur('12 écrans au plus par vidéo.');
    const id = nouvelIdFrise('c', ids(r.frise));
    const source = { type: 'capture' as const, captureId: r.captureId, debutSource: 0 };
    o.changer(poserClip(r.frise, '', { id, debut: Math.round(o.tete), duree: 4_000, source }));
    o.setSelection(id);
  };
  const scinder = () => {
    const r = o.selection ? clipParId(f, o.selection) : null;
    if (r) o.changer(couperClip(f, r.clip.id, o.tete));
  };
  const supprimer =
    o.selection && clipParId(f, o.selection)
      ? () => {
          o.changer(supprimerClip(f, o.selection!));
          o.setSelection(null);
        }
      : undefined;
  const retoucher = (r: RetoucheGlissee, clipId = o.selection) => {
    const trouve = clipId ? clipParId(f, clipId) : null;
    if (!trouve) return o.erreur('Choisissez d’abord un clip sur la frise (ou glissez dessus).');
    if (trouve.piste.type !== 'video')
      return o.erreur('Transitions et effets vidéo : sur un clip d’une piste vidéo.');
    const c = trouve.clip;
    if (r.genre === 'transition')
      o.changer(modifierClip(f, c.id, { transition: { type: r.type, duree: 500 } }));
    else {
      const effets = c.effets ?? [];
      o.changer(
        modifierClip(f, c.id, {
          effets: effets.includes(r.type)
            ? effets.filter((x) => x !== r.type)
            : [...effets, r.type].slice(-5),
        }),
      );
    }
    o.setSelection(c.id);
  };
  return { poser, ecran, scinder, supprimer, retoucher };
}
