'use client';

import { LIBELLES_STATUT_STUDIO, type StatutProjetStudio } from '@ph/core/studio';
import { Banner, Button } from '@ph/ui';
import { useState, useTransition } from 'react';
import { relancer } from './actions';

const ETAPES: StatutProjetStudio[] = ['transcription', 'montage', 'captures', 'rendu', 'pret'];

/** Avancement du robot : transcription, montage, captures, rendu ; relance en cas d'échec. */
export function SuiviTravail({
  projetId,
  statut,
  erreur,
}: {
  projetId: string;
  statut: StatutProjetStudio;
  erreur: string | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const courant = ETAPES.indexOf(statut);
  return (
    <section
      aria-labelledby="suivi-studio"
      className="grid gap-3 rounded-card border border-trait bg-blanc p-4"
    >
      <h2 id="suivi-studio" className="m-0 text-lg">
        3. Fabrication
      </h2>
      <ol className="m-0 flex list-none flex-wrap gap-2 p-0" aria-live="polite">
        {ETAPES.map((e, i) => (
          <li
            key={e}
            aria-current={i === courant ? 'step' : undefined}
            className={`rounded-full px-3 py-1.5 text-sm ${i < courant || statut === 'pret' ? 'bg-succes-fond text-succes' : i === courant ? 'bg-accent-100 font-semibold text-accent-800' : 'bg-neutre-100 text-neutre-700'}`}
          >
            {i < courant || statut === 'pret' ? '✓ ' : i === courant ? '… ' : ''}
            {LIBELLES_STATUT_STUDIO[e]}
          </li>
        ))}
      </ol>
      {statut === 'erreur' ? (
        <Banner tone="danger" titre="Une étape a échoué">
          {erreur}
        </Banner>
      ) : null}
      {message ? <Banner tone="danger">{message}</Banner> : null}
      {statut === 'erreur' ? (
        <div>
          <Button
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                const r = await relancer({ projetId });
                setMessage(r.ok ? null : r.message);
              })
            }
          >
            Relancer
          </Button>
        </div>
      ) : null}
    </section>
  );
}
