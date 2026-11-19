'use client';

import { LIBELLES_MUR, longueurMur, type ModificationMur, type Mur } from '@ph/core/dessin';
import { Button, ConfirmDialog, Field, Select } from '@ph/ui';
import { PEINTURES_DESSIN, type TeinteDessin } from '@ph/ui/tokens';
import type { Dispatch } from 'react';
import type { Action } from './etat';
import { Nuancier } from './Nuancier';
import { ChampMesure } from './ChampMesure';
import { CaseVerrou, TitreSelection } from './blocs';

/** Mur sélectionné (DES-07, DES-10, DES-25) : longueur, peinture des faces, suppression. */
export function InspecteurMur({
  mur,
  fusionnable,
  dispatch,
}: {
  mur: Mur;
  /** Mur voisin aligné et identique : on peut les fusionner (DES-09). */
  fusionnable: string | null;
  dispatch: Dispatch<Action>;
}) {
  const modifier = (modif: ModificationMur) =>
    dispatch({ type: 'modifierMur', murId: mur.id, modif });
  const peindre = (face: 'a' | 'b') => (t: TeinteDessin) =>
    dispatch({
      type: 'revetement',
      cible: { genre: 'mur', murId: mur.id, face },
      revetement: { famille: 'peinture', couleur: t.couleur },
    });
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
