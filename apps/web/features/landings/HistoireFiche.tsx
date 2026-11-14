'use client';

import { cn } from '@ph/ui';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Ecran, Encarts, HISTOIRE } from './HistoireParties';
import { conteneur, pastille, titreFort } from './styles';

const N = HISTOIRE.length;

/**
 * Landing Chantiers (LANDINGS §3, à la place de « Comment ça marche ») : de la fiche complète à la
 * première demande, en 3 temps, sur de vraies captures. Panneau collant : l'étape, l'écran et ses
 * encarts changent au fil du défilement, dans les deux sens ; la 2e étape passe de l'annuaire à la
 * fiche publique. Avec `prefers-reduced-motion` : les 3 étapes empilées.
 */
export function HistoireFiche() {
  const zone = useRef<HTMLDivElement>(null);
  const [etape, setEtape] = useState(0);
  const [avance, setAvance] = useState(0);
  const [calme, setCalme] = useState(false);

  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)');
    const suivre = () => setCalme(m.matches);
    suivre();
    m.addEventListener('change', suivre);
    return () => m.removeEventListener('change', suivre);
  }, []);

  useEffect(() => {
    if (calme) return;
    let rq = 0;
    const lire = () => {
      rq = 0;
      const r = zone.current!.getBoundingClientRect();
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
      cancelAnimationFrame(rq);
      removeEventListener('scroll', surDefilement);
      removeEventListener('resize', surDefilement);
    };
  }, [calme]);

  const allerA = (i: number) => {
    const z = zone.current!;
    const pas = (z.offsetHeight - innerHeight) / N;
    scrollTo({
      top: z.getBoundingClientRect().top + scrollY + pas * i + pas * 0.05,
      behavior: 'smooth',
    });
  };

  const entete = (
    <div className="mx-auto grid max-w-[680px] justify-items-center text-center">
      <span className={cn(pastille, 'bg-blanc')}>En 3 temps</span>
      <h2 className={titreFort}>De votre fiche à vos premiers clients</h2>
      <p className="m-0 max-w-[52ch] text-[17px] leading-[27px] text-neutre-800">
        Vous créez votre fiche, les particuliers de votre zone la trouvent, et leurs demandes
        arrivent chez vous. Jusqu’à 10 demandes par mois, gratuites.
      </p>
    </div>
  );

  if (calme)
    return (
      <section className="bg-accent-100 py-[clamp(56px,7vw,104px)]">
        <div className={cn(conteneur, 'grid gap-10')}>
          {entete}
          {HISTOIRE.map((e, i) => (
            <div key={e.titre} className="grid gap-4">
              <Etape i={i} titre={e.titre} texte={e.texte} actif />
              <Cadre url={e.url}>
                <Ecran nom={e.ecrans[0]} visible />
              </Cadre>
            </div>
          ))}
        </div>
      </section>
    );

  const e = HISTOIRE[etape]!;
  const ecran = e.ecrans[Math.min(e.ecrans.length - 1, Math.floor(avance * e.ecrans.length))]!;
  return (
    <section className="bg-[linear-gradient(180deg,var(--color-blanc)_0%,var(--accent-100)_30%,var(--accent-100)_100%)] pt-[clamp(56px,7vw,104px)]">
      <div className={conteneur}>{entete}</div>
      <div ref={zone} data-histoire-fiche className="relative h-[360vh]">
        <div className="sticky top-0 flex h-svh items-center">
          <div
            className={cn(
              conteneur,
              'grid w-full items-center gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] md:gap-10',
            )}
          >
            <ol className="m-0 grid list-none gap-1 p-0 max-md:hidden">
              {HISTOIRE.map((x, i) => (
                <li key={x.titre}>
                  <button
                    type="button"
                    onClick={() => allerA(i)}
                    aria-current={i === etape ? 'step' : undefined}
                    className={cn(
                      'grid w-full cursor-pointer gap-2 rounded-[14px] border-0 bg-transparent p-4 text-left font-[inherit] text-texte transition-opacity duration-300 focus-visible:outline-2 focus-visible:outline-accent',
                      i === etape
                        ? 'bg-blanc opacity-100 shadow-sm'
                        : 'opacity-55 hover:opacity-80',
                    )}
                  >
                    <Etape i={i} titre={x.titre} texte={x.texte} actif={i === etape} />
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
              <Etape i={etape} titre={e.titre} texte={e.texte} actif />
            </div>
            <Cadre url={ecran === 'histoire-fiche-publique' ? HISTOIRE[2].url : e.url}>
              {HISTOIRE.flatMap((x) => x.ecrans).map((nom) => (
                <Ecran key={nom} nom={nom} visible={nom === ecran} />
              ))}
              <Encarts etape={etape} />
            </Cadre>
          </div>
        </div>
      </div>
    </section>
  );
}

function Etape(p: { i: number; titre: string; texte: string; actif: boolean }) {
  return (
    <span className="grid gap-1.5">
      <span className="flex items-center gap-3 text-[clamp(18px,1.8vw,22px)] leading-tight font-bold">
        <span className="flex size-8 flex-none items-center justify-center rounded-full bg-accent text-[15px] text-blanc">
          {p.i + 1}
        </span>
        {p.titre}
      </span>
      <span
        className={cn('text-[15.5px] leading-[24px] text-neutre-800', !p.actif && 'line-clamp-1')}
      >
        {p.texte}
      </span>
    </span>
  );
}

function Cadre(p: { url: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-trait bg-blanc shadow-lg">
      <div className="flex items-center gap-3 border-b border-trait bg-neutre-100/60 px-3.5 py-2">
        <span aria-hidden="true" className="flex flex-none gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2.5 rounded-full bg-neutre-200" />
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate rounded-[8px] bg-blanc px-3 py-1 text-[13px] text-neutre-700">
          {p.url}
        </span>
      </div>
      <div className="relative aspect-[390/440] bg-neutre-100 md:aspect-[16/10]">{p.children}</div>
    </div>
  );
}
