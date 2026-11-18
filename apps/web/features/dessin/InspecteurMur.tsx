'use client';

import { formatLongueur, LIBELLES_MUR, longueurMur, type Mur } from '@ph/core/dessin';
import { Button, ConfirmDialog } from '@ph/ui';
import { PEINTURES_DESSIN, type TeinteDessin } from '@ph/ui/tokens';
import type { Dispatch } from 'react';
import type { Action } from './etat';
import { Nuancier } from './Nuancier';
import { ChampMesure } from './ChampMesure';
import { Info, TitreSelection } from './blocs';

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
      <TitreSelection titre={LIBELLES_MUR[mur.type]} />
      <ChampMesure
        label="Longueur (cm)"
        aide="Entrée pour appliquer ; les murs reliés suivent."
        mm={Math.round(longueurMur(mur))}
        min={10}
        appliquer={(longueur) => dispatch({ type: 'modifierLongueur', murId: mur.id, longueur })}
      />
      <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
        <Info libelle="Épaisseur" valeur={formatLongueur(mur.epaisseur, 'cm')} />
        <Info libelle="Hauteur" valeur={formatLongueur(mur.hauteur)} />
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
