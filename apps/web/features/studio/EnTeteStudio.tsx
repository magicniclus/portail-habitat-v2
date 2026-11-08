'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BoutonStudio } from './BoutonStudio';

const ONGLETS = [
  ['/admin/studio', 'Vidéos'],
  ['/admin/studio/tournage', 'Tournage'],
  ['/admin/studio/idees', 'Idées'],
  ['/admin/studio/calendrier', 'Calendrier'],
  ['/admin/studio/resultats', 'Résultats'],
  ['/admin/studio/reseaux', 'Réseaux'],
] as const;

/**
 * En-tête commun des pages du Studio (organisation inspirée de CapCut et Descript) : le nom,
 * les onglets, et en haut à droite « Studio » : l'éditeur, où toute vidéo se crée et se monte.
 */
export function EnTeteStudio() {
  const chemin = usePathname();
  return (
    <header className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[clamp(26px,3vw,32px)] font-bold tracking-tight">Studio</p>
        <BoutonStudio />
      </div>
      <nav
        aria-label="Sections du Studio"
        className="-mb-px flex gap-1 overflow-x-auto border-b border-trait"
      >
        {ONGLETS.map(([href, libelle]) => {
          const actif = chemin === href;
          return (
            <Link
              key={href}
              href={href as Route}
              aria-current={actif ? 'page' : undefined}
              className="inline-flex min-h-11 items-center border-b-2 border-transparent px-3 font-semibold text-neutre-700 no-underline hover:text-texte aria-[current=page]:border-texte aria-[current=page]:text-texte"
            >
              {libelle}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
