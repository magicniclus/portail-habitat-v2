'use client';

import { bouton, cn } from '@ph/ui';
import { useEffect, useRef, useState } from 'react';
import { EXEMPLES_DEMANDES } from './contenu';
import { conteneurPro } from './Sections';
import { TelephoneDemandes } from './TelephoneDemandes';
import { useVersionEmpilee } from '@/features/landings/useVersionEmpilee';

const NB = EXEMPLES_DEMANDES.length;
/** Une étape par demande qui arrive, puis l'étape finale (le client est rappelé). */
const ETAPES = NB + 1;

/**
 * /pro, « Les demandes arrivent » : panneau collant où les demandes d'exemple arrivent une à une
 * sur le téléphone au fil du défilement (dans les deux sens), avec le compteur à gauche. À la
 * fin, le message qui fait s'inscrire : sans fiche, ces demandes vont à un autre artisan.
 * `prefers-reduced-motion` : tout est affiché d'un coup, sans panneau collant.
 */
export function FilDemandes() {
  const zone = useRef<HTMLDivElement>(null);
  const [etape, setEtape] = useState(0);
  const calme = useVersionEmpilee();

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
        'grid w-full items-center gap-x-[clamp(28px,5vw,80px)] gap-y-5 md:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]',
      )}
    >
      <div className="grid content-center justify-items-start gap-2 md:gap-5">
        <p className="m-0 text-[13px] font-bold tracking-[0.08em] text-accent-700 uppercase max-md:hidden">
          Votre téléphone, une fois inscrit
        </p>
        <h2 className="m-0 text-[clamp(25px,3.6vw,46px)] leading-[1.08] tracking-[-0.02em]">
          Les demandes arrivent. Vous choisissez.
        </h2>
        <p className="m-0 max-w-[46ch] text-[17px] leading-[27px] text-neutre-800 max-md:hidden">
          Chaque demande vous dit tout : le chantier, la ville, le budget annoncé et le délai. Vous
          rappelez celles qui vous vont, vous laissez les autres. Celles qui viennent de votre fiche
          sont pour vous seul, et gratuites.
        </p>
        <p className="m-0 flex items-center gap-3" aria-live="polite">
          <b className="text-[clamp(34px,5vw,64px)] leading-none text-accent-700 tabular-nums">
            {n}
          </b>
          <span className="text-[14px] leading-tight font-semibold text-neutre-800 md:text-[15px]">
            demande{n > 1 ? 's' : ''} gratuite{n > 1 ? 's' : ''}
            <br />
            reçue{n > 1 ? 's' : ''} cette semaine
          </span>
        </p>
        <p
          className={cn(
            'm-0 max-w-[40ch] rounded-[14px] border-l-4 border-accent bg-accent-100 px-4 py-3 text-[15.5px] leading-[23px] font-semibold text-accent-800 transition-[opacity,transform] duration-500 max-md:hidden',
            final ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          )}
        >
          Sans fiche sur Portail Travaux, ces clients appellent un autre artisan. L’inscription est
          gratuite : ce serait dommage de les laisser passer.
        </p>
        <a href="#inscription" className={bouton({ className: 'min-h-12 max-md:hidden' })}>
          Recevoir les demandes de ma zone
        </a>
        <p className="m-0 text-[13px] text-neutre-700 max-md:hidden">
          Exemples de demandes, à titre d’illustration.
        </p>
      </div>
      <TelephoneDemandes n={n} final={final} empile={calme}>
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
          <div className="sticky top-0 flex h-svh items-center pt-[60px] pb-2 md:py-4">
            {contenu}
          </div>
        </div>
      )}
    </section>
  );
}
