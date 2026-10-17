'use client';

import { bouton, Logo } from '@ph/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { routes } from '@/lib/routes';
import { seDeconnecter } from './api';

const lien =
  'inline-flex min-h-11 items-center rounded-[8px] px-3 text-[15px] font-semibold text-neutre-800 no-underline hover:bg-neutre-100';

/** En-tête de l'espace particulier (maquette) : navigation, nouveau projet, déconnexion. */
export function EnteteEspace() {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b border-trait bg-blanc">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-1 px-[clamp(18px,4vw,44px)] py-2">
        <Link href={routes.accueil} className="flex min-h-11 items-center text-texte no-underline">
          <Logo taille={32} />
        </Link>
        <nav aria-label="Navigation principale" className="hidden gap-1 sm:flex">
          <Link href={routes.artisans} className={lien}>
            Artisans
          </Link>
          <Link href={routes.avis} className={lien}>
            Avis
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href={routes.simulateur} className={bouton()}>
            Nouveau projet
          </Link>
          <button
            type="button"
            className={lien}
            onClick={async () => {
              await seDeconnecter();
              router.replace(routes.accueil);
            }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </header>
  );
}
