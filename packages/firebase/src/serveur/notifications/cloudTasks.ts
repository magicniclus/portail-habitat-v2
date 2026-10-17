import { getFirestore } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { appAdmin, estEmulateur } from '../../admin';
import { collections } from '../../chemins';
import type { PlanifierEnvoi } from './notifier';

/** File Cloud Tasks de la Function `envoyerEnvoi` (europe-west1). */
const FILE_ENVOIS = 'locations/europe-west1/functions/envoyerEnvoi';

/**
 * Sous émulateur sans émulateur Cloud Tasks, la tâche est capturée dans `capturesEmulateur` pour que
 * les tests de bout en bout lisent les liens secrets (ONB-04). Jamais hors émulateur (projet « demo- »).
 */
export const captureEmulateur = (env: NodeJS.ProcessEnv = process.env) =>
  estEmulateur(env) && !env.CLOUD_TASKS_EMULATOR_HOST;

/** Planifie l'envoi ; `scheduleTime` pour les envois différés. Les secrets ne vont qu'à la tâche. */
export const planifierCloudTask: PlanifierEnvoi = async ({ envoiId, envoyerLe, secrets }) => {
  if (captureEmulateur()) {
    await getFirestore(appAdmin())
      .collection(collections.capturesEmulateur)
      .doc(envoiId)
      .set({ envoiId, secrets, envoyerLe: envoyerLe.toISOString() });
    return;
  }
  await getFunctions(appAdmin())
    .taskQueue(FILE_ENVOIS)
    .enqueue(
      { envoiId, secrets },
      envoyerLe.getTime() > Date.now() + 1000 ? { scheduleTime: envoyerLe } : {},
    );
};
