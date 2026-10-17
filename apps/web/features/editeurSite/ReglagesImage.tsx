'use client';

import { Field, Select } from '@ph/ui';
import { ImportImage } from './ImportImage';

/** Photo de l'élément image : réalisations publiées et images importées (médiathèque du site). */
export function ReglagesImage({
  src,
  medias,
  artisanId,
  onMedia,
  onChoisir,
}: {
  src: string;
  medias: Record<string, string>;
  artisanId: string;
  onMedia: (cle: string, url: string) => void;
  onChoisir: (src: string) => void;
}) {
  return (
    <>
      <Field label="Photo" aide="Vos réalisations publiées et vos images importées.">
        <Select value={src} onChange={(e) => onChoisir(e.target.value)}>
          <option value="">Aucune</option>
          {Object.keys(medias).map((m, i) => (
            <option key={m} value={m}>
              {m.startsWith('up:') ? `Image importée ${i + 1}` : `Photo ${i + 1}`}
            </option>
          ))}
        </Select>
      </Field>
      <ImportImage
        artisanId={artisanId}
        onImportee={(cle, url) => {
          onMedia(cle, url);
          onChoisir(cle);
        }}
      />
    </>
  );
}
