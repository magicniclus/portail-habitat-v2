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

const TYPES = {
  image: {
    types: TYPES_IMAGE,
    mo: 8,
    bouton: 'Importer une image',
    aide: 'JPEG, PNG ou WebP, 8 Mo au plus.',
  },
  fichier: {
    types: ['application/pdf'],
    mo: 10,
    bouton: 'Importer un PDF',
    aide: 'PDF, 10 Mo au plus (plaquette, tarifs…).',
  },
} as const;

/**
 * « Importer une image » ou « Importer un PDF » (médiathèque du site, SITE_INTERNET §4.2) : dépôt
 * dans Storage, vérifié par le serveur (type, taille), puis choisi pour l'élément ou le bouton.
 */
export function ImportImage({
  artisanId,
  onImportee,
  usage = 'image',
}: {
  artisanId: string;
  /** Fichier enregistré : sa clé `up:`, son URL et son nom, ajoutés à la médiathèque de l'éditeur. */
  onImportee: (cle: string, url: string, nom: string) => void;
  usage?: 'image' | 'fichier';
}) {
  const t = TYPES[usage];
  const id = useId();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const choisir = async (f: File | undefined) => {
    if (!f) return;
    const probleme =
      usage === 'fichier' && f.type !== 'application/pdf'
        ? 'Fichier PDF uniquement.'
        : problemeFichier(f, t.types, t.mo);
    if (probleme) return setErreur(probleme);
    setEnCours(true);
    setErreur(null);
    const nomFichier = `${nouvelIdFichier()}-${nomFichierSur(f)}`.slice(0, 200);
    try {
      await deposerFichier(fichiers.mediaSite(artisanId, nomFichier), f);
      const nom = f.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'Document';
      const r = await posterJson<{ cle: string; url: string }>('/api/pro/site/medias', {
        nomFichier,
        ...(usage === 'fichier' ? { usage, nom } : {}),
      });
      if (!r.ok) setErreur(r.message);
      else onImportee(r.data.cle, r.data.url, nom);
    } catch {
      setErreur("L'envoi n'a pas abouti. Réessayez.");
    }
    setEnCours(false);
  };
  return (
    <div className="grid gap-1">
      <label
        htmlFor={id}
        className="relative inline-flex min-h-11 w-fit cursor-pointer items-center overflow-hidden rounded-md border border-trait bg-blanc px-4 text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-accent"
      >
        {enCours ? 'Envoi…' : t.bouton}
        <input
          id={id}
          type="file"
          accept={t.types.join(',')}
          disabled={enCours}
          onChange={(e) => void choisir(e.target.files?.[0])}
          className="sr-only text-base"
        />
      </label>
      <span className="text-xs text-neutre-700">{t.aide}</span>
      {erreur ? <span className="text-sm text-danger">{erreur}</span> : null}
    </div>
  );
}
