'use client';

import { dureeFrise, gainClip, tempsSource, type Clip, type Frise } from '@ph/core/studio';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Chaîne de traitement d'un média : filtres son du clip puis volume (WebAudio). */
interface Chaine {
  passeHaut: BiquadFilterNode;
  graves: BiquadFilterNode;
  mediums: BiquadFilterNode;
  aigus: BiquadFilterNode;
  presence: BiquadFilterNode;
  passeBas: BiquadFilterNode;
  gain: GainNode;
}

function creerChaine(ctx: AudioContext, el: HTMLMediaElement): Chaine {
  const f = (type: BiquadFilterType, frequence: number) => {
    const n = ctx.createBiquadFilter();
    n.type = type;
    n.frequency.value = frequence;
    return n;
  };
  const c: Chaine = {
    passeHaut: f('highpass', 20),
    graves: f('lowshelf', 200),
    mediums: f('peaking', 1_000),
    aigus: f('highshelf', 4_000),
    presence: f('peaking', 3_000),
    passeBas: f('lowpass', 20_000),
    gain: ctx.createGain(),
  };
  ctx
    .createMediaElementSource(el)
    .connect(c.passeHaut)
    .connect(c.graves)
    .connect(c.mediums)
    .connect(c.aigus)
    .connect(c.presence)
    .connect(c.passeBas)
    .connect(c.gain)
    .connect(ctx.destination);
  return c;
}

/** Réglages son d'un clip : égaliseur, « voix claire » (présence), « réduction de bruit ». */
function reglerChaine(c: Chaine, s: Clip['son'], gain: number) {
  c.passeHaut.frequency.value = s?.reductionBruit ? 120 : s?.voixClaire ? 90 : 20;
  c.graves.gain.value = s?.graves ?? 0;
  c.mediums.gain.value = s?.mediums ?? 0;
  c.aigus.gain.value = s?.aigus ?? 0;
  c.presence.gain.value = s?.voixClaire ? 4 : 0;
  c.passeBas.frequency.value = s?.reductionBruit ? 9_000 : 20_000;
  c.gain.gain.value = gain;
}

/**
 * Horloge et mixage de l'aperçu de la frise : un élément média par clip (vidéo, son, prise,
 * capture), calé sur le temps de la frise, avec sa vitesse ; le son passe par WebAudio (volume
 * jusqu'à 200 %, fondus, automations, solo, filtres). Sans WebAudio (fichier sans CORS), le
 * volume de l'élément sert de secours (100 % au plus, sans filtres).
 */
export function useLectureFrise(frise: Frise) {
  const duree = dureeFrise(frise);
  const [lecture, setLecture] = useState(false);
  const t = useRef(0);
  const [affiche, setAffiche] = useState(0);
  /** Élément média de chaque clip (id du clip). */
  const medias = useRef<Record<string, HTMLMediaElement>>({});
  /** Images importées (id du média). */
  const images = useRef<Record<string, HTMLImageElement>>({});
  const audio = useRef<{ ctx: AudioContext; chaines: WeakMap<HTMLMediaElement, Chaine> } | null>(
    null,
  );

  const caler = useCallback(
    (force: boolean, joue: boolean) => {
      const solo = frise.pistes.some((p) => p.solo);
      for (const p of frise.pistes)
        for (const c of p.clips) {
          const el = medias.current[c.id];
          if (!el) continue;
          const local = t.current - c.debut;
          if (local < 0 || local >= c.duree) {
            if (!el.paused) el.pause();
            continue;
          }
          const cible = tempsSource(c, t.current) / 1000;
          if (force || Math.abs(el.currentTime - cible) > 0.25) el.currentTime = cible;
          el.playbackRate = c.vitesse ?? 1;
          const g = gainClip(p, c, local, solo);
          const a = audio.current;
          let chaine = a?.chaines.get(el);
          if (a && !chaine && el.crossOrigin === 'anonymous') {
            chaine = creerChaine(a.ctx, el);
            a.chaines.set(el, chaine);
          }
          if (chaine) reglerChaine(chaine, c.son, g);
          else el.volume = Math.min(1, g);
          if (joue && el.paused) void el.play().catch(() => undefined);
          if (!joue && !el.paused) el.pause();
        }
    },
    [frise],
  );

  useEffect(() => {
    if (!lecture) {
      caler(true, false);
      return;
    }
    // Le contexte audio naît au premier « Lire » (geste de l'utilisateur).
    audio.current ??= { ctx: new AudioContext(), chaines: new WeakMap() };
    void audio.current.ctx.resume();
    let raf = 0;
    let precedent = performance.now();
    caler(true, true);
    const pas = (maintenant: number) => {
      t.current = Math.min(duree, t.current + (maintenant - precedent));
      precedent = maintenant;
      caler(false, true);
      setAffiche(t.current);
      if (t.current >= duree) setLecture(false);
      else raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [lecture, duree, caler]);

  const aller = useCallback(
    (ms: number) => {
      t.current = Math.max(0, Math.min(duree, ms));
      setAffiche(t.current);
      caler(true, lecture);
    },
    [duree, caler, lecture],
  );

  return { duree, lecture, setLecture, t, affiche, aller, medias, images };
}

export type LectureFrise = ReturnType<typeof useLectureFrise>;
