'use client';

import { Field, Select } from '@ph/ui';
import { useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { agirSurCycle } from './actions';

/** Fiche cycle : pause, exclusion, étape forcée (permission conversion.piloter). */
export function ActionsFiche({
  artisanId,
  enPause,
  exclu,
  sequences,
  peutPiloter,
}: {
  artisanId: string;
  enPause: boolean;
  exclu: boolean;
  sequences: { id: string; nom: string }[];
  peutPiloter: boolean;
}) {
  const [sequenceId, setSequenceId] = useState(sequences[0]?.id ?? '');
  const desactive = peutPiloter ? undefined : 'Permission requise : conversion.piloter';
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmationAdmin
        libelle={enPause ? 'Reprendre la séquence' : 'Mettre en pause'}
        titre={enPause ? 'Reprendre la séquence' : 'Mettre la séquence en pause'}
        description="Aucun email commercial ne part pendant la pause. Les signaux continuent d’être calculés."
        desactive={desactive}
        onConfirmer={(motif) =>
          agirSurCycle({ action: enPause ? 'reprendre' : 'pause', artisanId, motif })
        }
      />
      <ConfirmationAdmin
        libelle={exclu ? 'Réinclure' : 'Exclure des emails commerciaux'}
        titre={exclu ? 'Réinclure dans les emails commerciaux' : 'Exclure des emails commerciaux'}
        description="Les emails transactionnels et de sécurité continuent dans tous les cas."
        danger={!exclu}
        desactive={desactive}
        onConfirmer={(motif) =>
          agirSurCycle({ action: exclu ? 'inclure' : 'exclure', artisanId, motif })
        }
      />
      <ConfirmationAdmin
        libelle="Forcer une étape"
        titre="Forcer une séquence"
        description="L’entreprise repart du début de la séquence choisie, au prochain créneau d’envoi."
        desactive={desactive}
        onConfirmer={(motif) => agirSurCycle({ action: 'forcer', artisanId, sequenceId, motif })}
      >
        <Field label="Séquence">
          <Select value={sequenceId} onChange={(e) => setSequenceId(e.target.value)}>
            {sequences.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.nom}
              </option>
            ))}
          </Select>
        </Field>
      </ConfirmationAdmin>
    </div>
  );
}
