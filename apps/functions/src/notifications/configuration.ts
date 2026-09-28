import { appAdmin } from '@ph/firebase/admin';
import {
  notifier as notifierFirestore,
  planifierCloudTask,
  type Envoi,
} from '@ph/firebase/notifications';
import { getFirestore } from 'firebase-admin/firestore';
import type { ConfigEnvoi } from './envoyer';
import { brevoSms, mailpit, resend, smsCapture } from './fournisseurs';

/** Seule porte d'entrée des envois pour les Functions (EMAILS §1). */
export const notifier = (e: Envoi) =>
  notifierFirestore(
    { db: getFirestore(appAdmin()), horloge: Date.now, planifier: planifierCloudTask },
    e,
  );

const env = (nom: string, defaut?: string) => {
  const v = process.env[nom] ?? defaut;
  if (v === undefined) throw new Error(`Variable d'environnement manquante : ${nom}`);
  return v;
};

/**
 * Fournisseurs selon l'environnement : EMAIL_CAPTURE=mailpit en local et en staging (aucun envoi réel),
 * Resend et Brevo en production seulement.
 */
export function configurationEnvoi(): ConfigEnvoi {
  const capture =
    process.env.EMAIL_CAPTURE === 'mailpit' || process.env.FUNCTIONS_EMULATOR === 'true';
  return {
    db: getFirestore(appAdmin()),
    horloge: Date.now,
    email: capture
      ? mailpit(env('MAILPIT_URL', 'http://127.0.0.1:8025'))
      : resend(env('RESEND_API_KEY')),
    sms: capture ? smsCapture : brevoSms(env('BREVO_API_KEY'), env('SMS_SENDER', 'PortailHab')),
    secret: env(
      'NOTIF_SIGNING_SECRET',
      capture ? 'secret-de-developpement-local-uniquement-32' : undefined,
    ),
    urlSite: env('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000').replace(/\/$/, ''),
    expediteurs: {
      defaut: env('EMAIL_FROM', 'Portail Habitat <notifications@portailhabitat.fr>'),
      pro: env('EMAIL_FROM_PRO', 'Portail Habitat Pro <pro@notifications.portailhabitat.fr>'),
    },
    repondreA: process.env.EMAIL_REPLY_TO,
    editeur: env(
      'EDITEUR_MENTION',
      'Portail Habitat · [Raison sociale] · [Adresse postale de l’éditeur]',
    ),
    listeBlanche: process.env.EMAIL_WHITELIST,
  };
}
