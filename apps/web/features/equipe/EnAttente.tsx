'use client';

import { formatDate, formatRelatif } from '@ph/core/format';
import { LIBELLES_ROLE } from '@ph/core/equipe';
import type { Equipe } from '@ph/firebase/pro';
import { Badge, Banner, Button } from '@ph/ui';
import { useActionEquipe } from './useActionEquipe';

/** Invitations en cours (elles occupent un siège) et demandes pour rejoindre (COMPTES §4.2, §4.4). */
export function EnAttente({
  artisanId,
  invitations,
  demandes,
}: {
  artisanId: string;
  invitations: Equipe['invitations'];
  demandes: Equipe['demandesAcces'];
}) {
  const { appeler, erreur, enCours } = useActionEquipe();
  if (!invitations.length && !demandes.length) return null;
  return (
    <div className="grid gap-3">
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {invitations.length ? (
        <ul aria-label="Invitations en attente" className="m-0 grid list-none gap-2 p-0">
          {invitations.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-dashed border-trait p-3.5"
            >
              <span className="grid min-w-0">
                <strong className="text-[15px] break-all">{i.email}</strong>
                <span className="text-[13px] text-neutre-700">
                  {LIBELLES_ROLE[i.role]} · expire le {formatDate(i.expireLe)}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone="info">En attente</Badge>
                <Button
                  variant="fantome"
                  taille="sm"
                  disabled={enCours}
                  onClick={() => void appeler('revoquer', { artisanId, invitationId: i.id })}
                >
                  Annuler
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {demandes.length ? (
        <ul aria-label="Demandes pour rejoindre" className="m-0 grid list-none gap-2 p-0">
          {demandes.map((d) => (
            <li key={d.id} className="grid gap-2 rounded-[12px] border border-trait p-3.5">
              <span className="grid">
                <strong className="text-[15px]">{d.nom} souhaite rejoindre l&apos;équipe</strong>
                <span className="text-[13px] text-neutre-700">{formatRelatif(d.le)}</span>
              </span>
              {d.message ? <p className="m-0 text-sm">{d.message}</p> : null}
              <span className="flex flex-wrap gap-2">
                <Button
                  taille="sm"
                  disabled={enCours}
                  onClick={() =>
                    void appeler('demande-acces', {
                      artisanId,
                      demandeId: d.id,
                      accepter: true,
                      role: 'collaborateur',
                    })
                  }
                >
                  Accepter comme collaborateur
                </Button>
                <Button
                  variant="secondaire"
                  taille="sm"
                  disabled={enCours}
                  onClick={() =>
                    void appeler('demande-acces', { artisanId, demandeId: d.id, accepter: false })
                  }
                >
                  Refuser
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
