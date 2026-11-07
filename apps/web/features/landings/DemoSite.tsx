'use client';

import { cn } from '@ph/ui';
import { useEffect, useState } from 'react';
import { SceneFiche, SceneGeneration, SceneMobile, ScenePublier } from './DemoSiteScenes';

const ETAPES = ['Votre fiche', 'Génération', 'Mobile', 'Publier'];
const URLS = [
  'portailtravaux.fr/pro/site/creation',
  'portailtravaux.fr/pro/site/creation',
  'bertrand-renovation.portailtravaux.fr',
  'portailtravaux.fr/pro/site',
];
const DUREE = 4200;

/**
 * Démo de création du site (maquette `SiteGenerationDemo`, LANDINGS §3.3) : les étapes défilent
 * seules, cliquables ; immobile avec `prefers-reduced-motion`.
 */
export function DemoSite() {
  const [etape, setEtape] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => setEtape((e) => (e + 1) % ETAPES.length), DUREE);
    return () => window.clearTimeout(t);
  }, [etape, auto]);
  const scenes = [
    <SceneFiche key="f" />,
    <SceneGeneration key="g" actif={etape === 1} />,
    <SceneMobile key="m" />,
    <ScenePublier key="p" />,
  ];
  return (
    <div className="mx-auto flex w-full max-w-[950px] flex-col overflow-hidden rounded-[18px] border border-trait bg-blanc text-left">
      <div className="flex items-center gap-3 border-b border-trait bg-neutre-100/40 px-3.5 py-2.5">
        <span aria-hidden="true" className="flex flex-none gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2.5 rounded-full bg-neutre-200" />
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate rounded-[8px] bg-neutre-100 px-3 py-1.5 text-[13px] text-neutre-700">
          {URLS[etape]}
        </span>
      </div>
      <div
        role="tablist"
        aria-label="Étapes de la démonstration"
        className="flex gap-1.5 overflow-x-auto border-b border-trait px-3.5 py-2.5"
      >
        {ETAPES.map((l, i) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={etape === i}
            onClick={() => {
              setAuto(false);
              setEtape(i);
            }}
            className={cn(
              'flex min-h-11 flex-none cursor-pointer items-center gap-2 rounded-pill border px-3 text-[13px] font-semibold',
              etape === i
                ? 'border-accent bg-accent-100 text-accent-800'
                : 'border-trait bg-blanc text-neutre-700',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-5 items-center justify-center rounded-full text-[11px] font-bold',
                etape === i ? 'bg-accent text-blanc' : 'bg-neutre-100',
              )}
            >
              {i + 1}
            </span>
            {l}
          </button>
        ))}
      </div>
      <div className="relative grid aspect-video min-h-[260px] overflow-hidden bg-neutre-100">
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(color-mix(in_srgb,var(--color-texte)_9%,transparent)_1px,transparent_1.2px)] bg-[size:20px_20px]"
        />
        {scenes.map((s, i) => (
          <div
            key={i}
            aria-hidden={etape !== i}
            className={cn(
              'relative flex items-center justify-center py-4 transition-[opacity,transform] duration-500 [grid-area:1/1] motion-reduce:transition-none',
              etape === i ? 'opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
            )}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}
