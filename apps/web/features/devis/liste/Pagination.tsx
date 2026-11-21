import { cn } from '@ph/ui';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';

const bouton =
  'grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-neutre-800 hover:bg-neutre-100 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40';

/** « 1 à 25 sur 132 » et flèches (captures du propriétaire). */
export function Pagination({
  page,
  parPage,
  total,
  onPage,
}: {
  page: number;
  parPage: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (total <= parPage) return null;
  const pages = Math.ceil(total / parPage);
  return (
    <nav
      aria-label="Pages"
      className="flex items-center justify-center gap-2 text-sm text-neutre-800"
    >
      <button
        type="button"
        aria-label="Page précédente"
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
        className={cn(bouton)}
      >
        <CaretLeftIcon size={18} aria-hidden="true" />
      </button>
      <span>
        {page * parPage + 1} à {Math.min((page + 1) * parPage, total)} sur {total}
      </span>
      <button
        type="button"
        aria-label="Page suivante"
        disabled={page >= pages - 1}
        onClick={() => onPage(page + 1)}
        className={cn(bouton)}
      >
        <CaretRightIcon size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}
