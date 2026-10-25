import { cn } from '@ph/ui';
import type { ReactNode } from 'react';

/** Carte d'une section de Ma fiche (maquette) : titre, action à droite (crayon), contenu. */
export function CarteFiche({
  titre,
  sousTitre,
  action,
  className,
  children,
}: {
  titre: string;
  sousTitre?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label={titre}
      className={cn(
        'grid content-start gap-3 rounded-[16px] border border-trait bg-blanc p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="m-0 text-xl leading-tight">{titre}</h2>
          {sousTitre ? <p className="m-0 text-sm text-neutre-800">{sousTitre}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
