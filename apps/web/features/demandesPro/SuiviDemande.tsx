'use client';

import { ETAPES_CHOISIES, LIBELLES_ETAPE, type EtapeChoisie } from '@ph/core/espace-pro';
import { formatDate } from '@ph/core/format';
import type { DemandePro } from '@ph/firebase/pro';
import { Banner, Button, Field, Input, Select, Textarea } from '@ph/ui';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

/** `AAAA-MM-JJ` d'une date de relance (midi UTC, voir `majSuiviDemande`). */
const jourIso = (ms?: number) => (ms === undefined ? '' : new Date(ms).toISOString().slice(0, 10));

/**
 * Suivi façon CRM d'une demande acceptée : étape (enregistrée dès le choix), note privée et date de
 * relance. Rien de tout cela n'est visible du particulier.
 */
export function SuiviDemande({ d, recharger }: { d: DemandePro; recharger: () => unknown }) {
  const [note, setNote] = useState(d.suivi.note);
  const [relance, setRelance] = useState(jourIso(d.suivi.relanceLe));
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const etapeActuelle: EtapeChoisie = d.suivi.etape === 'nouvelle' ? 'a_appeler' : d.suivi.etape;

  const enregistrer = async (corps: Record<string, string>) => {
    setEnCours(true);
    setMessage(null);
    const r = await posterJson<null>('/api/pro/demandes/suivi', {
      demandeId: d.demandeId,
      etape: etapeActuelle,
      ...corps,
    });
    setEnCours(false);
    if (!r.ok) return setMessage(r.message);
    await recharger();
  };

  return (
    <div className="grid gap-2 rounded-md border border-trait p-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Étape du suivi" className="min-w-[12rem] flex-1">
          <Select
            value={etapeActuelle}
            disabled={enCours}
            onChange={(e) => void enregistrer({ etape: e.target.value })}
          >
            {ETAPES_CHOISIES.map((e) => (
              <option key={e} value={e}>
                {LIBELLES_ETAPE[e]}
              </option>
            ))}
          </Select>
        </Field>
        {d.suivi.relanceLe !== undefined ? (
          <p className="m-0 pb-3 text-[13px] text-neutre-800">
            Relance le <strong>{formatDate(new Date(d.suivi.relanceLe))}</strong>
          </p>
        ) : null}
      </div>
      {d.suivi.note ? (
        <p className="m-0 text-sm whitespace-pre-line text-neutre-800">{d.suivi.note}</p>
      ) : null}
      <details className="text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
          {d.suivi.note || d.suivi.relanceLe !== undefined
            ? 'Modifier la note et la relance'
            : 'Ajouter une note ou une relance'}
        </summary>
        <form
          className="grid gap-3 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            void enregistrer({ note: note.trim(), relanceLe: relance });
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
          <Field label="Date de relance" aide="Laissez vide pour ne pas relancer.">
            <Input type="date" value={relance} onChange={(e) => setRelance(e.target.value)} />
          </Field>
          {message ? <Banner tone="danger">{message}</Banner> : null}
          <Button type="submit" chargement={enCours} className="justify-self-start">
            Enregistrer le suivi
          </Button>
        </form>
      </details>
    </div>
  );
}
