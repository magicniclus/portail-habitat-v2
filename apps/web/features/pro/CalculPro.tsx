import { bouton } from '@ph/ui';
import { CheckCircleIcon } from '@phosphor-icons/react/ssr';
import { Fragment } from 'react';
import { conteneurPro } from './Sections';

/** Les trois « zéro » de l'inscription (aucun chiffre inventé : ce sont les conditions). */
const ZEROS = [
  { valeur: '0 €', texte: 'à l’inscription, sans carte bancaire' },
  { valeur: '0 %', texte: 'de commission sur vos chantiers' },
  { valeur: '0', texte: 'engagement : vous partez quand vous voulez' },
] as const;

const operateur =
  'flex size-12 flex-none items-center justify-center self-center justify-self-center rounded-full border border-blanc/15 bg-blanc/10 text-[26px] leading-none font-bold text-accent-300';

/**
 * « Le calcul est vite fait » (fond nuit) : une équation 0 € + 0 % + 0 engagement = des clients.
 * À l'horizontale dès 1024 px, empilée sur téléphone.
 */
export function CalculPro() {
  return (
    <section
      aria-labelledby="calcul-pro"
      className="relative overflow-hidden bg-nuit py-[clamp(64px,8vw,112px)] text-blanc"
      style={{
        backgroundImage:
          'radial-gradient(circle at 85% 100%, color-mix(in srgb, var(--accent) 38%, transparent) 0, transparent 45%), radial-gradient(color-mix(in srgb, var(--color-blanc) 7%, transparent) 1px, transparent 1.2px)',
        backgroundSize: 'auto, 22px 22px',
      }}
    >
      <div className={`${conteneurPro} relative grid gap-[clamp(32px,5vw,56px)]`}>
        <div className="mx-auto grid max-w-[720px] justify-items-center text-center">
          <p className="m-0 mb-3 text-[13px] font-bold tracking-[0.08em] text-accent-300 uppercase">
            Le calcul est vite fait
          </p>
          <h2
            id="calcul-pro"
            className="m-0 mb-4 text-[clamp(30px,4.4vw,54px)] leading-[1.05] tracking-[-0.02em] text-blanc"
          >
            Rien à perdre. Des clients à gagner.
          </h2>
          <p className="m-0 max-w-[50ch] text-[17px] leading-[27px] text-blanc/80">
            Vous ne payez rien pour recevoir des demandes. Ne pas s’inscrire, c’est les laisser à un
            autre artisan de votre secteur.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.35fr] lg:gap-4">
          {ZEROS.map((z, i) => (
            <Fragment key={z.valeur + z.texte}>
              <div className="grid content-center gap-2 rounded-[20px] border border-blanc/12 bg-blanc/[0.06] px-6 py-6 text-center backdrop-blur-sm lg:py-8">
                <b className="text-[clamp(44px,5vw,64px)] leading-none tracking-[-0.03em] text-blanc">
                  {z.valeur}
                </b>
                <span className="text-[15px] leading-[22px] text-blanc/75">{z.texte}</span>
              </div>
              <span aria-hidden="true" className={operateur}>
                {i < ZEROS.length - 1 ? '+' : '='}
              </span>
            </Fragment>
          ))}
          <div className="relative grid content-center gap-2 overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,var(--accent)_0%,var(--accent-700)_100%)] px-6 py-7 text-center shadow-[0_20px_50px_-12px_color-mix(in_srgb,var(--accent)_60%,transparent)] lg:py-8">
            <CheckCircleIcon
              size={30}
              weight="fill"
              aria-hidden="true"
              className="mx-auto text-blanc"
            />
            <b className="text-[clamp(30px,3.2vw,42px)] leading-[1.05] tracking-[-0.02em] text-blanc">
              Des clients
            </b>
            <span className="text-[15px] leading-[22px] font-semibold text-blanc">
              qui vous écrivent depuis votre fiche, avec leur projet et leur budget
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <a
            href="#inscription"
            className={bouton({ taille: 'lg', className: 'min-h-[52px] px-7 text-[17px]' })}
          >
            Créer ma fiche gratuitement
          </a>
          <span className="text-sm text-blanc/75">3 minutes, et votre fiche est en ligne</span>
        </div>
      </div>
    </section>
  );
}
