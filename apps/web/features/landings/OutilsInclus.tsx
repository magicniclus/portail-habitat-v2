import { OUTILS_INCLUS, type ContenuLanding, type OutilLanding } from '@ph/core/landings';
import { cn } from '@ph/ui';
import { IconeLanding } from './IconeLanding';
import { coche, conteneur, pastille, titreFort } from './styles';

const BADGES = ['Sans abonnement', 'Sans carte bancaire'];

/**
 * « Un seul compte » (maquette) : l'outil de la page en grande carte « Sur cette page », puis les
 * autres outils ; chaque carte ramène au formulaire, jamais vers une autre landing (LANDINGS §3.7).
 */
export function OutilsInclus({
  outil,
  eco,
  points,
}: {
  outil: OutilLanding;
  eco: ContenuLanding['eco'];
  points: string[];
}) {
  const actif = OUTILS_INCLUS.find((o) => o.id === outil)!;
  const autres = OUTILS_INCLUS.filter((o) => o.id !== outil);
  return (
    <section data-section-gratuit className="relative bg-neutre-100 py-[clamp(56px,7vw,104px)]">
      <div className={cn(conteneur, 'grid gap-[clamp(24px,3vw,36px)]')}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="max-w-[640px]">
            <span className={cn(pastille, 'bg-blanc')}>Un seul compte</span>
            <h2 className={titreFort}>{eco.titre}</h2>
            <p className="m-0 text-[17px] leading-[27px] text-neutre-800">{eco.texte}</p>
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {BADGES.map((b) => (
              <li
                key={b}
                className="inline-flex items-center gap-2 rounded-pill border border-accent-300 bg-blanc px-3.5 py-2 text-[14.5px] font-semibold"
              >
                <span aria-hidden="true" className="font-bold text-accent">
                  ✓
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <a
          href="#inscription"
          className="relative grid items-center gap-x-[clamp(24px,4vw,56px)] gap-y-6 overflow-hidden rounded-[16px] border-2 border-accent bg-blanc p-[clamp(22px,3vw,36px)] text-texte no-underline shadow-md transition hover:-translate-y-0.5 hover:shadow-lg min-[760px]:grid-cols-2"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent-300)"
            strokeWidth="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute -top-[30px] -right-6 hidden size-[clamp(160px,20vw,260px)] opacity-70 min-[760px]:block"
          >
            <path d="M3 10.5 12 3l9 7.5M5 9v11h14V9M10 20v-6h4v6" />
          </svg>
          <span className="relative grid gap-3">
            <span className="flex flex-wrap items-center gap-3">
              <span className="flex size-14 flex-none items-center justify-center rounded-[14px] bg-accent text-blanc">
                <IconeLanding nom={actif.icone} taille={28} />
              </span>
              <span className="rounded-pill border border-accent-300 bg-accent-100 px-2.5 py-1 text-xs font-bold text-accent-800">
                Sur cette page
              </span>
            </span>
            <span className="text-[clamp(24px,2.8vw,32px)] leading-[1.1] font-bold">
              {actif.titre}
            </span>
            <span className="max-w-[44ch] text-[16.5px] leading-[25px] text-neutre-800">
              {actif.texte}
            </span>
          </span>
          <span className="relative grid gap-2.5">
            {points.map((p) => (
              <span
                key={p}
                className="flex items-center gap-3 rounded-[10px] bg-accent-100 px-3.5 py-3 text-[15.5px] leading-[21px] font-semibold"
              >
                <span aria-hidden="true" className={cn(coche, 'size-6 text-xs')}>
                  ✓
                </span>
                {p}
              </span>
            ))}
          </span>
        </a>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))] gap-3.5 p-0">
          {autres.map((o) => (
            <li key={o.id}>
              <a
                href="#inscription"
                className="grid h-full content-start gap-2.5 rounded-[12px] border border-trait bg-blanc p-5 text-texte no-underline transition hover:-translate-y-[3px] hover:border-accent-300 hover:shadow-md"
              >
                <span className="flex items-start justify-between">
                  <span className="flex size-11 items-center justify-center rounded-[12px] border border-accent-300 bg-accent-100 text-accent-700">
                    <IconeLanding nom={o.icone} />
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-neutre-700)"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </span>
                <span className="text-[17px] leading-[1.2] font-bold">{o.titre}</span>
                <span className="text-[14.5px] leading-[21px] text-neutre-800">{o.texte}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
