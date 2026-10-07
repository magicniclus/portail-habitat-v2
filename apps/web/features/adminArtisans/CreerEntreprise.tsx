'use client';

import { Field, Input, Select } from '@ph/ui';
import { useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { creerEntreprise } from './actionsEntreprise';

/** « Créer une entreprise non revendiquée » (COMPTES §3.5) : SIREN obligatoire, hors ligne. */
export function CreerEntreprise({
  metiers,
  autorise,
}: {
  metiers: { id: string; nom: string }[];
  autorise: boolean;
}) {
  const [siren, setSiren] = useState('');
  const [metier, setMetier] = useState(metiers[0]?.id ?? '');
  const [rayon, setRayon] = useState(30);
  const [email, setEmail] = useState('');
  return (
    <ConfirmationAdmin
      libelle="Créer une entreprise"
      titre="Créer une entreprise non revendiquée"
      description="Données lues au répertoire SIRENE. Aucun membre ; la fiche reste hors ligne tant que l’entreprise n’est pas revendiquée."
      desactive={autorise ? undefined : 'Permission requise : artisans.creer'}
      onConfirmer={(motif) =>
        creerEntreprise({
          siren: siren.replace(/\s/g, ''),
          metierPrincipal: metier,
          metiers: [metier],
          rayonKm: rayon,
          ...(email.trim() ? { emailDirigeant: email.trim() } : {}),
          motif,
        })
      }
    >
      <Field label="SIREN">
        <Input
          inputMode="numeric"
          autoComplete="off"
          value={siren}
          onChange={(e) => setSiren(e.target.value)}
        />
      </Field>
      <Field label="Métier principal">
        <Select value={metier} onChange={(e) => setMetier(e.target.value)}>
          {metiers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Rayon d’intervention (km)">
        <Input
          type="number"
          min={10}
          max={100}
          value={rayon}
          onChange={(e) => setRayon(Number(e.target.value))}
        />
      </Field>
      <Field label="Email du dirigeant (facultatif : invitation à revendiquer)">
        <Input
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
    </ConfirmationAdmin>
  );
}
