'use client';

import { clipsVideoVisibles, SCENES_CAPTURE, type Frise } from '@ph/core/studio';
import type { FichiersProjet } from './sourcesFrise';

const RAISONS: Record<string, string> = {
  'storage/unauthorized':
    'accès refusé : les règles Storage ne sont pas déployées sur le projet Firebase (firebase deploy --only storage)',
  'storage/object-not-found': 'fichier introuvable : refilmez l’écran (page Captures)',
  'storage/unauthenticated': 'session expirée : reconnectez-vous à l’admin',
};

/**
 * Sur l'aperçu, pourquoi l'écran de Portail Travaux à la tête de lecture ne s'affiche pas :
 * pas encore filmé, fichier refusé ou absent, vidéo illisible, ou en chargement.
 */
export function EtatEcrans(p: {
  frise: Frise;
  t: number;
  fichiers: FichiersProjet;
  urls: Record<string, string>;
  erreurs: Record<string, string>;
  illisibles: ReadonlySet<string>;
}) {
  const messages = clipsVideoVisibles(p.frise, p.t).flatMap(({ clip }) => {
    const s = clip.source;
    if (s.type !== 'capture') return [];
    const cap = p.frise.captures.find((x) => x.id === s.captureId);
    const nom = cap ? SCENES_CAPTURE[cap.scene].libelle : 'Écran inconnu';
    const chemin = cap ? p.fichiers.captures[`${cap.id}:${cap.scene}`] : undefined;
    if (!chemin)
      return [
        `« ${nom} » : pas encore filmé. Le robot le filme à « Enregistrer et fabriquer » (ou page Captures).`,
      ];
    const code = p.erreurs[chemin];
    if (code) return [`« ${nom} » : ${RAISONS[code] ?? `vidéo inaccessible (${code})`}.`];
    if (p.illisibles.has(chemin))
      return [`« ${nom} » : la vidéo filmée ne se lit pas ; refilmez l’écran.`];
    if (p.urls[chemin] === undefined) return [`« ${nom} » : chargement…`];
    return [];
  });
  if (!messages.length) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute inset-x-2 top-2 z-10 grid gap-1 rounded-[8px] bg-montage-fond/85 p-2 text-xs text-montage-texte"
    >
      {messages.map((m) => (
        <p key={m} className="m-0">
          {m}
        </p>
      ))}
    </div>
  );
}
