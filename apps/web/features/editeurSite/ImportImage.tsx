'use client';

import { fichiers } from '@ph/firebase/chemins';
import { useId, useState } from 'react';
import {
  nomFichierSur,
  nouvelIdFichier,
  problemeFichier,
  TYPES_IMAGE,
} from '@/features/fichePro/fichiers';
import { deposerFichier } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';

/**
 * « Importer une image » (médiathèque du site, SITE_INTERNET §4.2) : dépôt dans Storage, vérifié
 * par le serveur (image, 8 Mo), puis choisie pour l'élément. L'image rejoint la médiathèque.
 */
export function ImportImage({
  artisanId,
  onImportee,
}: {
  artisanId: string;
  /** Image enregistrée : sa clé `up:` et son URL, ajoutées à la médiathèque de l'éditeur. */
  onImportee: (cle: string, url: string) => void;
}) {
  const id = useId();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const choisir = async (f: File | undefined) => {
    if (!f) return;
    const probleme = problemeFichier(f, TYPES_IMAGE, 8);
    if (probleme) return setErreur(probleme);
    setEnCours(true);
    setErreur(null);
    const nomFichier = `${nouvelIdFichier()}-${nomFichierSur(f)}`.slice(0, 200);
    try {
      await deposerFichier(fichiers.mediaSite(artisanId, nomFichier), f);
      const r = await posterJson<{ cle: string; url: string }>('/api/pro/site/medias', {
        nomFichier,
      });
      if (!r.ok) setErreur(r.message);
      else onImportee(r.data.cle, r.data.url);
    } catch {
      setErreur("L'envoi de l'image n'a pas abouti. Réessayez.");
    }
    setEnCours(false);
  };
  return (
    <div className="grid gap-1">
      <label
        htmlFor={id}
        className="relative inline-flex min-h-11 w-fit cursor-pointer items-center overflow-hidden rounded-md border border-trait bg-blanc px-4 text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-accent"
      >
        {enCours ? 'Envoi…' : 'Importer une image'}
        <input
          id={id}
          type="file"
          accept={TYPES_IMAGE.join(',')}
          disabled={enCours}
          onChange={(e) => void choisir(e.target.files?.[0])}
          className="sr-only text-base"
        />
      </label>
      <span className="text-xs text-neutre-700">JPEG, PNG ou WebP, 8 Mo au plus.</span>
      {erreur ? <span className="text-sm text-danger">{erreur}</span> : null}
    </div>
  );
}
