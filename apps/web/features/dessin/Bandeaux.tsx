'use client';

import { Banner, Button } from '@ph/ui';
import type { Dispatch } from 'react';
import { BandeauEssai } from './EssaiCompte';
import type { Action, EtatEditeur } from './etat';
import type { EtatSauvegarde } from './useSauvegarde';

/** Bandeaux au-dessus du plan : conflit, essai sans compte, erreurs, consigne de coupe. */
export function Bandeaux({
  etat,
  dispatch,
  sauvegarde,
  essai,
  resoudreConflit,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
  sauvegarde: { etat: EtatSauvegarde; message: string | null };
  essai: boolean;
  resoudreConflit: (garderLaMienne: boolean) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 grid gap-2 [&>*]:pointer-events-auto">
      {sauvegarde.etat === 'conflit' ? (
        <Banner tone="danger" titre="Ce plan a été modifié ailleurs">
          <div className="mt-2 flex flex-wrap gap-2">
            <Button taille="sm" onClick={() => resoudreConflit(false)}>
              Prendre la version enregistrée
            </Button>
            <Button taille="sm" variant="secondaire" onClick={() => resoudreConflit(true)}>
              Garder la mienne
            </Button>
          </div>
        </Banner>
      ) : null}
      {essai ? <BandeauEssai /> : null}
      {sauvegarde.etat === 'erreur' && sauvegarde.message ? (
        <Banner tone="danger">{sauvegarde.message}</Banner>
      ) : null}
      {etat.outil === 'coupe' && etat.vue === 'plan' ? (
        <Banner tone="info">
          Coupe : cliquez deux points de part et d’autre de la maison. On regarde vers la gauche du
          trait.
        </Banner>
      ) : null}
      {etat.erreur ? (
        <Banner
          tone="attention"
          action={
            <Button
              taille="sm"
              variant="secondaire"
              onClick={() => dispatch({ type: 'effacerErreur' })}
            >
              OK
            </Button>
          }
        >
          {etat.erreur}
        </Banner>
      ) : null}
    </div>
  );
}
