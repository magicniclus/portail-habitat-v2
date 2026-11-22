'use client';

import { inspecteurAnnotation } from './InspecteurAnnotation';
import { InspecteurMulti } from './InspecteurMulti';
import {
  formatLongueur,
  formatSurface,
  LIBELLES_PIECE,
  niveauSuperieur,
  voisinFusionnable,
  perimetre,
  surfaceCarrez,
  type Piece,
} from '@ph/core/dessin';
import { Button, Field, Input, Select } from '@ph/ui';
import type { Dispatch } from 'react';
import { contexteNavigateur, niveauDe, sceneDe, type Action, type EtatEditeur } from './etat';
import { inspecteurAmenagement } from './InspecteurAmenagement';
import { inspecteurExterieur } from './InspecteurExterieur';
import { inspecteurParcelle } from './InspecteurParcelle';
import { InspecteurEscalier } from './InspecteurEscalier';
import { InspecteurOuverture } from './InspecteurStructure';
import { InspecteurMur } from './InspecteurMur';
import { ResumeFinitions } from './ResumeFinitions';
import { Info, surtitre } from './blocs';

function InspecteurPiece({
  piece,
  finitionsOuvert,
  dispatch,
}: {
  piece: Piece;
  finitionsOuvert: boolean;
  dispatch: Dispatch<Action>;
}) {
  return (
    <div className="grid gap-4">
      <p className={surtitre}>Pièce sélectionnée</p>
      <Field label="Type de pièce">
        <Select
          value={piece.type}
          onChange={(ev) =>
            dispatch({
              type: 'typerPiece',
              pieceId: piece.id,
              typePiece: ev.target.value as Piece['type'],
            })
          }
        >
          {(Object.keys(LIBELLES_PIECE) as Piece['type'][]).map((t) => (
            <option key={t} value={t}>
              {LIBELLES_PIECE[t]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Nom de la pièce">
        <Input
          key={piece.nom}
          defaultValue={piece.nom}
          maxLength={60}
          onBlur={(ev) => {
            if (ev.target.value.trim() && ev.target.value !== piece.nom)
              dispatch({ type: 'renommerPiece', pieceId: piece.id, nom: ev.target.value });
          }}
        />
      </Field>
      <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
        <Info libelle="Surface" valeur={formatSurface(surfaceCarrez(piece))} grande />
        <Info libelle="Périmètre" valeur={formatLongueur(perimetre(piece.contour))} grande />
      </dl>
      <ResumeFinitions
        surfaces={[
          { libelle: 'Sol', revetement: piece.sol },
          { libelle: 'Plafond', revetement: piece.plafond },
        ]}
        finitionsOuvert={finitionsOuvert}
        dispatch={dispatch}
      />
      <Button
        variant="secondaire"
        onClick={() => dispatch({ type: 'menu', menu: 'chiffrer', basculer: false })}
      >
        Voir le métré
      </Button>
    </div>
  );
}

/** Inspecteur (DESSIN.md §7) : propriétés de la sélection, aide quand rien n'est choisi. */
export function Inspecteur({ etat, dispatch }: { etat: EtatEditeur; dispatch: Dispatch<Action> }) {
  if (etat.multi.length > 1) return <InspecteurMulti etat={etat} dispatch={dispatch} />;
  const n = niveauDe(etat);
  const s = etat.selection;
  const mur = s?.genre === 'mur' ? n.murs.find((m) => m.id === s.id) : undefined;
  const piece = s?.genre === 'piece' ? n.pieces.find((p) => p.id === s.id) : undefined;
  if (mur)
    return (
      <InspecteurMur
        face={s?.face}
        key={mur.id}
        mur={mur}
        fusionnable={voisinFusionnable(n, mur.id, contexteNavigateur)}
        finitionsOuvert={etat.menu === 'finitions'}
        dispatch={dispatch}
      />
    );
  if (piece)
    return (
      <InspecteurPiece
        key={piece.id}
        piece={piece}
        finitionsOuvert={etat.menu === 'finitions'}
        dispatch={dispatch}
      />
    );
  const o = s?.genre === 'ouverture' ? n.ouvertures.find((x) => x.id === s.id) : undefined;
  if (o) return <InspecteurOuverture key={o.id} o={o} dispatch={dispatch} />;
  const esc = s?.genre === 'escalier' ? n.escaliers.find((x) => x.id === s.id) : undefined;
  if (esc)
    return (
      <InspecteurEscalier
        key={esc.id}
        e={esc}
        hauteurDessus={niveauSuperieur(sceneDe(etat), n.id)?.hauteurSousPlafond}
        dispatch={dispatch}
      />
    );
  const amenagement =
    inspecteurAmenagement(etat, dispatch) ??
    inspecteurExterieur(etat, dispatch) ??
    inspecteurParcelle(etat, dispatch) ??
    inspecteurAnnotation(etat, dispatch);
  if (amenagement) return amenagement;
  return (
    <div className="grid gap-2 px-2 py-6 text-center text-neutre-800">
      <p className="m-0 font-bold text-texte">Rien de sélectionné</p>
      <p className="m-0 text-sm leading-5">
        Cliquez sur une pièce, un mur, une porte, un meuble ou une zone du plan pour modifier ses
        propriétés.
      </p>
    </div>
  );
}
