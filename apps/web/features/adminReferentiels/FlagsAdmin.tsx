'use client';

import type { NomFlag } from '@ph/core/flags';
import { Badge, Banner } from '@ph/ui';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { changerFlag } from './actions';

const ACTIVER_MAINTENANCE =
  'Toutes les pages du site seront remplacées par «\u00a0Maintenance en cours\u00a0». Seul l’admin reste accessible.';

/**
 * Activer la maintenance coupe tout le site (ERR-03) : la fenêtre de confirmation l'explique en
 * détail, pour ne jamais la déclencher par erreur (par exemple en cherchant une autre fonction).
 */
function AlerteMaintenance() {
  return (
    <Banner tone="danger" titre="Tout le site sera en maintenance">
      Particuliers, espace artisan et sites des artisans afficheront{' '}
      {'«\u00a0Maintenance en cours\u00a0»\u00a0:'} plus de demandes, de devis, de connexion ni de
      paiement. À n’utiliser qu’en cas d’incident grave ou d’intervention planifiée, jamais pour
      activer une autre fonctionnalité. Pensez à la désactiver ensuite.
    </Banner>
  );
}

const description = (nom: NomFlag, active: boolean) =>
  nom !== 'maintenance'
    ? 'Le changement s’applique à tout le site dans la minute.'
    : active
      ? 'Le site redevient accessible à tous dans la minute.'
      : ACTIVER_MAINTENANCE;

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
              description={description(f.nom, f.valeur)}
              danger={f.nom === 'maintenance' && !f.valeur}
              desactive={peut ? undefined : 'Permission requise : referentiels.modifier'}
              onConfirmer={(motif) => changerFlag({ nom: f.nom, valeur: !f.valeur, motif })}
            >
              {f.nom === 'maintenance' && !f.valeur ? <AlerteMaintenance /> : null}
            </ConfirmationAdmin>
          </span>
        </li>
      ))}
    </ul>
  );
}
