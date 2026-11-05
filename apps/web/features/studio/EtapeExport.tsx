'use client';

import type { SujetStudio } from '@ph/core/studio';
import { bouton } from '@ph/ui';
import { useEffect, useState } from 'react';
import { urlFichierStudio } from '@/lib/firebaseClient';

/** Étape 5 : la vidéo finale, à télécharger avec ses sous-titres, sa miniature et sa légende. */
export function EtapeExport({
  rendu,
  sujet,
}: {
  rendu: { video: string; srt: string; miniature: string; dureeMs: number };
  sujet: SujetStudio | null;
}) {
  const [urls, setUrls] = useState<{ video?: string; srt?: string; miniature?: string }>({});
  useEffect(() => {
    void Promise.all(
      (['video', 'srt', 'miniature'] as const).map(
        async (k) => [k, await urlFichierStudio(rendu[k]).catch(() => '')] as const,
      ),
    ).then((r) => setUrls(Object.fromEntries(r)));
  }, [rendu]);
  const legende = sujet ? `${sujet.legende}\n\n${sujet.hashtags.join(' ')}` : '';
  return (
    <section
      aria-labelledby="export-studio"
      className="grid gap-3 rounded-card border border-succes bg-succes-fond p-4"
    >
      <h2 id="export-studio" className="m-0 text-lg">
        5. Vidéo prête · {Math.round(rendu.dureeMs / 1000)} s
      </h2>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        {urls.video ? (
          <video
            src={urls.video}
            controls
            playsInline
            poster={urls.miniature}
            className="max-h-[70vh] w-full rounded-card bg-neutre-900"
          />
        ) : null}
        <div className="grid content-start gap-2">
          {urls.video ? (
            <a className={bouton()} href={urls.video} download="video-portail-travaux.mp4">
              Télécharger la vidéo (MP4)
            </a>
          ) : null}
          {urls.srt ? (
            <a
              className={bouton({ variant: 'secondaire' })}
              href={urls.srt}
              download="sous-titres.srt"
            >
              Sous-titres (.srt)
            </a>
          ) : null}
          {urls.miniature ? (
            <a
              className={bouton({ variant: 'secondaire' })}
              href={urls.miniature}
              download="miniature.jpg"
            >
              Miniature (JPG)
            </a>
          ) : null}
          {legende ? (
            <label className="grid gap-1 text-sm font-semibold">
              Légende à publier
              <textarea
                readOnly
                value={legende}
                rows={5}
                className="rounded-control border border-trait p-2 text-base font-normal"
              />
            </label>
          ) : null}
        </div>
      </div>
    </section>
  );
}
