import { definition, estModele, type NomModele } from '@ph/core/notifications';
import { rendreEmail } from '@ph/emails';
import {
  annulerEnvoi,
  empreinteEmail,
  lireEnvoi,
  marquerEnvoye,
  noterEchec,
  signerJeton,
} from '@ph/firebase/notifications';
import type { Firestore } from 'firebase-admin/firestore';
import { encoreValable } from './conditions';
import { estAutorise, type EnvoiEmail, type EnvoiSms } from './fournisseurs';

export interface ConfigEnvoi {
  db: Firestore;
  horloge: () => number;
  email: EnvoiEmail;
  sms: EnvoiSms;
  /** NOTIF_SIGNING_SECRET : jetons des liens de préférences et de désabonnement. */
  secret: string;
  /** Adresse publique du site, sans barre finale (liens absolus). */
  urlSite: string;
  expediteurs: { defaut: string; pro: string };
  repondreA?: string;
  editeur: string;
  listeBlanche?: string;
}

export type IssueEnvoi = 'envoye' | 'ignore' | 'annule' | 'hors_liste_blanche';
const JOUR = 86_400_000;

/** Lien absolu avec suivi de campagne (EMAILS §3 : `lien(route, { utm_campaign })`). */
export function lienAbsolu(urlSite: string, route: string, modele: string): string {
  const url = new URL(route, `${urlSite}/`);
  if (url.origin === new URL(urlSite).origin) {
    url.searchParams.set('utm_source', 'email');
    url.searchParams.set('utm_campaign', modele);
  }
  return url.toString();
}

function absolutiser(c: ConfigEnvoi, modele: string, d: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(d).map(([k, v]) =>
      typeof v === 'string' && (k === 'lien' || k.startsWith('lien')) && v.startsWith('/')
        ? [k, lienAbsolu(c.urlSite, v, modele)]
        : [k, v],
    ),
  );
}

/**
 * Tâche `envoyerEnvoi` : relit l'envoi, annule une relance devenue inutile, rend le modèle, envoie,
 * puis note le résultat. Lève une erreur pour que Cloud Tasks réessaie (5 fois au plus).
 */
export async function traiterEnvoi(
  c: ConfigEnvoi,
  envoiId: string,
  secrets: Record<string, string> = {},
): Promise<IssueEnvoi> {
  const s = { db: c.db, horloge: c.horloge };
  const envoi = await lireEnvoi(s, envoiId);
  if (!envoi || !estModele(envoi.modele)) return 'ignore';
  const nom = envoi.modele as NomModele;
  if (definition(nom).differe && !(await encoreValable(c.db, envoi))) {
    await annulerEnvoi(s, envoiId);
    return 'annule';
  }
  if (!estAutorise(envoi.destinataire, c.listeBlanche)) {
    await annulerEnvoi(s, envoiId);
    return 'hors_liste_blanche';
  }

  const sujet = envoi.uid ? `u:${envoi.uid}` : `e:${empreinteEmail(envoi.destinataire)}`;
  const expireLe = c.horloge() + 90 * JOUR;
  const preferences = `${c.urlSite}/preferences?t=${signerJeton({ sujet, expireLe }, c.secret)}`;
  const desabonnement = `${c.urlSite}/api/desabonnement?t=${signerJeton({ sujet, categorie: envoi.categorie, expireLe }, c.secret)}`;
  const donnees = absolutiser(c, nom, { ...envoi.donnees, ...secrets });
  const def = definition(nom);

  try {
    const rendu = await rendreEmail(nom, donnees, {
      espace: envoi.artisanId ? 'pro' : 'particulier',
      pied: { preferences, desabonnement, aide: `${c.urlSite}/aide`, editeur: c.editeur },
    });
    let id: string;
    if (envoi.canal === 'sms') {
      id = (await c.sms.envoyer({ a: envoi.destinataire, texte: rendu.sms ?? rendu.sujet })).id;
    } else {
      const desabonnable = ['activite', 'relance', 'offres_pro', 'marketing'].includes(
        def.categorie,
      );
      id = (
        await c.email.envoyer({
          de: def.charte === 'pro' || envoi.artisanId ? c.expediteurs.pro : c.expediteurs.defaut,
          a: envoi.destinataire,
          sujet: rendu.sujet,
          html: rendu.html,
          texte: rendu.texte,
          ...(c.repondreA ? { repondreA: c.repondreA } : {}),
          ...(desabonnable
            ? {
                entetes: {
                  'List-Unsubscribe': `<${desabonnement}>`,
                  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
              }
            : {}),
        })
      ).id;
    }
    await marquerEnvoye(s, envoiId, id);
    return 'envoye';
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (await noterEchec(s, envoiId, message)) throw e;
    return 'ignore';
  }
}
