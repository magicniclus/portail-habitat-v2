'use client';

import type { Alignement } from '@ph/core/dessin';
import { Button, ConfirmDialog } from '@ph/ui';
import type { Dispatch } from 'react';
import { TitreSelection } from './blocs';
import { niveauDe, type Action, type EtatEditeur } from './etat';

const ALIGNEMENTS: { bord: Alignement; libelle: string }[] = [
  { bord: 'gauche', libelle: 'À gauche' },
  { bord: 'centre', libelle: 'Au centre' },
  { bord: 'droite', libelle: 'À droite' },
  { bord: 'haut', libelle: 'En haut' },
  { bord: 'milieu', libelle: 'Au milieu' },
  { bord: 'bas', libelle: 'En bas' },
];

/** Sélection multiple (DES-29) : nombre d'éléments, aligner, répartir, dupliquer, verrouiller. */
export function InspecteurMulti({
  etat,
  dispatch,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
}) {
  const n = niveauDe(etat);
  const ids = (g: string) => new Set(etat.multi.filter((e) => e.genre === g).map((e) => e.id));
  const [murs, objets] = [ids('mur'), ids('objet')];
  const nbObjets = objets.size;
  const porteur = n.murs.some((m) => murs.has(m.id) && m.porteur);
  const verrouilles = [
    ...n.murs.filter((m) => murs.has(m.id)),
    ...n.objets.filter((o) => objets.has(o.id)),
  ];
  const toutVerrouille = verrouilles.length > 0 && verrouilles.every((x) => x.verrouille);
  const supprimer = <Button variant="secondaire">Supprimer</Button>;
  return (
    <div className="grid gap-4">
      <TitreSelection titre={`${etat.multi.length} éléments choisis`} />
      <p className="m-0 text-sm text-neutre-800">
        Flèches du clavier pour déplacer, Maj + clic pour ajouter ou retirer un élément.
      </p>
      {nbObjets >= 2 ? (
        <fieldset className="m-0 grid gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-bold">Aligner les {nbObjets} meubles</legend>
          <div className="grid grid-cols-3 gap-2">
            {ALIGNEMENTS.map((a) => (
              <Button
                key={a.bord}
                taille="sm"
                variant="secondaire"
                onClick={() => dispatch({ type: 'alignerSelection', bord: a.bord })}
              >
                {a.libelle}
              </Button>
            ))}
          </div>
          {nbObjets >= 3 ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                taille="sm"
                variant="secondaire"
                onClick={() => dispatch({ type: 'repartirSelection', axe: 'x' })}
              >
                Répartir en largeur
              </Button>
              <Button
                taille="sm"
                variant="secondaire"
                onClick={() => dispatch({ type: 'repartirSelection', axe: 'y' })}
              >
                Répartir en hauteur
              </Button>
            </div>
          ) : null}
        </fieldset>
      ) : null}
      {verrouilles.length ? (
        <Button
          variant="secondaire"
          onClick={() => dispatch({ type: 'verrouillerSelection', valeur: !toutVerrouille })}
        >
          {toutVerrouille ? 'Déverrouiller' : 'Verrouiller'} les murs et meubles
        </Button>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondaire" onClick={() => dispatch({ type: 'dupliquerSelection' })}>
          Dupliquer
        </Button>
        {porteur ? (
          <ConfirmDialog
            titre="Supprimer la sélection ?"
            libelleConfirmer="Tout supprimer"
            danger
            declencheur={supprimer}
            onConfirmer={() => dispatch({ type: 'supprimerSelection', confirme: true })}
          >
            La sélection contient un mur porteur. Le supprimer dans la réalité demande une étude par
            un professionnel.
          </ConfirmDialog>
        ) : (
          <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
            Supprimer
          </Button>
        )}
      </div>
    </div>
  );
}
