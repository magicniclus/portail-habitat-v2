'use client';

import {
  formatLongueur,
  formatSurface,
  longueurMur,
  perimetre,
  surfaceCarrez,
  type Mur,
  type Piece,
} from '@ph/core/dessin';
import { Button, Field, Input } from '@ph/ui';
import { PEINTURES_DESSIN, SOLS_DESSIN, type TeinteDessin } from '@ph/ui/tokens';
import { useState, type Dispatch } from 'react';
import { niveauDe, type Action, type EtatEditeur } from './etat';
import { inspecteurAmenagement } from './InspecteurAmenagement';
import { inspecteurExterieur } from './InspecteurExterieur';
import { InspecteurEscalier, InspecteurOuverture } from './InspecteurStructure';
import { Nuancier } from './Nuancier';

const LIBELLES_MUR: Record<Mur['type'], string> = {
  mur: 'Mur',
  cloison: 'Cloison',
  demi_mur: 'Demi-mur',
  muret: 'Muret',
  separation: 'Séparation invisible',
  poteau: 'Poteau',
  poutre: 'Poutre',
};

function InspecteurMur({ mur, dispatch }: { mur: Mur; dispatch: Dispatch<Action> }) {
  const [saisie, setSaisie] = useState(String(Math.round(longueurMur(mur) / 10)));
  const valider = () => {
    const cm = Number(saisie.replace(',', '.'));
    if (Number.isFinite(cm) && cm > 0)
      dispatch({ type: 'modifierLongueur', murId: mur.id, longueur: Math.round(cm * 10) });
  };
  const peindre = (face: 'a' | 'b') => (t: TeinteDessin) =>
    dispatch({
      type: 'revetement',
      cible: { genre: 'mur', murId: mur.id, face },
      revetement: { famille: 'peinture', couleur: t.couleur },
    });
  return (
    <div className="grid gap-4">
      <div>
        <p className="m-0 text-xs font-bold tracking-wide text-neutre-700 uppercase">Sélection</p>
        <h2 className="m-0 text-xl font-bold">{LIBELLES_MUR[mur.type]}</h2>
      </div>
      <form
        className="grid gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          valider();
        }}
      >
        <Field label="Longueur (cm)" aide="Entrée pour appliquer ; les murs reliés suivent.">
          <Input
            inputMode="decimal"
            value={saisie}
            onChange={(ev) => setSaisie(ev.target.value)}
            onBlur={valider}
          />
        </Field>
      </form>
      <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-neutre-100 px-2.5 py-2">
          <dt className="text-neutre-700">Épaisseur</dt>
          <dd className="m-0 font-bold">{formatLongueur(mur.epaisseur, 'cm')}</dd>
        </div>
        <div className="rounded-lg bg-neutre-100 px-2.5 py-2">
          <dt className="text-neutre-700">Hauteur</dt>
          <dd className="m-0 font-bold">{formatLongueur(mur.hauteur)}</dd>
        </div>
      </dl>
      <Nuancier
        legende="Peinture côté gauche"
        teintes={PEINTURES_DESSIN}
        active={mur.faceA.couleur}
        choisir={peindre('a')}
      />
      <Nuancier
        legende="Peinture côté droit"
        teintes={PEINTURES_DESSIN}
        active={mur.faceB.couleur}
        choisir={peindre('b')}
      />
      {mur.porteur ? (
        <p className="m-0 text-sm text-attention">
          Mur porteur : demandez l’avis d’un professionnel avant de le modifier.
        </p>
      ) : null}
      <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
        Supprimer
      </Button>
    </div>
  );
}

function InspecteurPiece({ piece, dispatch }: { piece: Piece; dispatch: Dispatch<Action> }) {
  return (
    <div className="grid gap-4">
      <p className="m-0 text-xs font-bold tracking-wide text-neutre-700 uppercase">
        Pièce sélectionnée
      </p>
      <Field label="Nom de la pièce">
        <Input
          defaultValue={piece.nom}
          maxLength={60}
          onBlur={(ev) => {
            if (ev.target.value.trim() && ev.target.value !== piece.nom)
              dispatch({ type: 'renommerPiece', pieceId: piece.id, nom: ev.target.value });
          }}
        />
      </Field>
      <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-neutre-100 px-2.5 py-2">
          <dt className="text-neutre-700">Surface</dt>
          <dd className="m-0 text-[17px] font-bold">{formatSurface(surfaceCarrez(piece))}</dd>
        </div>
        <div className="rounded-lg bg-neutre-100 px-2.5 py-2">
          <dt className="text-neutre-700">Périmètre</dt>
          <dd className="m-0 text-[17px] font-bold">{formatLongueur(perimetre(piece.contour))}</dd>
        </div>
      </dl>
      <Nuancier
        legende="Sol"
        teintes={SOLS_DESSIN}
        active={piece.sol.couleur}
        choisir={(t) => {
          const sol = SOLS_DESSIN.find((s) => s.id === t.id)!;
          dispatch({
            type: 'revetement',
            cible: { genre: 'piece', pieceId: piece.id, surface: 'sol' },
            revetement: { famille: sol.famille, couleur: sol.couleur },
          });
        }}
      />
      <Nuancier
        legende="Plafond"
        teintes={PEINTURES_DESSIN}
        active={piece.plafond.couleur}
        choisir={(t) =>
          dispatch({
            type: 'revetement',
            cible: { genre: 'piece', pieceId: piece.id, surface: 'plafond' },
            revetement: { famille: 'peinture', couleur: t.couleur },
          })
        }
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
  const n = niveauDe(etat);
  const s = etat.selection;
  const mur = s?.genre === 'mur' ? n.murs.find((m) => m.id === s.id) : undefined;
  const piece = s?.genre === 'piece' ? n.pieces.find((p) => p.id === s.id) : undefined;
  if (mur)
    return <InspecteurMur key={`${mur.id}-${longueurMur(mur)}`} mur={mur} dispatch={dispatch} />;
  if (piece) return <InspecteurPiece key={piece.id} piece={piece} dispatch={dispatch} />;
  const o = s?.genre === 'ouverture' ? n.ouvertures.find((x) => x.id === s.id) : undefined;
  // Clé avec les dimensions : les champs se remettent à jour après une modification refusée.
  if (o)
    return (
      <InspecteurOuverture
        key={`${o.id}-${o.largeur}-${o.hauteur}-${o.allege}-${o.position}`}
        o={o}
        dispatch={dispatch}
      />
    );
  const esc = s?.genre === 'escalier' ? n.escaliers.find((x) => x.id === s.id) : undefined;
  if (esc)
    return (
      <InspecteurEscalier
        key={`${esc.id}-${esc.largeur}-${esc.hauteurAMonter}`}
        e={esc}
        dispatch={dispatch}
      />
    );
  const amenagement = inspecteurAmenagement(etat, dispatch) ?? inspecteurExterieur(etat, dispatch);
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
