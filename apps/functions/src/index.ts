import { setGlobalOptions } from 'firebase-functions/v2';
import { REGION } from './callable';
import './sentry';

setGlobalOptions({ region: REGION, maxInstances: 10 });

export { ping } from './appelables/ping';
export * from './comptes/appelables';
export { expirerInvitations, syncClaims } from './comptes/declencheurs';
export { envoyerEnvoi } from './notifications/tache';
export { syncIntentionTypesense, syncSynonymesTypesense } from './recherche/declencheurs';
