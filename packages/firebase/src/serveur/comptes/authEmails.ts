import { Timestamp } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import type { ServicesComptes } from './services';

/**
 * Emails d'authentification personnalisés (EMAILS §4.1) : Firebase génère le lien, `notifier()`
 * l'envoie avec notre mise en page ; le lien ne passe que par la tâche d'envoi (secret).
 * Au plus 5 envois par heure et par adresse ; au-delà, rien ne part, sans le dire.
 */
const ENVOIS_AUTH_MAX_HEURE = 5;

type Services = ServicesComptes & { urlSite: string };
type ModeleAuth = 'lien-connexion' | 'verifier-email' | 'mot-de-passe-oublie';

async function plafondAtteint(s: Services, modele: ModeleAuth, email: string): Promise<boolean> {
  const recents = await s.db
    .collection(collections.emails)
    .where('modele', '==', modele)
    .where('destinataire', '==', email)
    .where('createdAt', '>', Timestamp.fromMillis(s.horloge() - 3_600_000))
    .count()
    .get();
  return recents.data().count >= ENVOIS_AUTH_MAX_HEURE;
}

async function envoyer(
  s: Services,
  modele: ModeleAuth,
  email: string,
  uid: string | undefined,
  lien: string,
  prenom?: string,
) {
  if (await plafondAtteint(s, modele, email)) return;
  await s.notifier({
    modele,
    destinataire: uid ? { uid, email } : { email },
    refObjet: `auth/${modele}`,
    variante: String(s.horloge()),
    donnees: prenom ? { prenom } : {},
    secrets: { lien },
  });
}

const prenomDe = (nom?: string) => nom?.split(' ')[0];

/** Lien magique (connexion ou création de compte au premier clic), valable 1 h. */
export async function envoyerLienConnexion(
  s: Services,
  email: string,
  espace: 'particulier' | 'pro',
) {
  const lien = await s.auth.generateSignInWithEmailLink(email, {
    url: `${s.urlSite}${espace === 'pro' ? '/pro' : ''}/connexion/lien`,
    handleCodeInApp: true,
  });
  const compte = await s.auth.getUserByEmail(email).catch(() => null);
  await envoyer(s, 'lien-connexion', email, compte?.uid, lien, prenomDe(compte?.displayName));
}

/** Vérification de l'adresse après une inscription avec mot de passe (24 h). */
export async function envoyerVerificationEmail(s: Services, uid: string) {
  const compte = await s.auth.getUser(uid);
  if (!compte.email || compte.emailVerified) return;
  const lien = await s.auth.generateEmailVerificationLink(compte.email, {
    url: `${s.urlSite}/connexion`,
  });
  await envoyer(s, 'verifier-email', compte.email, uid, lien, prenomDe(compte.displayName));
}

/** Mot de passe oublié : rien n'est envoyé pour une adresse inconnue, et l'appelant ne le sait pas. */
export async function envoyerReinitialisation(s: Services, email: string) {
  const compte = await s.auth.getUserByEmail(email).catch(() => null);
  if (!compte) return;
  const lien = await s.auth.generatePasswordResetLink(email, { url: `${s.urlSite}/connexion` });
  await envoyer(s, 'mot-de-passe-oublie', email, compte.uid, lien, prenomDe(compte.displayName));
}
