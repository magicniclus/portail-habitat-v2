'use client';

import { FORMAT_DEFAUT, FORMATS_STUDIO, NOMS_FORMATS, type FormatStudio } from '@ph/core/studio';
import { Banner, Button, Checkbox, Field, Input, Select } from '@ph/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { creerProjet } from './actions';

/** Nouvelle vidéo : titre, format (vertical par défaut), caméra ou non, thème facultatif. */
export function NouveauProjet() {
  const router = useRouter();
  const [titre, setTitre] = useState('');
  const [format, setFormat] = useState<FormatStudio>(FORMAT_DEFAUT);
  const [camera, setCamera] = useState(true);
  const [theme, setTheme] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const creer = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await creerProjet({
        titre: titre.trim() || 'Nouvelle vidéo',
        format,
        camera,
        theme: theme.trim() || undefined,
      });
      if (!r.ok) setErreur(r.message);
      else router.push(`/admin/studio/${r.data}` as Route);
    });
  return (
    <section
      aria-labelledby="nouvelle-video"
      className="grid gap-3 rounded-card border border-trait bg-blanc p-4"
    >
      <h2 id="nouvelle-video" className="m-0 text-lg">
        Nouvelle vidéo
      </h2>
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <Field label="Titre (pour vous retrouver)">
          <Input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Ex. 10 demandes gratuites"
          />
        </Field>
        <Field label="Format">
          <Select value={format} onChange={(e) => setFormat(e.target.value as FormatStudio)}>
            {NOMS_FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMATS_STUDIO[f].libelle}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label="Thème (facultatif)"
        aide="Laissez vide : Claude cherche lui-même ce qui marche auprès des artisans."
      >
        <Input
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Ex. trouver des chantiers sans payer de commission"
        />
      </Field>
      <Checkbox checked={camera} onChange={(e) => setCamera(e.target.checked)}>
        Je veux pouvoir apparaître à l’image (caméra)
      </Checkbox>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <div>
        <Button onClick={creer} disabled={enCours}>
          {enCours ? 'Création…' : 'Créer la vidéo'}
        </Button>
      </div>
    </section>
  );
}
