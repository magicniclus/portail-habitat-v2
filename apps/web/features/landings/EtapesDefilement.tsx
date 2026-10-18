'use client';

import { useGSAP } from '@gsap/react';
import type { Benefice } from '@ph/core/landings';
import { cn } from '@ph/ui';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, useState } from 'react';
import { CaptureEcran } from './CaptureEcran';
import { IconeLanding } from './IconeLanding';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const DERNIERE = 2;
const borner = (v: number) => Math.max(0, Math.min(DERNIERE, v));
/** Ordinateur et animations permises : sinon, les trois étapes s'empilent simplement. */
const MEDIA = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';

/**
 * Trois étapes « scrollytelling » (LANDINGS §3.4, LAND-03) : panneau collant, un déclencheur sur la
 * zone, `snap` directionnel (un geste = une étape, jamais deux), sortie libre après la 3e et avant la
 * 1re. Sur téléphone ou avec `prefers-reduced-motion`, liste simple sans aimantation.
 */
export function EtapesDefilement({ benefices }: { benefices: Benefice[] }) {
  const zone = useRef<HTMLDivElement>(null);
  const panneau = useRef<HTMLDivElement>(null);
  const [etape, setEtape] = useState(0);
  const [anime, setAnime] = useState(false);
  const geo = useRef({ pas: 0, haut: 44, cible: null as number | null });

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MEDIA, () => {
        const z = zone.current!;
        const p = panneau.current!;
        setAnime(true);
        const mesurer = () => {
          const vh = window.innerHeight;
          geo.current.pas = Math.round(vh * 0.55);
          geo.current.haut = Math.max(0, Math.min(44, vh - p.offsetHeight));
          p.style.top = `${geo.current.haut}px`;
          z.style.height = `${p.offsetHeight + DERNIERE * geo.current.pas}px`;
        };
        mesurer();
        const st = ScrollTrigger.create({
          trigger: z,
          start: () => `top ${geo.current.haut}px`,
          end: () => `+=${DERNIERE * geo.current.pas}`,
          onRefreshInit: mesurer,
          onEnter: () => (geo.current.cible = 0),
          onEnterBack: () => (geo.current.cible = DERNIERE),
          onUpdate: (s) => setEtape(borner(Math.round(s.progress * DERNIERE))),
          snap: {
            snapTo: (v) => {
              const pos = v * DERNIERE;
              const cur = geo.current.cible ?? Math.round(pos);
              const ecart = pos - cur;
              const cible = Math.abs(ecart) < 0.06 ? cur : borner(cur + Math.sign(ecart));
              return cible / DERNIERE;
            },
            duration: { min: 0.35, max: 0.7 },
            delay: 0.02,
            ease: 'power3.inOut',
            inertia: false,
            onComplete: (s) => (geo.current.cible = borner(Math.round(s.progress * DERNIERE))),
          },
        });
        return () => {
          st.kill();
          z.style.height = '';
          p.style.top = '';
          setAnime(false);
        };
      });
      return () => mm.revert();
    },
    { scope: zone },
  );

  // Le panneau change de mise en page en passant en mode animé : on remesure une fois rendu.
  useEffect(() => {
    if (anime) ScrollTrigger.refresh();
  }, [anime]);

  const aller = (i: number) => {
    setEtape(i);
    const z = zone.current;
    if (!anime || !z) return;
    geo.current.cible = i;
    const haut = window.scrollY + z.getBoundingClientRect().top - geo.current.haut;
    window.scrollTo({ top: Math.round(haut + i * geo.current.pas), behavior: 'smooth' });
  };

  return (
    <div ref={zone} data-scrolly className="relative">
      <div
        ref={panneau}
        className={cn(
          'grid gap-8 min-[900px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] min-[900px]:items-center',
          anime && 'sticky',
        )}
      >
        <div>
          <div role="tablist" aria-label="Étapes" className="hidden gap-1 min-[900px]:grid">
            {benefices.map((b, i) => (
              <button
                key={b.titre}
                type="button"
                role="tab"
                id={`etape-${i}`}
                aria-selected={etape === i}
                aria-controls={`etape-panneau-${i}`}
                onClick={() => aller(i)}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-control border-0 bg-transparent px-2 py-2.5 text-left font-[inherit]',
                  etape === i ? 'text-texte' : 'text-neutre-700',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-8 flex-none items-center justify-center rounded-full text-sm font-bold',
                    etape === i ? 'bg-accent text-blanc' : 'bg-neutre-200 text-neutre-800',
                  )}
                >
                  {i + 1}
                </span>
                <span className="grid">
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Étape {i + 1}
                  </span>
                  <span className="text-[17px] font-bold">{b.titre}</span>
                </span>
              </button>
            ))}
          </div>
          {benefices.map((b, i) => (
            <div
              key={b.titre}
              id={`etape-panneau-${i}`}
              role={anime ? 'tabpanel' : undefined}
              aria-labelledby={anime ? `etape-${i}` : undefined}
              hidden={anime && etape !== i}
              className="mt-4 min-[900px]:pl-[52px]"
            >
              <h3 className="m-0 mb-2 flex items-center gap-2 text-xl min-[900px]:sr-only">
                <span className="text-accent-700">
                  <IconeLanding nom={b.icone} />
                </span>
                {b.titre}
              </h3>
              <p className="m-0 mb-3 text-[16.5px] leading-[26px] text-neutre-800">{b.texte}</p>
              <ul className="m-0 grid list-none gap-1.5 p-0 text-[15px]">
                {b.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span aria-hidden="true" className="font-bold text-accent-700">
                      ✓
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
              {anime ? null : (
                <CaptureEcran capture={b.capture} cadre="navigateur" className="mt-5" />
              )}
            </div>
          ))}
        </div>
        {anime ? (
          <div className="relative">
            {benefices.map((b, i) => (
              <div
                key={b.titre}
                aria-hidden={etape !== i}
                className={cn(
                  'transition-opacity duration-300',
                  i === 0 ? 'relative' : 'absolute inset-x-0 top-0',
                  etape === i ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              >
                <CaptureEcran capture={b.capture} cadre="navigateur" />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
