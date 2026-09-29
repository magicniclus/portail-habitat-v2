'use client';

import { LIBELLES_ETAT_PRO, type EtatPro } from '@ph/core/espace-pro';
import { formatFourchette, formatRelatif, formatTel, initiales } from '@ph/core/format';
import type { DemandePro } from '@ph/firebase/pro';
import { Badge, Button, bouton, type Tone } from '@ph/ui';
import { EnvelopeSimpleIcon, PhoneIcon } from '@phosphor-icons/react';

const TONS: Record<EtatPro, Tone> = {
  nouveau: 'accent',
  contacte: 'info',
  converti: 'succes',
  perdu: 'neutre',
};

export type ActionCarte = 'accepter' | 'refuser' | 'prendre';

/** Une demande reçue (maquette Mes Demandes) : coordonnées seulement après acceptation (PRO-02). */
export function CarteDemandePro({
  d,
  uid,
  enCours,
  agir,
}: {
  d: DemandePro;
  uid: string;
  enCours: boolean;
  agir: (action: ActionCarte) => void;
}) {
  const aMoi = d.assigneA?.uid === uid;
  return (
    <li className="grid gap-3 rounded-[12px] border border-trait p-4">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="flex size-11 flex-none items-center justify-center rounded-full bg-accent-200 text-sm font-bold text-accent-800"
        >
          {initiales(d.particulier)}
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <p className="m-0 flex flex-wrap items-center gap-2">
            <strong className="text-[15px]">{d.particulier}</strong>
            <Badge tone={TONS[d.etat]}>{LIBELLES_ETAT_PRO[d.etat]}</Badge>
          </p>
          <h3 className="m-0 text-base">{d.titre}</h3>
          {d.precisions ? <p className="m-0 text-sm text-neutre-800">{d.precisions}</p> : null}
          <p className="m-0 text-[13px] text-neutre-700">
            {d.ville} ({d.codePostal}) ·{' '}
            {formatFourchette(d.estimation.minCentimes, d.estimation.maxCentimes)} ·{' '}
            {formatRelatif(d.proposeeLe)} · {d.reference}
          </p>
          {d.assigneA ? (
            <p className="m-0 text-[13px] font-semibold text-accent-800">
              {aMoi ? 'Vous vous en occupez' : `Pris en charge par ${d.assigneA.nom}`}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {d.etat === 'nouveau' ? (
          <>
            <Button onClick={() => agir('accepter')} disabled={enCours}>
              Accepter la demande
            </Button>
            <Button variant="secondaire" onClick={() => agir('refuser')} disabled={enCours}>
              Refuser
            </Button>
          </>
        ) : null}
        {d.contact ? (
          <>
            <a href={`tel:${d.contact.telephone}`} className={bouton({ variant: 'secondaire' })}>
              <PhoneIcon aria-hidden="true" /> {formatTel(d.contact.telephone)}
            </a>
            <a href={`mailto:${d.contact.email}`} className={bouton({ variant: 'secondaire' })}>
              <EnvelopeSimpleIcon aria-hidden="true" /> Écrire
            </a>
          </>
        ) : null}
        {!aMoi && d.etat !== 'perdu' ? (
          <Button variant="fantome" onClick={() => agir('prendre')} disabled={enCours}>
            Je m&apos;en occupe
          </Button>
        ) : null}
      </div>
    </li>
  );
}
