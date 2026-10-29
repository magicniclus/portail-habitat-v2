import { cn } from '@ph/ui';
import type { ReactNode } from 'react';

/** En-tête d'un onglet de « Mon site » : même titre, même texte d'aide, actions à droite. */
export function EnTeteOnglet({
  titre,
  children,
  actions,
}: {
  titre: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid min-w-0 gap-1">
        <h2 className="m-0 text-[22px] leading-tight font-bold">{titre}</h2>
        {children ? (
          <p className="m-0 max-w-[68ch] text-[15px] text-neutre-700">{children}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** Carte de réglages : icône, titre, état à droite, puis le contenu. */
export function CarteReglage({
  icone,
  titre,
  etat,
  description,
  children,
  className,
}: {
  icone?: ReactNode;
  titre: string;
  etat?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={titre}
      className={cn('grid gap-4 rounded-[14px] border border-trait bg-blanc p-5', className)}
    >
      <div className="flex items-start gap-3">
        {icone ? (
          <span
            aria-hidden="true"
            className="grid size-10 flex-none place-items-center rounded-[10px] bg-neutre-100 text-neutre-800"
          >
            {icone}
          </span>
        ) : null}
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 className="m-0 text-base font-bold">{titre}</h3>
          {description ? <p className="m-0 text-sm text-neutre-700">{description}</p> : null}
        </div>
        {etat}
      </div>
      {children}
    </section>
  );
}

/** Pastille d'état (« Actif », « Non configuré »). */
export function Pastille({ actif, children }: { actif: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        actif ? 'bg-succes-fond text-succes' : 'bg-neutre-100 text-neutre-700',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', actif ? 'bg-succes' : 'bg-neutre-500')}
      />
      {children}
    </span>
  );
}
