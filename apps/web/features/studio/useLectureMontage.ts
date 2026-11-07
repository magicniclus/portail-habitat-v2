'use client';

import { dureePlan, positionSource, type PlanMontage } from '@ph/core/studio';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Horloge de l'aperçu : temps de la vidéo finale, et synchronisation des médias de la prise
 * (voix, écran, caméra) et des captures sur ce temps, coupe par coupe.
 */
export function useLectureMontage(plan: PlanMontage) {
  const duree = dureePlan(plan);
  const [lecture, setLecture] = useState(false);
  const t = useRef(0);
  const [affiche, setAffiche] = useState(0);
  const prise = useRef<HTMLMediaElement[]>([]);
  const captures = useRef<Record<string, HTMLVideoElement>>({});
  const voix = useRef<HTMLAudioElement | null>(null);

  const caler = useCallback(
    (force: boolean) => {
      const pos = positionSource(plan, t.current);
      const x = plan.plans[pos.index]!;
      const cible = pos.tSource / 1000;
      for (const m of [...prise.current, ...(voix.current ? [voix.current] : [])]) {
        if (force || Math.abs(m.currentTime - cible) > 0.25) m.currentTime = cible;
      }
      const c = x.captureId ? captures.current[x.captureId] : undefined;
      if (c && (force || Math.abs(c.currentTime - pos.tPlan / 1000) > 0.25))
        c.currentTime = Math.min(pos.tPlan / 1000, Math.max(0, (c.duration || 1) - 0.05));
      return pos.index;
    },
    [plan],
  );

  useEffect(() => {
    if (!lecture) {
      [...prise.current, voix.current, ...Object.values(captures.current)].forEach((m) =>
        m?.pause(),
      );
      return;
    }
    let raf = 0;
    let precedent = performance.now();
    let plan_ = caler(true);
    [...prise.current, voix.current, ...Object.values(captures.current)].forEach(
      (m) => void m?.play().catch(() => undefined),
    );
    const pas = (maintenant: number) => {
      t.current = Math.min(duree, t.current + (maintenant - precedent));
      precedent = maintenant;
      // Changement de plan = une coupe : on recale tout ; sinon seulement si ça dérive.
      const i = positionSource(plan, t.current).index;
      caler(i !== plan_);
      plan_ = i;
      setAffiche(t.current);
      if (t.current >= duree) setLecture(false);
      else raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [lecture, duree, plan, caler]);

  const aller = useCallback(
    (ms: number) => {
      t.current = Math.max(0, Math.min(duree, ms));
      setAffiche(t.current);
      caler(true);
    },
    [duree, caler],
  );

  return { duree, lecture, setLecture, t, affiche, aller, prise, captures, voix };
}

export type Lecture = ReturnType<typeof useLectureMontage>;
