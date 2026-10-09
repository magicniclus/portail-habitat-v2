'use client';

import { Banner, Button, Field, Input, Select, Textarea } from '@ph/ui';
import { useState } from 'react';
import { publierAnnonce } from './actions';

type Cible = 'particuliers' | 'pros' | 'tous';
type Ton = 'info' | 'attention' | 'premium';

/** Nouvelle annonce in-app : public, ton, période. */
export function FormulaireAnnonce({ aujourdhui, peut }: { aujourdhui: string; peut: boolean }) {
  const [titre, setTitre] = useState('');
  const [texte, setTexte] = useState('');
  const [cible, setCible] = useState<Cible>('pros');
  const [ton, setTon] = useState<Ton>('info');
  const [debut, setDebut] = useState(aujourdhui);
  const [fin, setFin] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const envoyer = async () => {
    const e = await publierAnnonce({ titre, texte, cible, ton, debut, ...(fin ? { fin } : {}) });
    setMessage(e ? { ok: false, texte: e } : { ok: true, texte: 'Annonce publiée.' });
    if (!e) {
      setTitre('');
      setTexte('');
    }
  };

  return (
    <fieldset
      aria-label="Nouvelle annonce"
      className="grid gap-3 rounded-[12px] border border-trait bg-blanc p-4"
      disabled={!peut}
    >
      <legend className="font-bold">Nouvelle annonce</legend>
      <Field label="Titre">
        <Input value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={120} />
      </Field>
      <Field label="Texte">
        <Textarea
          rows={3}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          maxLength={600}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Public">
          <Select value={cible} onChange={(e) => setCible(e.target.value as Cible)}>
            <option value="pros">Artisans</option>
            <option value="particuliers">Particuliers</option>
            <option value="tous">Tous</option>
          </Select>
        </Field>
        <Field label="Ton">
          <Select value={ton} onChange={(e) => setTon(e.target.value as Ton)}>
            <option value="info">Information</option>
            <option value="attention">Attention</option>
            <option value="premium">Premium</option>
          </Select>
        </Field>
        <Field label="Début">
          <Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
        </Field>
        <Field label="Fin (facultative)">
          <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
        </Field>
      </div>
      {message ? <Banner tone={message.ok ? 'succes' : 'danger'}>{message.texte}</Banner> : null}
      <Button onClick={envoyer} disabled={titre.trim().length < 3 || texte.trim().length < 3}>
        Publier l’annonce
      </Button>
    </fieldset>
  );
}
