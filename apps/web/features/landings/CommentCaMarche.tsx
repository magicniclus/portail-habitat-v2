import type { ContenuLanding } from '@ph/core/landings';
import { cn } from '@ph/ui';
import { conteneur, pastille, titreFort } from './styles';

/** « Comment ça marche » (maquette) : en-tête collant à gauche, trois cartes reliées par un fil. */
export function CommentCaMarche({ etapes }: { etapes: ContenuLanding['etapes'] }) {
  const n = etapes.length;
  return (
    <section className="relative overflow-hidden bg-blanc py-[clamp(56px,7vw,104px)]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_srgb,var(--color-texte)_10%,transparent)_1px,transparent_1.2px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_60%_70%_at_85%_30%,#000_20%,transparent_70%)]"
      />
      <div
        className={cn(
          conteneur,
          'relative grid items-start gap-[clamp(32px,5vw,72px)] min-[760px]:grid-cols-2',
        )}
      >
        <div className="min-[760px]:sticky min-[760px]:top-24">
          <span className={cn(pastille, 'bg-accent-100')}>En 3 étapes</span>
          <h2 className={titreFort}>Comment ça marche</h2>
          <p className="m-0 mb-[22px] max-w-[42ch] text-[17px] leading-[27px] text-neutre-800">
            Pas de rendez-vous, pas d’installation. Vous avancez à votre rythme, depuis votre
            téléphone ou votre ordinateur.
          </p>
          <a
            href="#inscription"
            className="inline-flex min-h-11 items-center gap-2 text-base font-bold text-accent-700 no-underline hover:underline"
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
        <ol className="relative m-0 grid list-none gap-[clamp(18px,2.4vw,28px)] p-0">
          <span
            aria-hidden="true"
            className="absolute top-7 bottom-7 left-[27px] w-0.5 rounded-sm bg-accent"
          />
          {etapes.map((e, i) => {
            const fin = i === n - 1;
            return (
              <li
                key={e.titre}
                className="relative grid grid-cols-[56px_minmax(0,1fr)] items-start gap-[clamp(14px,2vw,24px)]"
              >
                <span
                  aria-hidden="true"
                  className="relative z-[1] flex size-14 items-center justify-center rounded-full border-2 border-accent bg-accent text-xl font-bold text-blanc shadow-[0_0_0_6px_var(--accent-100)]"
                >
                  {i + 1}
                </span>
                <div
                  className={cn(
                    'relative overflow-hidden rounded-[14px] border p-[clamp(20px,2.4vw,28px)] shadow-md',
                    fin ? 'border-accent-300 bg-accent-100' : 'border-trait bg-blanc',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-3.5 right-3 text-[96px] leading-none font-bold tracking-[-0.05em] text-transparent"
                    style={{
                      WebkitTextStroke: `1.5px color-mix(in srgb, ${fin ? 'var(--accent)' : 'var(--color-texte)'} ${fin ? 22 : 8}%, transparent)`,
                    }}
                  >
                    0{i + 1}
                  </span>
                  <h3 className="relative m-0 mb-2 text-[clamp(19px,2vw,23px)] leading-[1.2]">
                    {e.titre}
                  </h3>
                  <p className="relative m-0 max-w-[52ch] text-[15.5px] leading-[25px] text-neutre-800">
                    {e.texte}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
