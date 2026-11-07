import { consentement } from '@ph/core/schemas';
import type { CollectionReference, Transaction } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { rattacherOuCreerParticulier } from '../comptes/particuliers';
import type { ServicesComptes } from '../comptes/services';
import { depot } from '../depot';

/**
 * Particulier auquel rattacher un envoi (demande, dossier de diagnostics) : la personne connectée
 * si c'est un particulier, sinon le compte de l'email, créé au besoin sans ouvrir de session (COMPTES §2).
 */
export async function particulierDeLEnvoi(
  s: ServicesComptes,
  uidConnecte: string | null | undefined,
  email: string,
): Promise<string> {
  if (uidConnecte) {
    const roles = (await s.db.doc(chemins.user(uidConnecte)).get()).get('roles') as
      string[] | undefined;
    if (roles?.includes('particulier')) return uidConnecte;
  }
  return (await rattacherOuCreerParticulier(s, email)).uid;
}

export interface TraceEnvoi {
  ipHash?: string;
  userAgent?: string;
}

/**
 * Consentements d'un envoi, en transaction : politique de confidentialité et mise en relation
 * (valeur choisie). Renvoie l'identifiant du consentement de mise en relation.
 */
export function ecrireConsentements(
  s: Pick<ServicesComptes, 'db'>,
  t: Transaction,
  e: {
    uid: string;
    version: string;
    source: string;
    miseEnRelation: boolean;
    maintenant: Date;
    trace: TraceEnvoi;
  },
): string {
  const consentements = depot(s.db, chemins.consentements(e.uid), consentement);
  const miseEnRelation = consentements.reference.doc();
  const commun = {
    schemaVersion: 1 as const,
    version: e.version,
    source: e.source,
    createdAt: e.maintenant,
    ...(e.trace.ipHash ? { ipHash: e.trace.ipHash } : {}),
    ...(e.trace.userAgent ? { userAgent: e.trace.userAgent.slice(0, 400) } : {}),
  };
  t.create(consentements.reference.doc(), { ...commun, type: 'confidentialite', valeur: true });
  t.create(miseEnRelation, { ...commun, type: 'mise_en_relation', valeur: e.miseEnRelation });
  return miseEnRelation.id;
}

/**
 * Lien de l'email de confirmation : compte créé par l'envoi → lien magique vers le suivi ; compte
 * existant → page de connexion, jamais de session ouverte à partir d'un simple email (COMPTES §2).
 */
export async function lienDeSuivi(
  s: ServicesComptes & { urlSite: string },
  uid: string,
  email: string,
  suite: string,
): Promise<{ lien: string; nouveauCompte: boolean }> {
  const compte = await s.auth.getUser(uid);
  const cible = encodeURIComponent(suite);
  if (compte.emailVerified)
    return { lien: `${s.urlSite}/connexion?suite=${cible}`, nouveauCompte: false };
  const lien = await s.auth.generateSignInWithEmailLink(email, {
    url: `${s.urlSite}/connexion/lien?suite=${cible}`,
    handleCodeInApp: true,
  });
  return { lien, nouveauCompte: true };
}

/** Référence lisible unique dans une collection (nouvel essai en cas de collision, 32⁶ possibilités). */
export async function referenceUnique(
  t: Transaction,
  collection: CollectionReference,
  generer: () => string,
): Promise<string> {
  for (let essai = 0; essai < 5; essai++) {
    const reference = generer();
    if ((await t.get(collection.where('reference', '==', reference).limit(1))).empty)
      return reference;
  }
  throw new Error('Référence introuvable après 5 essais.');
}
