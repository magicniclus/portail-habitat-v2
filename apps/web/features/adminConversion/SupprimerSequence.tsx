'use client';

import { Field, Input, Select } from '@ph/ui';
import { useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { supprimerSequence } from './actions';

/** Suppression : identifiant retapé, motif, devenir des entreprises en cours (CONVERSION §9). */
export function SupprimerSequence({
  id,
  enCours,
  autres,
  desactive,
}: {
  id: string;
  enCours: number;
  autres: { id: string; nom: string }[];
  desactive?: string | undefined;
}) {
  const [devenir, setDevenir] = useState<'arret' | 'bascule'>('arret');
  const [vers, setVers] = useState(autres[0]?.id ?? '');
  const [confirmation, setConfirmation] = useState('');
  return (
    <ConfirmationAdmin
      libelle="Supprimer"
      titre={`Supprimer ${id} ?`}
      description={`${enCours} entreprise${enCours > 1 ? 's sont' : ' est'} en cours dans cette séquence. Les traces et les statistiques passées sont conservées.`}
      danger
      desactive={desactive}
      onConfirmer={(motif) =>
        supprimerSequence({
          id,
          confirmation: confirmation.trim(),
          devenir,
          ...(devenir === 'bascule' ? { versSequence: vers } : {}),
          motif,
        })
      }
    >
      <Field label="Entreprises en cours">
        <Select
          value={devenir === 'arret' ? 'arret' : vers}
          onChange={(e) => {
            if (e.target.value === 'arret') setDevenir('arret');
            else {
              setDevenir('bascule');
              setVers(e.target.value);
            }
          }}
        >
          <option value="arret">Arrêter leurs envois</option>
          {autres.map((a) => (
            <option key={a.id} value={a.id}>
              Basculer vers {a.id} · {a.nom}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={`Tapez ${id} pour confirmer`}>
        <Input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
        />
      </Field>
    </ConfirmationAdmin>
  );
}
