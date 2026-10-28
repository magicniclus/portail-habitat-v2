'use client';

import { Button, Field, Textarea } from '@ph/ui';
import { useState } from 'react';

/** Question de précision de l'IA (IA_SITE §3.2) : réponse courte, ou « Passer ». */
export function QuestionIa({
  question,
  enCours,
  onRepondre,
  onPasser,
}: {
  question: string;
  enCours: boolean;
  onRepondre: (reponse: string) => void;
  onPasser: () => void;
}) {
  const [reponse, setReponse] = useState('');
  return (
    <form
      className="grid gap-3 rounded-[12px] border border-trait p-3 break-words [grid-template-columns:minmax(0,1fr)]"
      onSubmit={(e) => {
        e.preventDefault();
        onRepondre(reponse);
      }}
    >
      <Field label={question}>
        <Textarea value={reponse} maxLength={500} onChange={(e) => setReponse(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={enCours || !reponse.trim()}>
          Répondre
        </Button>
        <Button variant="fantome" onClick={onPasser}>
          Passer
        </Button>
      </div>
    </form>
  );
}
