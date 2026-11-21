import { contourPiscine, type Niveau } from '@ph/core/dessin';
import { COULEURS_EXTERIEUR as C } from '@ph/ui/tokens';
import type { Dispatch, PointerEvent } from 'react';
import type { Action, EtatEditeur } from './etat';
import { remplissage } from './Motifs';
import { memoCalque } from './memoCalque';
import { activer, points } from './svg';

const trait = { vectorEffect: 'non-scaling-stroke' as const, strokeWidth: 1.5 };
type Genre = 'terrasse' | 'piscine' | 'cloture' | 'vegetal' | 'allee';

/** Extérieur vu de dessus (DES-18 à DES-20) : sous la maison, sélectionnable. */
function ExterieurSvgBrut({
  niveau,
  etat,
  dispatch,
}: {
  niveau: Pick<Niveau, 'exterieur'>;
  etat: Pick<EtatEditeur, 'selection' | 'outil'>;
  dispatch: Dispatch<Action>;
}) {
  const ext = niveau.exterieur;
  const choisi = (genre: Genre, id: string) =>
    etat.selection?.genre === genre && etat.selection.id === id;
  const cliquable = (genre: Genre, id: string, libelle: string) => {
    const choisir = () => dispatch({ type: 'selectionner', selection: { genre, id } });
    return {
      role: 'button',
      tabIndex: 0,
      'aria-label': libelle,
      'aria-pressed': choisi(genre, id),
      onPointerDown: (ev: PointerEvent) => {
        if (etat.outil !== 'selection') return;
        ev.stopPropagation();
        choisir();
      },
      onKeyDown: activer(choisir),
      className: choisi(genre, id) ? 'stroke-accent' : '',
    };
  };
  return (
    <g>
      {ext.allees.map((a, i) => (
        <polygon
          key={`a${i}`}
          points={points(a)}
          fill={C.allee}
          stroke={choisi('allee', String(i)) ? undefined : 'none'}
          {...trait}
          {...cliquable('allee', String(i), 'Allée')}
        />
      ))}
      {ext.terrasses.map((t) => (
        <polygon
          key={t.id}
          points={points(t.contour)}
          fill={remplissage(t.revetement)}
          stroke={C.cloture}
          {...trait}
          {...cliquable('terrasse', t.id, 'Terrasse')}
        />
      ))}
      {ext.piscines.map((p) => (
        <polygon
          key={p.id}
          points={points(contourPiscine(p))}
          fill={C.eau}
          stroke={C.margelle}
          strokeWidth={6}
          vectorEffect="non-scaling-stroke"
          {...cliquable('piscine', p.id, 'Piscine')}
        />
      ))}
      {ext.vegetation.map((v) => (
        <circle
          key={v.id}
          cx={v.position.x}
          cy={v.position.y}
          r={v.diametre / 2}
          fill={C.vegetal}
          fillOpacity={0.7}
          stroke={C.vegetalFonce}
          {...trait}
          {...cliquable(
            'vegetal',
            v.id,
            v.type === 'arbre' ? 'Arbre' : v.type === 'arbuste' ? 'Arbuste' : 'Haie',
          )}
        />
      ))}
      {ext.clotures.map((c) => (
        <polyline
          key={c.id}
          points={points(c.points)}
          fill="none"
          stroke={
            c.type === 'haie' ? C.vegetalFonce : c.type === 'grillage' ? C.grillage : C.cloture
          }
          strokeWidth={4}
          strokeDasharray={c.type === 'grillage' ? '3 3' : undefined}
          vectorEffect="non-scaling-stroke"
          {...cliquable('cloture', c.id, 'Clôture')}
        />
      ))}
    </g>
  );
}

export const ExterieurSvg = memoCalque(ExterieurSvgBrut, ['exterieur'], ['selection', 'outil']);
