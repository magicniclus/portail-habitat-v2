import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { REGION } from '../callable';
import { configurationEnvoi } from './configuration';
import { traiterEnvoi } from './envoyer';

/** File d'envoi : 10 envois par seconde, 5 tentatives avec délai exponentiel (EMAILS §1). */
export const envoyerEnvoi = onTaskDispatched<{ envoiId: string; secrets?: Record<string, string> }>(
  {
    region: REGION,
    retryConfig: { maxAttempts: 5, minBackoffSeconds: 30, maxDoublings: 4 },
    rateLimits: { maxConcurrentDispatches: 20, maxDispatchesPerSecond: 10 },
  },
  async (requete) => {
    await traiterEnvoi(configurationEnvoi(), requete.data.envoiId, requete.data.secrets ?? {});
  },
);
