import type { Benefice } from '@ph/core/landings';
import { cn } from '@ph/ui';
import { CaptureEcran } from './CaptureEcran';

const mix = (c: string, p: number) => `color-mix(in srgb, ${c} ${p}%, transparent)`;

/** Décor fixe (rien n'y bouge : l'animation reste légère) : lueur douce et grille de points. */
export function Decor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-accent-100">
      <span
        className="absolute inset-0"
        style={{
          background: `radial-gradient(60% 50% at 78% 40%, ${mix('var(--accent-400)', 28)} 0%, transparent 70%), radial-gradient(45% 40% at 10% 85%, ${mix('var(--accent)', 12)} 0%, transparent 70%)`,
        }}
      />
      <span
        className="absolute inset-0 bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_60%_50%,#000_20%,transparent_75%)]"
        style={{
          backgroundImage: `radial-gradient(${mix('var(--color-texte)', 10)} 1px, transparent 1.2px)`,
        }}
      />
    </div>
  );
}

const PUCES = [
  { cle: 'Inclus', d: 'M20 6 9 17l-5-5', place: '-left-3 top-6' },
  {
    cle: 'Automatique',
    d: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1',
    place: '-right-4 top-[40%]',
  },
  { cle: 'Ensuite', d: 'M4 12h16M14 6l6 6-6 6', place: 'right-[10%] -bottom-5' },
];

/**
 * Contenu d'une étape posé sur la plaque commune : capture, trois pastilles (`data-puce`) et
 * légende. Les étapes se superposent ; seules l'opacité et la position bougent (animation fluide).
 */
export function Scene({ b, i }: { b: Benefice; i: number }) {
  return (
    <div
      data-scene={i}
      className="pointer-events-none relative min-w-0 will-change-transform [grid-area:1/1]"
      style={i === 0 ? undefined : { opacity: 0, visibility: 'hidden' }}
    >
      <div className="overflow-hidden rounded-[14px] shadow-[0_24px_60px_-24px_rgb(0_0_0/0.35)]">
        <CaptureEcran capture={b.capture} cadre="navigateur" legende={false} />
      </div>
      {PUCES.map((p, n) =>
        b.points[n] ? (
          <div
            key={p.cle}
            data-puce
            className={cn(
              'absolute z-[2] flex max-w-[250px] items-center gap-2.5 rounded-[12px] border border-trait bg-blanc py-2.5 pr-3.5 pl-2.5 text-texte shadow-md will-change-transform',
              p.place,
            )}
          >
            <span className="flex size-[30px] flex-none items-center justify-center rounded-[8px] border border-accent-300 bg-accent-100 text-accent-700">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={p.d} />
              </svg>
            </span>
            <span className="grid min-w-0 gap-px">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-accent-700">
                {p.cle}
              </span>
              <span className="text-sm leading-[19px] font-semibold">{b.points[n]}</span>
            </span>
          </div>
        ) : null,
      )}
      <p className="m-0 mt-7 max-w-[52%] text-[13px] leading-[18px] text-neutre-700">
        {b.capture.legende}
      </p>
    </div>
  );
}
