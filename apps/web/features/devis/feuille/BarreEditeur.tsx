import { Button } from '@ph/ui';
import { SlidersHorizontalIcon, XIcon } from '@phosphor-icons/react';
import type { Route } from 'next';
import Link from 'next/link';
import { routes } from '@/lib/routes';

/** Haut de l'éditeur pleine page : fermer (retour à la liste), titre, bouton « Options ». */
export function BarreEditeur({
  titre,
  onOptions,
  optionsOuvertes,
}: {
  titre: string;
  onOptions: () => void;
  optionsOuvertes: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-trait bg-blanc px-[clamp(16px,3vw,32px)] py-2">
      <Link
        href={routes.proDevis as Route}
        aria-label="Fermer l’éditeur"
        className="grid size-11 place-items-center rounded-full hover:bg-neutre-100 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <XIcon size={20} aria-hidden="true" />
      </Link>
      <h1 className="m-0 min-w-0 flex-1 truncate text-lg">{titre}</h1>
      <Button variant="secondaire" onClick={onOptions} aria-expanded={optionsOuvertes}>
        <SlidersHorizontalIcon size={18} aria-hidden="true" />
        Options
      </Button>
    </header>
  );
}
