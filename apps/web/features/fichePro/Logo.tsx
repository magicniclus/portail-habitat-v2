'use client';

import { fichiers } from '@ph/firebase/chemins';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { deposerFichier } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';
import { useGlisserDeposer } from './useGlisserDeposer';
import { nomFichierSur, problemeFichier, TYPES_IMAGE } from './fichiers';

/**
 * Logo (maquette Ma fiche) : carré posé sur la bannière ; clic ou glisser-déposer d'une image (2 Mo) ;
 * dépôt Storage puis enregistrement serveur. Sans droit de modification, simple affichage.
 */
export function Logo({
  artisanId,
  logoUrl,
  nom,
  modifiable,
}: {
  artisanId: string;
  logoUrl?: string;
  nom: string;
  modifiable: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const choisir = async (f: File | undefined) => {
    if (!f) return;
    const probleme = problemeFichier(f, TYPES_IMAGE, 2);
    if (probleme) return setErreur(probleme);
    setEnCours(true);
    setErreur(null);
    const nomFichier = nomFichierSur(f);
    try {
      await deposerFichier(fichiers.logo(artisanId, nomFichier), f);
      const r = await posterJson<{ logoUrl: string }>('/api/pro/logo', { nomFichier });
      if (!r.ok) setErreur(r.message);
      else router.refresh();
    } catch {
      setErreur("L'envoi du logo n'a pas abouti. Réessayez.");
    }
    setEnCours(false);
  };
  const { survol, zone } = useGlisserDeposer((f) => void choisir(f), modifiable && !enCours);

  const contenu = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- fichier Storage public, taille fixe
    <img src={logoUrl} alt={`Logo de ${nom}`} className="size-full object-contain" />
  ) : (
    <span className="grid place-items-center gap-0.5 text-center text-sm font-semibold text-neutre-800">
      Logo
      {modifiable ? <span className="text-xs font-normal underline">Ajouter</span> : null}
    </span>
  );
  const carre =
    'relative flex size-[84px] flex-none items-center justify-center overflow-hidden rounded-[14px] border border-trait bg-blanc shadow-sm';
  if (!modifiable) return <span className={carre}>{contenu}</span>;
  return (
    <span className="grid gap-1">
      <label
        htmlFor={id}
        title={
          logoUrl
            ? 'Changer le logo (cliquez ou déposez une image)'
            : 'Ajouter un logo (cliquez ou déposez une image)'
        }
        {...zone}
        className={`${carre} cursor-pointer border-dashed has-focus-visible:outline-2 has-focus-visible:outline-accent ${survol ? 'border-2 border-accent bg-accent-100' : ''}`}
      >
        {enCours ? <span className="text-xs">Envoi…</span> : contenu}
        <input
          id={id}
          type="file"
          aria-label={logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
          accept={TYPES_IMAGE.join(',')}
          disabled={enCours}
          onChange={(e) => void choisir(e.target.files?.[0])}
          className="sr-only"
        />
      </label>
      {erreur ? <span className="max-w-[200px] text-xs text-danger">{erreur}</span> : null}
    </span>
  );
}
