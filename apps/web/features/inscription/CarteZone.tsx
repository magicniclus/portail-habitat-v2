import {
  diametreRayonPx,
  RAYON_ZONE,
  tuilesCarte,
  zoomCarte,
  type Point,
} from '@ph/core/onboarding';
import type { ReactNode } from 'react';

/** Calque de tuiles plus grand que la carte, centré : la carte reste pleine quelle que soit sa largeur. */
const LARGEUR = 1000;
const HAUTEUR = 760;
const FRANCE: Point = { latitude: 46.6, longitude: 2.4 };

/**
 * Carte de l'étape 2 (maquette Onboarding Etape 2) : fond OpenStreetMap, recherche de la ville en
 * haut, cercle du rayon et curseur de 10 à 100 km en bas une fois la ville choisie.
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
        <div className="absolute inset-x-3.5 bottom-3.5 grid gap-1 rounded-[12px] bg-blanc px-3.5 pt-2.5 pb-1 shadow-lg">
          <label
            htmlFor="rayon-zone"
            className="flex items-center justify-between text-sm font-semibold"
          >
            Rayon d&apos;intervention
            <span className="text-accent-700 tabular-nums">{rayon} km</span>
          </label>
          <input
            id="rayon-zone"
            type="range"
            min={RAYON_ZONE.min}
            max={RAYON_ZONE.max}
            step={RAYON_ZONE.pas}
            value={rayon}
            onChange={(e) => onRayon(Number(e.target.value))}
            aria-valuetext={`${rayon} kilomètres`}
            className="min-h-11 w-full cursor-pointer accent-accent"
          />
        </div>
      ) : null}
    </div>
  );
}
