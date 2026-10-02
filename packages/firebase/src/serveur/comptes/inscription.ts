import type { entreeInscriptionEtape1, entreeInscriptionEtape2 } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { Timestamp } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { empreinteEmail } from '../notifications/notifier';
import { empreinteJeton, JOUR_MS, nouveauJeton, type ServicesComptes } from './services';

type Services = ServicesComptes & { urlSite: string };
const DUREE_MS = 30 * JOUR_MS;

export interface BrouillonInscription {
  brouillonId: string;
  etape: 2 | 3;
  identite: { nom: string; telephone: string; email: string; codePostal: string };
  metierPrincipal: string;
  metiers: string[];
  intentions: string[];
  zone?: { ville: string; centre: { latitude: number; longitude: number }; rayonKm: number };
}

const ref = (s: ServicesComptes, id: string) =>
  s.db.collection(collections.brouillonsOnboarding).doc(id);

/**
 * Étape 1 terminée (COMPTES §3.2) : brouillon `brouillonsOnboarding` (30 jours, sans compte) et lien
 * de reprise envoyé par email (ONB-04) ; seule l'empreinte du jeton est stockée.
 */
export async function enregistrerEtape1(
  s: Services,
  e: z.output<typeof entreeInscriptionEtape1>,
  brouillonId?: string,
): Promise<{ brouillonId: string }> {
  const maintenant = s.horloge();
  const existant = brouillonId ? await ref(s, brouillonId).get() : null;
  const doc = existant?.exists
    ? existant.ref
    : s.db.collection(collections.brouillonsOnboarding).doc();
  const donnees = {
    identite: { nom: e.nom, telephone: e.telephone, email: e.email, codePostal: e.codePostal },
    metierPrincipal: e.metierPrincipal,
    metiers: e.metiers,
    intentions: e.intentions,
  };
  const jeton = (s.jeton ?? nouveauJeton)();
  const nouveau = !existant?.exists || existant.get('emailHash') !== empreinteEmail(e.email);
  await doc.set(
    {
      schemaVersion: 1,
      etape: 2,
      donnees,
      emailHash: empreinteEmail(e.email),
      ...(nouveau ? { jetonHash: empreinteJeton(jeton) } : {}),
      majLe: Timestamp.fromMillis(maintenant),
      expireLe: Timestamp.fromMillis(maintenant + DUREE_MS),
      ...(existant?.exists ? {} : { createdAt: Timestamp.fromMillis(maintenant) }),
    },
    { merge: true },
  );
  if (nouveau)
    await s.notifier({
      modele: 'reprise-onboarding',
      destinataire: { email: e.email },
      refObjet: `${collections.brouillonsOnboarding}/${doc.id}`,
      donnees: { prenom: e.nom.split(' ')[0], nomCommercial: e.nom },
      secrets: { lien: `${s.urlSite}/pro/inscription?reprise=${encodeURIComponent(jeton)}` },
    });
  return { brouillonId: doc.id };
}

export async function enregistrerZone(
  s: ServicesComptes,
  brouillonId: string,
  e: z.output<typeof entreeInscriptionEtape2>,
): Promise<void> {
  const d = await ref(s, brouillonId).get();
  if (!d.exists) return;
  await d.ref.update({
    etape: 3,
    'donnees.zone': { ville: e.ville, centre: e.centre, rayonKm: e.rayonKm },
    majLe: Timestamp.fromMillis(s.horloge()),
  });
}

/** Brouillon en cours (cookie httpOnly) ; `null` s'il n'existe plus ou a expiré. */
export async function lireBrouillonInscription(
  s: ServicesComptes,
  brouillonId: string,
): Promise<BrouillonInscription | null> {
  const d = await ref(s, brouillonId).get();
  if (!d.exists || (d.get('expireLe') as Timestamp).toMillis() < s.horloge()) return null;
  return {
    brouillonId,
    etape: d.get('etape') as 2 | 3,
    ...(d.get('donnees') as Omit<BrouillonInscription, 'brouillonId' | 'etape'>),
  };
}

/** Lien de reprise (ONB-04) : identifiant du brouillon, valable jusqu'à son expiration. */
export async function reprendreInscription(
  s: ServicesComptes,
  jeton: string,
): Promise<string | null> {
  const r = await s.db
    .collection(collections.brouillonsOnboarding)
    .where('jetonHash', '==', empreinteJeton(jeton))
    .limit(1)
    .get();
  const d = r.docs[0];
  if (!d || (d.get('expireLe') as Timestamp).toMillis() < s.horloge()) return null;
  return d.id;
}
