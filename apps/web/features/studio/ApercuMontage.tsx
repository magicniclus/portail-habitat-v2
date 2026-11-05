'use client';

import {
  dessinerImage,
  FORMATS_STUDIO,
  lignesSousTitres,
  motsSortie,
  type ContexteImage,
  type MotTranscrit,
  type PlanMontage,
  type SourceImage,
} from '@ph/core/studio';
import { Button } from '@ph/ui';
import { themeStudio } from '@ph/ui/tokens';
import { useEffect, useMemo, useRef, useState } from 'react';
import { urlFichierStudio } from '@/lib/firebaseClient';
import { useLectureMontage } from './useLectureMontage';

const ECHELLE = 0.5;
const source = (v: HTMLVideoElement | undefined): SourceImage | undefined =>
  v && v.readyState >= 2 ? { image: v, largeur: v.videoWidth, hauteur: v.videoHeight } : undefined;
const sec = (ms: number) => `${Math.floor(ms / 1000)} s`;

/** Aperçu du montage, image par image, avec les mêmes calques que la vidéo finale. */
export function ApercuMontage({
  plan,
  prise,
  captures,
  mots,
}: {
  plan: PlanMontage;
  prise: { ecran?: string; camera?: string; voix: string };
  captures: Record<string, string>;
  mots: MotTranscrit[];
}) {
  const { largeur, hauteur } = FORMATS_STUDIO[plan.format];
  const canevas = useRef<HTMLCanvasElement>(null);
  const ecran = useRef<HTMLVideoElement>(null);
  const camera = useRef<HTMLVideoElement>(null);
  const l = useLectureMontage(plan);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const lignes = useMemo(() => lignesSousTitres(motsSortie(plan, mots)), [plan, mots]);

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
        l.t.current,
        {
          ...(source(ecran.current ?? undefined) ? { ecran: source(ecran.current!)! } : {}),
          ...(source(camera.current ?? undefined) ? { camera: source(camera.current!)! } : {}),
          captures: caps,
        },
        lignes,
        themeStudio,
      );
      raf = requestAnimationFrame(image);
    });
    return () => cancelAnimationFrame(raf);
  }, [plan, lignes, l.t, l.captures]);

  return (
    <div className="grid justify-items-center gap-2">
      <canvas
        ref={canevas}
        width={largeur * ECHELLE}
        height={hauteur * ECHELLE}
        className="h-auto max-h-[70vh] w-auto max-w-full rounded-card bg-neutre-900"
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
      <div className="flex w-full max-w-[540px] items-center gap-3">
        <Button
          taille="sm"
          onClick={() =>
            l.affiche >= l.duree ? (l.aller(0), l.setLecture(true)) : l.setLecture(!l.lecture)
          }
        >
          {l.lecture ? 'Pause' : 'Lire'}
        </Button>
        <input
          type="range"
          min={0}
          max={l.duree}
          step={100}
          value={Math.round(l.affiche)}
          onChange={(e) => l.aller(Number(e.target.value))}
          className="min-h-11 flex-1"
          aria-label="Position dans la vidéo"
        />
        <span className="text-sm tabular-nums">
          {sec(l.affiche)} / {sec(l.duree)}
        </span>
      </div>
      {!plan.captures.every((c) => urls[`capture:${c.id}`]) ? (
        <p className="m-0 text-xs text-neutre-700">
          Les captures Portail Travaux apparaîtront ici dès que le robot les aura filmées.
        </p>
      ) : null}
    </div>
  );
}
