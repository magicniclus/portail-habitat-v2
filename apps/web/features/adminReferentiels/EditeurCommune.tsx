'use client';

import { Banner, Button, Field, Input, Textarea } from '@ph/ui';
import { useState, useTransition } from 'react';
import { enregistrerTexteCommune } from './actionsCommunes';

type Textes = {
  intro: string;
  bati: string;
  secteurs: string;
  risques: string;
  frequents: { titre: string; texte: string }[];
};
const CHAMPS = [
  ['intro', 'Introduction'],
  ['bati', 'Le bâti'],
  ['secteurs', 'Les secteurs'],
  ['risques', 'Les risques'],
] as const;

/** Textes SEO d'une page commune : chaque enregistrement crée une version (motif obligatoire). */
export function EditeurCommune({
  slug,
  nom,
  initial,
  version,
  peut,
}: {
  slug: string;
  nom: string;
  initial: Textes;
  version: number;
  peut: boolean;
}) {
  const [t, setT] = useState(initial);
  const [motif, setMotif] = useState('');
  const [resultat, setResultat] = useState<{ ok: boolean; message: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const frequent = (i: number, champ: 'titre' | 'texte', valeur: string) =>
    setT({ ...t, frequents: t.frequents.map((f, j) => (j === i ? { ...f, [champ]: valeur } : f)) });
  return (
    <form
      className="grid gap-4"
      aria-label={`Textes de ${nom}`}
      onSubmit={(ev) => {
        ev.preventDefault();
        demarrer(async () => setResultat(await enregistrerTexteCommune({ slug, ...t, motif })));
      }}
    >
      <p className="m-0 text-sm text-neutre-700">
        {version ? `Version ${version} en ligne.` : 'Textes d’origine (docs/data/communes.json).'}
      </p>
      {CHAMPS.map(([id, libelle]) => (
        <Field key={id} label={libelle} aide={`${t[id].length}/1500`}>
          <Textarea
            rows={4}
            maxLength={1500}
            disabled={!peut}
            value={t[id]}
            onChange={(e) => setT({ ...t, [id]: e.target.value })}
          />
        </Field>
      ))}
      <fieldset className="m-0 grid gap-3 border-0 p-0">
        <legend className="mb-2 font-semibold">Points fréquents</legend>
        {t.frequents.map((f, i) => (
          <div key={i} className="grid gap-2 rounded-control border border-trait p-3">
            <Field label={`Titre ${i + 1}`}>
              <Input
                maxLength={120}
                disabled={!peut}
                value={f.titre}
                onChange={(e) => frequent(i, 'titre', e.target.value)}
              />
            </Field>
            <Field label={`Texte ${i + 1}`}>
              <Textarea
                rows={2}
                maxLength={600}
                disabled={!peut}
                value={f.texte}
                onChange={(e) => frequent(i, 'texte', e.target.value)}
              />
            </Field>
          </div>
        ))}
      </fieldset>
      {peut ? (
        <>
          <Field label="Motif (obligatoire)">
            <Input value={motif} onChange={(e) => setMotif(e.target.value)} />
          </Field>
          {resultat ? (
            <Banner tone={resultat.ok ? 'succes' : 'danger'}>{resultat.message}</Banner>
          ) : null}
          <Button type="submit" disabled={enCours || motif.trim().length < 5}>
            Publier la nouvelle version
          </Button>
        </>
      ) : (
        <p className="m-0 text-sm">Permission requise : communes.modifier</p>
      )}
    </form>
  );
}
