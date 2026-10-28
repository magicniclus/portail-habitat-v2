'use client';

import type { SectionEnregistree } from '@ph/firebase/sites';
import { Button } from '@ph/ui';
import { useEffect, useState } from 'react';
import { posterJson } from '@/lib/posterJson';

const URL_SECTIONS = '/api/pro/site/sections';

/** Appel de « Mes sections » : la liste à jour, ou le message d'erreur. */
export const appelSections = (corps: object) =>
  posterJson<SectionEnregistree[]>(URL_SECTIONS, corps);

/** Mes sections (SITE_INTERNET §4.7), lues à l'ouverture du panneau Ajouter seulement. */
export function MesSections({
  carte,
  onInserer,
}: {
  carte: string;
  onInserer: (s: SectionEnregistree) => void;
}) {
  const [liste, setListe] = useState<SectionEnregistree[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const appeler = async (corps: object) => {
    const r = await appelSections(corps);
    if (r.ok) setListe(r.data);
    else setErreur(r.message);
  };
  useEffect(() => {
    let actif = true;
    void appelSections({ action: 'lire' }).then((r) => {
      if (!actif) return;
      if (r.ok) setListe(r.data);
      else setErreur(r.message);
    });
    return () => {
      actif = false;
    };
  }, []);
  return (
    <section aria-labelledby="mes-sections" className="grid gap-2">
      <h2 id="mes-sections" className="m-0 text-base">
        Mes zones enregistrées
      </h2>
      {erreur ? <p className="m-0 text-sm text-danger">{erreur}</p> : null}
      {liste === null && !erreur ? (
        <p className="m-0 text-sm text-neutre-700">Chargement…</p>
      ) : null}
      {liste?.length === 0 ? (
        <p className="m-0 text-sm text-neutre-700">
          Sélectionnez une zone, puis « Enregistrer comme modèle de zone » : elle apparaît ici.
        </p>
      ) : null}
      <ul className="m-0 grid list-none gap-2 p-0">
        {liste?.map((s) => (
          <li key={s.id} className="flex items-stretch gap-1">
            <button type="button" className={`${carte} flex-1`} onClick={() => onInserer(s)}>
              <span className="font-semibold">{s.nom}</span>
            </button>
            <Button
              variant="fantome"
              taille="sm"
              aria-label={`Supprimer ${s.nom} de Mes zones`}
              onClick={() => void appeler({ action: 'supprimer', id: s.id })}
            >
              ×
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
