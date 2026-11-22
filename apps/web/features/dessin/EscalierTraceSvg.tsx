import {
  brouillonEscalier,
  emprise,
  formatLongueur,
  hauteurVersLeHaut,
  marchesDroites,
  MODELES_ESCALIER,
  orthogonal,
  versRepere,
  type Escalier,
  type Point,
} from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import type { PointerEvent } from 'react';
import { EtiquetteSvg } from './EtiquetteSvg';
import { sceneDe, type EtatEditeur } from './etat';
import { points } from './svg';

const trait = { vectorEffect: 'non-scaling-stroke' as const, fill: 'none' };

/** Ligne de foulée d'un escalier tracé, sur le plan : du départ (rond) à l'arrivée (flèche). */
export function FouleeSvg({ e, mmParPx = 20 }: { e: Escalier; mmParPx?: number }) {
  if (!e.chemin) return null;
  const place = versRepere(e.position, e.rotation);
  const pts = e.chemin.map(place);
  const [a, b] = [pts.at(-2)!, pts.at(-1)!];
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const [ux, uy] = [(b.x - a.x) / l, (b.y - a.y) / l];
  const f = 10 * mmParPx;
  return (
    <g pointerEvents="none">
      <polyline points={points(pts)} {...trait} stroke="currentColor" strokeWidth={1.5} />
      <circle cx={pts[0]!.x} cy={pts[0]!.y} r={3 * mmParPx} fill="currentColor" />
      <path
        d={`M${b.x - ux * f - uy * f * 0.6} ${b.y - uy * f + ux * f * 0.6}L${b.x} ${b.y}L${b.x - ux * f + uy * f * 0.6} ${b.y - uy * f - ux * f * 0.6}`}
        {...trait}
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </g>
  );
}

/** Poignées des points du tracé (escalier choisi) : on les tire pour changer la forme. */
export function PoigneesEscalier({
  e,
  mmParPx,
  demarrer,
}: {
  e: Escalier;
  mmParPx: number;
  demarrer: (id: string, i: number, ev: PointerEvent) => void;
}) {
  if (!e.chemin) return null;
  const place = versRepere(e.position, e.rotation);
  return e.chemin.map((p, i) => {
    const q = place(p);
    return (
      <circle
        key={i}
        cx={q.x}
        cy={q.y}
        r={7 * mmParPx}
        fill="white"
        className="cursor-grab stroke-accent"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        aria-label={`Point ${i + 1} du tracé de l’escalier`}
        data-testid={`point-escalier-${i}`}
        onPointerDown={(ev) => {
          ev.stopPropagation();
          demarrer(e.id, i, ev);
        }}
      />
    );
  });
}

/**
 * Escalier en cours de tracé : l'escalier se dessine jusqu'au pointeur, marches comprises, avec
 * la longueur de chaque volée ; la dernière volée reste d'équerre.
 */
export function ApercuEscalierTrace({
  etat,
  pointeur,
  mmParPx,
}: {
  etat: EtatEditeur;
  pointeur: Point;
  mmParPx: number;
}) {
  const modele = MODELES_ESCALIER[etat.modeleEscalier].trace;
  const dernier = etat.cheminEscalier.at(-1);
  if (!modele) return null;
  // Avant le premier clic : la croix de visée suffit.
  if (!dernier) return null;
  const chemin = [...etat.cheminEscalier, orthogonal(dernier, pointeur)];
  const e = brouillonEscalier(chemin, hauteurVersLeHaut(sceneDe(etat), etat.niveauId), modele);
  return (
    <g pointerEvents="none" className="text-accent" opacity={0.85}>
      {e ? (
        <>
          <polygon
            points={points(emprise(e))}
            {...trait}
            fill={COULEURS_PLAN.etiquette}
            fillOpacity={0.7}
            stroke="currentColor"
            strokeWidth={2}
          />
          {marchesDroites(e).map(([p, q], i) => (
            <line
              key={i}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              {...trait}
              stroke="currentColor"
              strokeWidth={1}
            />
          ))}
          <FouleeSvg e={e} mmParPx={mmParPx} />
        </>
      ) : (
        <polyline
          points={points(chemin)}
          {...trait}
          stroke="currentColor"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      )}
      {chemin.slice(1).map((b, i) => {
        const a = chemin[i]!;
        const l = Math.hypot(b.x - a.x, b.y - a.y);
        return l > 200 ? (
          <EtiquetteSvg
            key={i}
            x={(a.x + b.x) / 2}
            y={(a.y + b.y) / 2}
            texte={formatLongueur(l)}
            taille={11 * mmParPx}
            trait={COULEURS_PLAN.murSelection}
          />
        ) : null;
      })}
    </g>
  );
}
