'use client';

import { SCENES_CAPTURE, type SceneCapture, type SujetStudio } from '@ph/core/studio';
import { formatNombre } from '@ph/core/format';
import { Badge, Button, Select } from '@ph/ui';
import { useState } from 'react';

/** Mot comparé sans casse ni ponctuation (« RIEN ? » = « rien »). */
const simple = (m: string) => m.toLowerCase().replace(/[^\p{L}\p{N}€]/gu, '');

const ecran = (x: string) =>
  x === 'camera'
    ? 'Face caméra'
    : x === 'ecran'
      ? 'Mon écran'
      : (SCENES_CAPTURE[x as SceneCapture]?.libelle ?? x);

/**
 * Une vidéo proposée, sur une ligne (miniature à gauche, l'essentiel à droite) : un seul choix (« Choisir cette
 * vidéo »). Le détail (script, accroches, inspirations, versions) est replié.
 */
export function CarteSujet({
  sujet,
  choisi,
  autreChoisi,
  desactive,
  onChoisir,
  onDecliner,
  onGarder,
  gardee,
  liens,
}: {
  sujet: SujetStudio;
  choisi: boolean;
  /** Une autre idée est déjà choisie : celle-ci passe au second plan. */
  autreChoisi: boolean;
  desactive: boolean;
  onChoisir: () => void;
  onDecliner: (nombre: number) => void;
  /** Mettre l'idée de côté pour la tourner plus tard, sans rappeler l'IA. */
  onGarder: () => void;
  gardee: boolean;
  /** Titre d'une vidéo analysée → lien pour la regarder. */
  liens: ReadonlyMap<string, string>;
}) {
  const [nombre, setNombre] = useState(1);
  const potentiel = sujet.potentielViral ?? null;
  // Mot(s) mis en avant : « 2 minutes » met en avant « 2 » et « minutes ».
  const motsAccent = new Set(
    (sujet.miniature?.accent ?? '').split(/\s+/).map(simple).filter(Boolean),
  );
  return (
    <li
      className={`grid overflow-hidden rounded-card border bg-blanc transition-opacity md:grid-cols-[240px_minmax(0,1fr)] ${
        choisi ? 'border-accent ring-2 ring-accent' : 'border-trait'
      } ${autreChoisi ? 'opacity-60 hover:opacity-100' : ''}`}
    >
      <div className="relative grid min-h-40 place-items-center bg-neutre-900 px-5 pb-6 pt-12 text-center md:min-h-full">
        <p className="m-0 text-xl font-black uppercase leading-tight text-blanc">
          {(sujet.miniature?.texte ?? sujet.titre).split(/\s+/).map((m, i) => (
            <span key={i}>
              <span
                className={
                  motsAccent.has(simple(m)) ? 'rounded bg-attention-fond px-1 text-texte' : ''
                }
              >
                {m}
              </span>{' '}
            </span>
          ))}
        </p>
        {potentiel !== null ? (
          <Badge
            className="absolute left-3 top-3"
            tone={potentiel >= 7 ? 'succes' : potentiel >= 4 ? 'attention' : 'neutre'}
          >
            Viral {potentiel}/10
          </Badge>
        ) : null}
        <button
          type="button"
          onClick={onGarder}
          disabled={desactive || gardee}
          aria-label={gardee ? 'Idée gardée' : 'Garder cette idée pour plus tard'}
          title={gardee ? 'Idée gardée' : 'Garder pour plus tard'}
          className="absolute right-2 top-2 grid size-11 place-items-center rounded-full text-xl text-blanc hover:bg-blanc/15 disabled:opacity-100"
        >
          {gardee ? '★' : '☆'}
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4 md:p-5">
        <h3 className="m-0 text-lg leading-snug">{sujet.titre}</h3>
        <p className="m-0 text-sm text-neutre-700">
          {sujet.vuesVisees
            ? `${formatNombre(sujet.vuesVisees.min)} à ${formatNombre(sujet.vuesVisees.max)} vues · +${formatNombre(sujet.abonnesVises)} abonnés · `
            : ''}
          {sujet.dureeCibleS} s
        </p>
        <p className="m-0 text-sm">{sujet.angle}</p>
        {sujet.accroches[0] ? (
          <p className="m-0 border-l-4 border-accent pl-3 text-sm font-semibold">
            « {sujet.accroches[0]} »
          </p>
        ) : null}

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
                <Button
                  variant="secondaire"
                  disabled={desactive}
                  onClick={() => onDecliner(nombre)}
                >
                  Créer
                </Button>
              </div>
            </div>
          </div>
        </details>

        <Button
          className="mt-auto w-full md:w-auto md:self-end"
          taille="lg"
          variant={choisi ? 'secondaire' : 'primaire'}
          disabled={desactive || choisi}
          onClick={onChoisir}
        >
          {choisi ? '✓ Vidéo choisie' : 'Choisir cette vidéo'}
        </Button>
      </div>
    </li>
  );
}
