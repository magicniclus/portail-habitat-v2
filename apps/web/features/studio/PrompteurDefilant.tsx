'use client';

import type { SujetStudio } from '@ph/core/studio';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

/** Vitesse en pixels par seconde : réglage fin, gardé sur cet appareil. */
const VITESSE_MIN = 10;
const VITESSE_MAX = 150;
const CLE_VITESSE = 'studio.prompteur.vitesse';
const borner = (v: number) => Math.min(VITESSE_MAX, Math.max(VITESSE_MIN, Math.round(v)));

function vitesseGardee(): number {
  if (typeof window === 'undefined') return 40;
  try {
    const v = Number(window.localStorage.getItem(CLE_VITESSE));
    return v ? borner(v) : 40;
  } catch {
    return 40;
  }
}

/**
 * Prompteur qui défile tout seul, en gros mais léger, sur fond noir : à poser devant soi (ordinateur
 * ou tablette) pendant qu'on se filme au téléphone. Plein écran, vitesse réglable, pause.
 */
export function PrompteurDefilant({
  script,
  parties,
}: {
  script?: SujetStudio['script'];
  /** Session d'une traite : les scripts à la suite, séparés par le titre de chaque vidéo. */
  parties?: { titre: string; script: SujetStudio['script'] }[];
}) {
  const blocs = parties ?? [{ titre: '', script: script ?? [] }];
  const zone = useRef<HTMLDivElement>(null);
  const [lecture, setLecture] = useState(false);
  // Jamais rendu côté serveur (affiché après un choix de l'auteur) : lecture directe.
  const [vitesse, setVitesseBrute] = useState<number>(vitesseGardee);
  const setVitesse = (v: number) => {
    const b = borner(v);
    setVitesseBrute(b);
    try {
      window.localStorage.setItem(CLE_VITESSE, String(b));
    } catch {
      // Stockage indisponible (navigation privée) : la vitesse vaut pour cette page seulement.
    }
  };
  // Clavier (prompteur sélectionné ou plein écran) : espace = pause, flèches = vitesse.
  const touche = (e: KeyboardEvent) => {
    if (e.key === ' ') setLecture((l) => !l);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') setVitesse(vitesse + 5);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') setVitesse(vitesse - 5);
    else return;
    e.preventDefault();
  };
  useEffect(() => {
    if (!lecture) return;
    let raf = 0;
    let avant = performance.now();
    const pas = (t: number) => {
      const el = zone.current;
      if (el) {
        el.scrollTop += ((t - avant) / 1000) * vitesse;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) setLecture(false);
      }
      avant = t;
      raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [lecture, vitesse]);
  // Nouveau script : on repart du début, à l'arrêt.
  useEffect(() => {
    if (zone.current) zone.current.scrollTop = 0;
  }, [script, parties]);
  return (
    <section aria-label="Prompteur défilant" className="grid gap-2">
      <div
        ref={zone}
        tabIndex={0}
        onKeyDown={touche}
        aria-label="Texte du prompteur (espace : pause, flèches : vitesse)"
        className="h-[60vh] overflow-y-auto rounded-card bg-neutre-900 px-6 py-[30vh] text-center text-blanc [&:fullscreen]:h-screen"
      >
        {blocs.map((b, k) => (
          <div key={k} className="mx-auto max-w-3xl">
            {b.titre ? (
              <p className="m-0 mb-6 text-[clamp(14px,1.6vw,18px)] tracking-wide text-neutre-400 uppercase">
                — Vidéo {k + 1} · {b.titre} —
              </p>
            ) : null}
            {b.script.map((x, i) => (
              <p
                key={i}
                className="m-0 mb-6 text-[clamp(22px,3.4vw,40px)] leading-snug font-medium"
              >
                {x.voix}
              </p>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setLecture(!lecture)}
          className="inline-flex min-h-11 items-center rounded-control bg-neutre-900 px-5 font-bold text-blanc"
        >
          {lecture ? '❚❚ Pause' : '▶ Lancer le défilement'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (zone.current) zone.current.scrollTop = 0;
          }}
          className="inline-flex min-h-11 items-center rounded-control border border-trait px-4 text-sm font-semibold"
        >
          Revenir au début
        </button>
        <button
          type="button"
          onClick={() => void zone.current?.requestFullscreen?.()}
          className="inline-flex min-h-11 items-center rounded-control border border-trait px-4 text-sm font-semibold"
        >
          Plein écran
        </button>
        <div className="flex min-h-11 items-center gap-2 text-sm">
          <button
            type="button"
            aria-label="Plus lent"
            onClick={() => setVitesse(vitesse - 5)}
            className="grid size-11 place-items-center rounded-control border border-trait text-lg font-semibold"
          >
            −
          </button>
          <label className="flex items-center gap-2">
            Vitesse
            <input
              type="range"
              min={VITESSE_MIN}
              max={VITESSE_MAX}
              step={1}
              value={vitesse}
              onChange={(e) => setVitesse(Number(e.target.value))}
              className="h-11 w-36 accent-neutre-900 sm:w-48"
            />
          </label>
          <button
            type="button"
            aria-label="Plus rapide"
            onClick={() => setVitesse(vitesse + 5)}
            className="grid size-11 place-items-center rounded-control border border-trait text-lg font-semibold"
          >
            +
          </button>
          <output className="w-10 text-right tabular-nums" aria-live="polite">
            {vitesse}
          </output>
        </div>
      </div>
    </section>
  );
}
