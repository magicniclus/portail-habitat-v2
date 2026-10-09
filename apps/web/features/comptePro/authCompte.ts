'use client';

import type { TotpSecret, User } from 'firebase/auth';
import { ouvrirSessionPro } from '@/features/connexion/sessionPro';
import { authClient } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';

/**
 * Réglages de connexion faits dans le navigateur (Firebase Auth) : chaque changement exige une
 * connexion récente (mot de passe, et code de l'application si la double authentification est
 * active), puis la session serveur et `users/{uid}` sont remis à jour.
 */

const erreur = (message: string) => Object.assign(new Error(message), { code: 'compte' });

async function utilisateur(): Promise<User> {
  const auth = await authClient();
  await auth.authStateReady();
  if (!auth.currentUser)
    throw erreur('Reconnectez-vous pour modifier ces réglages, puis réessayez.');
  return auth.currentUser;
}

/** Messages lisibles pour les erreurs Firebase les plus courantes. */
export function messageAuth(e: unknown): string {
  const code = (e as { code?: string }).code ?? '';
  if (code === 'compte') return (e as Error).message;
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential')
    return 'Mot de passe incorrect.';
  if (code === 'auth/invalid-verification-code') return 'Code incorrect. Réessayez.';
  if (code === 'auth/weak-password') return 'Mot de passe trop faible : 8 caractères au moins.';
  if (code === 'auth/too-many-requests') return 'Trop d’essais. Patientez quelques minutes.';
  if (code === 'auth/requires-recent-login')
    return 'Pour votre sécurité, reconnectez-vous puis réessayez.';
  if (code === 'auth/popup-closed-by-user') return 'Fenêtre fermée avant la fin.';
  if (code === 'auth/credential-already-in-use')
    return 'Ce compte Google est déjà lié à un autre compte.';
  if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation')
    return 'Cette option n’est pas encore activée sur Portail Habitat.';
  return 'Une erreur est survenue. Réessayez dans un instant.';
}

/** Connexion récente : mot de passe, puis code TOTP si un second facteur est enregistré. */
async function reauthentifier(motDePasse: string, code?: string): Promise<User> {
  const u = await utilisateur();
  const m = await import('firebase/auth');
  const auth = await authClient();
  try {
    await m.reauthenticateWithCredential(u, m.EmailAuthProvider.credential(u.email!, motDePasse));
  } catch (e) {
    if ((e as { code?: string }).code !== 'auth/multi-factor-auth-required') throw e;
    const resolveur = m.getMultiFactorResolver(
      auth,
      e as Parameters<typeof m.getMultiFactorResolver>[1],
    );
    const totp = resolveur.hints.find((h) => h.factorId === m.TotpMultiFactorGenerator.FACTOR_ID);
    if (!totp || !code)
      throw erreur('Saisissez aussi le code à 6 chiffres de votre application d’authentification.');
    await resolveur.resolveSignIn(m.TotpMultiFactorGenerator.assertionForSignIn(totp.uid, code));
  }
  return u;
}

/** Nouveaux droits dans le cookie de session, puis `users/{uid}` recopié depuis Auth. */
async function rafraichirCompte(): Promise<void> {
  const u = await utilisateur();
  await u.getIdToken(true);
  await ouvrirSessionPro({ user: u });
  await posterJson<null>('/api/pro/compte/synchroniser', {});
}

export async function changerMotDePasse(actuel: string, nouveau: string, code?: string) {
  const u = await reauthentifier(actuel, code);
  const m = await import('firebase/auth');
  await m.updatePassword(u, nouveau);
  // Le changement révoque les sessions existantes : nouvelle session d'abord, puis l'alerte.
  await rafraichirCompte();
  await posterJson<null>('/api/pro/compte/mot-de-passe', {});
}

/** Première étape de l'application d'authentification : clé secrète et lien `otpauth://`. */
export async function preparerTotp(motDePasse: string, code?: string) {
  const u = await reauthentifier(motDePasse, code);
  const m = await import('firebase/auth');
  const secret = await m.TotpMultiFactorGenerator.generateSecret(
    await m.multiFactor(u).getSession(),
  );
  return { secret, lien: secret.generateQrCodeUrl(u.email ?? 'compte', 'Portail Habitat') };
}

export async function finaliserTotp(secret: TotpSecret, code: string) {
  const u = await utilisateur();
  const m = await import('firebase/auth');
  await m
    .multiFactor(u)
    .enroll(m.TotpMultiFactorGenerator.assertionForEnrollment(secret, code), 'Application');
  await rafraichirCompte();
}

export async function retirerFacteur(facteurUid: string, motDePasse: string, code?: string) {
  const u = await reauthentifier(motDePasse, code);
  const m = await import('firebase/auth');
  await m.multiFactor(u).unenroll(facteurUid);
  await rafraichirCompte();
}

export async function lierGoogle() {
  const u = await utilisateur();
  const m = await import('firebase/auth');
  await m.linkWithPopup(u, new m.GoogleAuthProvider());
  await rafraichirCompte();
}

export async function delierGoogle() {
  const u = await utilisateur();
  const m = await import('firebase/auth');
  await m.unlink(u, 'google.com');
  await rafraichirCompte();
}

/**
 * SMS (flag `deuxFacteursSms`, Identity Platform facturé) : envoi du code au numéro, pour le
 * vérifier (`enSecours` = false) ou l'ajouter comme second facteur de secours.
 */
export async function envoyerCodeSms(numero: string, conteneur: string, enSecours: boolean) {
  const u = await utilisateur();
  const auth = await authClient();
  const m = await import('firebase/auth');
  const verificateur = new m.RecaptchaVerifier(auth, conteneur, { size: 'invisible' });
  const options = enSecours
    ? { phoneNumber: numero, session: await m.multiFactor(u).getSession() }
    : numero;
  return new m.PhoneAuthProvider(auth).verifyPhoneNumber(options, verificateur);
}

export async function validerCodeSms(verificationId: string, code: string, enSecours: boolean) {
  const u = await utilisateur();
  const m = await import('firebase/auth');
  const preuve = m.PhoneAuthProvider.credential(verificationId, code);
  if (enSecours)
    await m.multiFactor(u).enroll(m.PhoneMultiFactorGenerator.assertion(preuve), 'SMS');
  else await m.updatePhoneNumber(u, preuve);
  await rafraichirCompte();
}
