'use client';

import { distance, formatLongueur, milieu, type Niveau } from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import type { Dispatch } from 'react';
import type { Action, EtatEditeur } from './etat';
import { memoCalque } from './memoCalque';
import { activer } from './svg';

type Props = {
  niveau: Pick<Niveau, 'cotes' | 'textes'>;
  etat: Pick<EtatEditeur, 'selection' | 'outil'>;
  dispatch: Dispatch<Action>;
  mmParPx: number;
};

/** Cotes libres (trait, traits d'attache, longueur) et textes du plan (DES-31), sélectionnables. */
function AnnotationsSvgBrut({ niveau, etat, dispatch, mmParPx }: Props) {
  const libre = etat.outil === 'selection';
  const choisie = (genre: 'cote' | 'texte', id: string) =>
    etat.selection?.genre === genre && etat.selection.id === id;
  const taille = 12 * mmParPx;
  return (
    <g pointerEvents={libre ? undefined : 'none'}>
      {niveau.cotes.map((c) => {
        const l = distance(c.a, c.b);
        const [ux, uy] = [(c.b.x - c.a.x) / l, (c.b.y - c.a.y) / l];
        const t = 6 * mmParPx;
        const m = milieu(c.a, c.b);
        const texte = formatLongueur(Math.round(l));
        const choisir = () =>
          dispatch({ type: 'selectionner', selection: { genre: 'cote', id: c.id } });
        const trait = choisie('cote', c.id) ? 'stroke-accent' : '';
        return (
          <g
            key={c.id}
            role="button"
            tabIndex={0}
            aria-label={`Cote de ${texte}`}
            aria-pressed={choisie('cote', c.id)}
            className="cursor-pointer"
            onPointerDown={(ev) => {
              ev.stopPropagation();
              choisir();
            }}
            onKeyDown={activer(choisir)}
          >
            <line
              x1={c.a.x}
              y1={c.a.y}
              x2={c.b.x}
              y2={c.b.y}
              stroke="transparent"
              strokeWidth={16 * mmParPx}
            />
            {[c.a, c.b].map((p, i) => (
              <line
                key={i}
                x1={p.x - uy * t}
                y1={p.y + ux * t}
                x2={p.x + uy * t}
                y2={p.y - ux * t}
                stroke={COULEURS_PLAN.cote}
                className={trait}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <line
              x1={c.a.x}
              y1={c.a.y}
              x2={c.b.x}
              y2={c.b.y}
              stroke={COULEURS_PLAN.cote}
              className={trait}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={m.x - texte.length * taille * 0.3}
              y={m.y - taille * 0.75}
              width={texte.length * taille * 0.6}
              height={taille * 1.5}
              rx={taille * 0.75}
              fill={COULEURS_PLAN.etiquette}
              stroke={COULEURS_PLAN.etiquetteTrait}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={m.x}
              y={m.y + taille * 0.35}
              fontSize={taille}
              textAnchor="middle"
              className="fill-texte font-semibold select-none"
            >
              {texte}
            </text>
          </g>
        );
      })}
      {niveau.textes.map((t) => {
        const choisir = () =>
          dispatch({ type: 'selectionner', selection: { genre: 'texte', id: t.id } });
        return (
          <text
            key={t.id}
            role="button"
            tabIndex={0}
            aria-label={`Texte ${t.contenu}`}
            aria-pressed={choisie('texte', t.id)}
            x={t.position.x}
            y={t.position.y}
            fontSize={t.taille * mmParPx}
            textAnchor="middle"
            className={`cursor-pointer font-semibold select-none ${choisie('texte', t.id) ? 'fill-accent-700' : 'fill-texte'}`}
            onPointerDown={(ev) => {
              ev.stopPropagation();
              choisir();
            }}
            onKeyDown={activer(choisir)}
          >
            {t.contenu}
          </text>
        );
      })}
    </g>
  );
}

export const AnnotationsSvg = memoCalque(
  AnnotationsSvgBrut,
  ['cotes', 'textes'],
  ['selection', 'outil'],
);
