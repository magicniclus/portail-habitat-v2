'use client';

import { cn } from '@ph/ui';
import { ImageSquareIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useImportMedia } from '../ImportImage';
import { Libelle } from './controles';

/**
 * Image (maquette) : emplacement où glisser une image (ou cliquer), retrait, et médiathèque du site
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
  const [survol, setSurvol] = useState(false);
  const imp = useImportMedia(artisanId, 'image', (cle, u) => {
    onMedia(cle, u);
    onChoisir(cle);
  });
  const deposer = (e: React.DragEvent) => {
    e.preventDefault();
    setSurvol(false);
    void imp.envoyer(e.dataTransfer.files[0]);
  };
  return (
    <div className="grid gap-2">
      <Libelle
        texte={libelle}
        droite={src ? (src.startsWith('up:') ? 'Importée' : 'Réalisation') : 'Aucune'}
      />
      {/* Emplacement : glisser une image depuis l'ordinateur, ou cliquer pour la choisir. */}
      <label
        onDragOver={(e) => {
          if (![...e.dataTransfer.types].includes('Files')) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (!survol) setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={deposer}
        className={cn(
          'group relative grid h-32 cursor-pointer place-items-center overflow-hidden rounded-[10px] border-[1.5px] border-dashed bg-cover bg-center transition-colors motion-reduce:transition-none has-focus-visible:outline-2 has-focus-visible:outline-accent',
          survol
            ? 'border-accent bg-accent-100'
            : 'border-neutre-300 bg-neutre-100 hover:border-neutre-500',
        )}
        style={url && !survol ? { backgroundImage: `url("${encodeURI(url)}")` } : undefined}
      >
        <span
          className={cn(
            'pointer-events-none grid justify-items-center gap-1 rounded-[8px] px-3 py-2 text-center text-xs text-neutre-600',
            url &&
              'bg-blanc/90 opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none',
            (survol || imp.enCours) && 'opacity-100',
          )}
        >
          <ImageSquareIcon size={20} aria-hidden="true" className="text-neutre-500" />
          {imp.enCours
            ? 'Envoi…'
            : survol
              ? 'Déposez l’image ici'
              : url
                ? 'Glissez une image ou cliquez pour la remplacer'
                : 'Glissez une image ici ou cliquez pour choisir'}
        </span>
        <input
          type="file"
          aria-label="Importer une image"
          accept={imp.types.join(',')}
          disabled={imp.enCours}
          onChange={(e) => void imp.envoyer(e.target.files?.[0])}
          className="sr-only text-base"
        />
      </label>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-neutre-600">{imp.aide}</span>
        {src ? (
          <button
            type="button"
            onClick={() => onChoisir('')}
            className="min-h-11 flex-none rounded-control px-3 text-sm font-semibold text-neutre-800 hover:bg-neutre-100"
          >
            Retirer
          </button>
        ) : null}
      </div>
      {imp.erreur ? <span className="text-sm text-danger">{imp.erreur}</span> : null}
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
