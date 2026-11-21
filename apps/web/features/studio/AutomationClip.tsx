'use client';

import type { Clip } from '@ph/core/studio';
import type { PointerEvent as EvtPointeur } from 'react';

/**
 * Courbe d'automation modifiable sur le clip (comme dans les logiciels de montage) : un clic
 * pose un point (temps et valeur sous le curseur), un point se glisse, un double-clic l'enlève.
 * Volume de 0 à 200 %, opacité de 0 à 100 %.
 */
export function AutomationClip({
  clip: c,
  param,
  onDebut,
  onPoint,
  onRetirer,
}: {
  clip: Clip;
  param: 'volume' | 'opacite';
  onDebut: () => void;
  /** Pose ou déplace un point (`ancien` : temps du point déplacé). */
  onPoint: (p: { t: number; v: number }, ancien?: number) => void;
  onRetirer: (t: number) => void;
}) {
  const max = param === 'volume' ? 2 : 1;
  const pts = c.automations?.[param] ?? [];
  const lire = (e: { clientX: number; clientY: number }, zone: Element) => {
    const r = zone.getBoundingClientRect();
    const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return { t: Math.round(fx * c.duree), v: +((1 - fy) * max).toFixed(2) };
  };
  const glisserPoint = (e: EvtPointeur<HTMLSpanElement>, t0: number) => {
    e.stopPropagation();
    const zone = e.currentTarget.parentElement!;
    onDebut();
    let ancien = t0;
    const bouger = (m: PointerEvent) => {
      const p = lire(m, zone);
      onPoint(p, ancien);
      ancien = p.t;
    };
    const fin = () => {
      window.removeEventListener('pointermove', bouger);
      window.removeEventListener('pointerup', fin);
    };
    window.addEventListener('pointermove', bouger);
    window.addEventListener('pointerup', fin);
  };
  const y = (v: number) => 100 - (v / max) * 100;
  const x = (t: number) => (t / c.duree) * 100;
  const d = pts.length
    ? [
        `M0 ${y(pts[0]!.v)}`,
        ...pts.map((p) => `L${x(p.t)} ${y(p.v)}`),
        `L100 ${y(pts.at(-1)!.v)}`,
      ].join(' ')
    : `M0 ${y(1)} L100 ${y(1)}`;
  return (
    <div
      role="group"
      aria-label={`Automation ${param === 'volume' ? 'du volume' : 'de l’opacité'} : cliquez pour poser un point`}
      className="absolute inset-0 z-10 cursor-crosshair bg-black/25 text-montage-tete"
      onPointerDown={(e) => {
        e.stopPropagation();
        onDebut();
        onPoint(lire(e, e.currentTarget));
      }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
      >
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeDasharray={pts.length ? undefined : '4 3'}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {pts.map((p) => (
        <span
          key={p.t}
          role="button"
          tabIndex={-1}
          aria-label={`Point à ${Math.round(p.v * 100)} % : glisser pour déplacer, double-clic pour enlever`}
          title={`${Math.round(p.v * 100)} %`}
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border border-montage-fond bg-montage-tete"
          style={{ left: `${x(p.t)}%`, top: `${y(p.v)}%` }}
          onPointerDown={(e) => glisserPoint(e, p.t)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onRetirer(p.t);
          }}
        />
      ))}
    </div>
  );
}
