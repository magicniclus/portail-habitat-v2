import { ErreurMetier } from '@ph/core/erreurs';
import type { entreeBrouillonCompte } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { brouillonParcours, DUREE_BROUILLON_MS, type BrouillonParcours } from '@ph/core/parcours';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { empreinteJeton, nouveauJeton, type Notifier } from '../comptes/services';
import { empreinteEmail } from '../notifications/notifier';

export interface ServicesBrouillons {
  db: Firestore;
  horloge: () => number;
  notifier: Notifier;
  urlSite: string;
  jeton?: () => string;
}

/** Au plus 3 liens par adresse et par jour : au-delà, rien ne part, sans le dire (anti-abus). */
const LIENS_MAX_JOUR = 3;
const JOUR_MS = 86_400_000;

/**
 * « M'envoyer un lien pour reprendre plus tard » (REPRISE_PARCOURS §5, niveau 3) : consentement
 * explicite, brouillon serveur SANS coordonnées (schéma strict), seule l'empreinte du jeton et de
 * l'email est stockée ; le lien (secret) ne passe que par la tâche d'envoi.
 */
export async function demanderLienReprise(
  s: ServicesBrouillons,
  e: { brouillon: BrouillonParcours; email: string; resume: string },
): Promise<{ brouillonId: string }> {
  const b = brouillonParcours.safeParse(e.brouillon);
  if (!b.success) throw new ErreurMetier('ENTREE_INVALIDE');
  const maintenant = s.horloge();
  const email = e.email.trim().toLowerCase();
  const emailHash = empreinteEmail(email);
  const brouillons = s.db.collection(collections.brouillons);
  const ref = brouillons.doc();

  const recents = await brouillons.where('emailHash', '==', emailHash).get();
  const aujourdhui = recents.docs.filter(
    (d) => (d.get('createdAt') as Timestamp).toMillis() > maintenant - JOUR_MS,
  );
  if (aujourdhui.length >= LIENS_MAX_JOUR) return { brouillonId: ref.id };

  const jeton = (s.jeton ?? nouveauJeton)();
  await ref.create({
    schemaVersion: 1,
    parcours: b.data.parcours,
    emailHash,
    donnees: b.data,
    jetonHash: empreinteJeton(jeton),
    majLe: Timestamp.fromMillis(maintenant),
    expireLe: Timestamp.fromMillis(maintenant + DUREE_BROUILLON_MS),
    createdAt: Timestamp.fromMillis(maintenant),
  });
  await s.notifier({
    modele: 'reprise-simulateur',
    destinataire: { email },
    refObjet: `${collections.brouillons}/${ref.id}`,
    donnees: { resume: e.resume.slice(0, 160), etape: b.data.etape },
    secrets: { lien: `${s.urlSite}/simulateur?reprise=${encodeURIComponent(jeton)}` },
  });
  return { brouillonId: ref.id };
}

/**
 * Ouverture du lien (autre appareil, sans compte) : usage unique, 30 jours. Renvoie le brouillon, ou
 * `null` pour un lien inconnu, déjà utilisé ou expiré (« Ce lien a expiré… »).
 */
export async function reprendreParLien(
  s: Pick<ServicesBrouillons, 'db' | 'horloge'>,
  jeton: string,
): Promise<BrouillonParcours | null> {
  const requete = s.db
    .collection(collections.brouillons)
    .where('jetonHash', '==', empreinteJeton(jeton))
    .limit(1);
  return s.db.runTransaction(async (t) => {
    const trouve = (await t.get(requete)).docs[0];
    if (!trouve) return null;
    if ((trouve.get('expireLe') as Timestamp).toMillis() <= s.horloge()) return null;
    const b = brouillonParcours.safeParse(trouve.get('donnees'));
    // Jeton consommé dans tous les cas : un second clic affiche « lien expiré ».
    t.update(trouve.ref, { jetonHash: FieldValue.delete() });
    return b.success ? b.data : null;
  });
}

/** Demande envoyée : le brouillon serveur est supprimé (REPRISE_PARCOURS §4), sans erreur s'il n'existe plus. */
export async function supprimerBrouillon(s: Pick<ServicesBrouillons, 'db'>, id: string) {
  await s.db.collection(collections.brouillons).doc(id).delete();
}

/**
 * Brouillon d'une personne connectée (REPRISE_PARCOURS §5, niveau 2) : un seul document par
 * parcours et par personne, `brouillons/{uid}_{parcours}`, sans coordonnées, expiré après 30 jours.
 */
export async function brouillonCompte(
  s: { db: Firestore; horloge: () => number },
  uid: string,
  e: z.output<typeof entreeBrouillonCompte>,
): Promise<BrouillonParcours | null> {
  const parcours = e.action === 'sauver' ? e.brouillon.parcours : e.parcours;
  const ref = s.db.collection(collections.brouillons).doc(`${uid}_${parcours}`);
  const maintenant = s.horloge();
  if (e.action === 'effacer') {
    await ref.delete();
    return null;
  }
  if (e.action === 'sauver') {
    await ref.set({
      schemaVersion: 1,
      parcours,
      uid,
      donnees: e.brouillon,
      majLe: Timestamp.fromMillis(maintenant),
      expireLe: Timestamp.fromMillis(maintenant + DUREE_BROUILLON_MS),
      createdAt: Timestamp.fromMillis(e.brouillon.creeLe),
    });
    return null;
  }
  const d = await ref.get();
  if (!d.exists || (d.get('expireLe') as Timestamp).toMillis() < maintenant) return null;
  const b = brouillonParcours.safeParse(d.get('donnees'));
  return b.success ? b.data : null;
}
