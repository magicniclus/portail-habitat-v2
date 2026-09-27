import type { Notifier } from '@ph/firebase/comptes';
import { logger } from 'firebase-functions/v2';

/**
 * Notificateur provisoire jusqu'au lot 5 (`notifier()`, EMAILS.md) : trace le modèle et les identifiants,
 * jamais l'adresse email ni le contenu (règle n° 8). Aucun envoi réel.
 */
export const notifierProvisoire: Notifier = async (n) => {
  logger.info('notification en attente du lot 5', {
    modele: n.modele,
    uid: n.destinataire.uid,
    artisanId: n.destinataire.artisanId,
    cle: n.cleIdempotence,
  });
};
