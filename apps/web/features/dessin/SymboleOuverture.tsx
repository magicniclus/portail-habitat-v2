'use client';

import {
  CATALOGUE_OUVERTURES,
  longueurMur,
  zonesCoulissement,
  type Mur,
  type Ouverture,
  type Point,
} from '@ph/core/dessin';
import { points } from './svg';

export const add = (p: Point, v: Point, k: number): Point => ({
  x: p.x + v.x * k,
  y: p.y + v.y * k,
});
export const trait = {
  vectorEffect: 'non-scaling-stroke' as const,
  strokeWidth: 1.5,
  fill: 'none',
};
const COULISSANTES: readonly Ouverture['type'][] = [
  'porte_coulissante',
  'porte_galandage',
  'porte_galandage_double',
  'baie_coulissante',
];

/** `vector-effect` ne s'hérite pas : il se pose sur chaque trait, jamais sur un groupe. */
/** Symbole normalisé d'une ouverture : vantail et arc d'une porte, double trait d'une fenêtre. */
export function Symbole({
  o,
  m,
  versInterieur,
}: {
  o: Ouverture;
  m: Mur;
  /** +1 si l'intérieur de la pièce est du côté de la normale gauche du mur, sinon -1. */
  versInterieur: 1 | -1;
}) {
  const l = longueurMur(m);
  const u = { x: (m.b.x - m.a.x) / l, y: (m.b.y - m.a.y) / l };
  const nv = { x: -u.y, y: u.x };
  const debut = add(m.a, u, o.position);
  const fin = add(m.a, u, o.position + o.largeur);
  const famille = CATALOGUE_OUVERTURES[o.type].famille;
  const zones = zonesCoulissement(o);
  if (o.type === 'porte_coulissante') {
    // En applique : vantail et rail devant le mur, du côté choisi, sur la baie et sa place.
    const cote = (o.cote === 'interieur' ? versInterieur : -versInterieur) * (m.epaisseur / 2 + 40);
    const [z0, z1] = zones[0]!;
    const de = Math.min(o.position, z0);
    const a = Math.max(o.position + o.largeur, z1);
    return (
      <g>
        <line
          {...trait}
          strokeDasharray="5 4"
          x1={add(add(m.a, u, de), nv, cote).x}
          y1={add(add(m.a, u, de), nv, cote).y}
          x2={add(add(m.a, u, a), nv, cote).x}
          y2={add(add(m.a, u, a), nv, cote).y}
        />
        <line
          {...trait}
          strokeWidth={3}
          x1={add(debut, nv, cote).x}
          y1={add(debut, nv, cote).y}
          x2={add(fin, nv, cote).x}
          y2={add(fin, nv, cote).y}
        />
      </g>
    );
  }
  if (zones.length) {
    // À galandage : vantail dans l'axe du mur, poche en pointillés dans la cloison.
    const e = m.epaisseur / 3;
    return (
      <g>
        <line {...trait} strokeWidth={3} x1={debut.x} y1={debut.y} x2={fin.x} y2={fin.y} />
        {zones.map(([z0, z1]) => (
          <polygon
            key={z0}
            {...trait}
            strokeDasharray="4 3"
            points={points([
              add(add(m.a, u, z0), nv, e),
              add(add(m.a, u, z1), nv, e),
              add(add(m.a, u, z1), nv, -e),
              add(add(m.a, u, z0), nv, -e),
            ])}
          />
        ))}
      </g>
    );
  }
  if (COULISSANTES.includes(o.type))
    return (
      <g>
        <line
          {...trait}
          x1={debut.x}
          y1={debut.y}
          x2={add(fin, u, -o.largeur / 2).x}
          y2={add(fin, u, -o.largeur / 2).y}
        />
        <polyline
          {...trait}
          points={points([
            add(add(debut, u, o.largeur / 2), nv, m.epaisseur / 4),
            add(fin, nv, m.epaisseur / 4),
          ])}
        />
      </g>
    );
  if (famille === 'fenetre')
    return (
      <g>
        {[-1, 1].map((k) => (
          <line
            {...trait}
            key={k}
            x1={add(debut, nv, (k * m.epaisseur) / 6).x}
            y1={add(debut, nv, (k * m.epaisseur) / 6).y}
            x2={add(fin, nv, (k * m.epaisseur) / 6).x}
            y2={add(fin, nv, (k * m.epaisseur) / 6).y}
          />
        ))}
      </g>
    );
  if (famille === 'libre') return null;
  // Porte battante : charnière selon le sens, vantail du côté choisi, arc d'ouverture.
  const cote = o.cote === 'interieur' ? versInterieur : -versInterieur;
  const vantaux =
    o.type === 'porte_double'
      ? [
          { charniere: debut, d: 1, w: o.largeur / 2 },
          { charniere: fin, d: -1, w: o.largeur / 2 },
        ]
      : [
          o.sens === 'gauche'
            ? { charniere: debut, d: 1, w: o.largeur }
            : { charniere: fin, d: -1, w: o.largeur },
        ];
  return (
    <g>
      {vantaux.map(({ charniere, d, w }, i) => {
        const bout = add(charniere, nv, cote * w);
        const arrivee = add(charniere, u, d * w);
        const balayage = -cote * d > 0 ? 1 : 0;
        return (
          <g key={i}>
            <line
              {...trait}
              x1={charniere.x}
              y1={charniere.y}
              x2={bout.x}
              y2={bout.y}
              strokeWidth={2}
            />
            <path
              {...trait}
              d={`M ${bout.x} ${bout.y} A ${w} ${w} 0 0 ${balayage} ${arrivee.x} ${arrivee.y}`}
              strokeDasharray="4 3"
            />
          </g>
        );
      })}
    </g>
  );
}
