'use client';

import {
  ARTISAN_EXEMPLE,
  captureDeScene,
  NOMS_SCENES,
  SCENES_CAPTURE,
  type Frise,
  type SceneCapture,
} from '@ph/core/studio';
import { Feuille } from '@ph/ui';
import { useState } from 'react';
import { FormulairePreparation } from './FormulairePreparation';

const BOUTON =
  'min-h-10 rounded-[8px] bg-montage-surface px-3 text-sm font-semibold hover:bg-montage-survol disabled:opacity-40';

/** Scènes déjà filmées pour ce projet (clés `id:scene` des captures). */
const scenesFilmees = (captures: Record<string, string>) =>
  new Set(Object.keys(captures).map((k) => k.split(':')[1] as SceneCapture));

/**
 * Onglet Écrans du Studio : les écrans de Portail Travaux filmés par le robot sur la copie
 * isolée, avec l'artisan d'exemple. Un clic pose l'écran à la tête de lecture ; « Filmer
 * maintenant » fait filmer ceux de la vidéo qui manquent, sans fabriquer la vidéo.
 */
export function EcransPortail(p: {
  frise: Frise;
  captures: Record<string, string>;
  /** Le robot est en train de filmer. */
  filmage: boolean;
  enCours: boolean;
  onEcran: (scene: SceneCapture) => void;
  onFilmer: (refaire: boolean) => void;
  changer: (f: Frise) => void;
}) {
  const [artisan, setArtisan] = useState(false);
  const filmees = scenesFilmees(p.captures);
  const aFilmer = p.frise.captures.filter((c) => !p.captures[`${c.id}:${c.scene}`]);
  const dansLaVideo = new Set(p.frise.captures.map((c) => c.scene));
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`${BOUTON} bg-montage-selection text-montage-fond hover:bg-montage-selection`}
          disabled={p.filmage || p.enCours || !aFilmer.length}
          onClick={() => p.onFilmer(false)}
        >
          {p.filmage
            ? 'Le robot filme…'
            : aFilmer.length
              ? `Filmer maintenant (${aFilmer.length})`
              : 'Tout est filmé'}
        </button>
        <button type="button" className={BOUTON} onClick={() => setArtisan(true)}>
          Artisan d’exemple
        </button>
        {p.frise.captures.length > aFilmer.length ? (
          <button
            type="button"
            className={BOUTON}
            disabled={p.filmage || p.enCours}
            onClick={() => {
              if (
                window.confirm(
                  'Refilmer tous les écrans de cette vidéo ? Les vidéos actuelles seront remplacées.',
                )
              )
                p.onFilmer(true);
            }}
          >
            Refilmer tous les écrans
          </button>
        ) : null}
      </div>
      {NOMS_SCENES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => p.onEcran(s)}
          className="grid min-h-14 content-center gap-1 rounded-[8px] border border-montage-trait bg-montage-surface p-2 text-left text-xs text-montage-texte hover:border-montage-selection"
        >
          <span className="font-semibold">{SCENES_CAPTURE[s].libelle}</span>
          <span className="text-montage-texte-doux">
            {filmees.has(s)
              ? 'Filmé'
              : dansLaVideo.has(s)
                ? 'Dans la vidéo, à filmer'
                : 'Filmé quand vous l’ajoutez'}
          </span>
        </button>
      ))}
      <Feuille open={artisan} onOpenChange={setArtisan} titre="Artisan d’exemple">
        <p className="m-0 mb-3 text-sm text-neutre-700">
          Fictif, filmé sur une copie isolée du site (jamais dans le vrai annuaire) : dites à l’oral
          que c’est un exemple.
        </p>
        <FormulairePreparation
          desactive={p.filmage}
          valeur={{
            artisan: p.frise.artisan ?? ARTISAN_EXEMPLE,
            scenes: p.frise.captures.map((c) => c.scene),
          }}
          onChange={(v) => {
            let f: Frise = { ...p.frise, artisan: v.artisan };
            for (const scene of v.scenes) f = captureDeScene(f, scene)?.frise ?? f;
            // Un écran décoché quitte la liste s'il n'est utilisé par aucun clip.
            const utilises = new Set(
              f.pistes.flatMap((x) =>
                x.clips.flatMap((c) => (c.source.type === 'capture' ? [c.source.captureId] : [])),
              ),
            );
            f = {
              ...f,
              captures: f.captures.filter((c) => v.scenes.includes(c.scene) || utilises.has(c.id)),
            };
            p.changer(f);
          }}
        />
      </Feuille>
    </div>
  );
}
