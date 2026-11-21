'use client';

import type { ClientCarnet } from '@ph/firebase/devis';
import { Banner, Button, Field, Input, Textarea } from '@ph/ui';
import { useState, type FormEvent } from 'react';
import { posterJson } from '@/lib/posterJson';

type Saisie = Omit<ClientCarnet, 'id'>;
const VIDE: Saisie = { nom: '', typeClient: 'particulier', adresse: '' };
const CASES = [
  ['email', 'Email', 'email'],
  ['tel', 'Téléphone', 'tel'],
  ['adresse', 'Adresse postale', 'text'],
  ['complement', 'Complément d’adresse', 'text'],
  ['codePostal', 'Code postal', 'text'],
  ['ville', 'Ville', 'text'],
  ['pays', 'Pays', 'text'],
] as const;
const PRO = ['sirenClient', 'tvaIntraClient'];

/** Fiche de la base clients : création ou modification (serveur, `devis.gerer`). */
export function FormulaireClient({
  client,
  onFini,
}: {
  client?: ClientCarnet;
  onFini: (id: string) => void;
}) {
  const [f, setF] = useState<Saisie>(() => {
    if (!client) return VIDE;
    const { id: _id, ...reste } = client;
    return reste;
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const maj = (p: Partial<Saisie>) => setF((x) => ({ ...x, ...p }));
  const pro = f.typeClient === 'pro';

  const valider = async (ev: FormEvent) => {
    ev.preventDefault();
    setEnCours(true);
    setErreur(null);
    const champs = Object.fromEntries(
      Object.entries(f).filter(([k, v]) => v !== '' && (pro || !PRO.includes(k))),
    );
    const r = await posterJson<{ id: string }>(
      '/api/pro/clients',
      client ? { action: 'modifier', id: client.id, ...champs } : { action: 'creer', ...champs },
    );
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    onFini(r.data.id);
  };

  return (
    <form
      aria-label={client ? 'Modifier le client' : 'Nouveau client'}
      onSubmit={valider}
      className="grid gap-4"
    >
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <Field label="Nom ou raison sociale" requis>
        <Input value={f.nom} onChange={(x) => maj({ nom: x.target.value })} autoComplete="off" />
      </Field>
      <fieldset className="m-0 flex flex-wrap gap-4 border-0 p-0">
        <legend className="mb-1 text-[15px] font-semibold">Type de client</legend>
        {(['particulier', 'pro'] as const).map((t) => (
          <label key={t} className="flex min-h-11 cursor-pointer items-center gap-2 text-base">
            <input
              type="radio"
              name="typeClient"
              checked={f.typeClient === t}
              onChange={() => maj({ typeClient: t })}
              className="size-5"
            />
            {t === 'pro' ? 'Professionnel' : 'Particulier'}
          </label>
        ))}
      </fieldset>
      {pro ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SIREN ou SIRET">
            <Input
              inputMode="numeric"
              value={f.sirenClient ?? ''}
              onChange={(x) => maj({ sirenClient: x.target.value })}
            />
          </Field>
          <Field label="N° de TVA intracommunautaire">
            <Input
              value={f.tvaIntraClient ?? ''}
              onChange={(x) => maj({ tvaIntraClient: x.target.value })}
            />
          </Field>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {CASES.map(([cle, label, type]) => (
          <Field key={cle} label={label}>
            <Input
              type={type}
              value={f[cle] ?? ''}
              onChange={(x) => maj({ [cle]: x.target.value })}
            />
          </Field>
        ))}
      </div>
      <Field label="Notes (privées)">
        <Textarea rows={2} value={f.notes ?? ''} onChange={(x) => maj({ notes: x.target.value })} />
      </Field>
      <Button chargement={enCours} type="submit" disabled={enCours || !f.nom.trim()}>
        {enCours ? 'Enregistrement…' : client ? 'Enregistrer la fiche' : 'Ajouter le client'}
      </Button>
    </form>
  );
}
