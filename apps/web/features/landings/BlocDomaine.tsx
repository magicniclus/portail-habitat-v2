import { ArrowDownIcon, CheckCircleIcon, LockSimpleIcon } from '@phosphor-icons/react/ssr';

const ETAPES = [
  ['Nous vous donnons 3 réglages', 'Copiés en un clic depuis votre espace.'],
  [
    'Vous les collez chez votre hébergeur',
    'OVH, IONOS, Gandi… vous gardez votre domaine là où il est.',
  ],
  ['La vérification se fait toute seule', 'Votre site passe sur votre adresse, sécurisée (HTTPS).'],
] as const;

/**
 * Site uniquement (LANDINGS §9) : nom de domaine personnalisé (barre d'adresse qui passe de
 * l'adresse Portail Travaux à l'adresse de l'artisan) et domaine existant en 3 étapes.
 */
export function BlocDomaine() {
  return (
    <div className="grid gap-[clamp(24px,4vw,48px)] overflow-hidden rounded-[22px] bg-nuit p-[clamp(22px,4vw,48px)] text-blanc shadow-lg min-[860px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <span className="text-[13px] font-bold tracking-[0.08em] text-accent-300 uppercase">
          Nom de domaine
        </span>
        <h3 className="m-0 text-[clamp(24px,2.8vw,34px)] leading-[1.1] text-blanc">
          Une adresse à votre nom, qui vous appartient
        </h3>
        <p className="m-0 max-w-[46ch] text-[16px] leading-[25px] text-blanc/85">
          Votre site passe sur votre propre nom de domaine. Il est enregistré au nom de votre
          entreprise : c’est le vôtre, même si vous partez.
        </p>
        <div aria-hidden="true" className="mt-2 grid max-w-[440px] gap-2.5">
          <span className="flex items-center gap-2 rounded-pill border border-blanc/15 bg-blanc/5 px-4 py-2.5 text-[14px] text-blanc/55 line-through">
            bertrand-renovation.portailtravaux.fr
          </span>
          <ArrowDownIcon size={18} className="ml-6 text-accent-300" />
          <span className="flex items-center gap-2.5 rounded-pill bg-blanc px-4 py-3 text-[16px] font-bold text-texte shadow-lg">
            <LockSimpleIcon size={18} weight="fill" className="text-succes" />
            bertrand-renovation.fr
            <span className="ml-auto rounded-pill bg-succes/12 px-2.5 py-0.5 text-[12px] font-bold text-succes">
              Sécurisé
            </span>
          </span>
        </div>
      </div>
      <div className="grid content-start gap-5 rounded-[18px] border border-blanc/12 bg-blanc/[0.06] p-[clamp(18px,3vw,30px)]">
        <h3 className="m-0 text-[clamp(20px,2.2vw,26px)] leading-tight text-blanc">
          Vous avez déjà un nom de domaine ? <span className="text-accent-300">On l’intègre.</span>
        </h3>
        <ol className="m-0 grid list-none gap-4 p-0">
          {ETAPES.map(([t, l], i) => (
            <li key={t} className="grid grid-cols-[36px_minmax(0,1fr)] items-start gap-3.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-accent text-[15px] font-bold text-blanc">
                {i + 1}
              </span>
              <span className="grid gap-0.5">
                <strong className="text-[16.5px] leading-tight">{t}</strong>
                <span className="text-[14.5px] leading-[21px] text-blanc/75">{l}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="m-0 flex items-center gap-2 text-[14.5px] font-semibold text-blanc/90">
          <CheckCircleIcon size={20} weight="fill" className="flex-none text-accent-300" />
          Vous restez propriétaire de votre domaine, et vos e-mails ne changent pas.
        </p>
      </div>
    </div>
  );
}
