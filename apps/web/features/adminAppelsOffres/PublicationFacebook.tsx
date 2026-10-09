'use client';

import { Banner, Button, Textarea } from '@ph/ui';
import { useState } from 'react';
import { marquerPublication } from './actionsFacebook';

/** Texte à coller dans le groupe « Trouver chantier » : copier, puis marquer comme publiée. */
export function PublicationFacebook({
  texte,
  departement,
  desactive,
}: {
  texte: string;
  departement: string;
  desactive?: string | undefined;
}) {
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texte);
      setMessage({
        ton: 'succes',
        texte: 'Texte copié : collez-le dans le groupe Trouver chantier.',
      });
    } catch {
      setMessage({ ton: 'danger', texte: 'Copie impossible : sélectionnez le texte à la main.' });
    }
  };
  const marquer = async () => {
    const e = await marquerPublication(departement);
    setMessage(
      e
        ? { ton: 'danger', texte: e }
        : { ton: 'succes', texte: 'Publication du jour marquée comme faite.' },
    );
  };
  return (
    <div className="grid gap-3">
      <Textarea readOnly value={texte} rows={14} aria-label="Texte de la publication" />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void copier()}>Copier le texte</Button>
        <Button
          variant="secondaire"
          disabled={Boolean(desactive)}
          title={desactive}
          onClick={() => void marquer()}
        >
          Marquer comme publiée
        </Button>
      </div>
      {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
    </div>
  );
}
