import { intentionRecherche, synonymesRecherche } from '@ph/core/schemas';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { REGION } from '../callable';
import { clientTypesense } from './typesense';

/** Toute modification d'une intention (admin) est reportée dans Typesense (RECHERCHE §4). */
export const syncIntentionTypesense = onDocumentWritten(
  { document: 'referentiel/recherche/intentions/{id}', region: REGION },
  async (evenement) => {
    const client = clientTypesense();
    if (!client) return logger.info('Typesense non configuré : synchronisation ignorée');
    const apres = evenement.data?.after;
    const r = apres?.exists ? intentionRecherche.safeParse(apres.data()) : null;
    if (r && !r.success)
      return logger.error('Intention invalide, non indexée', { id: evenement.params.id });
    await client.assurerCollection();
    await client.intention(evenement.params.id, r?.data);
  },
);

/** Synonymes et mots vides : un seul document, recopié entièrement à chaque modification. */
export const syncSynonymesTypesense = onDocumentWritten(
  { document: 'referentiel/recherche/synonymes/global', region: REGION },
  async (evenement) => {
    const client = clientTypesense();
    if (!client) return logger.info('Typesense non configuré : synchronisation ignorée');
    const apres = evenement.data?.after;
    if (!apres?.exists) return;
    const r = synonymesRecherche.safeParse(apres.data());
    if (!r.success) return logger.error('Synonymes invalides, non synchronisés');
    await client.assurerCollection();
    await client.synonymes(r.data);
  },
);
