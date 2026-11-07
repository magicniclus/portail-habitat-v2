'use client';

import { LIBELLES_ETAT_PRO, type EtatPro } from '@ph/core/espace-pro';
import { formatFourchette, formatRelatif, formatTel, initiales } from '@ph/core/format';
import { LIBELLES_NIVEAU } from '@ph/core/partenaires';
import type { DemandePro } from '@ph/firebase/pro';
import { Badge, bouton, BoutonAction, type Tone } from '@ph/ui';
import Link from 'next/link';
import { EnvelopeSimpleIcon, PhoneIcon } from '@phosphor-icons/react';
import { routes } from '@/lib/routes';
import { ContesterAppelOffres } from './ContesterAppelOffres';
import { EtapeDemande, NoteRelance } from './SuiviDemande';

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
  peutDevis,
  enCours,
  agir,
  recharger,
}: {
  d: DemandePro;
  uid: string;
  peutDevis: boolean;
  enCours: boolean;
  agir: (action: ActionCarte) => unknown;
  /** Relecture de la liste après une mise à jour du suivi. */
  recharger: () => unknown;
}) {
  const aMoi = d.assigneA?.uid === uid;
  const lieu = d.codePostal ? `${d.ville ? `${d.ville} ` : ''}(${d.codePostal})` : d.ville;
  return (
    <li className="overflow-hidden rounded-[16px] border border-trait bg-blanc">
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-11 flex-none items-center justify-center rounded-full bg-accent-200 text-sm font-bold text-accent-800"
            >
              {initiales(d.particulier)}
            </span>
            <div className="grid min-w-0 gap-0.5">
              <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                <strong className="text-base">{d.particulier}</strong>
                {/* Avant acceptation, l'état ; ensuite, la pastille d'étape du suivi le remplace. */}
                {d.contact ? null : <Badge tone={TONS[d.etat]}>{LIBELLES_ETAT_PRO[d.etat]}</Badge>}
                {d.origine ? (
                  <Badge tone="neutre">
                    {d.origine === 'fiche' ? 'Via votre fiche' : 'Via votre site'}
                  </Badge>
                ) : null}
              </p>
              <p className="m-0 text-[13px] text-neutre-700">
                {[lieu, formatRelatif(d.proposeeLe), d.reference].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          {d.contact ? <EtapeDemande d={d} recharger={recharger} /> : null}
        </div>

        <div className="grid gap-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="m-0 text-[17px] leading-snug">{d.titre}</h3>
            {d.estimation ? (
              <p className="m-0 text-sm font-semibold text-neutre-800">
                {formatFourchette(d.estimation.minCentimes, d.estimation.maxCentimes)}
              </p>
            ) : null}
          </div>
          {d.niveau ? (
            <p className="m-0">
              <Badge tone={d.niveau === 'A' ? 'succes' : d.niveau === 'B' ? 'info' : 'neutre'}>
                {LIBELLES_NIVEAU[d.niveau]}
              </Badge>
            </p>
          ) : null}
          {d.aides ? (
            <p className="m-0 rounded-[10px] bg-succes-fond px-3.5 py-2.5 text-sm text-succes">
              <strong>Aides estimées du client :</strong> {d.aides}
            </p>
          ) : null}
          {d.precisions ? (
            <p className="m-0 text-[15px] leading-6 text-neutre-800">{d.precisions}</p>
          ) : null}
          {d.details.length ? (
            <dl aria-label="Détails du projet" className="m-0 grid gap-2.5">
              {d.details.map((x) => (
                <div
                  key={x.question}
                  className="grid gap-0.5 border-l-[3px] border-accent-300 pl-3"
                >
                  <dt className="text-xs font-semibold tracking-wide text-neutre-700 uppercase">
                    {x.question}
                  </dt>
                  <dd className="m-0 text-[15px] leading-6 whitespace-pre-line text-texte">
                    {x.reponse}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {d.contact ? <NoteRelance d={d} recharger={recharger} /> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-trait bg-neutre-100/60 px-4 py-3 sm:px-5">
        {d.etat === 'nouveau' ? (
          <>
            <BoutonAction onClick={() => agir('accepter')} disabled={enCours}>
              Accepter la demande
            </BoutonAction>
            <BoutonAction variant="secondaire" onClick={() => agir('refuser')} disabled={enCours}>
              Refuser
            </BoutonAction>
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
            {peutDevis && d.statut !== 'devis_accepte' ? (
              <Link
                href={
                  `${routes.proDevisNouveau}?demande=${d.demandeId}` as typeof routes.proDevisNouveau
                }
                className={bouton()}
              >
                Créer un devis
              </Link>
            ) : null}
          </>
        ) : null}
        {d.contestable ? (
          <ContesterAppelOffres appelOffresId={d.contestable.appelOffresId} />
        ) : null}
        <span className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {d.assigneA ? (
            <span className="text-[13px] font-semibold text-accent-800">
              {aMoi ? 'Vous vous en occupez' : `Pris en charge par ${d.assigneA.nom}`}
            </span>
          ) : null}
          {!aMoi && d.etat !== 'perdu' ? (
            <BoutonAction variant="fantome" onClick={() => agir('prendre')} disabled={enCours}>
              Je m&apos;en occupe
            </BoutonAction>
          ) : null}
        </span>
      </div>
    </li>
  );
}
