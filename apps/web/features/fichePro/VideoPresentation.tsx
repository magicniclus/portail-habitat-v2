'use client';

import { fichiers } from '@ph/firebase/chemins';
import { PlayIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { deposerFichier } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';
import { nomFichierSur, problemeFichier } from './fichiers';

const TYPES_VIDEO = ['video/mp4', 'video/webm', 'video/ogg'];

/** Vidéo de présentation (maquette Ma fiche) : MP4, WebM ou OGG, 50 Mo ; lue sur la fiche publique. */
export function VideoPresentation({
  artisanId,
  videoUrl,
  modifiable,
}: {
  artisanId: string;
  videoUrl?: string;
  modifiable: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const choisir = async (f: File | undefined) => {
    if (!f) return;
    if (!TYPES_VIDEO.includes(f.type)) return setErreur('Vidéo MP4, WebM ou OGG uniquement.');
    const probleme = problemeFichier(f, TYPES_VIDEO, 50);
    if (probleme) return setErreur(probleme);
    setEnCours(true);
    setErreur(null);
    const nomFichier = nomFichierSur(f);
    try {
      await deposerFichier(fichiers.video(artisanId, nomFichier), f);
      const r = await posterJson<{ videoUrl: string }>('/api/pro/video', { nomFichier });
      if (!r.ok) setErreur(r.message);
      else router.refresh();
    } catch {
      setErreur("L'envoi de la vidéo n'a pas abouti. Réessayez.");
    }
    setEnCours(false);
  };

  if (!videoUrl && !modifiable) return null;
  const bouton = modifiable ? (
    <label
      htmlFor={id}
      className="inline-flex min-h-11 cursor-pointer items-center justify-self-center rounded-control border border-trait bg-blanc px-4 text-[15px] font-semibold has-focus-visible:outline-2 has-focus-visible:outline-accent"
    >
      {enCours ? 'Envoi…' : videoUrl ? 'Changer la vidéo' : 'Ajouter une vidéo'}
      <input
        id={id}
        type="file"
        accept={TYPES_VIDEO.join(',')}
        disabled={enCours}
        onChange={(e) => void choisir(e.target.files?.[0])}
        className="sr-only text-base"
      />
    </label>
  ) : null;
  return (
    <section
      aria-label="Vidéo de présentation"
      className={`grid justify-items-center gap-3 rounded-[16px] p-6 text-center ${
        videoUrl ? 'border border-trait' : 'border border-dashed border-neutre-400'
      }`}
    >
      {videoUrl ? (
        <video src={videoUrl} controls preload="metadata" className="w-full rounded-[12px]" />
      ) : (
        <>
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-full bg-accent-100 text-accent-700"
          >
            <PlayIcon size={22} weight="fill" />
          </span>
          <h2 className="m-0 text-lg">Ajoutez une vidéo de présentation</h2>
          <p className="m-0 text-[15px] text-neutre-800">
            Présentez votre entreprise et vos chantiers en vidéo. MP4, WebM ou OGG · 50 Mo max.
          </p>
        </>
      )}
      {bouton}
      {erreur ? <p className="m-0 text-sm text-danger">{erreur}</p> : null}
    </section>
  );
}
