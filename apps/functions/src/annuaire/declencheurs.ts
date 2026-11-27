import { appAdmin } from '@ph/firebase/admin';
import { publierFiche } from '@ph/firebase/annuaire';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { REGION } from '../callable';
import { clientTypesense } from '../recherche/typesense';

/**
 * Toute écriture de `artisans/{id}` recalcule sa fiche publique (DATABASE §3), puis l'index de
 * l'annuaire dans Typesense s'il est configuré (D4). Les champs privés ne quittent jamais `artisans`.
 */
export const projeterArtisan = onDocumentWritten(
  { document: 'artisans/{artisanId}', region: REGION },
  async (evenement) => {
    const id = evenement.params.artisanId;
    const r = await publierFiche({ db: getFirestore(appAdmin()), horloge: Date.now }, id);
    if (r.statut === 'invalide')
      return logger.error('Fiche privée invalide : fiche publique inchangée', {
        id,
        erreur: r.erreur,
      });
    const typesense = clientTypesense();
    if (typesense) await typesense.artisan(id, r.statut === 'publiee' ? r.fiche : null);
  },
);
