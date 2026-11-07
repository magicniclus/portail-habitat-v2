import { diametreRayonPx, tuilesCarte, zoomCarte, type Point } from '@ph/core/onboarding';
import { cn } from '@ph/ui';
import type { ReactNode } from 'react';

const RAYONS = [30, 50, 100] as const;
/** Calque de tuiles plus grand que la carte, centré : la carte reste pleine quelle que soit sa largeur. */
const LARGEUR = 1000;
const HAUTEUR = 760;
const FRANCE: Point = { latitude: 46.6, longitude: 2.4 };

/**
 * Carte de l'étape 2 (maquette Onboarding Etape 2) : fond OpenStreetMap, recherche de la ville en
 * haut, cercle du rayon et choix 30/50/100 km en bas une fois la ville choisie.
 */
export function CarteZone({
  centre,
  rayon,
  onRayon,
  recherche,
}: {
  centre: Point | null;
  rayon: number;
  onRayon: (r: number) => void;
  recherche: ReactNode;
}) {
  const zoom = zoomCarte(centre ? rayon : null);
  const tuiles = tuilesCarte(centre ?? FRANCE, zoom, LARGEUR, HAUTEUR);
  const d = centre ? diametreRayonPx(centre.latitude, zoom, rayon) : 0;
  // Étiquette posée sur le rayon tracé à -32° (maquette).
  const angle = 0.5585;
  return (
    <div className="relative h-[clamp(300px,42vh,400px)] w-full overflow-hidden rounded-[14px] border border-trait bg-neutre-200 shadow-md">
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: LARGEUR, height: HAUTEUR }}
      >
        {tuiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element -- tuiles OSM 256 px, pas d'optimisation utile
          <img
            key={t.url}
            src={t.url}
            alt=""
            width={256}
            height={256}
            loading="lazy"
            className="absolute max-w-none"
            style={{ left: t.x, top: t.y }}
          />
        ))}
      </div>
      {centre ? (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent/15 motion-safe:transition-[width,height] motion-safe:duration-300"
            style={{ width: d, height: d }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 h-0 origin-left -rotate-[32deg] border-t-2 border-dashed border-accent"
            style={{ width: d / 2 }}
          />
          <span
            className="pointer-events-none absolute top-1/2 left-1/2 rounded-pill bg-accent-action px-2.5 py-1 text-xs font-bold whitespace-nowrap text-blanc shadow-sm"
            style={{
              transform: `translate(${Math.round((d / 4) * Math.cos(angle))}px, ${Math.round(-(d / 4) * Math.sin(angle) - 26)}px)`,
            }}
          >
            {rayon} km de rayon
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-blanc bg-accent shadow-md"
          />
        </>
      ) : null}
      <div className="absolute inset-x-3.5 top-3.5">{recherche}</div>
      {centre ? (
        <fieldset className="absolute inset-x-3.5 bottom-3.5 m-0 flex flex-wrap items-center gap-3 rounded-[12px] border-0 bg-blanc px-3.5 py-3 shadow-lg">
          <legend className="float-left p-0 text-sm font-semibold">
            Rayon d&apos;intervention
          </legend>
          <div className="ml-auto flex gap-2">
            {RAYONS.map((r) => (
              <label
                key={r}
                className={cn(
                  'inline-flex min-h-11 cursor-pointer items-center rounded-pill border px-3.5 text-[13px] font-semibold whitespace-nowrap',
                  'has-focus-visible:outline-2 has-focus-visible:outline-accent',
                  rayon === r
                    ? 'border-accent bg-accent-action text-blanc'
                    : 'border-trait bg-blanc text-neutre-800',
                )}
              >
                <input
                  type="radio"
                  name="rayon"
                  value={r}
                  checked={rayon === r}
                  onChange={() => onRayon(r)}
                  className="sr-only"
                />
                {r} km
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
