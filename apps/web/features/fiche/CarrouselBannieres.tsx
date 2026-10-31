'use client';

import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useRef, useState, type ReactNode } from 'react';

const fleche =
  'absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-blanc/90 text-texte shadow-md focus-visible:outline-2 focus-visible:outline-accent';

/**
 * Bannières de la fiche (1 à 5) : défilement horizontal aimanté, flèches et points ; aucun
 * défilement automatique (`prefers-reduced-motion` respecté par le défilement doux).
 * `surImage` : commandes propres à l'espace pro, posées sur chaque bannière.
 */
export function CarrouselBannieres({
  urls,
  className,
  surImage,
}: {
  urls: string[];
  className?: string;
  surImage?: (url: string, i: number) => ReactNode;
}) {
  const piste = useRef<HTMLUListElement>(null);
  const [actuelle, setActuelle] = useState(0);
  const aller = (i: number) => {
    const el = piste.current;
    if (!el) return;
    const doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: doux ? 'smooth' : 'auto' });
  };
  const plusieurs = urls.length > 1;
  return (
    <div
      className={`relative ${className ?? ''}`}
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
        {urls.map((u, i) => (
          <li
            key={u}
            className="relative size-full flex-none snap-start"
            {...(plusieurs
              ? {
                  'aria-roledescription': 'diapositive',
                  'aria-label': `${i + 1} sur ${urls.length}`,
                }
              : {})}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- bannière Storage (1600 × 500) */}
            <img src={u} alt="" className="size-full object-cover" />
            {surImage?.(u, i)}
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
            disabled={actuelle === urls.length - 1}
            onClick={() => aller(actuelle + 1)}
            className={`${fleche} right-3 disabled:hidden`}
          >
            <CaretRightIcon size={20} aria-hidden="true" />
          </button>
          <p
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-2.5 m-0 flex justify-center gap-1.5"
          >
            {urls.map((u, i) => (
              <span
                key={u}
                className={`size-2 rounded-full shadow-sm ${i === actuelle ? 'bg-blanc' : 'bg-blanc/50'}`}
              />
            ))}
          </p>
        </>
      ) : null}
    </div>
  );
}
