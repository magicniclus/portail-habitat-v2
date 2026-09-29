import { randomUUID } from 'node:crypto';
import { chemins } from '@ph/firebase/chemins';
import { expect, type Page } from '@playwright/test';

/** Mot de passe des comptes du seed (`SEED_MOT_DE_PASSE`, émulateur seulement). */
export const MOT_DE_PASSE = process.env.SEED_MOT_DE_PASSE ?? 'MotDePasse-e2e-2026';

/** Petit PDF valide pour les dépôts de documents. */
export const PDF = {
  name: 'attestation.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'),
};

/** Image PNG valide de 1 × 1 px (logo, photos de chantier). */
export const png = (nom: string) => ({
  name: nom,
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  ),
});

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

/**
 * Donne `n` sièges libres à l'entreprise (donnée de test : en production seul le webhook Stripe
 * écrit `siegesMax`) ; renvoie la remise en l'état.
 */
export async function siegesLibres(artisanId: string, n: number): Promise<() => Promise<void>> {
  const { db, Timestamp } = await admin();
  const ref = db.doc(chemins.artisan(artisanId));
  const avant = (await ref.get()).get('siegesMax') as number;
  const membres = (await db.doc(chemins.membre(artisanId, '_')).parent.get()).size;
  const invitations = await db
    .doc(`invitations/_`)
    .parent.where('artisanId', '==', artisanId)
    .where('statut', '==', 'envoyee')
    .where('expireLe', '>', Timestamp.now())
    .get();
  await ref.update({ siegesMax: membres + invitations.size + n });
  return async () => {
    await ref.update({ siegesMax: avant });
  };
}

/** Liens secrets des envois capturés par l'émulateur (`capturesEmulateur`) contenant `motif`. */
export async function liensEnvoyes(motif: string): Promise<string[]> {
  const hote = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';
  const r = await fetch(
    `http://${hote}/v1/projects/demo-portail-habitat/databases/(default)/documents/capturesEmulateur?pageSize=500`,
    { headers: { Authorization: 'Bearer owner' } },
  );
  const d = (await r.json()) as {
    documents?: {
      fields: { secrets?: { mapValue: { fields?: Record<string, { stringValue: string }> } } };
    }[];
  };
  return (d.documents ?? [])
    .map((doc) => doc.fields.secrets?.mapValue.fields?.lien?.stringValue ?? '')
    .filter((l) => l.includes(motif));
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

/** Avis publié pour l'entreprise ; renvoie le nom affiché (unique) pour le retrouver. */
export async function publierAvis(artisanId: string): Promise<string> {
  const { db, Timestamp } = await admin();
  const nomAffiche = `Client ${Math.random().toString(36).slice(2, 7)}`;
  await db.doc(chemins.avis(randomUUID().replaceAll('-', '').slice(0, 20))).set({
    schemaVersion: 1,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    artisanId,
    nomAffiche,
    note: 5,
    criteres: {},
    pointsPositifs: [],
    texte: 'Travail soigné, équipe ponctuelle.',
    photos: [],
    typeTravaux: 'Peinture',
    finChantier: '2026-08',
    certificationAcceptee: true,
    preuve: { type: 'aucune' },
    statut: 'publie',
    publieLe: Timestamp.now(),
  });
  return nomAffiche;
}
