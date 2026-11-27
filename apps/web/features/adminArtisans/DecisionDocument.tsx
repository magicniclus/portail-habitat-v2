'use client';

import { Field, Input } from '@ph/ui';
import { useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { deciderDocument } from './actions';

/** Valider (avec la date de fin lue sur le document) ou refuser un document déposé. */
export function DecisionDocument({
  artisanId,
  documentId,
  libelle,
}: {
  artisanId: string;
  documentId: string;
  libelle: string;
}) {
  const [fin, setFin] = useState('');
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmationAdmin
        libelle="Valider"
        titre={`Valider : ${libelle}`}
        description="Le label correspondant apparaît sur la fiche ; l’artisan est prévenu."
        onConfirmer={(motif) =>
          deciderDocument(artisanId, documentId, 'valide', motif, fin || undefined)
        }
      >
        <Field label="Valable jusqu’au (si indiqué sur le document)">
          <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
        </Field>
      </ConfirmationAdmin>
      <ConfirmationAdmin
        libelle="Refuser"
        titre={`Refuser : ${libelle}`}
        description="Le motif est envoyé à l’artisan, qui peut déposer un nouveau document."
        danger
        onConfirmer={(motif) => deciderDocument(artisanId, documentId, 'refuse', motif)}
      />
    </div>
  );
}
