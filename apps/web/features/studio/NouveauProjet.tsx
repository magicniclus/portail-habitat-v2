'use client';

import { FORMAT_DEFAUT, FORMATS_STUDIO, NOMS_FORMATS, type FormatStudio } from '@ph/core/studio';
import { Banner, Button, Checkbox, Field, Select, Textarea } from '@ph/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { creerProjet } from './actions';

/**
 * Point de départ : sans rien écrire, Claude va chercher les vidéos qui marchent et propose quoi
 * tourner ; avec une idée, il part de celle-ci. Le titre vient de la vidéo choisie.
 */
export function NouveauProjet() {
  const router = useRouter();
  const [idee, setIdee] = useState('');
  const [format, setFormat] = useState<FormatStudio>(FORMAT_DEFAUT);
  const [camera, setCamera] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const lancer = (avecIdee: boolean) =>
    demarrer(async () => {
      setErreur(null);
      const theme = avecIdee ? idee.trim() : '';
      const r = await creerProjet({ format, camera, ...(theme ? { theme } : {}) });
      if (!r.ok) setErreur(r.message);
      else router.push(`/admin/studio/${r.data}?analyse=1` as Route);
    });
  return (
    <section
      aria-labelledby="nouvelle-video"
      className="grid gap-5 rounded-panel bg-neutre-900 p-[clamp(18px,3vw,32px)] text-blanc"
    >
      <div className="grid gap-1">
        <h2 id="nouvelle-video" className="m-0 text-[clamp(22px,2.6vw,28px)]">
          Quelle vidéo faire aujourd’hui ?
        </h2>
        <p className="m-0 max-w-[62ch] opacity-85">
          Claude regarde les vidéos courtes qui font le plus de vues en ce moment et vous propose
          trois vidéos à tourner, avec l’accroche et le script.
        </p>
      </div>
      <div>
        <Button
          taille="lg"
          variant="secondaire"
          className="border-blanc"
          disabled={enCours}
          onClick={() => lancer(false)}
        >
          {enCours ? 'Préparation…' : '✦ Trouver les meilleures vidéos à faire'}
        </Button>
      </div>
      <details className="rounded-card bg-blanc/10 px-4 py-1 open:pb-4">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
          J’ai déjà une idée
        </summary>
        <div className="mt-3 grid gap-3 text-texte">
          <div className="rounded-control bg-blanc p-3">
            <Field label="Votre idée, en quelques mots">
              <Textarea
                value={idee}
                onChange={(e) => setIdee(e.target.value)}
                rows={2}
                placeholder="Ex. montrer qu’un artisan reçoit des demandes sans payer de commission"
              />
            </Field>
          </div>
          <div>
            <Button
              variant="secondaire"
              disabled={enCours || idee.trim().length < 3}
              onClick={() => lancer(true)}
            >
              Partir de mon idée
            </Button>
          </div>
        </div>
      </details>
      <div className="flex flex-wrap items-end gap-4 border-t border-blanc/15 pt-4">
        <div className="min-w-[240px] text-texte">
          <Field label={<span className="text-blanc">Format</span>}>
            <Select value={format} onChange={(e) => setFormat(e.target.value as FormatStudio)}>
              {NOMS_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {FORMATS_STUDIO[f].libelle}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Checkbox checked={camera} onChange={(e) => setCamera(e.target.checked)}>
          Je peux apparaître à l’image
        </Checkbox>
      </div>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </section>
  );
}
