import {
  cleIdempotence,
  deciderCanaux,
  definition,
  instantSms,
  planifierEnvoi,
  type NomModele,
  type Preferences,
} from '@ph/core/notifications';
import { createHash } from 'node:crypto';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';

/** Planifie l'envoi (Cloud Task `envoyerEnvoi`) ; les secrets ne passent que par la tâche. */
export type PlanifierEnvoi = (e: {
  envoiId: string;
  envoyerLe: Date;
  secrets: Record<string, string>;
}) => Promise<void>;

export interface ServicesNotifications {
  db: Firestore;
  horloge: () => number;
  planifier: PlanifierEnvoi;
}

export interface Destinataire {
  uid?: string;
  /** Sans compte (invitation, prospect) : adresse fournie par l'appelant. */
  email?: string;
  artisanId?: string;
}

export interface Envoi {
  modele: NomModele;
  destinataire: Destinataire;
  /** Objet concerné (`demandes/abc`) : fait partie de la clé d'idempotence. */
  refObjet: string;
  /** Données du modèle, enregistrées dans `emails/` : jamais de secret. */
  donnees: Record<string, unknown>;
  /** Liens magiques, jetons d'invitation… : transmis à la tâche d'envoi, jamais écrits en base. */
  secrets?: Record<string, string>;
  variante?: string;
  /** Envoi différé (relances) ; immédiat sinon. */
  envoyerLe?: Date;
  titreInApp?: string;
}

export interface ResultatNotifier {
  email?: string;
  sms?: string;
  inapp?: string;
  /** Raison d'un canal non utilisé (préférences, liste de blocage, déjà envoyé). */
  ignores: Record<string, string>;
}

export const empreinteEmail = (email: string) =>
  createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
const idEnvoi = (cle: string) => createHash('sha256').update(cle).digest('hex').slice(0, 40);
const TREIZE_MOIS_MS = 395 * 86_400_000;

interface Profil {
  email?: string;
  telephone?: string;
  telephoneVerifie?: boolean;
  preferences?: { notifs?: Preferences };
}

async function historique(s: ServicesNotifications, uid: string | undefined, maintenant: number) {
  if (!uid) return { nonTransactionnelsAujourdhui: 0, offresPro7j: 0 };
  const recents = await s.db
    .collection(collections.emails)
    .where('uid', '==', uid)
    .where('createdAt', '>', Timestamp.fromMillis(maintenant - 7 * 86_400_000))
    .get();
  const jour = new Date(maintenant).toISOString().slice(0, 10);
  let nonTransactionnelsAujourdhui = 0;
  let offresPro7j = 0;
  for (const d of recents.docs) {
    const cat = d.get('categorie') as string;
    if (['activite', 'relance', 'offres_pro', 'marketing'].includes(cat)) {
      const le = (d.get('envoyerLe') as Timestamp).toDate().toISOString().slice(0, 10);
      if (le === jour) nonTransactionnelsAujourdhui++;
    }
    if (cat === 'offres_pro') offresPro7j++;
  }
  return { nonTransactionnelsAujourdhui, offresPro7j };
}

/**
 * Seule porte d'entrée des envois (EMAILS §1) : résout les canaux (préférences, catégorie, liste de
 * blocage), écrit `emails/{id}` une seule fois par clé d'idempotence, planifie l'envoi et crée la
 * notification in-app. Deux appels identiques ne produisent qu'un envoi.
 */
export async function notifier(s: ServicesNotifications, e: Envoi): Promise<ResultatNotifier> {
  const maintenant = s.horloge();
  const def = definition(e.modele);
  const profil: Profil = e.destinataire.uid
    ? (((await s.db.doc(chemins.user(e.destinataire.uid)).get()).data() as Profil | undefined) ??
      {})
    : {};
  const email = profil.email ?? e.destinataire.email;
  const telephone = profil.telephoneVerifie ? profil.telephone : undefined;
  const suppression = email
    ? await s.db.collection(collections.suppressions).doc(empreinteEmail(email)).get()
    : null;
  const canaux = deciderCanaux(e.modele, {
    preferences: profil.preferences?.notifs,
    emailSupprime: suppression?.exists ?? false,
    securiteDejaForcee: suppression?.get('securiteForcee') === true,
    telephone: Boolean(telephone),
  });
  const res: ResultatNotifier = { ignores: {} };
  const destinataireCle = e.destinataire.uid ?? (email ? empreinteEmail(email) : 'inconnu');
  const cle = cleIdempotence(e.modele, e.refObjet, destinataireCle, e.variante);
  const voulu = e.envoyerLe ?? new Date(maintenant);

  const ecrire = async (canal: 'email' | 'sms', a: string, envoyerLe: Date) => {
    const id = idEnvoi(`${canal}:${cle}`);
    try {
      await s.db
        .collection(collections.emails)
        .doc(id)
        .create({
          schemaVersion: 1,
          modele: e.modele,
          canal,
          destinataire: a,
          ...(e.destinataire.uid ? { uid: e.destinataire.uid } : {}),
          ...(e.destinataire.artisanId ? { artisanId: e.destinataire.artisanId } : {}),
          categorie: def.categorie,
          refObjet: e.refObjet,
          cleIdempotence: `${canal}:${cle}`,
          donnees: e.donnees,
          envoyerLe: Timestamp.fromDate(envoyerLe),
          statut: 'en_file',
          tentatives: 0,
          createdAt: Timestamp.fromMillis(maintenant),
          expireLe: Timestamp.fromMillis(maintenant + TREIZE_MOIS_MS),
        });
    } catch (err) {
      if ((err as { code?: number }).code === 6) return null; // ALREADY_EXISTS : déjà envoyé
      throw err;
    }
    await s.planifier({ envoiId: id, envoyerLe, secrets: e.secrets ?? {} });
    return id;
  };

  if (canaux.email === 'envoyer' && email) {
    const le = planifierEnvoi(e.modele, voulu, await historique(s, e.destinataire.uid, maintenant));
    if (!le) res.ignores.email = 'limite_pression';
    else {
      const id = await ecrire('email', email, le);
      if (id) res.email = id;
      else res.ignores.email = 'deja_envoye';
      if (id && suppression?.exists && def.categorie === 'securite')
        await suppression.ref.update({ securiteForcee: true });
    }
  } else res.ignores.email = email ? canaux.email : 'sans_adresse';

  if (canaux.sms === 'envoyer' && telephone) {
    const id = await ecrire('sms', telephone, instantSms(e.modele, voulu));
    if (id) res.sms = id;
  } else if (canaux.sms !== 'non_prevu') res.ignores.sms = canaux.sms;

  if (canaux.inapp === 'envoyer' && e.destinataire.uid) {
    const id = idEnvoi(`inapp:${cle}`);
    const ref = s.db.collection(chemins.notifications(e.destinataire.uid)).doc(id);
    await ref
      .create({
        schemaVersion: 1,
        type: e.modele,
        titre: (e.titreInApp ?? e.modele).slice(0, 140),
        corps: String(e.donnees.resumeInApp ?? '').slice(0, 1000),
        ...(typeof e.donnees.lienInApp === 'string' ? { lien: e.donnees.lienInApp } : {}),
        lu: false,
        createdAt: Timestamp.fromMillis(maintenant),
      })
      .then(() => (res.inapp = id))
      .catch((err: { code?: number }) => {
        if (err.code !== 6) throw err;
      });
  } else if (canaux.inapp !== 'non_prevu') res.ignores.inapp = canaux.inapp;
  return res;
}
