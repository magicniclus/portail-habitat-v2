'use client';

import { cn } from '@ph/ui';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';

/**
 * Curseur 2D / 3D des pages d'acquisition : la même maison (démonstration de Plans), en plan à
 * gauche et en 3D à droite ; on glisse la poignée pour passer de l'un à l'autre. Vraies captures
 * de l'éditeur (`e2e-pro/captures-plans.spec.ts`). À l'arrivée à l'écran, la poignée fait un
 * aller-retour pour montrer le geste (sauf mouvement réduit) ; au clavier : flèches, Début, Fin.
 */
const IMAGES = { '2d': '/landing/captures/plans-2d', '3d': '/landing/captures/plans-3d' };

function Image({ base, alt }: { base: string; alt: string }) {
  return (
    <picture>
      <source srcSet={`${base}.avif`} type="image/avif" />
      <img
        src={`${base}.webp`}
        alt={alt}
        width={1200}
        height={900}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="block size-full object-cover"
      />
    </picture>
  );
}

const borne = (v: number) => Math.min(100, Math.max(0, v));

export function Curseur2D3D({ className }: { className?: string }) {
  const [pos, setPos] = useState(50);
  const cadre = useRef<HTMLDivElement>(null);
  const touche = useRef(false);
  const glisse = useRef(false);

  // Démonstration du geste à la première apparition : 50 → 80 → 20 → 50.
  useEffect(() => {
    const el = cadre.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let image = 0;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        obs.disconnect();
        const debut = performance.now();
        const etapes = [50, 80, 20, 50];
        const duree = 2400;
        const pas = (t: number) => {
          if (touche.current) return;
          const p = Math.min(1, (t - debut) / duree) * (etapes.length - 1);
          const i = Math.min(etapes.length - 2, Math.floor(p));
          const f = p - i;
          const doux = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
          setPos(etapes[i]! + (etapes[i + 1]! - etapes[i]!) * doux);
          if (p < etapes.length - 1) image = requestAnimationFrame(pas);
        };
        image = requestAnimationFrame(pas);
      },
      { threshold: 0.6 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(image);
    };
  }, []);

  const placer = (clientX: number) => {
    const b = cadre.current?.getBoundingClientRect();
    if (b) setPos(borne(((clientX - b.left) / b.width) * 100));
  };
  const appuyer = (e: PointerEvent<HTMLDivElement>) => {
    touche.current = true;
    glisse.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    placer(e.clientX);
  };
  const bouger = (e: PointerEvent<HTMLDivElement>) => {
    if (glisse.current) placer(e.clientX);
  };
  const lacher = () => {
    glisse.current = false;
  };

  return (
    <div
      ref={cadre}
      data-curseur-plans
      onPointerDown={appuyer}
      onPointerMove={bouger}
      onPointerUp={lacher}
      onPointerCancel={lacher}
      className={cn(
        'relative aspect-[4/3] cursor-ew-resize touch-pan-y overflow-hidden rounded-[18px] bg-neutre-100 shadow-lg select-none',
        className,
      )}
    >
      <Image base={IMAGES['3d']} alt="La même maison en 3D, meubles et jardin compris" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image base={IMAGES['2d']} alt="Plan 2D d’une maison avec ses pièces et leurs surfaces" />
      </div>
      <span className="pointer-events-none absolute top-3 left-3 rounded-pill bg-blanc/95 px-3 py-1.5 text-[13px] font-bold text-texte shadow-sm">
        Plan 2D
      </span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-pill bg-accent px-3 py-1.5 text-[13px] font-bold text-blanc shadow-sm">
        Vue 3D
      </span>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-[3px] -translate-x-1/2 bg-blanc shadow-[0_0_0_1px_rgb(0_0_0/0.08)]"
        style={{ left: `${pos}%` }}
      >
        <span className="absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blanc text-accent-700 shadow-md ring-1 ring-neutre-200">
          <CaretLeftIcon size={16} weight="bold" />
          <CaretRightIcon size={16} weight="bold" />
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(pos)}
        onChange={(e) => {
          touche.current = true;
          setPos(Number(e.target.value));
        }}
        aria-label="Passer du plan 2D à la vue 3D"
        aria-valuetext={`${Math.round(pos)} % de plan 2D`}
        className="peer absolute inset-0 size-full cursor-ew-resize opacity-0"
        style={{ pointerEvents: 'none' }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[18px] peer-focus-visible:outline-3 peer-focus-visible:-outline-offset-3 peer-focus-visible:outline-accent"
      />
    </div>
  );
}
