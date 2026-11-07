'use client';

import {
  dessinerImage,
  dessinerMiniature,
  FORMATS_STUDIO,
  lignesSousTitres,
  motsSortie,
  reglagesSousTitres,
  type ContexteImage,
  type MotTranscrit,
  type PlanMontage,
  type SourceImage,
} from '@ph/core/studio';
import { themeStudio } from '@ph/ui/tokens';
import { useEffect, useMemo, useRef, useState } from 'react';
import { urlFichierStudio } from '@/lib/firebaseClient';
import type { Lecture } from './useLectureMontage';

const ECHELLE = 0.5;
const source = (v: HTMLVideoElement | undefined): SourceImage | undefined =>
  v && v.readyState >= 2 ? { image: v, largeur: v.videoWidth, hauteur: v.videoHeight } : undefined;

/** Aperçu du montage, image par image, avec les mêmes calques que la vidéo finale. */
export function ApercuMontage({
  plan,
  prise,
  captures,
  mots,
  lecture,
  miniature: voirMiniature = false,
}: {
  plan: PlanMontage;
  prise: { ecran?: string; camera?: string; voix?: string };
  captures: Record<string, string>;
  mots: MotTranscrit[];
  /** Horloge partagée avec la frise de l'éditeur. */
  lecture: Lecture;
  /** Montrer l'image de couverture (miniature) au lieu de la vidéo. */
  miniature?: boolean;
}) {
  const { largeur, hauteur } = FORMATS_STUDIO[plan.format];
  const canevas = useRef<HTMLCanvasElement>(null);
  const ecran = useRef<HTMLVideoElement>(null);
  const camera = useRef<HTMLVideoElement>(null);
  const l = lecture;
  const [urls, setUrls] = useState<Record<string, string>>({});
  const lignes = useMemo(
    () => lignesSousTitres(motsSortie(plan, mots), reglagesSousTitres(plan.format)),
    [plan, mots],
  );

  useEffect(() => {
    const voulues: Record<string, string> = { ...prise };
    for (const c of plan.captures) {
      const f = captures[`${c.id}:${c.scene}`];
      if (f) voulues[`capture:${c.id}`] = f;
    }
    void Promise.all(
      Object.entries(voulues).map(
        async ([k, chemin]) => [k, await urlFichierStudio(chemin).catch(() => '')] as const,
      ),
    ).then((r) => setUrls(Object.fromEntries(r.filter(([, u]) => u))));
    void new FontFace('Archivo', `url(${themeStudio.fichierPolice})`, { weight: '800' })
      .load()
      .then((f) => document.fonts.add(f))
      .catch(() => undefined);
  }, [prise, captures, plan.captures]);

  useEffect(() => {
    l.prise.current = [ecran.current, camera.current].filter((x): x is HTMLVideoElement =>
      Boolean(x),
    );
  });

  useEffect(() => {
    const ctx = canevas.current?.getContext('2d');
    if (!ctx) return;
    let raf = requestAnimationFrame(function image() {
      ctx.setTransform(ECHELLE, 0, 0, ECHELLE, 0, 0);
      const caps = Object.fromEntries(
        Object.entries(l.captures.current).flatMap(([id, v]) => {
          const s = source(v);
          return s ? [[id, s]] : [];
        }),
      );
      dessinerImage(
        ctx as unknown as ContexteImage,
        plan,
        // À l'arrêt tout au début, les textes sont encore transparents (entrée en fondu) : on
        // montre l'image où ils sont lisibles, sinon l'aperçu paraît vide.
        l.t.current === 0 && !l.lecture ? 300 : l.t.current,
        {
          ...(source(ecran.current ?? undefined) ? { ecran: source(ecran.current!)! } : {}),
          ...(source(camera.current ?? undefined) ? { camera: source(camera.current!)! } : {}),
          captures: caps,
        },
        lignes,
        themeStudio,
      );
      if (voirMiniature && plan.miniature)
        dessinerMiniature(
          ctx as unknown as ContexteImage,
          plan.miniature,
          plan.format,
          themeStudio,
        );
      raf = requestAnimationFrame(image);
    });
    return () => cancelAnimationFrame(raf);
  }, [plan, lignes, l.t, l.captures, l.lecture, voirMiniature]);

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center">
      <canvas
        ref={canevas}
        width={largeur * ECHELLE}
        height={hauteur * ECHELLE}
        className="block max-h-full max-w-full rounded-[4px] bg-neutre-900 object-contain"
        style={{ aspectRatio: `${largeur} / ${hauteur}`, height: '100%' }}
        aria-label="Aperçu du montage"
      />
      {urls.ecran ? (
        <video ref={ecran} src={urls.ecran} muted playsInline preload="auto" className="hidden" />
      ) : null}
      {urls.camera ? (
        <video ref={camera} src={urls.camera} muted playsInline preload="auto" className="hidden" />
      ) : null}
      {urls.voix ? (
        <audio
          ref={(a) => void (l.voix.current = a)}
          src={urls.voix}
          preload="auto"
          className="hidden"
        />
      ) : null}
      {plan.captures.map((c) =>
        urls[`capture:${c.id}`] ? (
          <video
            key={c.id}
            ref={(v) => {
              if (v) l.captures.current[c.id] = v;
              else delete l.captures.current[c.id];
            }}
            src={urls[`capture:${c.id}`]}
            muted
            playsInline
            preload="auto"
            className="hidden"
          />
        ) : null,
      )}
    </div>
  );
}
