'use client';

import { SCENES_CAPTURE, type SceneCapture, type SujetStudio } from '@ph/core/studio';
import { Button, Select } from '@ph/ui';
import { useState } from 'react';
import { cleTitre } from './CarteSujet';

const ecran = (x: string) =>
  x === 'camera'
    ? 'Face caméra'
    : x === 'ecran'
      ? 'Mon écran'
      : (SCENES_CAPTURE[x as SceneCapture]?.libelle ?? x);

/** Détail replié d'une idée : pourquoi, accroches, script, inspirations, autres versions. */
export function DetailSujet({
  sujet,
  liens,
  desactive,
  onDecliner,
}: {
  sujet: SujetStudio;
  liens: ReadonlyMap<string, string>;
  desactive: boolean;
  onDecliner: (nombre: number) => void;
}) {
  const [nombre, setNombre] = useState(1);
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer content-center font-semibold text-neutre-800">
        Voir le détail
      </summary>
      <div className="grid gap-3 pt-1">
        <p className="m-0">
          <strong>Pourquoi ça peut marcher :</strong> {sujet.pourquoi}
        </p>
        {sujet.accroches.length > 1 ? (
          <div>
            <p className="m-0 font-semibold">Autres accroches</p>
            <ul className="m-0 pl-5">
              {sujet.accroches.slice(1).map((a) => (
                <li key={a}>« {a} »</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <p className="m-0 font-semibold">Script ({sujet.script.length} phrases)</p>
          <ol className="m-0 grid gap-1.5 pl-5">
            {sujet.script.map((l, i) => (
              <li key={i}>
                {l.voix}
                <span className="block text-xs text-neutre-700">
                  À l’écran : {ecran(l.aEcran)}
                  {l.texteEcran ? ` · « ${l.texteEcran} »` : ''}
                </span>
              </li>
            ))}
          </ol>
        </div>
        {sujet.inspirations?.length ? (
          <div>
            <p className="m-0 font-semibold">Inspiré de</p>
            <ul className="m-0 pl-5 text-xs">
              {sujet.inspirations.map((t) => {
                const lien = liens.get(cleTitre(t));
                return (
                  <li key={t}>
                    {lien ? (
                      <a href={lien} target="_blank" rel="noopener noreferrer">
                        {t} ↗
                      </a>
                    ) : (
                      `« ${t} »`
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        <p className="m-0 text-xs text-neutre-700">
          {sujet.legende} {sujet.hashtags.join(' ')}
        </p>
        <div className="grid gap-2 rounded-control bg-neutre-100 p-3">
          <p className="m-0 font-semibold">Faire d’autres vidéos sur cette idée</p>
          <p className="m-0 text-xs text-neutre-700">
            Chaque version devient une vidéo séparée, prête à tourner plus tard.
          </p>
          <div className="flex flex-wrap gap-2">
            <Select
              aria-label="Nombre de versions"
              value={nombre}
              onChange={(e) => setNombre(Number(e.target.value))}
              className="w-auto"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} version{n > 1 ? 's' : ''}
                </option>
              ))}
            </Select>
            <Button variant="secondaire" disabled={desactive} onClick={() => onDecliner(nombre)}>
              Créer
            </Button>
          </div>
        </div>
      </div>
    </details>
  );
}
