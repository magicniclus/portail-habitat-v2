import { ErreurMetier } from '@ph/core/erreurs';
import {
  consentementsNotifs,
  normaliserNotifs,
  PREFERENCES_PRO_DEFAUT,
  type FacteurResume,
  type NotifsEntreprise,
  type PreferencesNotifs,
} from '@ph/core/espace-pro';
import { masquerEmail } from '@ph/core/equipe';
import { masquerTel } from '@ph/core/format';
import type { entreeChangerEmail, entreeNotifsPro, entreeProfilPro } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import type { UserRecord } from 'firebase-admin/auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import type { ServicesComptes } from '../comptes/services';
import { suppressionBloquee } from '../comptes/suppression';

/** Mon compte (maquette Mon Compte, COMPTES §9) : réglages de la personne, pas de l'entreprise. */

type Services = ServicesComptes & { urlSite: string };

export interface FacteurPro extends FacteurResume {
  uid: string;
}

export interface ComptePro {
  profil: {
    prenom: string;
    nom: string;
    email: string;
    emailVerifie: boolean;
    telephone: string | null;
    telephoneVerifie: boolean;
  };
  connexion: { motDePasse: boolean; google: string | null };
  facteurs: FacteurPro[];
  notifs: PreferencesNotifs;
  entreprise: { nom: string; notifs: NotifsEntreprise } | null;
  suppressionBloquee: boolean;
}

const NOTIFS_ENTREPRISE_DEFAUT: NotifsEntreprise = { demandes: true, avis: true, factures: true };

function facteursDe(compte: UserRecord): FacteurPro[] {
  return (compte.multiFactor?.enrolledFactors ?? []).map((f) => {
    const telephone = (f as { phoneNumber?: string }).phoneNumber;
    return f.factorId === 'phone'
      ? {
          uid: f.uid,
          type: 'sms' as const,
          ...(telephone ? { telephoneMasque: masquerTel(telephone) } : {}),
        }
      : { uid: f.uid, type: 'totp' as const };
  });
}

/** Préférences enregistrées, complétées par les défauts d'un pro (EMAILS §2). */
function preferencesDe(brut: unknown): PreferencesNotifs {
  const p = (brut ?? {}) as Partial<PreferencesNotifs>;
  return normaliserNotifs({
    activite: { ...PREFERENCES_PRO_DEFAUT.activite, ...p.activite },
    relance: { ...PREFERENCES_PRO_DEFAUT.relance, ...p.relance },
    offres_pro: { ...PREFERENCES_PRO_DEFAUT.offres_pro, ...p.offres_pro },
    marketing: { ...PREFERENCES_PRO_DEFAUT.marketing, ...p.marketing },
  });
}

/**
 * Lecture de la page : Firebase Auth fait foi pour l'email, les méthodes de connexion et les
 * seconds facteurs ; le profil et les préférences viennent de `users/{uid}`.
 */
export async function lireComptePro(
  s: ServicesComptes,
  uid: string,
  artisanId: string | null,
): Promise<ComptePro> {
  const [compte, user, membre, artisan, bloquee] = await Promise.all([
    s.auth.getUser(uid),
    s.db.doc(chemins.user(uid)).get(),
    artisanId ? s.db.doc(chemins.membre(artisanId, uid)).get() : null,
    artisanId ? s.db.doc(chemins.artisan(artisanId)).get() : null,
    suppressionBloquee(s, uid),
  ]);
  const [prenom = '', ...reste] = (compte.displayName ?? '').split(' ');
  const google = compte.providerData.find((p) => p.providerId === 'google.com');
  return {
    profil: {
      prenom: (user.get('prenom') as string | undefined) ?? prenom,
      nom: (user.get('nom') as string | undefined) ?? reste.join(' '),
      email: compte.email ?? '',
      emailVerifie: compte.emailVerified,
      telephone: (user.get('telephone') as string | undefined) ?? null,
      telephoneVerifie: user.get('telephoneVerifie') === true,
    },
    connexion: {
      motDePasse: compte.providerData.some((p) => p.providerId === 'password'),
      google: google ? (google.email ?? '') : null,
    },
    facteurs: facteursDe(compte),
    notifs: preferencesDe(user.get('preferences.notifs')),
    entreprise:
      membre?.exists && artisan?.exists
        ? {
            nom: (artisan.get('nomCommercial') as string | undefined) ?? '',
            notifs: {
              ...NOTIFS_ENTREPRISE_DEFAUT,
              ...(membre.get('notifs') as Partial<NotifsEntreprise> | undefined),
            },
          }
        : null,
    suppressionBloquee: bloquee,
  };
}

/** Prénom, nom (repris par l'équipe et les emails) et téléphone du compte. */
export async function modifierProfilPro(
  s: ServicesComptes,
  uid: string,
  e: z.output<typeof entreeProfilPro>,
): Promise<void> {
  const ref = s.db.doc(chemins.user(uid));
  const nomAffiche = `${e.prenom} ${e.nom}`;
  await s.db.runTransaction(async (t) => {
    const user = await t.get(ref);
    if (!user.exists) throw new ErreurMetier('INTROUVABLE');
    const telephone =
      e.telephone === undefined
        ? {}
        : e.telephone === ''
          ? { telephone: FieldValue.delete(), telephoneVerifie: false }
          : e.telephone === user.get('telephone')
            ? {}
            : { telephone: e.telephone, telephoneVerifie: false };
    t.update(ref, {
      prenom: e.prenom,
      nom: e.nom,
      nomAffiche,
      ...telephone,
      updatedAt: Timestamp.fromMillis(s.horloge()),
    });
  });
  await s.auth.updateUser(uid, { displayName: nomAffiche });
}

/**
 * Changement d'email (maquette : « un lien de confirmation à la nouvelle adresse et une alerte à
 * l'ancienne »). L'adresse ne change qu'au clic sur le lien ; la synchronisation suit.
 */
export async function changerEmailPro(
  s: Services,
  uid: string,
  e: z.output<typeof entreeChangerEmail>,
): Promise<void> {
  const compte = await s.auth.getUser(uid);
  if (!compte.email) throw new ErreurMetier('PRECONDITION');
  if (compte.email === e.email)
    throw new ErreurMetier('PRECONDITION', 'C’est déjà votre adresse de connexion.');
  if (await s.auth.getUserByEmail(e.email).catch(() => null))
    throw new ErreurMetier('CONFLIT', 'Cette adresse ne peut pas être utilisée.');
  const lien = await s.auth.generateVerifyAndChangeEmailLink(compte.email, e.email, {
    url: `${s.urlSite}/connexion?espace=pro`,
  });
  const prenom = compte.displayName?.split(' ')[0];
  const variante = String(s.horloge());
  await s.notifier({
    modele: 'changement-email-verifier',
    destinataire: { email: e.email },
    refObjet: `users/${uid}`,
    variante,
    donnees: prenom ? { prenom } : {},
    secrets: { lien },
  });
  await s.notifier({
    modele: 'changement-email-alerte',
    destinataire: { uid, email: compte.email },
    refObjet: `users/${uid}`,
    variante,
    donnees: { nouvelEmailMasque: masquerEmail(e.email) },
    secrets: { lien: `${s.urlSite}/aide?sujet=pro` },
  });
}

/**
 * Recopie dans `users/{uid}` ce que Firebase Auth fait foi (email, méthodes, second facteur,
 * téléphone vérifié) et prévient par email quand la double authentification change.
 * Appelée à l'ouverture de la page et après chaque changement fait dans le navigateur.
 */
export async function synchroniserComptePro(s: Services, uid: string): Promise<void> {
  const compte = await s.auth.getUser(uid);
  const ref = s.db.doc(chemins.user(uid));
  const avant = await ref.get();
  if (!avant.exists) return;
  const mfaActive = (compte.multiFactor?.enrolledFactors.length ?? 0) > 0;
  const fournisseurs = [
    ...(compte.providerData.some((p) => p.providerId === 'password') ? ['password'] : []),
    ...(compte.providerData.some((p) => p.providerId === 'google.com') ? ['google'] : []),
    ...(compte.providerData.some((p) => p.providerId === 'phone') ? ['telephone'] : []),
  ];
  const telephone = avant.get('telephone') as string | undefined;
  const apres = {
    email: compte.email ?? avant.get('email'),
    emailVerifie: compte.emailVerified,
    mfaActive,
    fournisseurs: fournisseurs.length ? fournisseurs : (avant.get('fournisseurs') ?? []),
    telephoneVerifie: Boolean(telephone && compte.phoneNumber === telephone),
  };
  const change = (Object.keys(apres) as (keyof typeof apres)[]).some(
    (k) => JSON.stringify(avant.get(k) ?? null) !== JSON.stringify(apres[k]),
  );
  if (!change) return;
  await ref.update({ ...apres, updatedAt: Timestamp.fromMillis(s.horloge()) });
  if ((avant.get('mfaActive') === true) !== mfaActive && compte.email)
    await s.notifier({
      modele: mfaActive ? '2fa-activee' : '2fa-desactivee',
      destinataire: { uid, email: compte.email },
      refObjet: `users/${uid}`,
      variante: String(s.horloge()),
      donnees: {},
      secrets: { lien: `${s.urlSite}/aide?sujet=pro` },
    });
}

/** « Déconnecter tous les appareils » : sessions et jetons révoqués, y compris celui-ci. */
export async function deconnecterPartout(s: ServicesComptes, uid: string): Promise<void> {
  await s.auth.revokeRefreshTokens(uid);
}

/**
 * Notifications : préférences personnelles (canaux inutiles coupés), réglages propres à
 * l'entreprise active et journal des consentements quand actualités ou offres pro changent.
 */
export async function modifierNotifsPro(
  s: ServicesComptes & { versionLegale: string },
  uid: string,
  artisanId: string | null,
  e: z.output<typeof entreeNotifsPro>,
  trace: { ipHash?: string; userAgent?: string } = {},
): Promise<void> {
  const refUser = s.db.doc(chemins.user(uid));
  const refMembre = artisanId ? s.db.doc(chemins.membre(artisanId, uid)) : null;
  const maintenant = Timestamp.fromMillis(s.horloge());
  await s.db.runTransaction(async (t) => {
    const [user, membre] = await Promise.all([t.get(refUser), refMembre ? t.get(refMembre) : null]);
    if (!user.exists) throw new ErreurMetier('INTROUVABLE');
    const avant = preferencesDe(user.get('preferences.notifs'));
    const apres = normaliserNotifs(e.preferences);
    t.update(refUser, { 'preferences.notifs': apres, updatedAt: maintenant });
    if (e.entreprise && refMembre && membre?.exists) t.update(refMembre, { notifs: e.entreprise });
    for (const c of consentementsNotifs(avant, apres))
      t.create(s.db.collection(chemins.consentements(uid)).doc(), {
        schemaVersion: 1,
        ...c,
        version: s.versionLegale,
        source: '/pro/compte',
        createdAt: maintenant,
        ...(trace.ipHash ? { ipHash: trace.ipHash } : {}),
        ...(trace.userAgent ? { userAgent: trace.userAgent.slice(0, 400) } : {}),
      });
  });
}
