'use client';

import { SCENES_CAPTURE, type SceneCapture, type SujetStudio } from '@ph/core/studio';
import { formatNombre } from '@ph/core/format';
import { Badge, Button, Select } from '@ph/ui';
import { useState } from 'react';

const ecran = (x: string) =>
  x === 'camera'
    ? 'Face caméra'
    : x === 'ecran'
      ? 'Mon écran'
      : (SCENES_CAPTURE[x as SceneCapture]?.libelle ?? x);

/** Une vidéo proposée : potentiel viral, objectifs, accroches, script, miniature, déclinaisons. */
export function CarteSujet({
  sujet,
  choisi,
  desactive,
  onChoisir,
  onDecliner,
  onGarder,
  gardee,
  liens,
}: {
  sujet: SujetStudio;
  choisi: boolean;
  desactive: boolean;
  onChoisir: () => void;
  onDecliner: (nombre: number) => void;
  /** Mettre l'idée de côté pour la tourner plus tard, sans rappeler l'IA. */
  onGarder: () => void;
  gardee: boolean;
  /** Titre d'une vidéo analysée → lien pour la regarder. */
  liens: ReadonlyMap<string, string>;
}) {
  const [nombre, setNombre] = useState(3);
  const potentiel = sujet.potentielViral ?? null;
  return (
    <li
      className={`grid content-start gap-3 rounded-card border p-4 ${choisi ? 'border-accent bg-accent-100' : 'border-trait bg-blanc'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <strong className="text-lg leading-tight">{sujet.titre}</strong>
        <span className="flex shrink-0 items-center gap-1">
          <Button
            variant="fantome"
            taille="sm"
            disabled={desactive || gardee}
            onClick={onGarder}
            aria-label={gardee ? 'Idée gardée' : 'Garder cette idée'}
            title={gardee ? 'Idée gardée' : 'Garder cette idée pour plus tard'}
          >
            {gardee ? '★ Gardée' : '☆ Garder'}
          </Button>
          {potentiel !== null ? (
            <Badge tone={potentiel >= 7 ? 'succes' : potentiel >= 4 ? 'attention' : 'neutre'}>
              Viral {potentiel}/10
            </Badge>
          ) : null}
        </span>
      </div>
      {sujet.vuesVisees ? (
        <dl className="m-0 grid grid-cols-3 gap-2 text-center">
          {[
            [
              'Vues visées',
              `${formatNombre(sujet.vuesVisees.min)} – ${formatNombre(sujet.vuesVisees.max)}`,
            ],
            ['Abonnés visés', `+${formatNombre(sujet.abonnesVises)}`],
            ['Durée', `${sujet.dureeCibleS} s`],
          ].map(([l, v]) => (
            <div key={l} className="rounded-control bg-neutre-100 px-2 py-1.5">
              <dt className="text-xs text-neutre-700">{l}</dt>
              <dd className="m-0 text-sm font-bold">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {sujet.miniature ? (
        <div className="rounded-control bg-neutre-900 px-3 py-4 text-center text-xl font-black uppercase leading-tight text-blanc">
          {sujet.miniature.texte.split(/\s+/).map((m, i) => (
            <span
              key={i}
              className={
                m.toLowerCase() === sujet.miniature.accent.toLowerCase() ? 'text-accent' : ''
              }
            >
              {m}{' '}
            </span>
          ))}
          <span className="mt-1 block text-[11px] font-normal normal-case opacity-70">
            Miniature proposée
          </span>
        </div>
      ) : null}
      <p className="m-0 text-sm">{sujet.angle}</p>
      <p className="m-0 text-sm text-neutre-700">
        <strong>Pourquoi ça peut marcher :</strong> {sujet.pourquoi}
      </p>
      {sujet.inspirations?.length ? (
        <div className="text-xs text-neutre-700">
          <p className="m-0 font-semibold">Inspiré de :</p>
          <ul className="m-0 pl-4">
            {sujet.inspirations.map((t) => {
              const lien = liens.get(t);
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
      <div>
        <p className="m-0 text-sm font-semibold">Accroches</p>
        <ul className="m-0 pl-5 text-sm">
          {sujet.accroches.map((a) => (
            <li key={a}>« {a} »</li>
          ))}
        </ul>
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">
          Script ({sujet.script.length} phrases)
        </summary>
        <ol className="m-0 grid gap-1.5 pl-5 text-sm">
          {sujet.script.map((l, i) => (
            <li key={i}>
              {l.voix}
              <span className="block text-xs text-neutre-700">
                À l’écran : {ecran(l.aEcran)}
                {l.texteEcran ? ` · texte « ${l.texteEcran} »` : ''}
              </span>
            </li>
          ))}
        </ol>
      </details>
      <p className="m-0 text-xs text-neutre-700">
        {sujet.legende} {sujet.hashtags.join(' ')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={choisi ? 'secondaire' : 'primaire'}
          disabled={desactive || choisi}
          onClick={onChoisir}
        >
          {choisi ? 'Vidéo choisie' : 'Tourner cette vidéo'}
        </Button>
        <span className="flex items-center gap-2">
          <Select
            aria-label="Nombre de déclinaisons"
            value={nombre}
            onChange={(e) => setNombre(Number(e.target.value))}
            className="w-auto"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} {n > 1 ? 'vidéos' : 'vidéo'}
              </option>
            ))}
          </Select>
          <Button variant="secondaire" disabled={desactive} onClick={() => onDecliner(nombre)}>
            {nombre > 1 ? 'Décliner' : 'Créer une variante'}
          </Button>
        </span>
      </div>
    </li>
  );
}
