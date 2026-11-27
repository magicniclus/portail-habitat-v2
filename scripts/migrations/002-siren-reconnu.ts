import { collections } from '@ph/firebase/chemins';
import type { Migration } from '@ph/firebase/migrations';
import { rattrapageMiseEnLigne } from '@ph/core/espace-pro';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Décision du propriétaire (15/11/2026) : la fiche est en ligne dès que le SIREN est reconnu.
 * Les fiches créées avant n'ont pas `sirenReconnu` : il est déduit de leur historique (inscription
 * par le répertoire, ou vérification d'un modérateur), puis la fiche est remise en ligne si elle
 * n'a été ni éteinte par l'artisan, ni suspendue. Aucune fiche n'est mise hors ligne.
 * À lancer d'abord en `--dry-run`, et en production seulement avec le « go » du propriétaire.
 */
export const sirenReconnu: Migration = {
  id: '002-siren-reconnu',
  description:
    'SIREN reconnu sur les fiches existantes, remise en ligne selon la règle du 15/11/2026',
  collection: collections.artisans,
  transformer: (d) => {
    const r = rattrapageMiseEnLigne(d);
    if (!r) return null;
    return {
      sirenReconnu: { par: r.sirenReconnu, le: Timestamp.now() },
      ...(r.enLigne ? { enLigne: true } : {}),
    };
  },
};
