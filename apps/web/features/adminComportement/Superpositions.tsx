'use client';

import { formatPart } from '@ph/core/comportement';
import { couleursComportement } from '@ph/ui/tokens';
import { atteinte, trouverElement } from './calques';
import type { CalqueComportement, DonneesCartes } from './types';

type Boite = { x: number; y: number; w: number; h: number };
const boiteDe = (el: Element | null): Boite | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width && r.height ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
};

/** Repères dessinés au-dessus de la page : seuils de défilement, frictions, sorties par section. */
export function Superpositions({
  calque,
  donnees,
  doc,
  largeur,
  hauteur,
  echelle,
  surligne,
}: {
  calque: CalqueComportement;
  donnees: DonneesCartes;
  doc: Document | null;
  largeur: number;
  hauteur: number;
  echelle: number;
  surligne?: string | null;
}) {
  const etiquettes: { x: number; y: number; texte: string; couleur: string }[] = [];
  const boites: (Boite & { couleur: string })[] = [];
  const lignes: number[] = [];
  if (calque === 'defilement')
    for (const v of [0.75, 0.5, 0.25]) {
      let y = 0;
      while (y < hauteur && atteinte(donnees.scroll, donnees.sessions, y, hauteur) > v) y += 10;
      if (y < hauteur) {
        lignes.push(y);
        etiquettes.push({
          x: 8,
          y,
          texte: `${formatPart(v)} des visiteurs arrivent ici`,
          couleur: couleursComportement.curseur,
        });
      }
    }
  if (calque === 'frictions' && doc)
    for (const [cle, e] of Object.entries(donnees.elements)) {
      if (!e.morts && !e.rages) continue;
      const b = boiteDe(trouverElement(doc, cle));
      if (!b) continue;
      const couleur = e.rages ? couleursComportement.rage : couleursComportement.clicMort;
      boites.push({ ...b, couleur });
      const part = (e.rages || e.morts) / Math.max(1, donnees.sessions);
      etiquettes.push({
        x: b.x,
        y: b.y - 4,
        texte: `${e.rages ? 'Clics de rage' : 'Clic mort'} · ${formatPart(part)}`,
        couleur,
      });
    }
  if (calque === 'sorties' && doc)
    for (const s of donnees.sorties) {
      const b = boiteDe(doc.querySelector(`[data-ph-section="${CSS.escape(s.section)}"]`));
      if (!b) continue;
      boites.push({ ...b, x: 0, w: largeur, couleur: couleursComportement.sortie });
      etiquettes.push({
        x: 8,
        y: b.y + 24,
        texte: `${formatPart(s.part)} des sorties · ${s.section}`,
        couleur: couleursComportement.sortie,
      });
    }
  const marque =
    surligne && doc
      ? boiteDe(
          doc.querySelector(
            `[data-ph="${CSS.escape(surligne)}"], [data-ph-section="${CSS.escape(surligne)}"]`,
          ) ?? trouverElement(doc, surligne),
        )
      : null;
  if (marque) boites.push({ ...marque, couleur: couleursComportement.curseur });
  return (
    <>
      <svg
        viewBox={`0 0 ${largeur} ${hauteur}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {lignes.map((y) => (
          <line
            key={y}
            x1={0}
            x2={largeur}
            y1={y}
            y2={y}
            stroke={couleursComportement.curseur}
            strokeWidth={1.5}
            strokeDasharray="6 5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {boites.map((b, i) => (
          <rect
            key={i}
            x={b.x - 4}
            y={b.y - 4}
            width={b.w + 8}
            height={b.h + 8}
            rx={6}
            fill="none"
            stroke={b.couleur}
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {etiquettes.map((e, i) => (
        <span
          key={i}
          className="absolute -translate-y-1/2 rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap text-blanc shadow-sm"
          style={{ left: e.x * echelle, top: e.y * echelle, background: e.couleur }}
        >
          {e.texte}
        </span>
      ))}
    </>
  );
}
