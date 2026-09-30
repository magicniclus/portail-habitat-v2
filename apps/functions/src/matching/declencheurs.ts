import { appAdmin } from '@ph/firebase/admin';
import { attribuerDemande } from '@ph/firebase/matching';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { REGION } from '../callable';
import { notifier } from '../notifications/configuration';

/**
 * Nouvelle demande (MATCHING, D41) : attribution au meilleur Premium qui a du quota, sinon appel
 * d'offres. Rejouable sans double effet (la demande n'est traitée que si elle est `nouvelle`).
 */
export const attribuerNouvelleDemande = onDocumentCreated(
  { document: 'demandes/{demandeId}', region: REGION, retry: true },
  async (evenement) => {
    const demandeId = evenement.params.demandeId;
    const resultat = await attribuerDemande(
      { db: getFirestore(appAdmin()), horloge: Date.now, notifier },
      demandeId,
    );
    // Identifiant et résultat seulement : aucune donnée personnelle dans les journaux.
    logger.info('Attribution', { demandeId, resultat });
  },
);
