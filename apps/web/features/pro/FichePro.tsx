import { bouton } from '@ph/ui';
import { BellRingingIcon, CheckIcon, LockSimpleIcon } from '@phosphor-icons/react/ssr';
import { conteneurPro } from './Sections';

const POINTS = [
  'Vos photos de chantiers, votre savoir-faire, votre zone',
  'Vos avis clients et vos garanties, bien en vue',
  'Un formulaire de contact direct, gratuit, rien qu’à vous',
];

/**
 * « Votre fiche travaille pendant que vous êtes sur le chantier » : la vraie fiche publique
 * (capture) dans un navigateur, avec la notification de la demande et l'encart « pour vous seul ».
 */
export function FichePro() {
  return (
    <section className="overflow-hidden bg-[linear-gradient(180deg,var(--accent-100)_0%,var(--color-blanc)_100%)] py-[clamp(64px,8vw,112px)]">
      <div
        className={`${conteneurPro} grid items-center gap-x-[clamp(32px,5vw,80px)] gap-y-12 min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]`}
      >
        <div aria-hidden="true" className="relative px-2 pt-8 pb-10 max-[899px]:order-2 sm:px-6">
          <div className="overflow-hidden rounded-[16px] border border-trait bg-blanc shadow-2xl">
            <div className="flex items-center gap-3 border-b border-trait bg-neutre-100/70 px-3.5 py-2">
              <span className="flex flex-none gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-2.5 rounded-full bg-neutre-200" />
                ))}
              </span>
              <span className="min-w-0 flex-1 truncate rounded-[8px] bg-blanc px-3 py-1 text-[13px] text-neutre-700">
                portailtravaux.fr/artisans/bertrand-renovation
              </span>
            </div>
            <picture>
              <source srcSet="/landing/captures/histoire-client-desktop.avif" type="image/avif" />
              <img
                src="/landing/captures/histoire-client-desktop.webp"
                alt=""
                loading="lazy"
                decoding="async"
                className="block aspect-[16/10] w-full object-cover object-top"
              />
            </picture>
          </div>
          <div className="absolute top-0 right-0 flex max-w-[86%] items-center gap-2.5 rounded-[14px] border border-trait bg-blanc/95 px-3 py-2 shadow-xl backdrop-blur sm:gap-3 sm:rounded-[16px] sm:px-4 sm:py-3">
            <span className="flex size-8 flex-none items-center justify-center rounded-[9px] bg-accent-700 text-blanc sm:size-10 sm:rounded-[10px]">
              <BellRingingIcon size={20} weight="fill" />
            </span>
            <span className="grid min-w-0 text-[11.5px] leading-tight sm:text-[13px]">
              <b className="truncate text-[12.5px] sm:text-[14px]">Nouvelle demande · Claire M.</b>
              <span className="truncate text-neutre-700">Salle de bain · Mérignac (33700)</span>
            </span>
          </div>
          <div className="absolute bottom-0 left-0 flex items-center gap-2 rounded-[12px] bg-texte px-3 py-2 text-blanc shadow-xl sm:gap-2.5 sm:rounded-[14px] sm:px-4 sm:py-3">
            <LockSimpleIcon size={20} weight="fill" className="text-accent-300" />
            <span className="grid text-[11.5px] leading-tight sm:text-[13px]">
              <b className="text-[12.5px] sm:text-[14px]">Pour vous seul</b>
              <span className="text-blanc/75">Gratuite, sans commission</span>
            </span>
          </div>
        </div>
        <div className="grid justify-items-start gap-5">
          <p className="m-0 text-[13px] font-bold tracking-[0.08em] text-accent-700 uppercase">
            Votre fiche Portail Travaux
          </p>
          <h2 className="m-0 text-[clamp(28px,3.6vw,44px)] leading-[1.08] tracking-[-0.02em]">
            Elle travaille pendant que vous êtes sur le chantier
          </h2>
          <p className="m-0 max-w-[48ch] text-[17px] leading-[27px] text-neutre-800">
            Un particulier de votre secteur voit votre travail, lit vos avis et vous écrit
            directement avec son projet. Cette demande n’arrive qu’à vous, et elle ne vous coûte
            rien.
          </p>
          <ul className="m-0 grid list-none gap-3 p-0">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[16px] leading-6 font-semibold">
                <span className="mt-0.5 flex size-6 flex-none items-center justify-center rounded-full bg-accent-700 text-blanc">
                  <CheckIcon size={14} weight="bold" aria-hidden="true" />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <a
            href="#inscription"
            className={bouton({ taille: 'lg', className: 'mt-1 min-h-[52px] px-7 text-[17px]' })}
          >
            Créer ma fiche gratuitement
          </a>
        </div>
      </div>
    </section>
  );
}
