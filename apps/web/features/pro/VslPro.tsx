'use client';

import { useRef, useState } from 'react';
import { pousserEvenement } from '@/lib/dataLayer';

/** Vidéo générale (clients + outils gratuits), avec son et sous-titres en piste. */
const GENERALE: VideoVsl = {
  base: '/landing/videos/vsl-pro',
  duree: 38,
  accroche: 'Des clients et des outils gratuits',
  piste: true,
};

/** Une durée du même film (version complète, 1 minute, 30 secondes). */
interface VersionVsl {
  libelle: string;
  /** Chemin sans extension (`.mp4`, et `-vertical.mp4` si la vidéo a un format vertical). */
  base: string;
  duree: number;
}

export interface VideoVsl {
  /** Chemin sans extension (`.mp4` et affiche `.webp`). */
  base: string;
  duree: number;
  accroche: string;
  /** Sous-titres en piste `.vtt` (sinon incrustés dans l'image). */
  piste?: boolean;
  /** Format vertical 9:16 servi sur téléphone (`-vertical.mp4` et affiche `-vertical.webp`). */
  vertical?: boolean;
  /** Autres durées proposées sous le lecteur ; la vidéo elle-même est la première. */
  versions?: VersionVsl[];
}

/** Sous ce seuil (largeur d'écran), la vidéo est servie en vertical. */
const TELEPHONE = '(max-width: 760px)';

/** 38 → « 38 s » ; 223 → « 3 min 43 ». */
const dureeLisible = (s: number) =>
  s < 90 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;

/**
 * Vidéo de présentation (VSL) du hero `/pro` et des landings : affiche légère, rien n'est
 * téléchargé avant le clic, lecture avec le son. Sur téléphone, la vidéo passe au format vertical
 * quand il existe ; les autres durées du film se choisissent sous le lecteur. Démonstration
 * seulement : la vidéo cite des chiffres à prouver avant la production (LANDINGS §7).
 */
export function VslPro({
  className,
  page = 'acquisition-artisans',
  video = GENERALE,
}: {
  className?: string;
  /** Vidéo propre à l'outil de la landing ; par défaut, la vidéo générale. */
  video?: VideoVsl;
  /** Page d'origine, pour la mesure (`vsl_play`). */
  page?: string;
}) {
  const lecteur = useRef<HTMLVideoElement>(null);
  const [lancee, setLancee] = useState(false);
  const [choix, setChoix] = useState(0);
  const versions: VersionVsl[] = [
    {
      libelle: `Version complète · ${dureeLisible(video.duree)}`,
      base: video.base,
      duree: video.duree,
    },
    ...(video.versions ?? []),
  ];
  const version = versions[choix] ?? versions[0]!;

  /** Charge la version demandée au bon format (vertical sur téléphone) et la lance. */
  const lire = (n: number) => {
    const v = versions[n] ?? versions[0]!;
    const vertical = Boolean(video.vertical) && window.matchMedia(TELEPHONE).matches;
    setChoix(n);
    setLancee(true);
    pousserEvenement({
      event: 'vsl_play',
      page,
      duree: v.duree,
      format: vertical ? 'vertical' : 'paysage',
    });
    const el = lecteur.current;
    if (!el) return;
    el.src = `${v.base}${vertical ? '-vertical' : ''}.mp4`;
    void el.play();
  };

  return (
    <div className={className}>
      <figure
        data-vsl
        className={`relative m-0 aspect-video w-full overflow-hidden rounded-[16px] bg-neutre-900 shadow-lg ${
          video.vertical
            ? 'max-[760px]:mx-auto max-[760px]:aspect-[9/16] max-[760px]:w-[min(100%,calc(82svh*9/16))]'
            : ''
        }`}
      >
        <video
          ref={lecteur}
          className="block size-full object-cover"
          preload="none"
          playsInline
          controls={lancee}
          aria-label={`${video.accroche} : présentation de ${dureeLisible(version.duree)}`}
        >
          {video.piste ? (
            <track kind="captions" src={`${video.base}.vtt`} srcLang="fr" label="Français" />
          ) : null}
        </video>
        {lancee ? null : (
          <>
            <picture>
              {video.vertical ? (
                <source media={TELEPHONE} srcSet={`${video.base}-vertical.webp`} />
              ) : null}
              <img
                src={`${video.base}.webp`}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
            </picture>
            <button
              type="button"
              onClick={() => lire(choix)}
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
                  <span className="text-sm opacity-90">
                    {video.accroche} · {dureeLisible(version.duree)}
                  </span>
                </span>
              </span>
            </button>
          </>
        )}
      </figure>
      {versions.length > 1 ? (
        <div
          role="group"
          aria-label="Durée de la vidéo"
          className="mt-3 flex flex-wrap justify-center gap-2 min-[761px]:justify-start"
        >
          {versions.map((v, n) => (
            <button
              key={v.base}
              type="button"
              aria-pressed={n === choix}
              onClick={() => (lancee ? lire(n) : setChoix(n))}
              className="min-h-11 cursor-pointer rounded-pill border border-accent-200 bg-blanc px-[15px] text-sm font-semibold text-accent-700 hover:border-accent hover:bg-accent-200 aria-pressed:border-accent aria-pressed:bg-accent-200"
            >
              {v.libelle}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
