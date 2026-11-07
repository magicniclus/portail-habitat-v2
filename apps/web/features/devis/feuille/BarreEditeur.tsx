import { Button } from '@ph/ui';
import { SlidersHorizontalIcon, XIcon } from '@phosphor-icons/react';

/** Haut de l'éditeur pleine page : fermer (enregistrer ou quitter), titre, bouton « Options ». */
export function BarreEditeur({
  titre,
  onFermer,
  onOptions,
  optionsOuvertes,
}: {
  titre: string;
  onFermer: () => void;
  onOptions: () => void;
  optionsOuvertes: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-trait bg-blanc px-[clamp(16px,3vw,32px)] py-2">
      <button
        type="button"
        aria-label="Fermer l’éditeur"
        onClick={onFermer}
        className="grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent hover:bg-neutre-100 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <XIcon size={20} aria-hidden="true" />
      </button>
      <h1 className="m-0 min-w-0 flex-1 truncate text-lg">{titre}</h1>
      <Button variant="secondaire" onClick={onOptions} aria-expanded={optionsOuvertes}>
        <SlidersHorizontalIcon size={18} aria-hidden="true" />
        Options
      </Button>
    </header>
  );
}
