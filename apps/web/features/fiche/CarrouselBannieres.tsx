'use client';

import { debutYoutube, idYoutube, videoBanniereYoutube } from '@ph/core/sites';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const fleche =
  'absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-blanc/90 text-texte shadow-md focus-visible:outline-2 focus-visible:outline-accent';

/** Durée d'une diapositive en défilement automatique (la vidéo reste un peu plus). */
const DUREE_MS = 5000;
const DUREE_VIDEO_MS = 12000;

/**
 * Bannières de la fiche (1 à 5) : défilement horizontal aimanté, flèches et points.
 * - `video` (fiche Premium) : vidéo YouTube en première diapositive, lue sans son et en boucle.
 * - `auto` : défilement automatique à l'ouverture, en pause au survol ou au focus, jamais si
 *   le visiteur réduit les animations.
 * - `surImage` : commandes propres à l'espace pro, posées sur chaque bannière.
 */
export function CarrouselBannieres({
  urls,
  className,
  surImage,
  position = 'center',
  video,
  auto = false,
}: {
  urls: string[];
  className?: string;
  surImage?: (url: string, i: number) => ReactNode;
  /** `object-position` des images rognées (cadrage choisi par l'artisan). */
  position?: string;
  /** Lien YouTube de la vidéo de présentation (fiche Premium). */
  video?: string;
  auto?: boolean;
}) {
  const piste = useRef<HTMLUListElement>(null);
  const [actuelle, setActuelle] = useState(0);
  const [pause, setPause] = useState(false);
  const idVideo = idYoutube(video);
  const diapos: { cle: string; video?: string; url?: string }[] = [
    ...(idVideo ? [{ cle: `video-${idVideo}`, video: idVideo }] : []),
    ...urls.map((u) => ({ cle: u, url: u })),
  ];
  const n = diapos.length;
  const plusieurs = n > 1;
  const aller = (i: number) => {
    const el = piste.current;
    if (!el) return;
    const doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: doux ? 'smooth' : 'auto' });
  };
  const surVideo = Boolean(diapos[actuelle]?.video);

  useEffect(() => {
    if (!auto || !plusieurs || pause) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(
      () => {
        const el = piste.current;
        if (!el) return;
        const suivante = (actuelle + 1) % n;
        el.scrollTo({ left: suivante * el.clientWidth, behavior: 'smooth' });
      },
      surVideo ? DUREE_VIDEO_MS : DUREE_MS,
    );
    return () => clearTimeout(t);
  }, [auto, plusieurs, pause, actuelle, n, surVideo]);

  return (
    <div
      className={`relative ${className ?? ''}`}
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      onFocusCapture={() => setPause(true)}
      onBlurCapture={() => setPause(false)}
      {...(plusieurs
        ? { role: 'region', 'aria-roledescription': 'carrousel', 'aria-label': 'Bannières' }
        : {})}
    >
      <ul
        ref={piste}
        onScroll={(e) =>
          setActuelle(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))
        }
        className="m-0 flex size-full snap-x snap-mandatory list-none overflow-x-auto p-0 [scrollbar-width:none]"
      >
        {diapos.map((d, i) => (
          <li
            key={d.cle}
            className="relative size-full flex-none snap-start overflow-hidden bg-neutre-900"
            style={d.video ? { containerType: 'size' } : undefined}
            {...(plusieurs
              ? { 'aria-roledescription': 'diapositive', 'aria-label': `${i + 1} sur ${n}` }
              : {})}
          >
            {d.video ? (
              // Vidéo « en fond » : couvre la bannière comme une image (16:9 rogné), sans clic.
              <iframe
                src={videoBanniereYoutube(d.video, debutYoutube(video))}
                title="Vidéo de présentation"
                tabIndex={-1}
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                className="pointer-events-none absolute top-1/2 left-1/2 h-[max(100cqh,56.25cqw)] w-[max(100cqw,177.78cqh)] -translate-x-1/2 -translate-y-1/2 border-0"
              />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- bannière Storage (1600 × 500) */}
                <img
                  src={d.url}
                  alt=""
                  className="size-full object-cover"
                  style={{ objectPosition: position }}
                />
                {d.url ? surImage?.(d.url, i - (idVideo ? 1 : 0)) : null}
              </>
            )}
          </li>
        ))}
      </ul>
      {plusieurs ? (
        <>
          <button
            type="button"
            aria-label="Bannière précédente"
            disabled={actuelle === 0}
            onClick={() => aller(actuelle - 1)}
            className={`${fleche} left-3 disabled:hidden`}
          >
            <CaretLeftIcon size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Bannière suivante"
            disabled={actuelle === n - 1}
            onClick={() => aller(actuelle + 1)}
            className={`${fleche} right-3 disabled:hidden`}
          >
            <CaretRightIcon size={20} aria-hidden="true" />
          </button>
          <p
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-2.5 z-10 m-0 flex justify-center gap-1.5"
          >
            {diapos.map((d, i) => (
              <span
                key={d.cle}
                className={`size-2 rounded-full shadow-sm ${i === actuelle ? 'bg-blanc' : 'bg-blanc/50'}`}
              />
            ))}
          </p>
        </>
      ) : null}
    </div>
  );
}
