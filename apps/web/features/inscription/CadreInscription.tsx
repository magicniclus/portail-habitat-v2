import { Logo } from '@ph/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { routes } from '@/lib/routes';

/** Cadre des étapes 2 et 3 (maquettes Onboarding) : logo, avancement, contenu, colonne de droite. */
export function CadreInscription({
  etape,
  children,
  aside,
}: {
  etape: 2 | 3;
  children: ReactNode;
  aside: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-blanc lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-6 px-[clamp(18px,5vw,64px)] pt-[clamp(20px,3vw,36px)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href={routes.pro} className="flex min-h-11 items-center text-texte no-underline">
            <Logo variant="pro" taille={34} />
          </Link>
          <div className="grid min-w-[160px] gap-1.5">
            <p className="m-0 text-[13px] font-bold text-neutre-800">Étape {etape} sur 3</p>
            <div
              role="progressbar"
              aria-label="Avancement de l’inscription"
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={etape}
              className="h-1.5 overflow-hidden rounded-pill bg-neutre-200"
            >
              <span
                className="block h-full rounded-pill bg-accent"
                style={{ width: `${(etape / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <main className="mx-auto grid w-full max-w-[560px] gap-6 pb-10">{children}</main>
      </div>
      <aside className="hidden bg-accent-900 p-[clamp(32px,5vw,64px)] text-accent-200 lg:block">
        {aside}
      </aside>
    </div>
  );
}
