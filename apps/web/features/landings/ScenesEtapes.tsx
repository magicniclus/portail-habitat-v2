import type { Benefice } from '@ph/core/landings';
import { cn } from '@ph/ui';
import { CaptureEcran } from './CaptureEcran';

/** Fonds des trois étapes, superposés : leur opacité suit le défilement (aucun saut de couleur). */
export const FONDS = ['bg-accent-100', 'bg-neutre-100', 'bg-texte'];
const mix = (c: string, p: number) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
/** Positions des deux halos à chaque étape (x1, y1, x2, y2), interpolées au défilement. */
export const POSITIONS_HALOS = [
  ['-12vw', '-20vh', '58vw', '40vh'],
  ['52vw', '-26vh', '-14vw', '44vh'],
  ['24vw', '34vh', '66vw', '-30vh'],
] as const;

/**
 * Décor : fonds superposés, deux halos qui glissent, grille de points, grands numéros d'étape.
 * Les éléments marqués `data-*` sont animés par le défilement (EtapesDefilement).
 */
export function Decor() {
  const halo = 'absolute top-0 left-0 rounded-full will-change-transform';
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {FONDS.map((f, i) => (
        <span
          key={f}
          data-fond={i}
          className={cn('absolute inset-0', f)}
          style={{ opacity: i === 0 ? 1 : 0 }}
        />
      ))}
      <div className="sticky top-0 h-screen overflow-hidden">
        <span
          data-halo="1"
          className={cn(halo, 'size-[min(90vw,1100px)]')}
          style={{
            background: `radial-gradient(circle, ${mix('var(--accent-400)', 40)} 0%, transparent 68%)`,
            transform: `translate3d(${POSITIONS_HALOS[0][0]},${POSITIONS_HALOS[0][1]},0)`,
          }}
        />
        <span
          data-halo="2"
          className={cn(halo, 'size-[min(80vw,900px)]')}
          style={{
            background: `radial-gradient(circle, ${mix('var(--accent)', 22)} 0%, transparent 68%)`,
            transform: `translate3d(${POSITIONS_HALOS[0][2]},${POSITIONS_HALOS[0][3]},0)`,
          }}
        />
        <span
          className="absolute inset-0 bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_30%,transparent_75%)]"
          style={{
            backgroundImage: `radial-gradient(${mix('var(--color-texte)', 12)} 1px, transparent 1.2px)`,
          }}
        />
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            data-numero={i}
            className="absolute bottom-[-0.18em] left-[-0.04em] text-[min(38vw,420px)] leading-none font-bold tracking-[-0.06em] text-transparent select-none"
            style={{
              opacity: i === 0 ? 1 : 0,
              WebkitTextStroke: `2px ${mix(i === 2 ? 'var(--color-blanc)' : 'var(--color-texte)', i === 2 ? 14 : 10)}`,
            }}
          >
            0{i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

const PUCES = [
  { cle: 'Inclus', d: 'M20 6 9 17l-5-5', place: 'left-0 top-2' },
  {
    cle: 'Automatique',
    d: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1',
    place: 'right-0 top-[42%]',
  },
  { cle: 'Ensuite', d: 'M4 12h16M14 6l6 6-6 6', place: 'right-[12%] bottom-0' },
];

/** Capture de l'étape sur sa plaque, avec trois pastilles (`data-puce`) et sa légende. */
export function Scene({ b, i, fonce }: { b: Benefice; i: number; fonce: boolean }) {
  return (
    <div
      data-scene={i}
      className="pointer-events-none min-w-0 will-change-transform [grid-area:1/1]"
      style={i === 0 ? undefined : { opacity: 0, visibility: 'hidden' }}
    >
      <div className="relative pt-[34px] pr-10 pb-11 pl-7">
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-0 right-4 bottom-4 left-0 rounded-[20px] border',
            fonce ? 'border-blanc/15 bg-blanc/5' : 'border-accent-300 bg-blanc/65',
          )}
        />
        <div className="relative z-[1] overflow-hidden rounded-[14px] shadow-lg">
          <CaptureEcran capture={b.capture} cadre="navigateur" legende={false} />
        </div>
        {PUCES.map((p, n) =>
          b.points[n] ? (
            <div
              key={p.cle}
              data-puce
              className={cn(
                'absolute z-[2] flex max-w-[250px] items-center gap-2.5 rounded-[12px] border border-trait bg-blanc py-2.5 pr-3.5 pl-2.5 text-texte shadow-md',
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
        <span
          className={cn(
            'absolute bottom-3.5 left-7 text-[13px] leading-[18px]',
            fonce ? 'text-blanc/75' : 'text-neutre-700',
          )}
        >
          {b.capture.legende}
        </span>
      </div>
    </div>
  );
}
