'use client';

import { formatNombre } from '@ph/core/format';
import type { ChiffreLanding } from '@ph/core/landings';
import { useEffect, useRef, useState } from 'react';
import { conteneur } from './styles';

const DUREE_MS = 1600;

/**
 * Section « chiffres du réseau », juste sous le hero : trois colonnes, chaque nombre compte de 0
 * à sa valeur dès que la section s'affiche, une seule fois (jamais rejoué). Valeurs finales toujours
 * lisibles par les lecteurs d'écran ; `prefers-reduced-motion` : valeurs directes, sans comptage.
 */
export function ChiffresReseau({ chiffres }: { chiffres: ChiffreLanding[] }) {
  const zone = useRef<HTMLElement>(null);
  // Les nombres partent de 0 (y compris au rendu serveur, pour ne jamais montrer la valeur finale
  // puis revenir à 0) ; les lecteurs d'écran et les moteurs lisent toujours la valeur finale.
  const [k, setK] = useState(0);
  useEffect(() => {
    const el = zone.current;
    if (
      !el ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      setK(1);
      return;
    }
    let id = 0;
    // Une seule fois : dès que la section est à l'écran (même visible dès le chargement).
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const pas = (t: number) => {
          const q = Math.min(1, (t - t0) / DUREE_MS);
          setK(1 - Math.pow(1 - q, 3));
          if (q < 1) id = requestAnimationFrame(pas);
        };
        id = requestAnimationFrame(pas);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(id);
    };
  }, []);
  if (!chiffres.length) return null;
  return (
    <section
      ref={zone}
      data-chiffres-reseau
      aria-label="Le réseau Portail Travaux en chiffres"
      className="border-y border-trait bg-accent-100/60 py-[clamp(32px,5vw,64px)]"
    >
      <ul className={`${conteneur} m-0 grid list-none grid-cols-3 divide-x divide-accent-300 p-0`}>
        {chiffres.map((c) => (
          <li
            key={c.libelle}
            className="grid content-start justify-items-center gap-1 px-1.5 text-center sm:px-4"
          >
            {c.avant ? (
              <span className="text-[11px] font-bold tracking-[0.08em] text-accent-700 uppercase sm:text-[13px]">
                {c.avant}
              </span>
            ) : (
              <span aria-hidden="true" className="h-[16.5px] sm:h-[19.5px]" />
            )}
            <span className="text-[clamp(28px,5.6vw,72px)] leading-none font-bold tracking-[-0.03em] text-texte tabular-nums">
              <span aria-hidden="true">
                {formatNombre(Math.round(c.valeur * k))}
                {c.apres}
              </span>
              <span className="sr-only">
                {formatNombre(c.valeur)}
                {c.apres}
              </span>
            </span>
            <span className="max-w-[24ch] text-[clamp(13px,1.5vw,17px)] leading-snug font-semibold text-neutre-800">
              {c.libelle}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
