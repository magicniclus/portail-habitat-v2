import { setGlobalOptions } from 'firebase-functions/v2';
import { REGION } from './callable';
import './sentry';

setGlobalOptions({ region: REGION, maxInstances: 10 });

export { ping } from './appelables/ping';
export * from './comptes/appelables';
export { expirerInvitations, syncClaims } from './comptes/declencheurs';
export { projeterArtisan } from './annuaire/declencheurs';
export { attribuerNouvelleDemande, matchingRelance, scoresNuit } from './matching/declencheurs';
export {
  cycleAgreger,
  cycleAppelsComplets,
  cycleCalculer,
  cycleCodesExpires,
  cycleDemandesInvendues,
  cycleHebdo,
  cyclePlanifier,
  cyclePlanifierSoir,
  cycleProspects,
  cycleTestsAB,
} from './cycle/planifiees';
export { comportementAgreger } from './comportement/planifiees';
export { envoyerEnvoi } from './notifications/tache';
export { importerDemandePartenaireHttp as importerDemandePartenaire } from './partenaires/webhook';
export { syncIntentionTypesense, syncSynonymesTypesense } from './recherche/declencheurs';
