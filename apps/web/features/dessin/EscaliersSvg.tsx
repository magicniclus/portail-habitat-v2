import { emprise, longueurVolee, marchesDroites, type Niveau } from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import type { Dispatch, PointerEvent } from 'react';
import type { Action, EtatEditeur } from './etat';
import { FouleeSvg, PoigneesEscalier } from './EscalierTraceSvg';
import { memoCalque } from './memoCalque';
import { activer, points } from './svg';
import { trait } from './SymboleOuverture';

/** Escaliers : emprise, marches, sens de montée (DES-15). */
function EscaliersSvgBrut({
  niveau,
  etat,
  dispatch,
  mmParPx = 20,
  demarrerPointEscalier,
}: {
  niveau: Pick<Niveau, 'escaliers'>;
  etat: Pick<EtatEditeur, 'selection' | 'outil'>;
  dispatch: Dispatch<Action>;
  mmParPx?: number;
  /** Poignée d'un point du tracé de l'escalier choisi (DES-15). */
  demarrerPointEscalier?: (id: string, i: number, ev: PointerEvent) => void;
}) {
  const choisi = niveau.escaliers.find(
    (e) => etat.selection?.genre === 'escalier' && etat.selection.id === e.id,
  );
  const escaliers = niveau.escaliers.map((e) => {
    const choisi = etat.selection?.genre === 'escalier' && etat.selection.id === e.id;
    const choisir = () =>
      dispatch({ type: 'selectionner', selection: { genre: 'escalier', id: e.id } });
    const contour = emprise(e);
    return (
      <g
        key={e.id}
        role="button"
        tabIndex={0}
        aria-label={`Escalier de ${e.nbMarches} marches`}
        aria-pressed={choisi}
        className={choisi ? 'stroke-accent' : 'stroke-texte'}
        onPointerDown={(ev) => {
          if (etat.outil !== 'selection') return;
          ev.stopPropagation();
          choisir();
        }}
        onKeyDown={activer(choisir)}
      >
        <polygon
          points={points(contour)}
          {...trait}
          fill={COULEURS_PLAN.etiquette}
          strokeWidth={choisi ? 3 : 1.5}
        />
        {marchesDroites(e).map(([p, q], i) => (
          <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} {...trait} strokeWidth={1} />
        ))}
        <FouleeSvg e={e} mmParPx={mmParPx} />
        <title>{`Escalier, ${Math.round(longueurVolee(e) / 10)} cm de volée`}</title>
      </g>
    );
  });
  return (
    <>
      {escaliers}
      {choisi && etat.outil === 'selection' && demarrerPointEscalier ? (
        <PoigneesEscalier e={choisi} mmParPx={mmParPx} demarrer={demarrerPointEscalier} />
      ) : null}
    </>
  );
}

export const EscaliersSvg = memoCalque(EscaliersSvgBrut, ['escaliers'], ['selection', 'outil']);
