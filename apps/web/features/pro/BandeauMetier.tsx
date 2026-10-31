'use client';

import type { GroupeMetiers } from './metiers';
import { useMetierCible } from './useMetierCible';

export function BandeauMetier({ groupes }: { groupes: GroupeMetiers[] }) {
  const m = useMetierCible(groupes);
  if (!m) return null;
  return (
    <p className="m-0 mb-3 text-sm font-bold tracking-[0.04em] text-accent-700 uppercase">
      {m.nom} · mise en relation avec des particuliers
    </p>
  );
}
