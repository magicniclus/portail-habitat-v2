import { synchroniserClaims, expirerInvitations as expirer } from '@ph/firebase/comptes';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '../callable';
import { services } from './services';

/** `syncClaims` : toute écriture d'un document `membres` recalcule les claims de la personne. */
export const syncClaims = onDocumentWritten(
  { document: 'artisans/{artisanId}/membres/{uid}', region: REGION },
  async (evenement) => {
    await synchroniserClaims(services(), evenement.params.uid, evenement.params.artisanId);
  },
);

/** Invitations périmées → `expiree` (chaque heure). */
export const expirerInvitations = onSchedule(
  { schedule: 'every 60 minutes', region: REGION, timeZone: 'Europe/Paris' },
  async () => {
    await expirer(services());
  },
);
