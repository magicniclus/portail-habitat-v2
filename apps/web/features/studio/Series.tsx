'use client';

import { FORMAT_DEFAUT } from '@ph/core/studio';
import type { SerieStudio } from '@ph/firebase/studio';
import { Banner, Button, Field, Input } from '@ph/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { creerSerie, episodeSuivant, supprimerSerie } from './series';

/**
 * Séries : une promesse tenue à chaque épisode (« Les erreurs de devis, épisode 3 »). Les séries
 * font gagner des abonnés : on revient pour la suite.
 */
export function Series({ series }: { series: SerieStudio[] }) {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [promesse, setPromesse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const agir = <T,>(
    f: () => Promise<{ ok: true; data: T } | { ok: false; message: string }>,
    ok?: (d: T) => void,
  ) =>
    demarrer(async () => {
      setErreur(null);
      const r = await f();
      if (!r.ok) setErreur(r.message);
      else ok?.(r.data);
    });
  return (
    <section aria-labelledby="series-studio" className="grid gap-2">
      <h2 id="series-studio" className="m-0 text-lg">
        Séries
      </h2>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {series.length ? (
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {series.map((s) => (
            <li
              key={s.id}
              className="grid content-start gap-2 rounded-card border border-trait bg-blanc p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <strong>{s.nom}</strong>
                <span className="text-sm text-neutre-700">
                  {s.episodes} épisode{s.episodes > 1 ? 's' : ''}
                </span>
              </div>
              <p className="m-0 text-sm">{s.promesse}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={enCours}
                  onClick={() =>
                    agir(
                      () => episodeSuivant({ serieId: s.id, format: FORMAT_DEFAUT, camera: false }),
                      (id) => router.push(`/admin/studio/${id}?analyse=1` as Route),
                    )
                  }
                >
                  Épisode {s.episodes + 1}
                </Button>
                <Button
                  variant="fantome"
                  disabled={enCours}
                  onClick={() => {
                    if (window.confirm(`Supprimer la série « ${s.nom} » ? Les vidéos restent.`))
                      agir(() => supprimerSerie({ serieId: s.id }));
                  }}
                >
                  Supprimer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <details className="rounded-card border border-trait bg-blanc p-3.5">
        <summary className="min-h-11 cursor-pointer font-semibold">+ Nouvelle série</summary>
        <form
          className="mt-2 grid items-end gap-3 md:grid-cols-[1fr_2fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            agir(
              () => creerSerie({ nom, promesse }),
              () => {
                setNom('');
                setPromesse('');
              },
            );
          }}
        >
          <Field label="Nom">
            <Input
              value={nom}
              maxLength={60}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Les erreurs de devis"
            />
          </Field>
          <Field label="Promesse de chaque épisode">
            <Input
              value={promesse}
              maxLength={200}
              onChange={(e) => setPromesse(e.target.value)}
              placeholder="Une erreur qui coûte cher aux artisans, et comment l’éviter"
            />
          </Field>
          <Button
            type="submit"
            disabled={enCours || nom.trim().length < 2 || promesse.trim().length < 5}
          >
            Créer
          </Button>
        </form>
      </details>
    </section>
  );
}
