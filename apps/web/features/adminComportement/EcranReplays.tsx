'use client';

import { formatDureeVisite, LIBELLES_ISSUE_REPLAY } from '@ph/core/comportement';
import { formatRelatif } from '@ph/core/format';
import type { ReplayListe, ReplayLu } from '@ph/firebase/admin-serveur';
import { Badge, EmptyState } from '@ph/ui';
import { useState, useTransition } from 'react';
import { lireReplayAdmin } from './actions';
import { LecteurReplay } from './LecteurReplay';

const TONS = {
  conversion: 'succes',
  rage: 'danger',
  abandon: 'attention',
  sortie: 'neutre',
} as const;

/** Onglet « Replays » : sessions enregistrées, chaque lecture est journalisée. */
export function EcranReplays({
  chemin,
  replays,
  maintenant,
}: {
  chemin: string;
  replays: ReplayListe[];
  maintenant: number;
}) {
  const [choisi, setChoisi] = useState<{ id: string; replay: ReplayLu } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const ouvrir = (vueId: string) =>
    demarrer(async () => {
      const r = await lireReplayAdmin(vueId);
      if (typeof r === 'string') return setErreur(r);
      setErreur(null);
      setChoisi({ id: vueId, replay: r });
    });
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
      {choisi ? (
        <LecteurReplay key={choisi.id} chemin={chemin} replay={choisi.replay} />
      ) : (
        <EmptyState titre="Choisissez une session">
          {erreur ?? 'Le replay rejoue le curseur, les clics et le défilement sur la page réelle.'}
        </EmptyState>
      )}
      <section
        aria-labelledby="sessions-replays"
        className="flex flex-col gap-1 rounded-card border border-trait bg-blanc p-3.5"
      >
        <h2 id="sessions-replays" className="m-0 mb-1.5 text-base">
          Sessions enregistrées
        </h2>
        {replays.length === 0 ? (
          <p className="m-0 text-sm text-neutre-700">
            Aucun replay pour cette page et cet appareil.
          </p>
        ) : (
          replays.map((r) => (
            <button
              key={r.vueId}
              type="button"
              disabled={enCours}
              aria-pressed={choisi?.id === r.vueId}
              onClick={() => ouvrir(r.vueId)}
              className="flex min-h-11 w-full cursor-pointer flex-col items-start gap-0.5 rounded-md border-0 bg-transparent px-2 py-2 text-left hover:bg-neutre-100 aria-pressed:bg-neutre-100"
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="font-semibold">{formatRelatif(r.createdAt, maintenant)}</span>
                <Badge tone={TONS[r.issue]}>{LIBELLES_ISSUE_REPLAY[r.issue]}</Badge>
              </span>
              <span className="text-xs text-neutre-700">
                {r.appareil} · {formatDureeVisite(r.duree)} · {r.source}
              </span>
            </button>
          ))
        )}
        <p className="m-0 mt-1 text-xs text-neutre-700">
          Conservés 30 jours. Aucune saisie ni donnée personnelle enregistrée. Chaque lecture est
          journalisée (comportement.replays).
        </p>
      </section>
    </div>
  );
}
