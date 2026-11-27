'use client';

import { adresseArticle } from '@ph/core/blog';
import { Field, Input, Interrupteur, Textarea } from '@ph/ui';
import type { ChampsArticle } from './useArticle';

/**
 * Image à la une (photo des Réalisations) et son texte alternatif, titre, sous-titre et adresse
 * `/blog/{slug}` qui suit le titre tant que l'interrupteur est actif (BLOG §3).
 */
export function EnteteArticle({
  c,
  maj,
  medias,
  hote,
}: {
  c: ChampsArticle;
  maj: (p: Partial<ChampsArticle>) => void;
  medias: Record<string, string>;
  hote: string;
}) {
  const photos = Object.entries(medias).slice(0, 18);
  const slug = c.slugAuto ? adresseArticle(c.titre || 'article', []) : c.slug;
  return (
    <div className="grid gap-4">
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-2 font-semibold">Image à la une</legend>
        {photos.length ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map(([src, url]) => (
              <button
                key={src}
                type="button"
                aria-pressed={c.image.src === src}
                aria-label={`Photo de chantier ${src}`}
                onClick={() => maj({ image: { ...c.image, src: c.image.src === src ? '' : src } })}
                className="size-20 flex-none overflow-hidden rounded-[10px] ring-offset-2 aria-pressed:ring-3 aria-pressed:ring-accent-action"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <p className="m-0 text-sm text-neutre-800">
            Ajoutez des photos dans « Ma fiche › Réalisations » pour illustrer vos articles.
          </p>
        )}
        <Field
          label="Texte alternatif"
          aide="Décrivez la photo : « Douche de plain-pied à Talence »"
        >
          <Input
            value={c.image.alt}
            maxLength={200}
            onChange={(e) => maj({ image: { ...c.image, alt: e.target.value } })}
          />
        </Field>
      </fieldset>
      <Field label="Titre" aide={`${c.titre.length} caractères (10 à 70, idéal 50 à 60)`}>
        <Textarea
          rows={2}
          value={c.titre}
          maxLength={200}
          onChange={(e) => maj({ titre: e.target.value })}
        />
      </Field>
      <Field label="Sous-titre (facultatif)">
        <Input
          value={c.sousTitre}
          maxLength={300}
          onChange={(e) => maj({ sousTitre: e.target.value })}
        />
      </Field>
      <div className="grid gap-2">
        <Field label={`Adresse : ${hote}/blog/`}>
          <Input
            value={slug}
            maxLength={80}
            disabled={c.slugAuto}
            onChange={(e) =>
              maj({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
            }
          />
        </Field>
        <label className="flex min-h-11 items-center gap-2 text-[15px]">
          <Interrupteur
            checked={c.slugAuto}
            onCheckedChange={(v) => maj({ slugAuto: v, slug: v ? '' : slug })}
            aria-label="L’adresse suit le titre"
          />
          Suit le titre
        </label>
      </div>
    </div>
  );
}
