'use client';

import { cn } from '@ph/ui';
import { useEffect, useRef, useState } from 'react';
import { BASE, Ecran, ETAPES, TexteEtape } from './DemoSiteParties';

const N = ETAPES.length;

/**
 * Création du site en 4 vidéos (LANDINGS §3.3) : panneau collant, l'étape change au fur et à
 * mesure du défilement, dans les deux sens ; la vidéo de l'étape se lance (muette, en boucle).
 * Avec `prefers-reduced-motion` : les 4 étapes empilées, vidéos lancées à la demande.
 */
export function DemoSiteVideos() {
  const zone = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const [etape, setEtape] = useState(0);
  const [avance, setAvance] = useState(0);
  const [visible, setVisible] = useState(false);
  const [calme, setCalme] = useState(false);

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const suivre = () => setCalme(m.matches);
    suivre();
    m.addEventListener('change', suivre);
    return () => m.removeEventListener('change', suivre);
  }, []);

  useEffect(() => {
    if (calme) return;
    const z = zone.current!;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)));
    io.observe(z);
    let rq = 0;
    const lire = () => {
      rq = 0;
      const r = z.getBoundingClientRect();
      const p = Math.min(0.9999, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      setEtape(Math.floor(p * N));
      setAvance(p * N - Math.floor(p * N));
    };
    const surDefilement = () => {
      if (!rq) rq = requestAnimationFrame(lire);
    };
    lire();
    addEventListener('scroll', surDefilement, { passive: true });
    addEventListener('resize', surDefilement);
    return () => {
      io.disconnect();
      cancelAnimationFrame(rq);
      removeEventListener('scroll', surDefilement);
      removeEventListener('resize', surDefilement);
    };
  }, [calme]);

  // Seule la vidéo de l'étape joue, reprise au début à chaque changement d'étape.
  useEffect(() => {
    if (calme) return;
    videos.current.forEach((v, i) => {
      if (!v) return;
      if (i === etape && visible) {
        if (v.preload !== 'auto') v.preload = 'auto';
        v.currentTime = 0;
        void v.play().catch(() => undefined);
      } else v.pause();
    });
  }, [etape, visible, calme]);

  const allerA = (i: number) => {
    const z = zone.current!;
    const haut = z.getBoundingClientRect().top + scrollY;
    const pas = (z.offsetHeight - innerHeight) / N;
    scrollTo({ top: haut + pas * i + pas * 0.05, behavior: 'smooth' });
  };

  if (calme)
    return (
      <ol className="m-0 grid list-none gap-10 p-0 text-left">
        {ETAPES.map((e, i) => (
          <li key={e.id} className="grid gap-4">
            <TexteEtape i={i} titre={e.titre} texte={e.texte} />
            <Ecran url={e.url}>
              <video
                className="block size-full object-cover"
                src={`${BASE}/${e.id}.mp4`}
                poster={`${BASE}/${e.id}.webp`}
                controls
                muted
                playsInline
                preload="none"
                aria-label={`${e.titre} : démonstration filmée dans Portail Travaux`}
              />
            </Ecran>
          </li>
        ))}
      </ol>
    );

  const e = ETAPES[etape]!;
  return (
    <div ref={zone} data-demo-site className="relative h-[420vh] text-left">
      <div className="sticky top-0 flex h-svh items-center">
        <div className="grid w-full items-center gap-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] md:gap-10">
          <ol className="m-0 grid list-none gap-1 p-0 max-md:hidden">
            {ETAPES.map((x, i) => (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => allerA(i)}
                  aria-current={i === etape ? 'step' : undefined}
                  className={cn(
                    'grid w-full cursor-pointer gap-2 rounded-[14px] border-0 bg-transparent p-4 text-left font-[inherit] text-texte transition-opacity duration-300 focus-visible:outline-2 focus-visible:outline-accent',
                    i === etape ? 'bg-blanc opacity-100 shadow-sm' : 'opacity-55 hover:opacity-80',
                  )}
                >
                  <TexteEtape i={i} titre={x.titre} texte={x.texte} court={i !== etape} />
                  <span
                    aria-hidden="true"
                    className="h-1 overflow-hidden rounded-pill bg-neutre-200"
                  >
                    <span
                      className="block h-full origin-left bg-accent"
                      style={{ transform: `scaleX(${i < etape ? 1 : i === etape ? avance : 0})` }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="md:hidden" aria-live="polite">
            <TexteEtape i={etape} titre={e.titre} texte={e.texte} />
          </div>
          <Ecran url={e.url}>
            {ETAPES.map((x, i) => (
              <video
                key={x.id}
                ref={(v) => {
                  videos.current[i] = v;
                }}
                className={cn(
                  'absolute inset-0 block size-full object-cover transition-opacity duration-500',
                  i === etape ? 'opacity-100' : 'opacity-0',
                )}
                src={`${BASE}/${x.id}.mp4`}
                poster={`${BASE}/${x.id}.webp`}
                muted
                loop
                playsInline
                preload={i === 0 ? 'metadata' : 'none'}
                aria-hidden={i !== etape}
                aria-label={`${x.titre} : démonstration filmée dans Portail Travaux`}
              />
            ))}
          </Ecran>
        </div>
      </div>
    </div>
  );
}
