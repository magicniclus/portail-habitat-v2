'use client';

import type { Benefice } from '@ph/core/landings';
import { cn } from '@ph/ui';
import { useEffect, useRef, useState } from 'react';
import { CaptureEcran } from './CaptureEcran';
import { chargerGsap } from './gsap';
import { IconeLanding } from './IconeLanding';
import { coche, conteneur } from './styles';

const DERNIERE = 2;
const borner = (v: number) => Math.max(0, Math.min(DERNIERE, v));
/** Ordinateur et animations permises : sinon, les trois étapes s'empilent simplement. */
const MEDIA = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';

/**
 * Trois étapes « scrollytelling » (LANDINGS §3.4, LAND-03) : panneau collant, un déclencheur sur la
 * zone, `snap` directionnel (un geste = une étape, jamais deux), sortie libre après la 3e et avant la
 * 1re. Sur téléphone ou avec `prefers-reduced-motion`, liste simple sans aimantation.
 */
export function EtapesDefilement({
  benefices,
  surtitre,
  titre,
  intro,
}: {
  benefices: Benefice[];
  surtitre: string;
  titre: string;
  intro: string;
}) {
  const zone = useRef<HTMLDivElement>(null);
  const panneau = useRef<HTMLDivElement>(null);
  const [etape, setEtape] = useState(0);
  const [anime, setAnime] = useState(false);
  const geo = useRef({ pas: 0, haut: 44, cible: null as number | null });

  const rafraichir = useRef<(() => void) | null>(null);

  // GSAP n'est chargé que sur ordinateur, animations permises (sinon liste simple, sans lui).
  useEffect(() => {
    if (!window.matchMedia(MEDIA).matches) return;
    let annule = false;
    let revert: (() => void) | undefined;
    void chargerGsap().then(({ gsap, ScrollTrigger }) => {
      if (annule) return;
      rafraichir.current = () => ScrollTrigger.refresh();
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
      revert = () => mm.revert();
    });
    return () => {
      annule = true;
      revert?.();
    };
  }, []);

  // Le panneau change de mise en page en passant en mode animé : on remesure une fois rendu.
  useEffect(() => {
    if (anime) rafraichir.current?.();
  }, [anime]);

  const aller = (i: number) => {
    setEtape(i);
    const z = zone.current;
    if (!anime || !z) return;
    geo.current.cible = i;
    const haut = window.scrollY + z.getBoundingClientRect().top - geo.current.haut;
    window.scrollTo({ top: Math.round(haut + i * geo.current.pas), behavior: 'smooth' });
  };

  const e = anime ? etape : 0;
  const fonce = e === 2;
  return (
    <section
      className={cn(
        'relative overflow-clip py-[clamp(48px,6vw,88px)] transition-colors duration-[900ms] motion-reduce:transition-none',
        FONDS[e],
        fonce && 'text-blanc',
      )}
    >
      <Decor etape={e} />
      <div className={cn(conteneur, 'relative')}>
        <div className="max-w-[62ch]">
          <span
            className={cn(
              'mb-2.5 block text-[13px] uppercase tracking-[0.08em]',
              fonce ? 'text-accent-300' : 'text-accent-700',
            )}
          >
            {surtitre}
          </span>
          <h2 className="m-0 mb-3 text-[clamp(28px,3.4vw,40px)] leading-[1.12] text-inherit">
            {titre}
          </h2>
          <p
            className={cn(
              'm-0 text-[17px] leading-[27px]',
              fonce ? 'text-blanc/85' : 'text-neutre-800',
            )}
          >
            {intro}
          </p>
        </div>
        <div ref={zone} data-scrolly className="relative">
          <div
            ref={panneau}
            className={cn(
              'grid gap-x-[clamp(28px,4vw,64px)] gap-y-8 pt-[clamp(24px,6vh,64px)] pb-3 min-[900px]:grid-cols-2 min-[900px]:items-center',
              anime && 'sticky',
            )}
          >
            <div className="grid min-w-0 gap-[clamp(12px,2.4vh,24px)]">
              <div role="tablist" aria-label="Étapes" className="relative hidden min-[900px]:grid">
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-[34px] bottom-[34px] left-[23px] w-0.5 rounded-sm',
                    fonce ? 'bg-blanc/20' : 'bg-texte/10',
                  )}
                />
                <span
                  aria-hidden="true"
                  style={{ transform: `scaleY(${e / DERNIERE})` }}
                  className="absolute top-[34px] bottom-[34px] left-[23px] w-0.5 origin-top rounded-sm bg-accent transition-transform duration-700 motion-reduce:transition-none"
                />
                {benefices.map((b, i) => (
                  <button
                    key={b.titre}
                    type="button"
                    role="tab"
                    id={`etape-${i}`}
                    aria-selected={e === i}
                    aria-controls={`etape-panneau-${i}`}
                    onClick={() => aller(i)}
                    className="relative z-[1] grid min-h-11 cursor-pointer grid-cols-[48px_minmax(0,1fr)] items-center gap-4 border-0 bg-transparent py-2 text-left font-[inherit] text-inherit"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-12 items-center justify-center rounded-full border text-sm font-bold transition-colors duration-500',
                        e === i
                          ? 'border-accent bg-accent text-blanc shadow-[0_6px_16px_-6px_var(--accent)]'
                          : fonce
                            ? 'border-blanc/30 bg-blanc/10 text-blanc'
                            : 'border-texte/15 bg-blanc/70 text-neutre-700',
                      )}
                    >
                      0{i + 1}
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <span
                        className={cn(
                          'text-xs font-bold uppercase tracking-[0.08em]',
                          e === i
                            ? fonce
                              ? 'text-accent-400'
                              : 'text-accent-700'
                            : fonce
                              ? 'text-blanc/60'
                              : 'text-neutre-700',
                        )}
                      >
                        Étape {i + 1}
                      </span>
                      <span
                        className={cn(
                          'text-[clamp(18px,1.9vw,24px)] leading-[1.2] font-bold tracking-[-0.01em]',
                          e === i ? 'text-inherit' : fonce ? 'text-blanc/60' : 'text-neutre-700',
                        )}
                      >
                        {b.titre}
                      </span>
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
                  hidden={anime && e !== i}
                  className="mt-2 min-[900px]:pl-16 min-[900px]:motion-safe:animate-[apparaitre_.55s_ease]"
                >
                  <h3 className="m-0 mb-2 flex items-center gap-2 text-xl min-[900px]:sr-only">
                    <span className="text-accent-700">
                      <IconeLanding nom={b.icone} />
                    </span>
                    {b.titre}
                  </h3>
                  <p
                    className={cn(
                      'm-0 mb-3.5 max-w-[48ch] text-[clamp(15px,1.6vw,17px)] leading-[1.55]',
                      fonce ? 'text-blanc/85' : 'text-neutre-800',
                    )}
                  >
                    {b.texte}
                  </p>
                  <ul className="m-0 grid list-none gap-2 p-0">
                    {b.points.map((p) => (
                      <li
                        key={p}
                        className={cn(
                          'flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-[15px] leading-5 font-semibold',
                          fonce ? 'border-blanc/15 bg-blanc/5' : 'border-trait bg-blanc/75',
                        )}
                      >
                        <span aria-hidden="true" className={coche}>
                          ✓
                        </span>
                        <span>{p}</span>
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
              <div className="grid min-w-0 items-center">
                {benefices.map((b, i) => (
                  <Scene key={b.titre} b={b} active={e === i} avant={i < e} fonce={fonce} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

const FONDS = ['bg-accent-100', 'bg-neutre-100', 'bg-texte'];
const mix = (c: string, p: number) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
const TEINTES: [string, string][] = [
  [mix('var(--accent-400)', 45), mix('var(--accent-300)', 60)],
  [mix('var(--color-blanc)', 95), mix('var(--color-texte)', 7)],
  [mix('var(--accent)', 30), mix('var(--color-blanc)', 7)],
];
const POSITIONS = [
  ['-12vw', '-20vh', '58vw', '40vh'],
  ['52vw', '-26vh', '-14vw', '44vh'],
  ['24vw', '34vh', '66vw', '-30vh'],
];

/** Décor de la maquette : deux halos qui glissent, grille de points, grand numéro d'étape. */
function Decor({ etape }: { etape: number }) {
  const [c1, c2] = TEINTES[etape]!;
  const [x1, y1, x2, y2] = POSITIONS[etape]!;
  const fonce = etape === 2;
  const halo =
    'absolute top-0 left-0 rounded-full transition-transform duration-[1200ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none';
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="sticky top-0 h-screen overflow-hidden">
        <span
          className={cn(halo, 'size-[min(90vw,1100px)]')}
          style={{
            background: `radial-gradient(circle, ${c1} 0%, transparent 68%)`,
            transform: `translate3d(${x1},${y1},0)`,
          }}
        />
        <span
          className={cn(halo, 'size-[min(80vw,900px)]')}
          style={{
            background: `radial-gradient(circle, ${c2} 0%, transparent 68%)`,
            transform: `translate3d(${x2},${y2},0)`,
          }}
        />
        <span
          className="absolute inset-0 bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_30%,transparent_75%)]"
          style={{
            backgroundImage: `radial-gradient(${mix(fonce ? 'var(--color-blanc)' : 'var(--color-texte)', fonce ? 10 : 12)} 1px, transparent 1.2px)`,
          }}
        />
        <span
          className="absolute bottom-[-0.18em] left-[-0.04em] text-[min(38vw,420px)] leading-none font-bold tracking-[-0.06em] text-transparent select-none"
          style={{
            WebkitTextStroke: `2px ${mix(fonce ? 'var(--color-blanc)' : 'var(--color-texte)', fonce ? 12 : 10)}`,
          }}
        >
          0{etape + 1}
        </span>
      </div>
    </div>
  );
}

const PUCES = [
  { cle: 'Inclus', d: 'M20 6 9 17l-5-5', place: 'left-0 top-2' },
  {
    cle: 'Automatique',
    d: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1',
    place: 'right-0 top-[42%]',
  },
  { cle: 'Ensuite', d: 'M4 12h16M14 6l6 6-6 6', place: 'right-[12%] bottom-0' },
];

/** Capture de l'étape posée sur une plaque, avec ses trois pastilles et sa légende. */
function Scene({
  b,
  active,
  avant,
  fonce,
}: {
  b: Benefice;
  active: boolean;
  avant: boolean;
  fonce: boolean;
}) {
  const sortie = avant ? '-translate-y-8 scale-[.96]' : 'translate-y-10 scale-[.96]';
  return (
    <div
      aria-hidden={!active}
      className={cn(
        'pointer-events-none min-w-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] [grid-area:1/1] motion-reduce:transition-none',
        active ? 'opacity-100' : cn('opacity-0', sortie),
      )}
    >
      <div className="relative pt-[34px] pr-10 pb-11 pl-7">
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-0 right-4 bottom-4 left-0 rounded-[20px] border transition-transform duration-1000',
            fonce ? 'border-blanc/15 bg-blanc/5' : 'border-accent-300 bg-blanc/65',
            active ? '' : '-translate-x-3.5 translate-y-3.5',
          )}
        />
        <div className="relative z-[1] overflow-hidden rounded-[14px]">
          <CaptureEcran capture={b.capture} cadre="navigateur" legende={false} />
        </div>
        {PUCES.map((p, n) =>
          b.points[n] ? (
            <div
              key={p.cle}
              style={{ transitionDelay: active ? `${420 + n * 140}ms` : '0ms' }}
              className={cn(
                'absolute z-[2] flex max-w-[250px] items-center gap-2.5 rounded-[12px] border border-trait bg-blanc py-2.5 pr-3.5 pl-2.5 text-texte shadow-md transition-[opacity,transform] duration-500',
                p.place,
                active ? 'opacity-100' : 'translate-y-4 scale-[.96] opacity-0',
              )}
            >
              <span className="flex size-[30px] flex-none items-center justify-center rounded-[8px] border border-accent-300 bg-accent-100 text-accent-700">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={p.d} />
                </svg>
              </span>
              <span className="grid min-w-0 gap-px">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-accent-700">
                  {p.cle}
                </span>
                <span className="text-sm leading-[19px] font-semibold">{b.points[n]}</span>
              </span>
            </div>
          ) : null,
        )}
        <span
          className={cn(
            'absolute bottom-3.5 left-7 text-[13px] leading-[18px]',
            fonce ? 'text-blanc/75' : 'text-neutre-700',
          )}
        >
          {b.capture.legende}
        </span>
      </div>
    </div>
  );
}
