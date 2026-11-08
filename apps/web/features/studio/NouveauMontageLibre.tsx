'use client';

import { FORMAT_DEFAUT, FORMATS_STUDIO, NOMS_FORMATS, type FormatStudio } from '@ph/core/studio';
import { Banner, Button, Field, Input, Select } from '@ph/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { creerMontageLibre } from './actions';

/**
 * Monter soi-même, sans génération : un projet vide qui s'ouvre directement dans l'éditeur
 * multipistes (importer ses vidéos, sons et images).
 */
export function NouveauMontageLibre() {
  const router = useRouter();
  const [titre, setTitre] = useState('');
  const [format, setFormat] = useState<FormatStudio>(FORMAT_DEFAUT);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const creer = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await creerMontageLibre({ titre: titre.trim(), format });
      if (!r.ok) setErreur(r.message);
      else router.push(`/admin/studio/${r.data}/montage` as Route);
    });
  return (
    <section
      aria-labelledby="montage-libre-nouveau"
      className="grid gap-3 rounded-card border border-trait bg-blanc p-4"
    >
      <div>
        <h2 id="montage-libre-nouveau" className="m-0 text-lg">
          Monter moi-même
        </h2>
        <p className="m-0 text-sm text-neutre-700">
          Un éditeur multipistes, sans génération : importez vos vidéos, sons et images.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Field label="Titre du montage">
            <Input value={titre} maxLength={100} onChange={(e) => setTitre(e.target.value)} />
          </Field>
        </div>
        <div className="min-w-[200px]">
          <Field label="Taille de la vidéo">
            <Select value={format} onChange={(e) => setFormat(e.target.value as FormatStudio)}>
              {NOMS_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {FORMATS_STUDIO[f].libelle}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button disabled={enCours || !titre.trim()} onClick={creer}>
          {enCours ? 'Création…' : 'Nouveau montage'}
        </Button>
      </div>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </section>
  );
}
