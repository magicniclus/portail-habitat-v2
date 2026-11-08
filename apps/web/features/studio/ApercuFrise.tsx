'use client';

import {
  clipsActifs,
  cleSource,
  dessinerFrise,
  dessinerMiniature,
  FORMATS_STUDIO,
  type ContexteFrise,
  type ContexteImage,
  type Frise,
  type LigneSousTitre,
  type SourceImage,
} from '@ph/core/studio';
import { themeStudio } from '@ph/ui/tokens';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { lecteurDuClip, useUrlsStudio, type FichiersProjet } from './sourcesFrise';
import type { LectureFrise } from './useLectureFrise';

const ECHELLE = 0.5;

/**
 * Aperçu de la frise image par image (même composition que la vidéo finale) : un élément média
 * caché par clip, une image par média image ; le son est mixé par `useLectureFrise`.
 */
export function ApercuFrise({
  frise,
  fichiers,
  lignes,
  lecture: l,
  miniature = false,
  children,
}: {
  frise: Frise;
  fichiers: FichiersProjet;
  lignes: readonly LigneSousTitre[];
  lecture: LectureFrise;
  /** Montrer le texte de la miniature par-dessus l'image. */
  miniature?: boolean;
  /** Poignées posées sur l'image (déplacer l'élément choisi). */
  children?: ReactNode;
}) {
  const { largeur, hauteur } = FORMATS_STUDIO[frise.format];
  const canevas = useRef<HTMLCanvasElement>(null);
  // Fichiers refusés en CORS : relus sans (image visible, son sans WebAudio).
  const [sansCors, setSansCors] = useState<ReadonlySet<string>>(new Set());
  const lecteurs = frise.pistes.flatMap((p) =>
    p.clips.flatMap((c) => {
      const x = lecteurDuClip(frise, c, fichiers);
      return x ? [{ clip: c.id, ...x }] : [];
    }),
  );
  const images = frise.medias.filter((m) => m.type === 'image');
  const urls = useUrlsStudio([...lecteurs.map((x) => x.chemin), ...images.map((m) => m.chemin)]);

  useEffect(() => {
    void new FontFace('Archivo', `url(${themeStudio.fichierPolice})`, { weight: '800' })
      .load()
      .then((f) => document.fonts.add(f))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const ctx = canevas.current?.getContext('2d');
    if (!ctx) return;
    let raf = requestAnimationFrame(function image() {
      ctx.setTransform(ECHELLE, 0, 0, ECHELLE, 0, 0);
      const sources: Record<string, SourceImage> = {};
      // À l'arrêt tout au début, les textes entrent encore en fondu : on montre l'image où ils
      // sont lisibles, sinon l'aperçu paraît vide.
      const t = l.t.current === 0 && !l.lecture ? 300 : l.t.current;
      for (const { clip } of clipsActifs(frise, t)) {
        const cle = cleSource(clip.source);
        if (!cle) continue;
        const el = l.medias.current[clip.id];
        if (el instanceof HTMLVideoElement && el.readyState >= 2)
          sources[cle] = { image: el, largeur: el.videoWidth, hauteur: el.videoHeight };
        if (clip.source.type === 'media') {
          const img = l.images.current[clip.source.mediaId];
          if (img?.complete && img.naturalWidth)
            sources[cle] = { image: img, largeur: img.naturalWidth, hauteur: img.naturalHeight };
        }
      }
      dessinerFrise(ctx as unknown as ContexteFrise, frise, t, sources, lignes, themeStudio);
      if (miniature && frise.miniature)
        dessinerMiniature(
          ctx as unknown as ContexteImage,
          frise.miniature,
          frise.format,
          themeStudio,
        );
      raf = requestAnimationFrame(image);
    });
    return () => cancelAnimationFrame(raf);
  }, [frise, lignes, miniature, l.t, l.lecture, l.medias, l.images]);

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center">
      <div
        data-apercu
        className="relative max-h-full max-w-full"
        style={{ aspectRatio: `${largeur} / ${hauteur}`, height: '100%' }}
      >
        <canvas
          ref={canevas}
          width={largeur * ECHELLE}
          height={hauteur * ECHELLE}
          className="block size-full rounded-[4px] bg-neutre-900"
          aria-label="Aperçu du montage"
        />
        {children}
      </div>
      {lecteurs.map(({ clip, chemin, balise }) => {
        const src = urls[chemin];
        if (!src) return null;
        const Balise = balise;
        return (
          <Balise
            key={`${clip}:${sansCors.has(chemin) ? 'n' : 'c'}`}
            ref={(el: HTMLMediaElement | null) => {
              if (el) l.medias.current[clip] = el;
              else delete l.medias.current[clip];
            }}
            src={src}
            crossOrigin={sansCors.has(chemin) ? undefined : 'anonymous'}
            onError={() => setSansCors((s) => (s.has(chemin) ? s : new Set(s).add(chemin)))}
            onLoadedData={() => l.aller(l.t.current)}
            playsInline
            preload="auto"
            className="hidden"
          />
        );
      })}
      {images.map((m) =>
        urls[m.chemin] ? (
          // eslint-disable-next-line @next/next/no-img-element -- dessinée dans le canevas
          <img
            key={m.id}
            ref={(el) => {
              if (el) l.images.current[m.id] = el;
              else delete l.images.current[m.id];
            }}
            src={urls[m.chemin]}
            alt=""
            className="hidden"
          />
        ) : null,
      )}
    </div>
  );
}
