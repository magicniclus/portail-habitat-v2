import type { Firestore } from 'firebase-admin/firestore';
import { chemins } from '@ph/firebase/chemins';
import type { EnvoiEnFile } from '@ph/firebase/notifications';

/**
 * `encoreValable` des envois différés (EMAILS §1) : relue au moment de l'envoi. Une relance dont
 * la condition n'est plus vraie est annulée (ex. onboarding terminé entre-temps).
 */
type Condition = (db: Firestore, envoi: EnvoiEnFile) => Promise<boolean>;

const brouillonOnboardingOuvert: Condition = async (db, e) => {
  const id = e.refObjet.split('/')[1];
  if (!id) return false;
  return (await db.doc(chemins.brouillonOnboarding(id)).get()).exists;
};

const CONDITIONS: Partial<Record<string, Condition>> = {
  'relance-onboarding-1': brouillonOnboardingOuvert,
  'relance-onboarding-2': brouillonOnboardingOuvert,
  'relance-onboarding-3': brouillonOnboardingOuvert,
  'invitation-relance': async (db, e) =>
    (await db.doc(e.refObjet).get()).get('statut') === 'envoyee',
  'reprise-simulateur-rappel': async (db, e) => (await db.doc(e.refObjet).get()).exists,
  'fiche-incomplete': async (db, e) =>
    ((await db.doc(chemins.artisan(e.artisanId ?? '_')).get()).get('completude') ?? 100) < 60,
};

export async function encoreValable(db: Firestore, envoi: EnvoiEnFile): Promise<boolean> {
  const c = CONDITIONS[envoi.modele];
  return c ? c(db, envoi) : true;
}
