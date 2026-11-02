'use client';

import {
  ETAPES_CHOISIES,
  LIBELLES_ETAPE,
  type EtapeChoisie,
  type EtapeSuivi,
} from '@ph/core/espace-pro';
import { formatDate } from '@ph/core/format';
import type { DemandePro } from '@ph/firebase/pro';
import { Banner, Button, cn, Field, Input, Textarea } from '@ph/ui';
import { BellIcon, CaretDownIcon, NotePencilIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

/** `AAAA-MM-JJ` d'une date de relance (midi UTC, voir `majSuiviDemande`). */
const jourIso = (ms?: number) => (ms === undefined ? '' : new Date(ms).toISOString().slice(0, 10));

/** Couleur de la pastille d'étape : du « à faire » au « conclu ». */
const COULEURS: Record<EtapeSuivi, string> = {
  nouvelle: 'border-accent-300 bg-accent-100 text-accent-800',
  a_appeler: 'border-accent-300 bg-accent-100 text-accent-800',
  appele: 'border-info/40 bg-info-fond text-info',
  rdv: 'border-info/40 bg-info-fond text-info',
  devis_a_faire: 'border-attention/40 bg-attention-fond text-attention',
  devis_envoye: 'border-attention/40 bg-attention-fond text-attention',
  gagne: 'border-succes/40 bg-succes-fond text-succes',
  perdu: 'border-trait bg-neutre-100 text-neutre-700',
};

const etapeAffichee = (d: DemandePro): EtapeChoisie =>
  d.suivi.etape === 'nouvelle' ? 'a_appeler' : d.suivi.etape;

async function enregistrerSuivi(d: DemandePro, corps: Record<string, string>) {
  return posterJson<null>('/api/pro/demandes/suivi', {
    demandeId: d.demandeId,
    etape: etapeAffichee(d),
    ...corps,
  });
}

/**
 * Pastille d'étape du suivi (façon CRM) : liste native compacte, enregistrée dès le choix.
 * Police de 16 px sur téléphone (pas de zoom à la sélection, MOBILE §5).
 */
export function EtapeDemande({ d, recharger }: { d: DemandePro; recharger: () => unknown }) {
  const [enCours, setEnCours] = useState(false);
  const etape = etapeAffichee(d);
  return (
    <span className="relative inline-flex">
      <select
        aria-label="Étape du suivi"
        value={etape}
        disabled={enCours}
        onChange={async (e) => {
          setEnCours(true);
          await enregistrerSuivi(d, { etape: e.target.value });
          await recharger();
          setEnCours(false);
        }}
        className={cn(
          'min-h-11 cursor-pointer appearance-none rounded-pill border py-1 pr-9 pl-4 text-base font-semibold sm:text-sm',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60',
          COULEURS[etape],
        )}
      >
        {ETAPES_CHOISIES.map((x) => (
          <option key={x} value={x}>
            {LIBELLES_ETAPE[x]}
          </option>
        ))}
      </select>
      <CaretDownIcon
        size={14}
        weight="bold"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
      />
    </span>
  );
}

/** Note privée et relance : affichées sur la carte, modifiables dans un panneau dépliant. */
export function NoteRelance({ d, recharger }: { d: DemandePro; recharger: () => unknown }) {
  const [ouvert, setOuvert] = useState(false);
  const [note, setNote] = useState(d.suivi.note);
  const [relance, setRelance] = useState(jourIso(d.suivi.relanceLe));
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rempli = Boolean(d.suivi.note) || d.suivi.relanceLe !== undefined;

  return (
    <div className="grid gap-2.5">
      {rempli ? (
        <div className="grid gap-1.5 rounded-[10px] bg-neutre-100 px-3.5 py-2.5 text-sm">
          {d.suivi.relanceLe !== undefined ? (
            <p className="m-0 flex items-center gap-1.5 font-semibold text-texte">
              <BellIcon size={16} aria-hidden="true" />
              Relance le {formatDate(new Date(d.suivi.relanceLe))}
            </p>
          ) : null}
          {d.suivi.note ? (
            <p className="m-0 whitespace-pre-line text-neutre-800">{d.suivi.note}</p>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        aria-expanded={ouvert}
        onClick={() => setOuvert((o) => !o)}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 self-start border-0 bg-transparent p-0 text-sm font-semibold text-accent-800 underline-offset-4 hover:underline"
      >
        <NotePencilIcon size={18} aria-hidden="true" />
        {rempli ? 'Modifier la note et la relance' : 'Ajouter une note ou une relance'}
      </button>
      {ouvert ? (
        <form
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)] sm:items-start"
          onSubmit={async (e) => {
            e.preventDefault();
            setEnCours(true);
            setMessage(null);
            const r = await enregistrerSuivi(d, { note: note.trim(), relanceLe: relance });
            setEnCours(false);
            if (!r.ok) return setMessage(r.message);
            setOuvert(false);
            await recharger();
          }}
        >
          <Field label="Note privée" aide="Visible par votre équipe seulement.">
            <Textarea
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <Field label="Date de relance" aide="Vide : pas de relance.">
            <Input type="date" value={relance} onChange={(e) => setRelance(e.target.value)} />
          </Field>
          {message ? (
            <div className="sm:col-span-2">
              <Banner tone="danger">{message}</Banner>
            </div>
          ) : null}
          <Button type="submit" chargement={enCours} className="justify-self-start">
            Enregistrer le suivi
          </Button>
        </form>
      ) : null}
    </div>
  );
}
