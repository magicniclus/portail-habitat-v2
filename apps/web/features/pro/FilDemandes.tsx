'use client';

import { bouton, cn } from '@ph/ui';
import {
  CurrencyEurIcon,
  ListChecksIcon,
  MapPinIcon,
  PhoneCallIcon,
  UserCircleCheckIcon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { EXEMPLES_DEMANDES } from './contenu';
import { conteneurPro } from './Sections';
import { TelephoneDemandes } from './TelephoneDemandes';
import { useVersionEmpilee } from '@/features/landings/useVersionEmpilee';

const NB = EXEMPLES_DEMANDES.length;
/** Une étape par demande qui arrive, puis l'étape finale (le client est rappelé). */
const ETAPES = NB + 1;

/** Ce que l'artisan sait avant d'appeler, et ce que ça lui coûte. */
const POINTS = [
  {
    icone: ListChecksIcon,
    titre: 'Tout est indiqué',
    texte: 'Le chantier, la ville, le budget annoncé et le délai.',
  },
  {
    icone: UserCircleCheckIcon,
    titre: 'Pour vous seul',
    texte: 'Une demande envoyée depuis votre fiche n’est pas partagée.',
  },
  {
    icone: CurrencyEurIcon,
    titre: '0 € et 0 % de commission',
    texte: 'Jusqu’à 10 demandes par mois, gratuites.',
  },
] as const;

/**
 * /pro, « Les demandes arrivent » : panneau collant où les demandes d'exemple arrivent une à une
 * sur le téléphone au fil du défilement (dans les deux sens), avec le compteur à gauche. À la
 * fin, le message qui fait s'inscrire : sans fiche, ces demandes vont à un autre artisan.
 * `prefers-reduced-motion` : tout est affiché d'un coup, sans panneau collant.
 */
export function FilDemandes() {
  const zone = useRef<HTMLDivElement>(null);
  const telephone = useRef<HTMLDivElement>(null);
  const [etape, setEtape] = useState(0);
  /** Version empilée : la notification s'affiche chaque fois que le téléphone entre à l'écran. */
  const [apparitions, setApparitions] = useState(0);
  const calme = useVersionEmpilee();

  useEffect(() => {
    if (!calme || !telephone.current) return;
    const io = new IntersectionObserver(
      ([x]) => {
        if (x?.isIntersecting) setApparitions((v) => v + 1);
      },
      { threshold: 0.5 },
    );
    io.observe(telephone.current);
    return () => io.disconnect();
  }, [calme]);

  useEffect(() => {
    if (calme) return;
    let rq = 0;
    const lire = () => {
      rq = 0;
      // Page quittée (navigation) entre la demande d'image et sa lecture : plus rien à mesurer.
      if (!zone.current) return;
      const r = zone.current.getBoundingClientRect();
      const p = Math.min(0.9999, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      setEtape(Math.floor(p * ETAPES));
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

  const e = calme ? ETAPES - 1 : etape;
  const n = Math.min(NB, e + 1);
  const final = e === ETAPES - 1;

  const contenu = (
    <div
      className={cn(
        conteneurPro,
        'grid w-full items-center gap-x-[clamp(32px,5vw,88px)] gap-y-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
      )}
    >
      <div className="grid content-center justify-items-start gap-4 md:gap-6 [@media(max-height:800px)]:md:gap-4">
        <div className="grid gap-2">
          <p className="m-0 text-[13px] font-bold tracking-[0.08em] text-accent-700 uppercase max-md:hidden [@media(max-height:800px)]:hidden">
            Votre téléphone, une fois inscrit
          </p>
          <h2 className="m-0 text-[clamp(26px,min(3.4vw,5.6vh),44px)] leading-[1.08] tracking-[-0.02em]">
            Les demandes arrivent. Vous choisissez.
          </h2>
        </div>
        {/* Compteur du mois : jauge sur les 10 demandes gratuites, points clés, message final. */}
        <div className="w-full max-w-[480px] overflow-hidden rounded-[22px] bg-blanc shadow-[0_18px_40px_-18px_rgb(0_0_0/0.25)] ring-1 ring-trait">
          <div className="grid gap-3 px-5 pt-5 pb-4 md:px-6" aria-live="polite">
            <div className="flex items-end justify-between gap-3">
              <p className="m-0 flex items-baseline gap-1.5">
                <b className="text-[clamp(40px,min(4.6vw,7vh),60px)] leading-none text-accent-700 tabular-nums">
                  {n}
                </b>
                <span className="text-lg font-bold text-neutre-700">/ 10</span>
              </p>
              <span className="rounded-pill bg-succes/10 px-3 py-1 text-[13px] font-bold text-succes">
                Gratuites
              </span>
            </div>
            <p className="m-0 text-[15px] font-semibold text-neutre-800">
              demande{n > 1 ? 's' : ''} reçue{n > 1 ? 's' : ''} ce mois-ci, sans rien payer
            </p>
            <div className="grid grid-cols-10 gap-1" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-2 rounded-pill transition-colors duration-500',
                    i < n ? 'bg-accent' : 'bg-neutre-200',
                  )}
                />
              ))}
            </div>
          </div>
          <ul className="m-0 grid list-none border-t border-trait p-0 max-md:hidden">
            {POINTS.map(({ icone: Icone, titre, texte }) => (
              <li
                key={titre}
                className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-3 border-b border-trait px-5 py-3 last:border-b-0 md:px-6 [@media(max-height:800px)]:py-2"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                  <Icone size={19} weight="bold" aria-hidden="true" />
                </span>
                <span className="grid text-[14.5px] leading-snug">
                  <b>{titre}</b>
                  <span className="text-[13.5px] text-neutre-700 [@media(max-height:800px)]:hidden">
                    {texte}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {/* Fin du défilement : le message se déplie en bas de la carte (aucun blanc réservé). */}
          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-500 max-md:hidden',
              final ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}
          >
            <p className="m-0 min-h-0 overflow-hidden bg-accent-700 text-[14.5px] leading-[21px] font-semibold text-blanc">
              <span className="block px-5 py-3.5 md:px-6">
                Sans fiche sur Portail Travaux, ces clients appellent un autre artisan. Ce serait
                dommage de les laisser passer.
              </span>
            </p>
          </div>
        </div>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-2 max-md:hidden">
          <a href="#inscription" className={bouton({ className: 'min-h-12' })}>
            Recevoir les demandes de ma zone
          </a>
          <span className="text-[13px] text-neutre-700">Exemples à titre d’illustration</span>
        </span>
      </div>
      <div ref={telephone} className="relative justify-self-center">
        {/* Halo derrière le téléphone et deux étiquettes (ordinateur). */}
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -z-0 size-[118%] -translate-1/2 rounded-full bg-[radial-gradient(circle,var(--accent-200)_0%,transparent_68%)] opacity-80"
        />
        <TelephoneDemandes n={n} final={final} empile={calme} apparitions={apparitions}>
          {/* Téléphone : le message final se pose sur l'écran (pas de place à côté). */}
          <p
            className={cn(
              'absolute inset-x-3 bottom-3 z-[3] m-0 rounded-[14px] bg-accent-700 px-4 py-3 text-[13.5px] leading-5 font-semibold text-blanc shadow-lg transition-[opacity,transform] duration-500 md:hidden',
              final ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
            )}
          >
            Sans fiche, ces clients appellent un autre artisan. Ce serait dommage de les laisser
            passer.
          </p>
        </TelephoneDemandes>
        <span
          aria-hidden="true"
          className="absolute top-[22%] -left-[44%] z-[2] flex items-center gap-2.5 rounded-[14px] bg-blanc px-3.5 py-2.5 text-[13px] leading-tight shadow-lg ring-1 ring-trait max-lg:hidden"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-accent-100 text-accent-700">
            <MapPinIcon size={18} weight="fill" />
          </span>
          <span className="grid">
            <b>Dans votre zone</b>
            <span className="text-neutre-700">à moins de 30 km</span>
          </span>
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'absolute -right-[40%] bottom-[18%] z-[2] flex items-center gap-2.5 rounded-[14px] bg-blanc px-3.5 py-2.5 text-[13px] leading-tight shadow-lg ring-1 ring-trait transition-[opacity,transform] duration-500 max-lg:hidden',
            final ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          )}
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-succes text-blanc">
            <PhoneCallIcon size={18} weight="fill" />
          </span>
          <span className="grid">
            <b>Client rappelé</b>
            <span className="text-neutre-700">en 5 minutes</span>
          </span>
        </span>
      </div>
    </div>
  );

  return (
    <section
      id="demandes"
      className="scroll-mt-20 bg-[linear-gradient(180deg,var(--color-neutre-100)_0%,var(--accent-100)_100%)]"
    >
      {calme ? (
        <div className="py-[clamp(48px,6vw,80px)]">{contenu}</div>
      ) : (
        <div ref={zone} data-fil-demandes className="relative h-[330vh]">
          {/* Sous l'en-tête fixe (60 px sur téléphone, 80 px sur ordinateur) : rien n'est caché. */}
          <div className="sticky top-0 flex h-svh items-center pt-[64px] pb-3 md:pt-[92px] md:pb-6">
            {contenu}
          </div>
        </div>
      )}
    </section>
  );
}
