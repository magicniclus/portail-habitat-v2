import type { ReactNode } from 'react';

/** Ligne d'un écran de réglages (Mon compte) : libellé, valeur, action à droite (sous le texte en mobile). */
export function LigneReglage({
  id,
  libelle,
  valeur,
  action,
  danger,
}: {
  id?: string;
  libelle: string;
  valeur: ReactNode;
  action?: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      id={id}
      className="flex scroll-mt-24 flex-wrap items-center gap-x-4 gap-y-2 border-t border-trait py-3.5 first:border-t-0"
    >
      <span className="flex flex-[1_1_240px] flex-col gap-0.5">
        <span className={`text-[15.5px] font-semibold ${danger ? 'text-danger' : ''}`}>
          {libelle}
        </span>
        <span className="text-sm text-neutre-700">{valeur}</span>
      </span>
      {action}
    </div>
  );
}
