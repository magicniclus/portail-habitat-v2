'use client';

import { Banner, Checkbox } from '@ph/ui';
import { TrashIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { supprimerProjet } from './actions';
import { EditeurScript } from './EditeurScript';
import type { VideoATourner } from './SessionTournage';

/** Vidéos à tourner : cochées par défaut, script modifiable avant de commencer. */
export function ListeATourner(p: {
  videos: VideoATourner[];
  exclues: ReadonlySet<string>;
  onExclure: (id: string, exclue: boolean) => void;
}) {
  const router = useRouter();
  const [edition, setEdition] = useState<string | null>(null);
  // Suppression en deux temps : on confirme, rien ne part sur un clic distrait.
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const supprimer = (id: string) =>
    demarrer(async () => {
      setErreur(null);
      const r = await supprimerProjet({ projetId: id });
      if (!r.ok) return setErreur(r.message);
      setASupprimer(null);
      router.refresh();
    });
  return (
    <>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <ul className="m-0 grid list-none gap-1 p-0">
        {p.videos.map((v) => (
          <li key={v.id} className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Checkbox
                checked={!p.exclues.has(v.id)}
                onChange={(e) => p.onExclure(v.id, !e.target.checked)}
              >
                {v.titre} · {v.script.length} phrases
                {v.modele ? (
                  <span className="block text-sm text-neutre-700">
                    Modèle : « {v.modele.titre} »
                    {v.modele.vues !== null
                      ? ` · ${v.modele.vues.toLocaleString('fr-FR')} vues`
                      : ''}
                  </span>
                ) : null}
              </Checkbox>
              <button
                type="button"
                aria-expanded={edition === v.id}
                aria-label={`Modifier le script de « ${v.titre} »`}
                onClick={() => setEdition(edition === v.id ? null : v.id)}
                className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold underline hover:bg-neutre-100"
              >
                Modifier le script
              </button>
              {aSupprimer === v.id ? (
                <span className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={enCours}
                    onClick={() => supprimer(v.id)}
                    className="inline-flex min-h-11 items-center rounded-control bg-danger px-3 text-sm font-semibold text-blanc"
                  >
                    {enCours ? 'Suppression…' : 'Confirmer la suppression'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setASupprimer(null)}
                    className="inline-flex min-h-11 items-center rounded-control px-3 text-sm underline"
                  >
                    Garder
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={`Supprimer « ${v.titre} »`}
                  onClick={() => setASupprimer(v.id)}
                  className="grid size-11 place-items-center rounded-control border border-trait hover:bg-neutre-100"
                >
                  <TrashIcon size={18} aria-hidden="true" />
                </button>
              )}
            </div>
            {edition === v.id ? (
              <div className="rounded-card border border-trait p-3">
                <EditeurScript
                  projetId={v.id}
                  script={v.script}
                  onAnnuler={() => setEdition(null)}
                  onEnregistre={() => {
                    setEdition(null);
                    router.refresh();
                  }}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
