'use client';

import { fichiers } from '@ph/firebase/chemins';
import { Banner } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { deposerFichier } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';
import { nomFichierSur, problemeFichier, TYPES_IMAGE } from './fichiers';

/** Logo de l'entreprise (2 Mo) : dépôt puis enregistrement serveur ; envoi dès le choix du fichier. */
export function Logo({
  artisanId,
  logoUrl,
  nom,
}: {
  artisanId: string;
  logoUrl?: string;
  nom: string;
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

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-4">
      <span className="flex size-20 flex-none items-center justify-center overflow-hidden rounded-[14px] border border-trait bg-neutre-100">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- fichier Storage public, taille fixe
          <img src={logoUrl} alt={`Logo de ${nom}`} className="size-full object-contain" />
        ) : (
          <span className="text-xs text-neutre-700">Logo</span>
        )}
      </span>
      <div className="grid min-w-0 gap-1.5">
        <label
          htmlFor={id}
          className="relative inline-flex min-h-11 cursor-pointer overflow-hidden items-center rounded-md border border-trait bg-blanc px-4 text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-accent"
        >
          {enCours ? 'Envoi…' : logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
          <input
            id={id}
            type="file"
            accept={TYPES_IMAGE.join(',')}
            disabled={enCours}
            onChange={(e) => void choisir(e.target.files?.[0])}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
        <span className="text-xs text-neutre-700">JPEG, PNG ou WebP, 2 Mo au plus.</span>
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      </div>
    </div>
  );
}
