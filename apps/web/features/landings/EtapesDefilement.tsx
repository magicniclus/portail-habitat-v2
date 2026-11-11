'use client';

import type { Benefice } from '@ph/core/landings';
import { cn } from '@ph/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CaptureEcran } from './CaptureEcran';
import { brancherGestes } from './gesteEtapes';
import { chargerGsap } from './gsap';
import { IconeLanding } from './IconeLanding';
import { ListeEtapes } from './ListeEtapes';
import { Decor, Scene } from './ScenesEtapes';
import { coche, conteneur } from './styles';
import { animerEntree, construireTransitions } from './transitionsEtapes';

const DERNIERE = 2;
/** Ordinateur et animations permises : sinon, les trois étapes s'empilent simplement. */
const MEDIA = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';
/** Défilement consacré à chaque étape (part de la hauteur de fenêtre). */
const PAS_VH = 0.75;
/** Durée d'un passage d'étape (s) : glissade de la page et transition ensemble. */
const DUREE = 0.85;

/**
 * Trois étapes (LANDINGS §3.4, LAND-03) : panneau collant ; chaque passage d'étape est une
 * transition jouée dans le temps, lancée dès le début du geste pendant que la page glisse avec
 * elle. Un geste (molette douce ou forte, doigt, clavier) = une étape, comme les pages produit
 * Apple (`brancherGestes`) ; avant la 1re et après la 3e, défilement libre. Sur téléphone ou avec
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
  const allerA = useRef<((i: number) => void) | null>(null);
  const [etape, setEtape] = useState(0);
  const [anime, setAnime] = useState(false);

  // Mode animé dès que le média le permet ; GSAP n'est chargé que dans ce cas.
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
      const geo = { pas: 0, haut: 0 };
      const mesurer = () => {
        const vh = window.innerHeight;
        geo.pas = Math.round(vh * PAS_VH);
        // Panneau centré verticalement pendant qu'il reste collé.
        geo.haut = Math.max(0, Math.round((vh - p.offsetHeight) / 2));
        p.style.top = `${geo.haut}px`;
        z.style.height = `${p.offsetHeight + DERNIERE * geo.pas}px`;
      };
      mesurer();

      let actuelle = 0;
      let gestes: ReturnType<typeof brancherGestes> | undefined;
      let st: ScrollTrigger | undefined;
      const ctx = gsap.context(() => {
        const tl = construireTransitions(gsap, s, DERNIERE);
        const montrer = (i: number) => {
          if (i === actuelle) return;
          actuelle = i;
          setEtape(i);
          tl.tweenTo(i, {
            duration: DUREE * Math.abs(i - tl.time()),
            ease: 'none',
            overwrite: true,
          });
        };
        animerEntree(gsap, s);
        // La position de la page ne décide de l'étape que pour un défilement libre (barre).
        st = ScrollTrigger.create({
          trigger: z,
          start: () => `top ${geo.haut}px`,
          end: () => `+=${DERNIERE * geo.pas}`,
          invalidateOnRefresh: true,
          onRefreshInit: mesurer,
          onUpdate: (self) => {
            if (!gestes?.enCours()) montrer(Math.round(self.progress * DERNIERE));
          },
        });
        gestes = brancherGestes({
          gsap,
          debut: () => st?.start ?? 0,
          pas: () => geo.pas,
          derniere: DERNIERE,
          surEtape: montrer,
          duree: DUREE,
        });
      }, s);
      allerA.current = gestes?.aller ?? null;
      // Les images arrivent après la mesure : on remesure quand tout est chargé.
      const remesurer = () => ScrollTrigger.refresh();
      window.addEventListener('load', remesurer);
      nettoyer = () => {
        gestes?.arreter();
        allerA.current = null;
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

  // Les captures ne sont jamais re-rendues par React pendant un passage (seul GSAP les anime).
  const scenes = useMemo(
    () => benefices.map((b, i) => <Scene key={b.titre} b={b} i={i} />),
    [benefices],
  );
  const aller = (i: number) => (allerA.current ? allerA.current(i) : setEtape(i));
  const e = anime ? etape : 0;
  return (
    <section
      ref={section}
      className={cn(
        'relative overflow-clip py-[clamp(48px,6vw,88px)]',
        anime ? '' : 'bg-accent-100',
      )}
    >
      {anime ? <Decor /> : null}
      <div className={cn(conteneur, 'relative')}>
        <div className="max-w-[62ch]">
          <span className="mb-2.5 block text-[13px] uppercase tracking-[0.08em] text-accent-700">
            {surtitre}
          </span>
          <h2 className="m-0 mb-3 text-[clamp(28px,3.4vw,40px)] leading-[1.12]">{titre}</h2>
          <p className="m-0 text-[17px] leading-[27px] text-neutre-800">{intro}</p>
        </div>
        <div ref={zone} data-scrolly className="relative">
          <div
            ref={panneau}
            className={cn(
              'grid gap-x-[clamp(28px,4vw,72px)] gap-y-8 pt-[clamp(24px,5vh,56px)] pb-3 min-[900px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] min-[900px]:items-center',
              anime && 'sticky',
            )}
          >
            <div className="grid min-w-0 gap-[clamp(14px,2.6vh,28px)]">
              {anime ? <ListeEtapes benefices={benefices} active={e} onChoisir={aller} /> : null}
              <div className={anime ? 'grid' : 'grid gap-10'}>
                {benefices.map((b, i) => (
                  <div
                    key={b.titre}
                    id={`etape-panneau-${i}`}
                    data-texte={anime ? i : undefined}
                    role={anime ? 'tabpanel' : undefined}
                    aria-labelledby={anime ? `etape-${i}` : undefined}
                    aria-hidden={anime && e !== i ? true : undefined}
                    className={cn(
                      'min-w-0',
                      anime && 'pl-16 will-change-transform [grid-area:1/1]',
                    )}
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
                    <p className="m-0 mb-3.5 max-w-[48ch] text-[clamp(15px,1.6vw,17px)] leading-[1.55] text-neutre-800">
                      {b.texte}
                    </p>
                    <ul className="m-0 grid list-none gap-2 p-0">
                      {b.points.map((pt) => (
                        <li
                          key={pt}
                          className="flex items-center gap-2.5 rounded-[10px] border border-trait bg-blanc/75 px-3 py-2.5 text-[15px] leading-5 font-semibold"
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
              <div data-plaque className="relative min-w-0 pt-6 pr-6 pb-2 pl-3" aria-hidden="true">
                {/* Plaque immobile : les captures se relaient dessus. */}
                <span className="absolute top-0 right-0 bottom-10 left-8 rounded-[24px] border border-accent-300 bg-blanc/60" />
                <div className="relative grid">{scenes}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
