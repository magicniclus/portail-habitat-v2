import { CATEGORIES_OBLIGATOIRES, type Categorie } from '@ph/core/notifications';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { ContenuJeton } from './jetons';
import type { ServicesNotifications } from './notifier';

/** Nouvelles tentatives avant l'abandon (EMAILS §1). */
export const TENTATIVES_MAX = 5;

export interface EnvoiEnFile {
  id: string;
  modele: string;
  canal: 'email' | 'sms';
  destinataire: string;
  uid?: string;
  artisanId?: string;
  categorie: Categorie;
  refObjet: string;
  donnees: Record<string, unknown>;
  tentatives: number;
}

type Services = Pick<ServicesNotifications, 'db' | 'horloge'>;
const ref = (s: Services, id: string) => s.db.collection(collections.emails).doc(id);

/** Envoi à traiter par la tâche, ou `null` s'il a déjà été envoyé, annulé ou abandonné. */
export async function lireEnvoi(s: Services, id: string): Promise<EnvoiEnFile | null> {
  const d = (await ref(s, id).get()).data();
  if (!d || d.statut !== 'en_file') return null;
  return { id, ...(d as Omit<EnvoiEnFile, 'id'>) };
}

export async function marquerEnvoye(s: Services, id: string, fournisseurId: string) {
  await ref(s, id).update({
    statut: 'envoye',
    fournisseurId,
    updatedAt: Timestamp.fromMillis(s.horloge()),
  });
}

/** Relance annulée : la condition n'est plus vraie au moment de l'envoi (`encoreValable`). */
export async function annulerEnvoi(s: Services, id: string) {
  await ref(s, id).update({ statut: 'annule' });
}

/**
 * Échec d'envoi : compte la tentative ; au-delà de 5, statut `echec` et tâche de modération.
 * Renvoie `true` s'il faut réessayer.
 */
export async function noterEchec(s: Services, id: string, erreur: string): Promise<boolean> {
  return s.db.runTransaction(async (tx) => {
    const d = (await tx.get(ref(s, id))).data();
    if (!d) return false;
    const tentatives = (d.tentatives as number) + 1;
    const abandon = tentatives >= TENTATIVES_MAX;
    tx.update(ref(s, id), {
      tentatives,
      erreur: erreur.slice(0, 500),
      ...(abandon ? { statut: 'echec' } : {}),
    });
    if (abandon)
      tx.set(s.db.collection(collections.filesModeration).doc(), {
        schemaVersion: 1,
        createdAt: Timestamp.fromMillis(s.horloge()),
        type: 'envoi_echec',
        refs: { emailId: id },
        priorite: 2,
        statut: 'a_traiter',
        permissionRequise: 'contacts.traiter',
      });
    return !abandon;
  });
}

export type EvenementFournisseur = 'delivre' | 'ouvert' | 'clic' | 'rebond' | 'plainte';

/**
 * Webhook du fournisseur (EMAILS §7) : met à jour le statut ; un rebond définitif ou une plainte
 * ajoute l'adresse à la liste de blocage, et une plainte coupe aussi le marketing.
 */
export async function appliquerEvenement(
  s: Services,
  fournisseurId: string,
  type: EvenementFournisseur,
  empreinte: (email: string) => string,
): Promise<boolean> {
  const trouves = await s.db
    .collection(collections.emails)
    .where('fournisseurId', '==', fournisseurId)
    .limit(1)
    .get();
  const doc = trouves.docs[0];
  if (!doc) return false;
  await doc.ref.update({ statut: type, updatedAt: Timestamp.fromMillis(s.horloge()) });
  if (type === 'rebond' || type === 'plainte') {
    await s.db
      .collection(collections.suppressions)
      .doc(empreinte(doc.get('destinataire') as string))
      .set({ schemaVersion: 1, motif: type, createdAt: Timestamp.fromMillis(s.horloge()) });
    const uid = doc.get('uid') as string | undefined;
    if (type === 'plainte' && uid)
      await s.db.doc(chemins.user(uid)).update({ 'preferences.notifs.marketing.email': false });
  }
  return true;
}

/**
 * Désabonnement en un clic (en-tête List-Unsubscribe-Post) : coupe la catégorie du lien, pas tout.
 * Sans compte (prospect), l'adresse passe dans la liste de blocage.
 */
export async function desabonner(s: Services, j: ContenuJeton): Promise<void> {
  const categorie = j.categorie as Categorie | undefined;
  if (categorie && CATEGORIES_OBLIGATOIRES.includes(categorie)) return;
  if (j.sujet.startsWith('u:')) {
    if (!categorie) return;
    await s.db.doc(chemins.user(j.sujet.slice(2))).update({
      [`preferences.notifs.${categorie}.email`]: false,
      updatedAt: Timestamp.fromMillis(s.horloge()),
    });
  } else if (j.sujet.startsWith('e:')) {
    await s.db
      .collection(collections.suppressions)
      .doc(j.sujet.slice(2))
      .set({ schemaVersion: 1, motif: 'demande', createdAt: Timestamp.fromMillis(s.horloge()) });
  }
}

export interface PreferencesPage {
  activite: { email: boolean; inapp: boolean };
  relance: { email: boolean };
  offres_pro: { email: boolean };
  marketing: { email: boolean };
}

/** Page /preferences : lecture et mise à jour des catégories désactivables. */
export async function majPreferences(s: Services, uid: string, p: PreferencesPage) {
  await s.db.doc(chemins.user(uid)).update({
    'preferences.notifs.activite.email': p.activite.email,
    'preferences.notifs.activite.inapp': p.activite.inapp,
    'preferences.notifs.relance.email': p.relance.email,
    'preferences.notifs.offres_pro.email': p.offres_pro.email,
    'preferences.notifs.marketing.email': p.marketing.email,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
