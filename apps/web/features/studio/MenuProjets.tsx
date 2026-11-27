'use client';

import { FolderOpenIcon } from '@phosphor-icons/react';
import type { Route } from 'next';
import Link from 'next/link';

/**
 * Menu « Projets » de l'éditeur : ouvrir un autre montage, ou en créer un nouveau. Avec des
 * modifications non enregistrées, on demande avant de quitter.
 */
export function MenuProjets(p: {
  projets: readonly { id: string; titre: string }[];
  actuel: string;
  modifie: boolean;
}) {
  const quitter = (e: React.MouseEvent) => {
    if (
      p.modifie &&
      !window.confirm('Changer de projet sans enregistrer ? Vos modifications seront perdues.')
    )
      e.preventDefault();
  };
  return (
    <details className="relative">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-[8px] px-3 text-sm hover:bg-montage-survol">
        <FolderOpenIcon size={18} aria-hidden="true" />
        Projets
      </summary>
      <nav
        aria-label="Projets de montage"
        className="absolute top-12 left-0 z-30 grid max-h-[60vh] w-80 gap-1 overflow-y-auto rounded-[10px] border border-montage-trait bg-montage-surface p-2 shadow-lg"
      >
        <Link
          href={'/admin/studio/monter' as Route}
          onClick={quitter}
          className="flex min-h-10 items-center rounded-[6px] px-2 text-sm font-semibold text-montage-selection no-underline hover:bg-montage-survol"
        >
          + Nouveau montage
        </Link>
        {p.projets.map((x) => (
          <Link
            key={x.id}
            href={`/admin/studio/${x.id}/montage` as Route}
            onClick={quitter}
            aria-current={x.id === p.actuel ? 'page' : undefined}
            className="flex min-h-10 items-center truncate rounded-[6px] px-2 text-sm text-montage-texte no-underline hover:bg-montage-survol aria-[current=page]:bg-montage-survol aria-[current=page]:font-semibold"
          >
            {x.titre}
          </Link>
        ))}
      </nav>
    </details>
  );
}
