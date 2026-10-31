'use client';

import type { NomFlag } from '@ph/core/flags';
import { Badge } from '@ph/ui';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { changerFlag } from './actions';

/** Fonctionnalités activables (EXPLOITATION §4) : chaque bascule est motivée et journalisée. */
export function FlagsAdmin({
  flags,
  peut,
}: {
  flags: { nom: NomFlag; description: string; valeur: boolean; defaut: boolean }[];
  peut: boolean;
}) {
  return (
    <ul aria-label="Fonctionnalités" className="m-0 grid list-none gap-2 p-0">
      {flags.map((f) => (
        <li
          key={f.nom}
          className="flex flex-wrap items-center justify-between gap-2 border-t border-trait py-3"
        >
          <span className="grid gap-0.5">
            <strong>{f.description}</strong>
            <span className="text-[13px] text-neutre-700">
              {f.nom} · par défaut {f.defaut ? 'activé' : 'désactivé'}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <Badge tone={f.valeur ? 'succes' : 'neutre'}>{f.valeur ? 'Activé' : 'Désactivé'}</Badge>
            <ConfirmationAdmin
              libelle={f.valeur ? 'Désactiver' : 'Activer'}
              titre={`${f.valeur ? 'Désactiver' : 'Activer'} : ${f.description}`}
              description="Le changement s’applique à tout le site dans la minute."
              danger={f.nom === 'maintenance' && !f.valeur}
              desactive={peut ? undefined : 'Permission requise : referentiels.modifier'}
              onConfirmer={(motif) => changerFlag({ nom: f.nom, valeur: !f.valeur, motif })}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
