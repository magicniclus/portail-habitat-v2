import { cn } from '@ph/ui';

const bascule = (actif: boolean) =>
  cn(
    'min-h-11 min-w-14 cursor-pointer rounded-pill border-0 px-3 text-sm font-semibold',
    actif ? 'bg-neutre-900 text-blanc' : 'bg-transparent text-neutre-800 hover:bg-neutre-100',
  );

/** Montants affichés hors taxes ou toutes taxes comprises (captures du propriétaire). */
export function BasculeHtTtc({ ttc, onTtc }: { ttc: boolean; onTtc: (ttc: boolean) => void }) {
  return (
    <div
      role="group"
      aria-label="Montants"
      className="flex rounded-pill border border-trait bg-blanc p-0.5"
    >
      <button
        type="button"
        aria-pressed={!ttc}
        onClick={() => onTtc(false)}
        className={bascule(!ttc)}
      >
        HT
      </button>
      <button type="button" aria-pressed={ttc} onClick={() => onTtc(true)} className={bascule(ttc)}>
        TTC
      </button>
    </div>
  );
}
