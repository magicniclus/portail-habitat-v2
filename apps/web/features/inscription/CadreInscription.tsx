import { Logo } from '@ph/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { routes } from '@/lib/routes';

/** Maison décorative des colonnes de droite (maquettes Onboarding, opacité 12 %). */
function MaisonDecor() {
  return (
    <svg
      viewBox="0 0 600 420"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute -right-[60px] -bottom-10 w-[min(70%,520px)] opacity-[0.12]"
    >
      <path d="M430 60h48v86l-48-38z" fill="var(--accent)" />
      <path d="M30 230 300 30l270 200v190H30z" fill="var(--accent)" />
      <path d="M300 30 570 230v190H300z" fill="var(--color-texte)" opacity="0.3" />
    </svg>
  );
}

/**
 * Cadre des étapes 2 et 3 (maquettes Onboarding) : logo, avancement, contenu ; à droite (dessous
 * sur mobile) la colonne claire du secteur. La barre d'action fixe est rendue par l'étape.
 */
export function CadreInscription({
  etape,
  children,
  aside,
  largeur = 'max-w-[560px]',
}: {
  etape: 2 | 3;
  children: ReactNode;
  aside: ReactNode;
  /** Largeur du contenu (560 px à l'étape 2, 420 px à l'étape 3). */
  largeur?: string;
}) {
  return (
    <div className="grid min-h-dvh grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] bg-blanc pb-[84px] text-texte">
      <div className="flex min-w-0 flex-col px-[clamp(20px,4vw,56px)] pt-[clamp(20px,3vw,32px)] pb-10">
        <div className="flex flex-wrap items-center gap-5">
          <Link href={routes.pro} className="flex min-h-11 items-center text-texte no-underline">
            <Logo variant="pro" taille={36} empile />
          </Link>
          <div className="min-w-[150px] flex-1 sm:max-w-[220px]">
            <p className="m-0 mb-1.5 text-[13px] font-semibold text-neutre-800">
              Étape {etape} sur 3
            </p>
            <div
              role="progressbar"
              aria-label="Avancement de l’inscription"
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={etape}
              className="h-1.5 overflow-hidden rounded-pill bg-neutre-300"
            >
              <span
                className="block h-full bg-accent"
                style={{ width: `${Math.round((etape / 3) * 100)}%` }}
              />
            </div>
          </div>
        </div>
        <main
          className={`mx-auto my-10 flex w-full flex-1 flex-col justify-center gap-5 ${largeur}`}
        >
          {children}
        </main>
      </div>
      <aside className="relative flex min-w-0 flex-col justify-center gap-[22px] overflow-hidden bg-accent-100 p-[clamp(28px,4vw,56px)]">
        <MaisonDecor />
        <div className="relative grid max-w-[460px] gap-[22px]">{aside}</div>
      </aside>
    </div>
  );
}
