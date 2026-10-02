import type { ReactNode } from 'react';
import { cn } from '../cn';

export interface EmptyStateProps {
  icone?: ReactNode;
  titre: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Liste vide : dire pourquoi et proposer l'action suivante. */
export function EmptyState({ icone, titre, children, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-card bg-neutre-100 px-5 py-10 text-center',
        className,
      )}
    >
      {icone && (
        <span aria-hidden="true" className="text-[40px] text-accent">
          {icone}
        </span>
      )}
      <h3 className="m-0 text-lg font-bold">{titre}</h3>
      {children && <div className="max-w-md text-neutre-800">{children}</div>}
      {action}
    </div>
  );
}
