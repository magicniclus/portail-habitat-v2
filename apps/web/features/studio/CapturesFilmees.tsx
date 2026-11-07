'use client';

import { SCENES_CAPTURE, type SceneCapture } from '@ph/core/studio';
import { Button } from '@ph/ui';
import { useEffect, useState } from 'react';
import { urlFichierStudio } from '@/lib/firebaseClient';

/** Les vidéos filmées par le robot, à regarder avant le montage ; chacune peut être refaite. */
export function CapturesFilmees({
  captures,
  onRefaire,
  desactive,
}: {
  /** Clé `id:scene` → chemin du fichier. */
  captures: Record<string, string>;
  onRefaire: (scene: SceneCapture) => void;
  desactive: boolean;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let actif = true;
    void Promise.all(
      Object.entries(captures).map(
        async ([cle, chemin]) => [cle, await urlFichierStudio(chemin).catch(() => '')] as const,
      ),
    ).then((r) => actif && setUrls(Object.fromEntries(r)));
    return () => {
      actif = false;
    };
  }, [captures]);
  const liste = Object.keys(captures).sort();
  if (!liste.length) return null;
  return (
    <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
      {liste.map((cle) => {
        const scene = cle.split(':')[1] as SceneCapture;
        return (
          <li key={cle} className="grid content-start gap-2 rounded-card border border-trait p-3">
            <p className="m-0 font-semibold">{SCENES_CAPTURE[scene]?.libelle ?? scene}</p>
            {urls[cle] ? (
              <video
                src={urls[cle]}
                controls
                muted
                playsInline
                preload="metadata"
                className="max-h-80 w-full rounded-[6px] bg-neutre-900"
              />
            ) : (
              <p className="m-0 text-sm text-neutre-700">Chargement de la vidéo…</p>
            )}
            <div>
              <Button
                variant="secondaire"
                taille="sm"
                disabled={desactive}
                onClick={() => onRefaire(scene)}
              >
                Refaire cette capture
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
