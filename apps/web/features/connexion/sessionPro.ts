'use client';

import type { MultiFactorResolver, User, UserCredential } from 'firebase/auth';
import { authClient } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';

export type Etape =
  | { etape: 'connecte' }
  | { etape: 'secondFacteur'; resolveur: MultiFactorResolver; type: 'totp' | 'phone' };

/** Ouvre la session serveur (cookie httpOnly, 7 jours pour les pros) à partir de la connexion Firebase. */
export async function ouvrirSessionPro(c: { user: User }): Promise<void> {
  const r = await posterJson<null>('/api/session', {
    jetonId: await c.user.getIdToken(),
    espace: 'pro',
  });
  if (!r.ok) throw Object.assign(new Error(r.message), { code: 'session' });
}

/** Email + mot de passe ; si un second facteur est enregistré, l'écran suivant le demande. */
export async function connecterPro(
  email: string,
  motDePasse: string,
  memoriser: boolean,
): Promise<Etape> {
  const auth = await authClient();
  const m = await import('firebase/auth');
  await m.setPersistence(auth, memoriser ? m.browserLocalPersistence : m.browserSessionPersistence);
  try {
    await ouvrirSessionPro(await m.signInWithEmailAndPassword(auth, email, motDePasse));
    return { etape: 'connecte' };
  } catch (e) {
    if ((e as { code?: string }).code !== 'auth/multi-factor-auth-required') throw e;
    const resolveur = m.getMultiFactorResolver(
      auth,
      e as Parameters<typeof m.getMultiFactorResolver>[1],
    );
    const totp = resolveur.hints.find((h) => h.factorId === m.TotpMultiFactorGenerator.FACTOR_ID);
    return { etape: 'secondFacteur', resolveur, type: totp ? 'totp' : 'phone' };
  }
}

/** Code de l'application d'authentification (TOTP). */
export async function validerTotp(resolveur: MultiFactorResolver, code: string) {
  const m = await import('firebase/auth');
  const indice = resolveur.hints.find((h) => h.factorId === m.TotpMultiFactorGenerator.FACTOR_ID)!;
  const assertion = m.TotpMultiFactorGenerator.assertionForSignIn(indice.uid, code);
  await ouvrirSessionPro(await resolveur.resolveSignIn(assertion));
}

/**
 * Second facteur par SMS : seulement si le flag `deuxFacteursSms` est activé (Identity Platform,
 * SMS facturés). Renvoie l'identifiant de vérification à passer à `validerSms`.
 */
export async function envoyerSms(resolveur: MultiFactorResolver, conteneurRecaptcha: string) {
  const auth = await authClient();
  const m = await import('firebase/auth');
  const verificateur = new m.RecaptchaVerifier(auth, conteneurRecaptcha, { size: 'invisible' });
  const indice = resolveur.hints.find((h) => h.factorId === m.PhoneMultiFactorGenerator.FACTOR_ID)!;
  return new m.PhoneAuthProvider(auth).verifyPhoneNumber(
    { multiFactorHint: indice, session: resolveur.session },
    verificateur,
  );
}

export async function validerSms(
  resolveur: MultiFactorResolver,
  verificationId: string,
  code: string,
) {
  const m = await import('firebase/auth');
  const assertion = m.PhoneMultiFactorGenerator.assertion(
    m.PhoneAuthProvider.credential(verificationId, code),
  );
  await ouvrirSessionPro(await resolveur.resolveSignIn(assertion));
}

/**
 * Compte email + mot de passe créé, ou connexion si l'adresse a déjà un compte avec ce mot de
 * passe ; la session serveur est ouverte.
 */
export async function creerOuConnecter(e: {
  email: string;
  motDePasse: string;
  nom: string;
}): Promise<UserCredential> {
  const auth = await authClient();
  const m = await import('firebase/auth');
  let c: UserCredential;
  try {
    c = await m.createUserWithEmailAndPassword(auth, e.email, e.motDePasse);
    await m.updateProfile(c.user, { displayName: e.nom });
  } catch (err) {
    if ((err as { code?: string }).code !== 'auth/email-already-in-use') throw err;
    c = await m.signInWithEmailAndPassword(auth, e.email, e.motDePasse);
  }
  await ouvrirSessionPro(c);
  return c;
}

/**
 * Étape 3 de l'inscription : compte email + mot de passe (ou connexion si l'adresse a déjà un compte
 * avec ce mot de passe), session, création de l'entreprise, puis session renouvelée avec les
 * nouveaux droits (rôle propriétaire, COMPTES §5).
 */
export async function activerEspace(e: {
  email: string;
  motDePasse: string;
  nom: string;
  siren: string;
}): Promise<{ artisanId: string }> {
  const c = await creerOuConnecter(e);
  const r = await posterJson<{ artisanId: string }>('/api/pro/inscription/finaliser', {
    cleIdempotence: crypto.randomUUID(),
    siren: e.siren,
  });
  if (!r.ok) throw Object.assign(new Error(r.message), { code: 'finaliser', message: r.message });
  await c.user.getIdToken(true);
  await ouvrirSessionPro(c);
  return r.data;
}

/**
 * Invitation (INV-01) : accès créé côté serveur puis connexion si besoin, acceptation, droits
 * rafraîchis. Personne déjà connectée : acceptation avec la connexion en cours.
 */
export async function rejoindreEquipe(e: {
  jeton: string;
  acces?: { nom: string; motDePasse: string };
}): Promise<void> {
  const auth = await authClient();
  const m = await import('firebase/auth');
  if (e.acces) {
    const r = await posterJson<{ email: string }>('/api/pro/invitation/compte', {
      jeton: e.jeton,
      ...e.acces,
    });
    if (!r.ok) throw Object.assign(new Error(r.message), { code: 'invitation' });
    await ouvrirSessionPro(
      await m.signInWithEmailAndPassword(auth, r.data.email, e.acces.motDePasse),
    );
  }
  const r = await posterJson<{ artisanId: string }>('/api/pro/invitation/accepter', {
    jeton: e.jeton,
  });
  if (!r.ok) throw Object.assign(new Error(r.message), { code: 'invitation' });
  await auth.authStateReady();
  const u = auth.currentUser;
  // Nouveaux droits (claims) pour l'écoute temps réel et les fichiers ; la page relit la base.
  if (u)
    await u
      .getIdToken(true)
      .then(() => ouvrirSessionPro({ user: u }))
      .catch(() => undefined);
}
