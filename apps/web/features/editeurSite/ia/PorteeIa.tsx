'use client';

type Portee = 'selection' | 'page' | 'site';

/** Portée de la demande à l'IA : la sélection (avec son nom), cette page ou tout le site. */
export function PorteeIa({
  portee,
  onChange,
  selection,
  nomSelection,
}: {
  portee: Portee;
  onChange: (p: Portee) => void;
  selection: string | null;
  nomSelection?: string;
}) {
  const puce = (actif: boolean) =>
    `min-h-11 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap disabled:opacity-40 ${actif ? 'border-accent bg-accent-100 text-accent-700' : 'border-trait bg-blanc text-neutre-800 hover:bg-neutre-100'}`;

  return (
    <div role="group" aria-label="Portée" className="flex flex-wrap gap-1.5">
      {(['selection', 'page', 'site'] as const).map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={portee === p}
          disabled={p === 'selection' && !selection}
          onClick={() => onChange(p)}
          className={puce(portee === p)}
        >
          {p === 'selection'
            ? `Sélection${nomSelection ? ` · ${nomSelection.slice(0, 18)}` : ''}`
            : p === 'page'
              ? 'Cette page'
              : 'Tout le site'}
        </button>
      ))}
    </div>
  );
}
