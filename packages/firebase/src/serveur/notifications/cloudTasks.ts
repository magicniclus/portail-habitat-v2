import { getFunctions } from 'firebase-admin/functions';
import { appAdmin } from '../../admin';
import type { PlanifierEnvoi } from './notifier';

/** File Cloud Tasks de la Function `envoyerEnvoi` (europe-west1). */
const FILE_ENVOIS = 'locations/europe-west1/functions/envoyerEnvoi';

/** Planifie l'envoi ; `scheduleTime` pour les envois différés. Les secrets ne vont qu'à la tâche. */
export const planifierCloudTask: PlanifierEnvoi = async ({ envoiId, envoyerLe, secrets }) => {
  await getFunctions(appAdmin())
    .taskQueue(FILE_ENVOIS)
    .enqueue(
      { envoiId, secrets },
      envoyerLe.getTime() > Date.now() + 1000 ? { scheduleTime: envoyerLe } : {},
    );
};
