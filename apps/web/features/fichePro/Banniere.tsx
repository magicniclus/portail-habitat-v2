'use client';

import { fichiers } from '@ph/firebase/chemins';
import { ImageIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { deposerFichier } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';
import { useGlisserDeposer } from './useGlisserDeposer';
import { nomFichierSur, problemeFichier, TYPES_IMAGE } from './fichiers';

/**
 * Bannière de Ma fiche (1600 × 500, 5 Mo ; clic ou glisser-déposer) : « Changer la bannière » n'existe que dans l'espace pro ;
 * la fiche publique n'affiche que l'image.
 */
export function Banniere({
  artisanId,
  banniereUrl,
  modifiable,
}: {
  artisanId: string;
  banniereUrl?: string;
  modifiable: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const choisir = async (f: File | undefined) => {
    if (!f) return;
    const probleme = problemeFichier(f, TYPES_IMAGE, 5);
    if (probleme) return setErreur(probleme);
    setEnCours(true);
    setErreur(null);
    const nomFichier = nomFichierSur(f);
    try {
      await deposerFichier(fichiers.banniere(artisanId, nomFichier), f);
      const r = await posterJson<{ banniereUrl: string }>('/api/pro/banniere', { nomFichier });
      if (!r.ok) setErreur(r.message);
      else router.refresh();
    } catch {
      setErreur("L'envoi de la bannière n'a pas abouti. Réessayez.");
    }
    setEnCours(false);
  };
  const { survol, zone } = useGlisserDeposer((f) => void choisir(f), modifiable && !enCours);

  return (
    <div
      {...zone}
      className={`relative h-[clamp(120px,18vw,170px)] overflow-hidden bg-accent-100 ${survol ? 'outline-2 -outline-offset-4 outline-accent outline-dashed' : ''}`}
    >
      {banniereUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- fichier Storage public
        <img src={banniereUrl} alt="" className="size-full object-cover" />
      ) : modifiable ? (
        <span className="flex size-full flex-col items-center justify-center gap-1 text-sm text-neutre-800">
          <ImageIcon size={26} aria-hidden="true" />
          Bannière (1600 × 500 px) : glissez une image ici
        </span>
      ) : null}
      {modifiable ? (
        <label
          htmlFor={id}
          className="absolute top-3 right-3 inline-flex min-h-11 cursor-pointer items-center rounded-control border border-trait bg-blanc px-3.5 text-sm font-semibold shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-accent"
        >
          {enCours ? 'Envoi…' : 'Changer la bannière'}
          <input
            id={id}
            type="file"
            accept={TYPES_IMAGE.join(',')}
            disabled={enCours}
            onChange={(e) => void choisir(e.target.files?.[0])}
            className="sr-only"
          />
        </label>
      ) : null}
      {erreur ? (
        <p className="absolute right-3 bottom-3 m-0 rounded-control bg-blanc px-3 py-1.5 text-sm text-danger">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
