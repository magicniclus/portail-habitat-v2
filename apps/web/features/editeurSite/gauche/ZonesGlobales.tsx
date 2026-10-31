'use client';

import type { Section } from '@ph/core/sites';

/** Ajouter › Zones : zones globales du site, à réutiliser sur la page (copie liée). */
export function ZonesGlobales({
  globales,
  carte,
  onInserer,
}: {
  globales: { globale: string; section: Section; pages: number }[];
  carte: string;
  onInserer: (s: Section) => void;
}) {
  if (!globales.length) return null;
  return (
    <section aria-labelledby="zones-globales" className="grid gap-2">
      <h3
        id="zones-globales"
        className="m-0 text-[11px] font-bold tracking-[0.08em] text-neutre-600 uppercase"
      >
        Zones globales
      </h3>
      {globales.map((g) => (
        <button
          key={g.globale}
          type="button"
          className={carte}
          onClick={() => onInserer(g.section)}
        >
          <span className="grid gap-0.5">
            <span className="text-sm font-bold">{g.section.p.nom || 'Zone globale'}</span>
            <span className="text-xs text-neutre-700">
              Sur {g.pages} page{g.pages > 1 ? 's' : ''} · modifiée partout à la fois
            </span>
          </span>
        </button>
      ))}
    </section>
  );
}
