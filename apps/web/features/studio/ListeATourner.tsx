'use client';

import { Checkbox } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EditeurScript } from './EditeurScript';
import type { VideoATourner } from './SessionTournage';

/** Vidéos à tourner : cochées par défaut, script modifiable avant de commencer. */
export function ListeATourner(p: {
  videos: VideoATourner[];
  exclues: ReadonlySet<string>;
  onExclure: (id: string, exclue: boolean) => void;
}) {
  const router = useRouter();
  const [edition, setEdition] = useState<string | null>(null);
  return (
    <ul className="m-0 grid list-none gap-1 p-0">
      {p.videos.map((v) => (
        <li key={v.id} className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Checkbox
              checked={!p.exclues.has(v.id)}
              onChange={(e) => p.onExclure(v.id, !e.target.checked)}
            >
              {v.titre} · {v.script.length} phrases
            </Checkbox>
            <button
              type="button"
              aria-expanded={edition === v.id}
              aria-label={`Modifier le script de « ${v.titre} »`}
              onClick={() => setEdition(edition === v.id ? null : v.id)}
              className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold underline hover:bg-neutre-100"
            >
              Modifier le script
            </button>
          </div>
          {edition === v.id ? (
            <div className="rounded-card border border-trait p-3">
              <EditeurScript
                projetId={v.id}
                script={v.script}
                onAnnuler={() => setEdition(null)}
                onEnregistre={() => {
                  setEdition(null);
                  router.refresh();
                }}
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
