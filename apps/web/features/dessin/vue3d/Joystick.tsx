'use client';

import { useRef, useState } from 'react';

/**
 * Joystick tactile (DES-34) : on pose le pouce dans le cercle et on le pousse ; la direction
 * et la force vont de -1 à 1. Utilisable aussi à la souris.
 */
export function Joystick({ bouger }: { bouger: (v: { x: number; y: number }) => void }) {
  const zone = useRef<HTMLDivElement>(null);
  const [pouce, setPouce] = useState({ x: 0, y: 0 });
  const suivre = (ev: React.PointerEvent) => {
    const r = zone.current?.getBoundingClientRect();
    if (!r) return;
    const rayon = r.width / 2;
    let x = (ev.clientX - r.left - rayon) / rayon;
    let y = (ev.clientY - r.top - rayon) / rayon;
    const l = Math.hypot(x, y);
    if (l > 1) [x, y] = [x / l, y / l];
    setPouce({ x, y });
    bouger({ x, y });
  };
  const lacher = () => {
    setPouce({ x: 0, y: 0 });
    bouger({ x: 0, y: 0 });
  };
  return (
    <div
      ref={zone}
      role="application"
      aria-label="Joystick : avancer, reculer, aller de côté"
      className="absolute bottom-5 left-5 size-32 touch-none rounded-full border-2 border-blanc/80 bg-texte/25 backdrop-blur-sm"
      onPointerDown={(ev) => {
        ev.stopPropagation();
        ev.currentTarget.setPointerCapture(ev.pointerId);
        suivre(ev);
      }}
      onPointerMove={(ev) => {
        if (ev.currentTarget.hasPointerCapture(ev.pointerId)) suivre(ev);
      }}
      onPointerUp={lacher}
      onPointerCancel={lacher}
    >
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 size-14 rounded-full bg-blanc shadow-md"
        style={{
          transform: `translate(calc(-50% + ${pouce.x * 36}px), calc(-50% + ${pouce.y * 36}px))`,
        }}
      />
    </div>
  );
}
