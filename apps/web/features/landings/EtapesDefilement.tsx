'use client';

import type { Benefice } from '@ph/core/landings';
import { cn } from '@ph/ui';
import { useEffect, useRef, useState } from 'react';
import { CaptureEcran } from './CaptureEcran';
import { chargerGsap } from './gsap';
import { IconeLanding } from './IconeLanding';
import { Decor, POSITIONS_HALOS, Scene } from './ScenesEtapes';
import { coche, conteneur } from './styles';

const DERNIERE = 2;
/** Ordinateur et animations permises : sinon, les trois étapes s'empilent simplement. */
const MEDIA = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';
/** Défilement consacré à chaque passage d'étape (part de la hauteur de fenêtre). */
const PAS_VH = 0.75;

/**
 * Trois étapes « scrollytelling » (LANDINGS §3.4, LAND-03) : panneau collant, et tout suit la
 * molette (`scrub`) : captures, textes, pastilles, ligne de progression, fond et décor avancent et
 * reculent avec le défilement, puis la page s'aimante sur l'étape la plus proche dans le sens
 * du geste (comme les pages produit Apple) ; arrivé à la 3e, on continue librement. Sur téléphone ou avec
 * `prefers-reduced-motion`, liste simple sans animation.
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
  const section = useRef<HTMLElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const panneau = useRef<HTMLDivElement>(null);
  const [etape, setEtape] = useState(0);
  const [anime, setAnime] = useState(false);
  const geo = useRef({ pas: 0, haut: 0 });

  // On passe en mode animé dès que le média le permet ; GSAP n'est chargé que dans ce cas.
  useEffect(() => {
    const m = window.matchMedia(MEDIA);
    const suivre = () => setAnime(m.matches);
    suivre();
    m.addEventListener('change', suivre);
    return () => m.removeEventListener('change', suivre);
  }, []);

  useEffect(() => {
    if (!anime) return;
    let annule = false;
    let nettoyer: (() => void) | undefined;
    void chargerGsap().then(({ gsap, ScrollTrigger }) => {
      if (annule) return;
      const s = section.current!;
      const z = zone.current!;
      const p = panneau.current!;
      const tous = <T extends Element>(sel: string) => [...s.querySelectorAll<T>(sel)];
      const scenes = tous<HTMLElement>('[data-scene]');
      const textes = tous<HTMLElement>('[data-texte]');
      const fonds = tous<HTMLElement>('[data-fond]');
      const numeros = tous<HTMLElement>('[data-numero]');
      const [h1, h2] = tous<HTMLElement>('[data-halo]');
      const ligne = s.querySelector<HTMLElement>('[data-ligne]');

      const mesurer = () => {
        const vh = window.innerHeight;
        geo.current.pas = Math.round(vh * PAS_VH);
        // Panneau centré verticalement dans la fenêtre pendant qu'il reste collé.
        geo.current.haut = Math.max(0, Math.round((vh - p.offsetHeight) / 2));
        p.style.top = `${geo.current.haut}px`;
        z.style.height = `${p.offsetHeight + DERNIERE * geo.current.pas}px`;
      };
      mesurer();

      const ctx = gsap.context(() => {
        // Une unité de temps = un passage d'étape ; le passage occupe le milieu de chaque tranche,
        // chaque étape reste lisible un moment avant et après (pas d'état « entre deux »).
        const tl = gsap.timeline({
          defaults: { ease: 'power1.inOut', duration: 0.6 },
          scrollTrigger: {
            trigger: z,
            start: () => `top ${geo.current.haut}px`,
            end: () => `+=${DERNIERE * geo.current.pas}`,
            scrub: 0.6,
            // Aimantation douce, dans le sens du geste ; après la 3e, le défilement sort librement.
            snap: {
              snapTo: 1 / DERNIERE,
              directional: true,
              inertia: false, // jamais deux étapes d'un coup
              duration: { min: 0.3, max: 0.7 },
              delay: 0.06,
              ease: 'power2.inOut',
            },
            invalidateOnRefresh: true,
            onRefreshInit: mesurer,
            onUpdate: (st) => setEtape(Math.round(st.progress * DERNIERE)),
          },
        });
        if (ligne)
          tl.fromTo(ligne, { scaleY: 0 }, { scaleY: 1, ease: 'none', duration: DERNIERE }, 0);
        for (let i = 0; i < DERNIERE; i++) {
          const t = i + 0.2;
          const [scA, scB] = [scenes[i], scenes[i + 1]];
          const [txA, txB] = [textes[i], textes[i + 1]];
          if (scA) tl.to(scA, { autoAlpha: 0, y: -48, scale: 0.95 }, t);
          if (scB) {
            tl.fromTo(
              scB,
              { autoAlpha: 0, y: 56, scale: 0.95 },
              { autoAlpha: 1, y: 0, scale: 1 },
              t,
            );
            tl.fromTo(
              scB.querySelectorAll('[data-puce]'),
              { autoAlpha: 0, y: 18 },
              { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.35 },
              t + 0.3,
            );
          }
          if (txA) tl.to(txA, { autoAlpha: 0, y: -24 }, t);
          if (txB) tl.fromTo(txB, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0 }, t + 0.1);
          const [fond, numA, numB] = [fonds[i + 1], numeros[i], numeros[i + 1]];
          if (fond) tl.to(fond, { opacity: 1 }, t);
          if (numA) tl.to(numA, { opacity: 0, x: -40 }, t);
          if (numB) tl.fromTo(numB, { opacity: 0, x: 40 }, { opacity: 1, x: 0 }, t);
          const [x1, y1, x2, y2] = POSITIONS_HALOS[i + 1]!;
          if (h1) tl.to(h1, { x: x1, y: y1 }, t);
          if (h2) tl.to(h2, { x: x2, y: y2 }, t);
        }
      }, s);
      // Les images arrivent après la mesure : on remesure quand tout est chargé.
      const remesurer = () => ScrollTrigger.refresh();
      window.addEventListener('load', remesurer);
      nettoyer = () => {
        window.removeEventListener('load', remesurer);
        ctx.revert();
        z.style.height = '';
        p.style.top = '';
      };
    });
    return () => {
      annule = true;
      nettoyer?.();
    };
  }, [anime]);

  // Clic sur une étape : on défile jusqu'à elle (le défilement fait le reste).
  const aller = (i: number) => {
    const z = zone.current;
    if (!anime || !z) return setEtape(i);
    const haut = window.scrollY + z.getBoundingClientRect().top - geo.current.haut;
    window.scrollTo({ top: Math.round(haut + i * geo.current.pas), behavior: 'smooth' });
  };

  const e = anime ? etape : 0;
  const fonce = e === 2;
  return (
    <section
      ref={section}
      className={cn(
        'relative overflow-clip py-[clamp(48px,6vw,88px)] transition-colors duration-500',
        anime ? '' : 'bg-accent-100',
        fonce && 'text-blanc',
      )}
    >
      {anime ? <Decor /> : null}
      <div className={cn(conteneur, 'relative')}>
        <div className="max-w-[62ch]">
          <span
            className={cn(
              'mb-2.5 block text-[13px] uppercase tracking-[0.08em] transition-colors duration-500',
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
              'm-0 text-[17px] leading-[27px] transition-colors duration-500',
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
              'grid gap-x-[clamp(28px,4vw,64px)] gap-y-8 pt-[clamp(24px,5vh,56px)] pb-3 min-[900px]:grid-cols-2 min-[900px]:items-center',
              anime && 'sticky',
            )}
          >
            <div className="grid min-w-0 gap-[clamp(12px,2.4vh,24px)]">
              {anime ? (
                <ListeEtapes benefices={benefices} active={e} fonce={fonce} onChoisir={aller} />
              ) : null}
              <div className={anime ? 'grid' : 'grid gap-10'}>
                {benefices.map((b, i) => (
                  <div
                    key={b.titre}
                    id={`etape-panneau-${i}`}
                    data-texte={anime ? i : undefined}
                    role={anime ? 'tabpanel' : undefined}
                    aria-labelledby={anime ? `etape-${i}` : undefined}
                    aria-hidden={anime && e !== i ? true : undefined}
                    className={cn('min-w-0', anime && 'pl-16 [grid-area:1/1]')}
                    style={anime && i > 0 ? { opacity: 0, visibility: 'hidden' } : undefined}
                  >
                    <h3
                      className={cn('m-0 mb-2 flex items-center gap-2 text-xl', anime && 'sr-only')}
                    >
                      <span className="text-accent-700">
                        <IconeLanding nom={b.icone} />
                      </span>
                      {b.titre}
                    </h3>
                    <p
                      className={cn(
                        'm-0 mb-3.5 max-w-[48ch] text-[clamp(15px,1.6vw,17px)] leading-[1.55]',
                        anime && i === 2 ? 'text-blanc/85' : 'text-neutre-800',
                      )}
                    >
                      {b.texte}
                    </p>
                    <ul className="m-0 grid list-none gap-2 p-0">
                      {b.points.map((pt) => (
                        <li
                          key={pt}
                          className={cn(
                            'flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-[15px] leading-5 font-semibold',
                            anime && i === 2
                              ? 'border-blanc/15 bg-blanc/5'
                              : 'border-trait bg-blanc/75',
                          )}
                        >
                          <span aria-hidden="true" className={coche}>
                            ✓
                          </span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                    {anime ? null : (
                      <CaptureEcran capture={b.capture} cadre="navigateur" className="mt-5" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            {anime ? (
              <div className="grid min-w-0 items-center" aria-hidden="true">
                {benefices.map((b, i) => (
                  <Scene key={b.titre} b={b} i={i} fonce={i === 2} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Les trois étapes à gauche : numéro, titre, ligne de progression qui suit le défilement. */
function ListeEtapes(p: {
  benefices: Benefice[];
  active: number;
  fonce: boolean;
  onChoisir: (i: number) => void;
}) {
  return (
    <div role="tablist" aria-label="Étapes" className="relative grid">
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-[34px] bottom-[34px] left-[23px] w-0.5 rounded-sm transition-colors duration-500',
          p.fonce ? 'bg-blanc/20' : 'bg-texte/10',
        )}
      />
      <span
        aria-hidden="true"
        data-ligne
        className="absolute top-[34px] bottom-[34px] left-[23px] w-0.5 origin-top scale-y-0 rounded-sm bg-accent"
      />
      {p.benefices.map((b, i) => {
        const actif = p.active === i;
        const passe = i < p.active;
        return (
          <button
            key={b.titre}
            type="button"
            role="tab"
            id={`etape-${i}`}
            aria-selected={actif}
            aria-controls={`etape-panneau-${i}`}
            onClick={() => p.onChoisir(i)}
            className="relative z-[1] grid min-h-11 cursor-pointer grid-cols-[48px_minmax(0,1fr)] items-center gap-4 border-0 bg-transparent py-2 text-left font-[inherit] text-inherit"
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-12 items-center justify-center rounded-full border text-sm font-bold transition-[background-color,border-color,color,transform,box-shadow] duration-500',
                actif
                  ? 'scale-105 border-accent bg-accent text-blanc shadow-[0_6px_16px_-6px_var(--accent)]'
                  : passe
                    ? 'border-accent bg-accent-100 text-accent-800'
                    : p.fonce
                      ? 'border-blanc/30 bg-blanc/10 text-blanc'
                      : 'border-texte/15 bg-blanc/70 text-neutre-700',
              )}
            >
              {passe ? '✓' : `0${i + 1}`}
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span
                className={cn(
                  'text-xs font-bold uppercase tracking-[0.08em] transition-colors duration-500',
                  actif
                    ? p.fonce
                      ? 'text-accent-400'
                      : 'text-accent-700'
                    : p.fonce
                      ? 'text-blanc/60'
                      : 'text-neutre-700',
                )}
              >
                Étape {i + 1}
              </span>
              <span
                className={cn(
                  'text-[clamp(18px,1.9vw,24px)] leading-[1.2] font-bold tracking-[-0.01em] transition-colors duration-500',
                  actif ? 'text-inherit' : p.fonce ? 'text-blanc/60' : 'text-neutre-700',
                )}
              >
                {b.titre}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
