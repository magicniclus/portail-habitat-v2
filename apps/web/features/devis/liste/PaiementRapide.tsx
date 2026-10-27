'use client';

import { LIBELLES_MOYEN_PAIEMENT } from '@ph/core/devis';
import { formatEuros } from '@ph/core/format';
import { Button, Feuille, Field, Input, Select } from '@ph/ui';
import { useState, type FormEvent } from 'react';

/** « Payée » choisi dans la liste : moyen et date du règlement du reste dû. */
export function PaiementRapide({
  ouvert,
  onOuvert,
  numero,
  resteCentimes,
  aujourdHui,
  onPayer,
}: {
  ouvert: boolean;
  onOuvert: (o: boolean) => void;
  numero: string;
  resteCentimes: number;
  aujourdHui: string;
  onPayer: (p: { moyen: string; le: string }) => Promise<void>;
}) {
  const [moyen, setMoyen] = useState('virement');
  const [le, setLe] = useState(aujourdHui);
  const [enCours, setEnCours] = useState(false);
  const valider = async (ev: FormEvent) => {
    ev.preventDefault();
    setEnCours(true);
    await onPayer({ moyen, le });
    setEnCours(false);
  };
  return (
    <Feuille open={ouvert} onOpenChange={onOuvert} titre={`Facture ${numero} payée`}>
      <form aria-label="Paiement reçu" onSubmit={valider} className="grid gap-4">
        <p className="m-0 text-base">
          Règlement du reste dû :{' '}
          <strong>{formatEuros(resteCentimes, { decimales: 'toujours' })}</strong>
        </p>
        <Field label="Moyen de paiement">
          <Select value={moyen} onChange={(x) => setMoyen(x.target.value)}>
            {Object.entries(LIBELLES_MOYEN_PAIEMENT).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date du paiement">
          <Input type="date" value={le} max={aujourdHui} onChange={(x) => setLe(x.target.value)} />
        </Field>
        <Button type="submit" disabled={enCours || !le}>
          {enCours ? 'Enregistrement…' : 'Enregistrer le paiement'}
        </Button>
      </form>
    </Feuille>
  );
}
