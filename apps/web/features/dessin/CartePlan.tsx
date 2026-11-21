'use client';

import { TAILLE_APERCU } from '@ph/core/dessin';
import { formatDate } from '@ph/core/format';
import { CopyIcon, TrashIcon } from '@phosphor-icons/react';
import { ConfirmDialog, IconButton } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { PlanListe } from './api';

/** Carte d'un plan dans « Mes plans » (DES-02) : aperçu des murs, titre, date, actions. */
export function CartePlan({
  plan: p,
  lien,
  agir,
}: {
  plan: PlanListe;
  lien: Route;
  agir: (operation: 'dupliquer' | 'corbeille', planId: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-card border border-trait bg-blanc p-3">
      <svg
        aria-hidden="true"
        data-testid="apercu-plan"
        viewBox={`0 0 ${TAILLE_APERCU} ${TAILLE_APERCU}`}
        className="size-16 flex-none rounded-lg bg-neutre-100"
      >
        {p.apercu ? <path d={p.apercu} className="fill-texte" /> : null}
      </svg>
      <Link href={lien} className="min-w-0 flex-1 text-texte no-underline">
        <span className="block truncate text-[17px] font-bold">{p.titre}</span>
        <span className="text-sm text-neutre-700">Modifié le {formatDate(new Date(p.majLe))}</span>
      </Link>
      <IconButton
        aria-label={`Dupliquer ${p.titre}`}
        icone={<CopyIcon />}
        onClick={() => agir('dupliquer', p.planId)}
      />
      <ConfirmDialog
        titre={`Supprimer « ${p.titre} » ?`}
        libelleConfirmer="Mettre à la corbeille"
        danger
        declencheur={
          <IconButton aria-label={`Mettre ${p.titre} à la corbeille`} icone={<TrashIcon />} />
        }
        onConfirmer={() => agir('corbeille', p.planId)}
      >
        Le plan part dans la corbeille : vous pouvez le restaurer pendant 30 jours, puis il est
        supprimé définitivement.
      </ConfirmDialog>
    </li>
  );
}
