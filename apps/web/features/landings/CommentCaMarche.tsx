import type { ContenuLanding } from '@ph/core/landings';
import { cn } from '@ph/ui';
import { CaptureEcran } from './CaptureEcran';
import { conteneur, pastille, titreFort } from './styles';

/**
 * « Comment ça marche » : en-tête centré puis trois étapes, chacune avec la vraie capture
 * téléphone de l'écran concerné (`etapes[].ecran`), un numéro et le texte. Sur téléphone, les
 * étapes défilent à l'horizontale (une carte par écran, la suivante dépasse).
 */
export function CommentCaMarche({ etapes }: { etapes: ContenuLanding['etapes'] }) {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,var(--color-blanc)_0%,var(--accent-100)_100%)] py-[clamp(56px,7vw,104px)]">
      <div className={cn(conteneur, 'relative grid gap-[clamp(28px,4vw,52px)]')}>
        <div className="mx-auto grid max-w-[640px] justify-items-center text-center">
          <span className={cn(pastille, 'bg-blanc')}>En 3 étapes</span>
          <h2 className={titreFort}>Comment ça marche</h2>
          <p className="m-0 max-w-[48ch] text-[17px] leading-[27px] text-neutre-800">
            Pas de rendez-vous, pas d’installation. Vous avancez à votre rythme, depuis votre
            téléphone ou votre ordinateur.
          </p>
        </div>
        <ol className="m-0 -mx-[clamp(18px,4vw,44px)] flex list-none snap-x snap-mandatory gap-5 overflow-x-auto px-[clamp(18px,4vw,44px)] pb-3 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-[clamp(20px,3vw,40px)] md:overflow-visible md:px-0 md:pb-0">
          {etapes.map((e, i) => (
            <li
              key={e.titre}
              className="grid w-[78%] flex-none snap-center content-start gap-5 md:w-auto"
            >
              <div className="relative rounded-[24px] border border-trait bg-blanc px-[12%] pt-6 shadow-md">
                <span
                  aria-hidden="true"
                  className="absolute top-4 left-4 z-[2] flex size-10 items-center justify-center rounded-full bg-accent text-[17px] font-bold text-blanc shadow-[0_0_0_5px_var(--accent-100)]"
                >
                  {i + 1}
                </span>
                {/* Haut du téléphone seulement : l'écran utile, sans la barre du bas. */}
                <div className="aspect-[390/560] overflow-hidden">
                  {e.ecran ? (
                    <CaptureEcran
                      capture={{ image: e.ecran, url: '', legende: e.titre }}
                      cadre="telephone"
                      legende={false}
                    />
                  ) : null}
                </div>
              </div>
              <div className="grid gap-1.5 px-1">
                <h3 className="m-0 text-[clamp(19px,2vw,23px)] leading-[1.2]">
                  <span className="text-accent-700">{String(i + 1).padStart(2, '0')}.</span>{' '}
                  {e.titre}
                </h3>
                <p className="m-0 text-[15.5px] leading-[25px] text-neutre-800">{e.texte}</p>
              </div>
            </li>
          ))}
        </ol>
        <a
          href="#inscription"
          className="mx-auto inline-flex min-h-11 items-center gap-2 text-base font-bold text-accent-700 no-underline hover:underline"
        >
          Créer mon espace gratuit
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </div>
    </section>
  );
}
