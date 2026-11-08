'use client';

import type { IdeeStudio } from '@ph/firebase/studio';
import type { SujetStudio } from '@ph/core/studio';
import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { EnregistrementIci } from './EnregistrementIci';
import { PreparerSession } from './PreparerSession';

/** Une vidéo prête à tourner : son script (prompteur). */
export interface VideoATourner {
  id: string;
  titre: string;
  script: SujetStudio['script'];
}

const BOUTON =
  'inline-flex min-h-11 items-center rounded-control border border-trait px-4 text-sm font-semibold hover:bg-neutre-100';

/**
 * Session de tournage (STUDIO.md) : les vidéos se tournent à la suite sur un seul écran. Caméra et
 * micro restent ouverts ; chaque prise envoyée part dans sa vidéo (Claude la monte) et le prompteur
 * passe au script suivant.
 */
export function SessionTournage(p: { aTourner: VideoATourner[]; idees: IdeeStudio[] }) {
  const [file, setFile] = useState<VideoATourner[] | null>(null);
  const [i, setI] = useState(0);
  const [envoyees, setEnvoyees] = useState<VideoATourner[]>([]);
  if (!file) return <PreparerSession {...p} onCommencer={(v) => (setFile(v), setI(0))} />;
  const v = file[i];
  if (!v)
    return (
      <section
        aria-labelledby="session-fin"
        className="grid gap-3 rounded-card border border-trait bg-blanc p-4"
      >
        <h2 id="session-fin" className="m-0 text-lg">
          Session terminée : {envoyees.length} vidéo{envoyees.length > 1 ? 's' : ''} envoyée
          {envoyees.length > 1 ? 's' : ''}
        </h2>
        <p className="m-0 text-sm text-neutre-700">
          Claude monte chaque vidéo (quelques minutes). Ouvrez-les dans le Studio pour retoucher et
          fabriquer.
        </p>
        <ul className="m-0 grid list-none gap-2 p-0">
          {envoyees.map((x) => (
            <li key={x.id}>
              <Link href={`/admin/studio/${x.id}/montage` as Route}>{x.titre}</Link>
            </li>
          ))}
        </ul>
        <div>
          <button type="button" className={BOUTON} onClick={() => (setFile(null), setEnvoyees([]))}>
            Nouvelle session
          </button>
        </div>
      </section>
    );
  const suivante = () => setI((n) => n + 1);
  return (
    <section
      aria-labelledby="session-video"
      className="grid gap-4 rounded-card border border-trait bg-blanc p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-sm text-neutre-700">
            Vidéo {i + 1} sur {file.length}
          </p>
          <h2 id="session-video" className="m-0 text-lg">
            {v.titre}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BOUTON} onClick={suivante}>
            Passer cette vidéo
          </button>
          <button type="button" className={BOUTON} onClick={() => setI(file.length)}>
            Terminer la session
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-neutre-200">
        <div className="h-full bg-accent" style={{ width: `${(i / file.length) * 100}%` }} />
      </div>
      {/* Gardé monté d'une vidéo à l'autre : la caméra et le micro restent ouverts. */}
      <EnregistrementIci
        projetId={v.id}
        script={v.script}
        cameraInitiale=""
        libelleEnvoi={
          i + 1 < file.length ? 'Envoyer et passer à la suivante' : 'Envoyer la dernière'
        }
        onEnvoye={() => {
          setEnvoyees((x) => [...x, v]);
          suivante();
        }}
      />
    </section>
  );
}
