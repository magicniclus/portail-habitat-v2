'use client';

import { useRef, useState } from 'react';
import { pousserEvenement } from '@/lib/dataLayer';

const BASE = '/landing/videos/vsl-pro';

/**
 * Vidéo de présentation (VSL) du hero `/pro` : affiche légère, rien n'est téléchargé avant le clic
 * (`preload="none"`), lecture avec le son, sous-titres disponibles. Démonstration seulement : la
 * vidéo cite un chiffre à prouver avant la production (LANDINGS §7).
 */
export function VslPro({ className }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [lancee, setLancee] = useState(false);
  const lancer = () => {
    setLancee(true);
    pousserEvenement({ event: 'vsl_play', page: 'acquisition-artisans' });
    void video.current?.play();
  };
  return (
    <figure
      data-vsl
      className={`relative m-0 aspect-video w-full overflow-hidden rounded-[16px] bg-neutre-900 shadow-lg ${className ?? ''}`}
    >
      <video
        ref={video}
        className="block size-full object-cover"
        poster={`${BASE}.webp`}
        preload="none"
        playsInline
        controls={lancee}
        aria-label="Présentation de Portail Travaux Pro en 38 secondes"
      >
        <source src={`${BASE}.mp4`} type="video/mp4" />
        <track kind="captions" src={`${BASE}.vtt`} srcLang="fr" label="Français" />
      </video>
      {lancee ? null : (
        <button
          type="button"
          onClick={lancer}
          className="absolute inset-0 flex cursor-pointer items-end justify-start border-0 bg-[linear-gradient(180deg,transparent_45%,color-mix(in_srgb,var(--color-neutre-900)_65%,transparent))] p-[clamp(14px,3vw,24px)] text-left text-blanc focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-accent"
        >
          <span className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-14 flex-none items-center justify-center rounded-full bg-accent shadow-lg motion-safe:animate-pulse"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </span>
            <span className="grid">
              <strong className="text-lg leading-tight">Voir la vidéo</strong>
              <span className="text-sm opacity-90">Des clients et des outils gratuits · 38 s</span>
            </span>
          </span>
        </button>
      )}
    </figure>
  );
}
