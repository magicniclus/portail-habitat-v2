'use client';

import { LIBELLES_TYPE_RGPD } from '@ph/core/admin';
import { Banner, Button, Field, Input, Select } from '@ph/ui';
import { useState } from 'react';
import { enregistrerDemandeRgpd } from './actions';

type Type = keyof typeof LIBELLES_TYPE_RGPD;

/** Demande reçue par email ou courrier, enregistrée avec sa date de réception. */
export function NouvelleDemandeRgpd({ aujourdhui }: { aujourdhui: string }) {
  const [type, setType] = useState<Type>('acces');
  const [email, setEmail] = useState('');
  const [recueLe, setRecueLe] = useState(aujourdhui);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const envoyer = async () => {
    const e = await enregistrerDemandeRgpd({ type, email, recueLe });
    setMessage(e ? { ok: false, texte: e } : { ok: true, texte: 'Demande enregistrée.' });
    if (!e) setEmail('');
  };
  return (
    <fieldset
      aria-label="Nouvelle demande"
      className="grid gap-3 rounded-[12px] border border-trait bg-blanc p-4"
    >
      <legend className="font-bold">Enregistrer une demande reçue</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as Type)}>
            {Object.entries(LIBELLES_TYPE_RGPD).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Email de la personne">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Reçue le">
          <Input type="date" value={recueLe} onChange={(e) => setRecueLe(e.target.value)} />
        </Field>
      </div>
      {message ? <Banner tone={message.ok ? 'succes' : 'danger'}>{message.texte}</Banner> : null}
      <Button onClick={envoyer} disabled={!email.includes('@')}>
        Enregistrer
      </Button>
    </fieldset>
  );
}
