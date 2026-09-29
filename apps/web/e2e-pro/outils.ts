import { randomUUID } from 'node:crypto';
import { chemins } from '@ph/firebase/chemins';
import { expect, type Page } from '@playwright/test';

/** Mot de passe des comptes du seed (`SEED_MOT_DE_PASSE`, émulateur seulement). */
export const MOT_DE_PASSE = process.env.SEED_MOT_DE_PASSE ?? 'MotDePasse-e2e-2026';

export const COMPTES = {
  proprio: 'proprio@test.local',
  collab: 'collab@test.local',
  compta: 'compta@test.local',
} as const;

export async function connecter(page: Page, email: string, suite = '/pro/tableau-de-bord') {
  await page.goto(`/connexion?espace=pro&suite=${encodeURIComponent(suite)}`);
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Mot de passe/).fill(MOT_DE_PASSE);
  await page.getByRole('button', { name: 'Me connecter' }).click();
  await expect(page).toHaveURL(new RegExp(suite.replace(/[/?]/g, '\\$&')));
}

/** Admin SDK sur l'émulateur (variables héritées de `firebase emulators:exec`). */
async function admin() {
  const [{ getApps, initializeApp }, { getAuth }, { getFirestore, Timestamp }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/auth'),
    import('firebase-admin/firestore'),
  ]);
  const app = getApps()[0] ?? initializeApp({ projectId: 'demo-portail-habitat' });
  return { auth: getAuth(app), db: getFirestore(app), Timestamp };
}

/** Entreprise active d'un compte du seed. */
export async function entrepriseDe(email: string): Promise<string> {
  const { auth, db } = await admin();
  const uid = (await auth.getUserByEmail(email)).uid;
  return (await db.doc(chemins.user(uid)).get()).get('entrepriseActive') as string;
}

/** Nouvelle demande proposée à l'entreprise (comme le ferait le matching, lot 12). */
export async function proposerDemande(artisanId: string): Promise<{ reference: string }> {
  const { db, Timestamp } = await admin();
  const code = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, 'X');
  const reference = `PH-${code}`;
  const demandeId = randomUUID().replaceAll('-', '').slice(0, 20);
  await db.doc(chemins.demande(demandeId)).set({
    reference,
    prestationId: 'peinture',
    contact: {
      prenom: 'Hélène',
      nom: 'Marty',
      email: 'helene@test.local',
      telephone: '+33612345678',
    },
    adresseChantier: { ville: 'Floirac', codePostal: '33270' },
    precisions: 'Peinture du séjour, 30 m².',
    estimation: { minCentimes: 150_000, maxCentimes: 250_000 },
  });
  await db.doc(chemins.attribution(demandeId, artisanId)).set({
    schemaVersion: 1,
    artisanId,
    demandeId,
    statut: 'proposee',
    exclusive: false,
    proposeeLe: Timestamp.now(),
    coordonneesDebloquees: false,
    scoreMatching: 80,
  });
  return { reference };
}

/** Email du propriétaire d'une entreprise du seed ayant ce plan (autre que les comptes fixes). */
export async function proprietaireAvecPlan(plan: 'gratuit' | 'visibilite' | 'premium') {
  const { auth, db } = await admin();
  const artisans = db.doc(chemins.artisan('_')).parent;
  const r = await artisans.where('plan', '==', plan).where('nbMembres', '>=', 1).limit(10).get();
  for (const d of r.docs) {
    const uid = d.get('proprietaireUid') as string | undefined;
    if (uid && !Object.values(COMPTES).some((e) => uid.includes(e.split('@')[0]!)))
      return (await auth.getUser(uid)).email!;
  }
  throw new Error(`Aucune entreprise ${plan} dans le seed`);
}
