'use client';

import { Banner, Button, Field, Select, Textarea } from '@ph/ui';
import { useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { deciderLitige, envoyerMessageLitige } from './actions';

type Sanction = '' | 'rappel' | 'avertissement';

/** Message aux deux parties et décision (maquette « Admin Litiges »). */
export function ActionsLitige({ id, peut }: { id: string; peut: boolean }) {
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [issue, setIssue] = useState<'resolu' | 'clos'>('resolu');
  const [sanction, setSanction] = useState<Sanction>('');

  const envoyer = async () => {
    setEnCours(true);
    const e = await envoyerMessageLitige(id, texte.trim());
    setEnCours(false);
    setErreur(e);
    if (!e) setTexte('');
  };

  return (
    <div className="grid gap-3">
      <Field label="Message aux deux parties">
        <Textarea
          rows={3}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          disabled={!peut}
        />
      </Field>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={envoyer} disabled={!peut || enCours || texte.trim().length < 5}>
          Envoyer
        </Button>
        <ConfirmationAdmin
          libelle="Clore le litige"
          titre="Clore le litige"
          description="La décision est envoyée aux deux parties et inscrite au journal d’audit."
          desactive={peut ? undefined : 'Permission requise : litiges.traiter'}
          onConfirmer={(motif) =>
            deciderLitige({ id, issue, motif, ...(sanction ? { sanction } : {}) })
          }
        >
          <Field label="Issue">
            <Select value={issue} onChange={(e) => setIssue(e.target.value as 'resolu' | 'clos')}>
              <option value="resolu">Résolu à l’amiable</option>
              <option value="clos">Clos sans suite</option>
            </Select>
          </Field>
          <Field label="Conséquence pour l’artisan">
            <Select value={sanction} onChange={(e) => setSanction(e.target.value as Sanction)}>
              <option value="">Aucune</option>
              <option value="rappel">Rappel</option>
              <option value="avertissement">Avertissement</option>
            </Select>
          </Field>
        </ConfirmationAdmin>
      </div>
    </div>
  );
}
