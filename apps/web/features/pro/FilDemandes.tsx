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
      const r = zone.current!.getBoundingClientRect();
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
      <div className="grid content-center justify-items-start gap-3 md:gap-5 [@media(max-height:800px)]:md:gap-3">
        <p className="m-0 text-[13px] font-bold tracking-[0.08em] text-accent-700 uppercase max-md:hidden [@media(max-height:800px)]:hidden">
          Votre téléphone, une fois inscrit
        </p>
        <h2 className="m-0 text-[clamp(26px,min(3.4vw,5.6vh),44px)] leading-[1.08] tracking-[-0.02em]">
          Les demandes arrivent. Vous choisissez.
        </h2>
        <p className="m-0 flex items-center gap-3" aria-live="polite">
          <b className="text-[clamp(34px,min(4.6vw,7vh),60px)] leading-none text-accent-700 tabular-nums">
            {n}
          </b>
          <span className="text-[14px] leading-tight font-semibold text-neutre-800 md:text-[15px]">
            demande{n > 1 ? 's' : ''} gratuite{n > 1 ? 's' : ''}
            <br />
            reçue{n > 1 ? 's' : ''} cette semaine
          </span>
        </p>
        <ul className="m-0 grid list-none gap-2.5 p-0 max-md:hidden">
          {POINTS.map(({ icone: Icone, titre, texte }) => (
            <li
              key={titre}
              className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-[14px] border border-trait bg-blanc/80 px-3.5 py-2.5 shadow-sm [@media(max-height:800px)]:py-1.5"
            >
              <span className="flex size-10 items-center justify-center rounded-[10px] bg-accent-100 text-accent-700">
                <Icone size={22} weight="bold" aria-hidden="true" />
              </span>
              <span className="grid text-[14.5px] leading-snug">
                <b>{titre}</b>
                <span className="text-neutre-800 [@media(max-height:800px)]:hidden">{texte}</span>
              </span>
            </li>
          ))}
        </ul>
        {/* Message final : se déplie à la fin (aucun blanc réservé avant). */}
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-500 max-md:hidden',
            final ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <p className="m-0 min-h-0 max-w-[44ch] overflow-hidden rounded-[14px] border-l-4 border-accent bg-accent-100 px-4 py-3 text-[15px] leading-[22px] [@media(max-height:800px)]:py-2 [@media(max-height:800px)]:text-[14px] [@media(max-height:800px)]:leading-5 font-semibold text-accent-800">
            Sans fiche sur Portail Travaux, ces clients appellent un autre artisan. L’inscription
            est gratuite : ce serait dommage de les laisser passer.
          </p>
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
