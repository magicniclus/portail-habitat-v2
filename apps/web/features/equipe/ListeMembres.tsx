'use client';

import { LIBELLES_ROLE, peut, peutQuitter, type Membre } from '@ph/core/equipe';
import { formatRelatif } from '@ph/core/format';
import type { MembreEquipe } from '@ph/firebase/pro';
import { Badge, Banner, Button, ConfirmDialog } from '@ph/ui';
import { useActionEquipe } from './useActionEquipe';

const ROLES_MODIFIABLES = ['gerant', 'collaborateur', 'comptable'] as const;

/**
 * Membres de l'équipe : changement de rôle et retrait pour qui gère (EQU-03 : rien pour un
 * collaborateur) ; « Quitter l'entreprise », refusé au dernier propriétaire (EQU-04).
 */
export function ListeMembres({
  artisanId,
  membres,
  moi,
  moiUid,
}: {
  artisanId: string;
  membres: MembreEquipe[];
  moi: Membre;
  moiUid: string;
}) {
  const { appeler, erreur, enCours } = useActionEquipe();
  const quittable = peutQuitter(membres, moiUid);

  return (
    <div className="grid gap-3">
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <ul aria-label="Membres" className="m-0 grid list-none gap-2.5 p-0">
        {membres.map((m) => {
          const cestMoi = m.uid === moiUid;
          const gerable =
            !cestMoi &&
            m.role !== 'proprietaire' &&
            peut(moi, 'membres.gerer', { roleCible: m.role });
          return (
            <li key={m.uid} className="grid gap-2.5 rounded-[12px] border border-trait p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="grid min-w-0">
                  <strong className="text-[15px]">
                    {m.nom}
                    {cestMoi ? ' (vous)' : ''}
                  </strong>
                  <span className="text-[13px] break-all text-neutre-700">{m.email}</span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  <Badge tone={m.role === 'proprietaire' ? 'accent' : 'neutre'}>
                    {LIBELLES_ROLE[m.role]}
                  </Badge>
                  {m.statut === 'suspendu' ? <Badge tone="attention">Suspendu</Badge> : null}
                </span>
              </div>
              {m.derniereActivite ? (
                <p className="m-0 text-[13px] text-neutre-700">
                  Actif {formatRelatif(m.derniereActivite)}
                </p>
              ) : null}
              {gerable ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`role-${m.uid}`}>
                    Rôle de {m.nom}
                  </label>
                  <select
                    id={`role-${m.uid}`}
                    value={m.role}
                    disabled={enCours}
                    onChange={(e) =>
                      void appeler('modifier', { artisanId, uid: m.uid, role: e.target.value })
                    }
                    className="min-h-11 cursor-pointer rounded-md border border-trait bg-blanc px-3 text-base"
                  >
                    {ROLES_MODIFIABLES.filter((r) =>
                      peut(moi, 'membres.gerer', { roleCible: r }),
                    ).map((r) => (
                      <option key={r} value={r}>
                        {LIBELLES_ROLE[r]}
                      </option>
                    ))}
                  </select>
                  <ConfirmDialog
                    titre={`Retirer ${m.nom} de l'équipe ?`}
                    libelleConfirmer="Retirer"
                    danger
                    declencheur={
                      <Button variant="fantome" taille="sm">
                        Retirer
                      </Button>
                    }
                    onConfirmer={async () => {
                      await appeler('retirer', { artisanId, uid: m.uid });
                    }}
                  >
                    Son accès à l&apos;espace pro est coupé immédiatement.
                  </ConfirmDialog>
                </div>
              ) : null}
              {cestMoi ? (
                quittable ? (
                  <ConfirmDialog
                    titre="Quitter l'entreprise ?"
                    libelleConfirmer="Quitter"
                    danger
                    declencheur={
                      <Button variant="fantome" taille="sm">
                        Quitter l&apos;entreprise
                      </Button>
                    }
                    onConfirmer={async () => {
                      // La page se recharge sans entreprise active (retour au tableau de bord).
                      await appeler('quitter', { artisanId });
                    }}
                  >
                    Vous perdrez l&apos;accès à l&apos;espace de cette entreprise.
                  </ConfirmDialog>
                ) : (
                  <p className="m-0 text-[13px] text-neutre-800">
                    Vous êtes le dernier propriétaire : transférez la propriété avant de quitter
                    l&apos;entreprise.
                  </p>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
