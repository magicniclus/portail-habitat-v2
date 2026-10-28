'use client';

import { cn } from '@ph/ui';
import { ImportImage } from '../ImportImage';
import { Libelle } from './controles';

/**
 * Image (maquette) : aperçu, import depuis l'ordinateur, retrait, et médiathèque du site
 * (réalisations publiées et images importées).
 */
export function ChoixImage({
  libelle,
  src,
  medias,
  artisanId,
  onMedia,
  onChoisir,
}: {
  libelle: string;
  src: string;
  medias: Record<string, string>;
  artisanId: string;
  onMedia: (cle: string, url: string) => void;
  onChoisir: (src: string) => void;
}) {
  const url = src ? medias[src] : undefined;
  return (
    <div className="grid gap-2">
      <Libelle
        texte={libelle}
        droite={src ? (src.startsWith('up:') ? 'Importée' : 'Réalisation') : 'Aucune'}
      />
      <div
        className="grid h-28 place-items-center rounded-[8px] border border-trait bg-neutre-100 bg-cover bg-center text-xs text-neutre-600"
        style={url ? { backgroundImage: `url("${encodeURI(url)}")` } : undefined}
      >
        {url ? <span className="sr-only">Image choisie</span> : 'Aucune image'}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ImportImage
          artisanId={artisanId}
          onImportee={(cle, u) => {
            onMedia(cle, u);
            onChoisir(cle);
          }}
        />
        {src ? (
          <button
            type="button"
            onClick={() => onChoisir('')}
            className="min-h-11 rounded-control px-3 text-sm font-semibold text-neutre-800 hover:bg-neutre-100"
          >
            Retirer
          </button>
        ) : null}
      </div>
      {Object.keys(medias).length ? (
        <>
          <span className="text-xs text-neutre-700">Médiathèque · vos réalisations et imports</span>
          <div role="radiogroup" aria-label="Médiathèque" className="grid grid-cols-4 gap-1.5">
            {Object.entries(medias).map(([cle, u], i) => (
              <button
                key={cle}
                type="button"
                role="radio"
                aria-checked={src === cle}
                aria-label={cle.startsWith('up:') ? `Image importée ${i + 1}` : `Photo ${i + 1}`}
                onClick={() => onChoisir(cle)}
                className={cn(
                  'aspect-square min-h-11 rounded-[6px] bg-cover bg-center',
                  src === cle ? 'ring-2 ring-accent' : 'ring-1 ring-trait',
                )}
                style={{ backgroundImage: `url("${encodeURI(u)}")` }}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
