import { DUREE_MAX_MS } from './formats';
import { dureeFrise, finClip, LIMITES_MEDIAS, type Frise, type TypePiste } from './frise';
import { typePisteDuClip } from './operationsFrise';

const CONTENU: Record<TypePiste, string> = {
  video: 'que des images',
  audio: 'que du son',
  texte: 'que des effets',
};

/** Ce qui empêche d'enregistrer ou de fabriquer la vidéo (messages lisibles par l'auteur). */
export function verifierFrise(f: Frise): string[] {
  const erreurs = new Set<string>();
  const clips = f.pistes.flatMap((p) => p.clips);
  if (!clips.length) return ['La frise est vide : ajoutez au moins un clip.'];
  const medias = new Set(f.medias.map((m) => m.id));
  const captures = new Set(f.captures.map((c) => c.id));
  for (const p of f.pistes) {
    const tries = [...p.clips].sort((a, b) => a.debut - b.debut);
    tries.forEach((c, i) => {
      if (c.source.type === 'media' && !medias.has(c.source.mediaId))
        erreurs.add('Un clip utilise un média absent de la bibliothèque.');
      if (c.source.type === 'capture' && !captures.has(c.source.captureId))
        erreurs.add('Un clip utilise une capture inconnue.');
      if (typePisteDuClip(c, f) !== p.type)
        erreurs.add(`« ${p.nom} » ne peut contenir ${CONTENU[p.type]}.`);
      const suivant = tries[i + 1];
      if (suivant && finClip(c) > suivant.debut)
        erreurs.add(`Deux clips se chevauchent sur « ${p.nom} ».`);
    });
  }
  if (dureeFrise(f) > DUREE_MAX_MS)
    erreurs.add(`La vidéo dépasse ${DUREE_MAX_MS / 60_000} minutes.`);
  if (f.medias.reduce((t, m) => t + m.taille, 0) > LIMITES_MEDIAS.projet)
    erreurs.add('Les médias dépassent 5 Go pour ce projet.');
  return [...erreurs];
}
