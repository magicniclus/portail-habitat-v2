'use client';

import type { SujetStudio } from '@ph/core/studio';
import { useEffect, useRef, useState } from 'react';

const VITESSES = [
  ['Lent', 28],
  ['Normal', 40],
  ['Rapide', 55],
] as const;

/**
 * Prompteur qui défile tout seul, en très gros, sur fond noir : à poser devant soi (ordinateur
 * ou tablette) pendant qu'on se filme au téléphone. Plein écran, vitesse réglable, pause.
 */
export function PrompteurDefilant({ script }: { script: SujetStudio['script'] }) {
  const zone = useRef<HTMLDivElement>(null);
  const [lecture, setLecture] = useState(false);
  const [vitesse, setVitesse] = useState<number>(40);
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
  }, [script]);
  return (
    <section aria-label="Prompteur défilant" className="grid gap-2">
      <div
        ref={zone}
        className="h-[60vh] overflow-y-auto rounded-card bg-neutre-900 px-6 py-[30vh] text-center text-blanc [&:fullscreen]:h-screen"
      >
        {script.map((x, i) => (
          <p key={i} className="m-0 mb-10 text-[clamp(30px,5vw,64px)] leading-tight font-bold">
            {x.voix}
          </p>
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
        <label className="flex min-h-11 items-center gap-2 text-sm">
          Vitesse
          <select
            value={vitesse}
            onChange={(e) => setVitesse(Number(e.target.value))}
            className="min-h-11 rounded-control border border-trait px-2 text-base"
          >
            {VITESSES.map(([l, v]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
