'use client';

import type { SujetStudio } from '@ph/core/studio';
import { Banner, Button, Field, Textarea } from '@ph/ui';
import { TrashIcon } from '@phosphor-icons/react';
import { useState, useTransition } from 'react';
import { modifierScript } from './actions';

type Script = SujetStudio['script'];

/**
 * Modifier le script d'une vidéo avant de la tourner : une phrase par case (ce qu'on dit au
 * prompteur), phrases à ajouter, retirer ou réécrire. Enregistré dans la vidéo.
 */
export function EditeurScript(p: {
  projetId: string;
  script: Script;
  onEnregistre: (script: Script) => void;
  onAnnuler: () => void;
}) {
  const [lignes, setLignes] = useState<Script>(p.script);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const changer = (i: number, voix: string) =>
    setLignes((l) => l.map((x, j) => (j === i ? { ...x, voix } : x)));
  const propres = lignes
    // Seuls les champs du script partent (anciennes données comprises).
    .map((x) => ({
      voix: x.voix.trim(),
      aEcran: x.aEcran || 'camera',
      texteEcran: x.texteEcran ?? '',
    }))
    .filter((x) => x.voix.length > 0);
  const mots = propres.reduce((n, x) => n + x.voix.split(/\s+/).length, 0);
  return (
    <section aria-label="Modifier le script" className="grid gap-3">
      <ol className="m-0 grid list-none gap-2 p-0">
        {lignes.map((x, i) => (
          <li key={i} className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field label={`Phrase ${i + 1}`}>
              <Textarea
                rows={2}
                maxLength={400}
                value={x.voix}
                onChange={(e) => changer(i, e.target.value)}
              />
            </Field>
            <button
              type="button"
              aria-label={`Retirer la phrase ${i + 1}`}
              disabled={lignes.length < 2}
              onClick={() => setLignes((l) => l.filter((_, j) => j !== i))}
              className="grid size-11 place-items-center rounded-control border border-trait hover:bg-neutre-100 disabled:opacity-40"
            >
              <TrashIcon size={18} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={lignes.length >= 40}
          onClick={() => setLignes((l) => [...l, { voix: '', aEcran: 'camera', texteEcran: '' }])}
          className="inline-flex min-h-11 items-center rounded-control border border-trait px-4 text-sm font-semibold hover:bg-neutre-100"
        >
          + Ajouter une phrase
        </button>
        <span className="text-sm text-neutre-700">
          {mots} mots · environ {Math.round(mots / 2.6)} s à l’oral
        </span>
      </div>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={enCours || !propres.length}
          onClick={() =>
            demarrer(async () => {
              setErreur(null);
              const r = await modifierScript({ projetId: p.projetId, script: propres });
              if (r.ok) p.onEnregistre(propres);
              else setErreur(r.message);
            })
          }
        >
          {enCours ? 'Enregistrement…' : 'Enregistrer le script'}
        </Button>
        <Button variant="secondaire" disabled={enCours} onClick={p.onAnnuler}>
          Annuler
        </Button>
      </div>
    </section>
  );
}
