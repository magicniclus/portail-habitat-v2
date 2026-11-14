'use client';

import type { ModeleSite } from '@ph/core/sites';
import type { CSSProperties } from 'react';

type Palette = { primaire: string; accent: string; clair: string; sombre: string };

/**
 * Vignette d'un modèle de site (maquette Editeur de Site) : barre de navigation, bandeau selon le
 * style du modèle (photo à droite, photo assombrie, sombre, minimal) et trois cartes.
 */
export function VignetteModele({ m, p }: { m: ModeleSite; p: Palette }) {
  const r = `${Math.min(m.rayonBoutons, 6)}px`;
  const photo = `linear-gradient(135deg, ${p.primaire}, ${p.sombre})`;
  const clairTxt = m.hero === 'photo' || m.hero === 'sombre';
  const centre = m.hero === 'photo' || m.hero === 'minimal';
  const fondHero =
    m.hero === 'photo'
      ? `linear-gradient(rgba(10,14,20,.55),rgba(10,14,20,.55)), ${photo}`
      : m.hero === 'sombre'
        ? p.sombre
        : m.hero === 'minimal'
          ? 'white'
          : p.clair;
  const trait = (s: CSSProperties) => <span style={{ borderRadius: 2, ...s }} />;
  return (
    <span
      aria-hidden="true"
      className="grid aspect-[16/10] overflow-hidden rounded-[6px] border border-trait bg-blanc"
      style={{ gridTemplateRows: '14px 1fr 26px' }}
    >
      <span className="flex items-center gap-1.5 bg-blanc px-2">
        <span className="size-2 rounded-[2px]" style={{ background: p.primaire }} />
        <span
          className="mx-6 h-[3px] flex-1 rounded-[2px]"
          style={{
            background: `repeating-linear-gradient(90deg, color-mix(in srgb, ${p.sombre} 35%, transparent) 0 12px, transparent 12px 18px)`,
          }}
        />
        <span className="h-[7px] w-[22px]" style={{ borderRadius: r, background: p.primaire }} />
      </span>
      <span
        className="grid items-center gap-2 px-2.5 py-2"
        style={{
          gridTemplateColumns: m.hero === 'split' ? '1.1fr 1fr' : '1fr',
          justifyItems: centre ? 'center' : 'stretch',
          background: fondHero,
        }}
      >
        <span
          className="grid gap-1"
          style={{
            justifyItems: centre ? 'center' : 'start',
            width: m.hero === 'split' || m.hero === 'sombre' ? 'auto' : '70%',
          }}
        >
          {trait({ height: 3, width: '40%', background: clairTxt ? 'white' : p.accent })}
          {trait({
            height: m.polices === 'dmserif' ? 6 : 8,
            width: '100%',
            background: clairTxt ? 'white' : p.sombre,
          })}
          {trait({
            height: 8,
            width: '80%',
            background: clairTxt ? 'rgba(255,255,255,.85)' : p.sombre,
          })}
          <span
            className="mt-[3px] h-2 w-[34px]"
            style={{ borderRadius: r, background: clairTxt ? p.accent : p.primaire }}
          />
        </span>
        {m.hero === 'split' ? (
          <span className="h-full min-h-10" style={{ borderRadius: r, background: photo }} />
        ) : null}
      </span>
      <span
        className="grid grid-cols-3 gap-[5px] px-2.5 py-[5px]"
        style={{ background: m.hero === 'sombre' ? p.sombre : 'white' }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              borderRadius: r,
              background: m.hero === 'minimal' ? 'white' : p.clair,
              border:
                m.hero === 'minimal'
                  ? `1px solid color-mix(in srgb, ${p.sombre} 14%, transparent)`
                  : 0,
            }}
          />
        ))}
      </span>
    </span>
  );
}
