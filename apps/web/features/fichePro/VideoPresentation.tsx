'use client';

import { idYoutube } from '@ph/core/sites';
import { Banner, BoutonAction, Button, Field, Input } from '@ph/ui';
import { YoutubeLogoIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LecteurVideo } from '@/features/fiche/LecteurVideo';
import { posterJson } from '@/lib/posterJson';

/**
 * Vidéo de présentation (maquette Ma fiche) : un lien YouTube suffit (aucun import, aucune limite
 * de taille), lu sans cookie sur la fiche publique. Changer ou retirer en un clic.
 */
export function VideoPresentation({
  videoUrl,
  modifiable,
}: {
  videoUrl?: string;
  modifiable: boolean;
}) {
  const router = useRouter();
  const [lien, setLien] = useState('');
  const [modifier, setModifier] = useState(!videoUrl);
  const [erreur, setErreur] = useState<string | null>(null);
  const valide = idYoutube(lien) !== null;

  const envoyer = async (
    corps: { lien: string } | Record<string, never>,
    methode: 'POST' | 'DELETE',
  ) => {
    setErreur(null);
    const r = await posterJson<{ videoUrl: string | null }>('/api/pro/video', corps, methode);
    if (!r.ok) return setErreur(r.message);
    setLien('');
    setModifier(methode === 'DELETE');
    router.refresh();
  };

  if (!videoUrl && !modifiable) return null;
  return (
    <section
      aria-label="Vidéo de présentation"
      className={`grid gap-3 rounded-[16px] p-5 ${videoUrl ? 'border border-trait' : 'border border-dashed border-neutre-400'}`}
    >
      {videoUrl ? (
        <LecteurVideo url={videoUrl} titre="Vidéo de présentation" />
      ) : (
        <div className="grid justify-items-center gap-2 text-center">
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-full bg-accent-100 text-accent-700"
          >
            <YoutubeLogoIcon size={24} weight="fill" />
          </span>
          <h2 className="m-0 text-lg">Ajoutez une vidéo de présentation</h2>
          <p className="m-0 max-w-[48ch] text-[15px] text-neutre-800">
            Présentez votre entreprise et vos chantiers : mettez la vidéo sur YouTube, puis collez
            son lien ici.
          </p>
        </div>
      )}
      {modifiable && modifier ? (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <Field
            label="Lien de la vidéo YouTube"
            aide="Par exemple https://youtu.be/… ; ajoutez ?t=30 pour démarrer à 30 secondes."
          >
            <Input
              value={lien}
              onChange={(e) => setLien(e.target.value)}
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </Field>
          {lien && !valide ? (
            <p className="m-0 text-sm text-danger">Ce lien n’est pas une vidéo YouTube.</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <BoutonAction disabled={!valide} onClick={() => envoyer({ lien }, 'POST')}>
              Enregistrer la vidéo
            </BoutonAction>
            {videoUrl ? (
              <Button variant="fantome" onClick={() => setModifier(false)}>
                Annuler
              </Button>
            ) : null}
          </div>
        </form>
      ) : modifiable ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondaire" onClick={() => setModifier(true)}>
            Changer la vidéo
          </Button>
          <BoutonAction variant="fantome" onClick={() => envoyer({}, 'DELETE')}>
            Retirer la vidéo
          </BoutonAction>
        </div>
      ) : null}
      {modifiable ? (
        <p className="m-0 text-xs text-neutre-700">
          Lue sans cookie, avec seulement vos propres vidéos en suggestion. Aucune publicité si
          votre chaîne YouTube n’est pas monétisée (c’est le cas par défaut).
        </p>
      ) : null}
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </section>
  );
}
