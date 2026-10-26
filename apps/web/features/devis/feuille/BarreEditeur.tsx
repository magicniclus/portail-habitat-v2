import { Button } from '@ph/ui';
import { SlidersHorizontalIcon, XIcon } from '@phosphor-icons/react';
import type { Route } from 'next';
import Link from 'next/link';
import { routes } from '@/lib/routes';

/** Haut de l'éditeur : fermer, titre, et « Options » sous 1100 px (panneau en feuille du bas). */
export function BarreEditeur({
  titre,
  onOptions,
}: {
  titre: string;
  onOptions: (() => void) | null;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-trait bg-blanc px-[clamp(16px,3vw,32px)] py-2">
      <Link
        href={routes.proDevis as Route}
        aria-label="Fermer l’éditeur"
        className="grid size-11 place-items-center rounded-full hover:bg-neutre-100 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <XIcon size={20} aria-hidden="true" />
      </Link>
      <h1 className="m-0 min-w-0 flex-1 truncate text-lg">{titre}</h1>
      {onOptions ? (
        <Button variant="secondaire" onClick={onOptions}>
          <SlidersHorizontalIcon size={18} aria-hidden="true" />
          Options
        </Button>
      ) : null}
    </header>
  );
}
