'use client';

import { formatLongueur, LIBELLES_MUR, longueurMur, type Mur } from '@ph/core/dessin';
import { Button, ConfirmDialog } from '@ph/ui';
import { PEINTURES_DESSIN, type TeinteDessin } from '@ph/ui/tokens';
import type { Dispatch } from 'react';
import type { Action } from './etat';
import { Nuancier } from './Nuancier';
import { ChampMesure } from './ChampMesure';

/** Mur sélectionné (DES-07, DES-10, DES-25) : longueur, peinture des faces, suppression. */
export function InspecteurMur({ mur, dispatch }: { mur: Mur; dispatch: Dispatch<Action> }) {
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
      <ChampMesure
        label="Longueur (cm)"
        aide="Entrée pour appliquer ; les murs reliés suivent."
        mm={Math.round(longueurMur(mur))}
        min={10}
        appliquer={(longueur) => dispatch({ type: 'modifierLongueur', murId: mur.id, longueur })}
      />
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
