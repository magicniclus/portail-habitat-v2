'use client';

import type { MultiFactorResolver, UserCredential } from 'firebase/auth';
import { authClient } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';

export type Etape =
  | { etape: 'connecte' }
  | { etape: 'secondFacteur'; resolveur: MultiFactorResolver; type: 'totp' | 'phone' };

/** Ouvre la session serveur (cookie httpOnly, 7 jours pour les pros) à partir de la connexion Firebase. */
async function ouvrirSessionPro(c: UserCredential): Promise<void> {
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
