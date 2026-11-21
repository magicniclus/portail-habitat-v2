'use client';

import { LIBELLES_MUR, longueurMur, type ModificationMur, type Mur } from '@ph/core/dessin';
import { Button, ConfirmDialog, Field, Select } from '@ph/ui';
import type { Dispatch } from 'react';
import type { Action } from './etat';
import { ResumeFinitions } from './ResumeFinitions';
import { ChampMesure } from './ChampMesure';
import { CaseVerrou, TitreSelection } from './blocs';

/** Mur sélectionné (DES-07, DES-10, DES-25) : longueur, peinture des faces, suppression. */
export function InspecteurMur({
  mur,
  fusionnable,
  face,
  finitionsOuvert,
  dispatch,
}: {
  mur: Mur;
  /** Mur voisin aligné et identique : on peut les fusionner (DES-09). */
  fusionnable: string | null;
  /** Côté choisi (sinon le mur entier). */
  face?: 'a' | 'b' | undefined;
  /** Menu Finitions ouvert : on y choisit les matériaux. */
  finitionsOuvert: boolean;
  dispatch: Dispatch<Action>;
}) {
  const modifier = (modif: ModificationMur) =>
    dispatch({ type: 'modifierMur', murId: mur.id, modif });
  return (
    <div className="grid gap-4">
      <TitreSelection titre={LIBELLES_MUR[mur.type]} />
      <ChampMesure
        label="Longueur (cm)"
        aide="Entrée pour appliquer ; les murs reliés suivent."
        mm={Math.round(longueurMur(mur))}
        min={10}
        appliquer={(longueur) => dispatch({ type: 'modifierLongueur', murId: mur.id, longueur })}
      />
      <div className="grid grid-cols-2 gap-2.5">
        <ChampMesure
          label="Épaisseur (cm)"
          mm={mur.epaisseur}
          min={20}
          appliquer={(epaisseur) => modifier({ epaisseur })}
        />
        <ChampMesure
          label="Hauteur (cm)"
          mm={mur.hauteur}
          min={100}
          appliquer={(hauteur) => modifier({ hauteur })}
        />
      </div>
      <Field label="Type">
        <Select
          value={mur.type}
          onChange={(ev) => modifier({ type: ev.target.value as Mur['type'] })}
        >
          {(Object.keys(LIBELLES_MUR) as Mur['type'][]).map((t) => (
            <option key={t} value={t}>
              {LIBELLES_MUR[t]}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-1 text-sm">
        Mur porteur
        <input
          type="checkbox"
          className="size-5 accent-accent"
          checked={mur.porteur}
          onChange={(ev) => modifier({ porteur: ev.target.checked })}
        />
      </label>
      <CaseVerrou
        verrouille={mur.verrouille}
        basculer={(valeur) => dispatch({ type: 'verrouillerSelection', valeur })}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondaire" onClick={() => dispatch({ type: 'couperMur', murId: mur.id })}>
          Couper en deux
        </Button>
        {fusionnable ? (
          <Button
            variant="secondaire"
            onClick={() => dispatch({ type: 'fusionnerMur', murId: mur.id, avec: fusionnable })}
          >
            Fusionner avec le voisin
          </Button>
        ) : null}
      </div>
      <ResumeFinitions
        surfaces={(['a', 'b'] as const).map((f) => ({
          libelle: f === 'a' ? 'Côté gauche' : 'Côté droit',
          revetement: f === 'a' ? mur.faceA : mur.faceB,
          choisie: face === f,
          // Le côté choisi se voit sur le plan ; ses matériaux sont dans Finitions.
          choisir: () => {
            dispatch({ type: 'selectionner', selection: { genre: 'mur', id: mur.id, face: f } });
            if (!finitionsOuvert) dispatch({ type: 'menu', menu: 'finitions', basculer: false });
          },
        }))}
        finitionsOuvert={finitionsOuvert}
        dispatch={dispatch}
      />
      {mur.porteur ? (
        <p className="m-0 text-sm text-attention">
          Mur porteur : demandez l’avis d’un professionnel avant de le modifier.
        </p>
      ) : null}
      {mur.porteur ? (
        <ConfirmDialog
          titre="Supprimer ce mur porteur ?"
          libelleConfirmer="Supprimer le mur"
          danger
          declencheur={<Button variant="secondaire">Supprimer</Button>}
          onConfirmer={() => dispatch({ type: 'supprimerSelection', confirme: true })}
        >
          Un mur porteur soutient les planchers ou la toiture. Le supprimer dans la réalité demande
          une étude par un professionnel (bureau d’études, maçon).
        </ConfirmDialog>
      ) : (
        <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
          Supprimer
        </Button>
      )}
    </div>
  );
}
