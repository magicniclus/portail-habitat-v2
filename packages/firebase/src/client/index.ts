import { STATUTS_ATTRIBUTION } from '@ph/core/espace-pro';
import type * as F from 'firebase/firestore';
import { collections, GROUPE_ATTRIBUTIONS } from '../chemins';

/**
 * Côté navigateur (SDK chargé à la demande par l'appelant) : attributions de l'entreprise, même
 * requête que `lireDemandesPro` (index existant), autorisée aux membres opérationnels par les règles.
 */
export const requeteAttributionsPro = (m: typeof F, db: F.Firestore, artisanId: string) =>
  m.query(
    m.collectionGroup(db, GROUPE_ATTRIBUTIONS),
    m.where('artisanId', '==', artisanId),
    m.where('statut', 'in', [...STATUTS_ATTRIBUTION]),
    m.orderBy('proposeeLe', 'desc'),
    m.limit(100),
  );

/** Dernière trace du moteur de conversion (journal admin en direct ; règles : lecture `cnv`). */
export const requeteDerniereTraceCycle = (m: typeof F, db: F.Firestore) =>
  m.query(m.collection(db, collections.cycleTraces), m.orderBy('createdAt', 'desc'), m.limit(1));
