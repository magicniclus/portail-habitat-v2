import { diametreRayonPx, tuilesCarte, zoomCarte, type Point } from '@ph/core/onboarding';

const LARGEUR = 1000;
const HAUTEUR = 500;

/** Carte de la zone d'intervention (maquette Ma fiche) : tuiles OpenStreetMap et cercle du rayon. */
export function CarteZoneFiche({ centre, rayonKm }: { centre: Point; rayonKm: number }) {
  const zoom = zoomCarte(rayonKm);
  const d = diametreRayonPx(centre.latitude, zoom, rayonKm);
  return (
    <div
      aria-hidden="true"
      className="relative h-[230px] w-full overflow-hidden rounded-[12px] border border-trait bg-neutre-200"
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: LARGEUR, height: HAUTEUR }}
      >
        {tuilesCarte(centre, zoom, LARGEUR, HAUTEUR).map((t) => (
          // eslint-disable-next-line @next/next/no-img-element -- tuiles OSM 256 px
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
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent/15"
        style={{ width: d, height: d }}
      />
      <span className="absolute top-1/2 left-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-blanc bg-accent shadow-md" />
    </div>
  );
}
