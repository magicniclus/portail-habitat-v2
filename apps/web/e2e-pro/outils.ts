import { randomUUID } from 'node:crypto';
import { chemins } from '@ph/firebase/chemins';
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import Stripe from 'stripe';

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
export async function proposerDemande(
  artisanId: string,
  partenaire = false,
): Promise<{ reference: string }> {
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
    ...(partenaire
      ? {
          source: 'partenaire',
          qualification: { niveau: 'A', score: 100, telephoneVerifie: true },
          aides: {
            eligibilite: 'eligible',
            trancheRevenus: 'jaune',
            montantEstimeCentimes: 180_000,
            dispositifs: ['MaPrimeRenov'],
            mention: 'indicatif',
          },
        }
      : {}),
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
  const liens: string[] = [];
  let page = '';
  do {
    const r = await fetch(
      `http://${hote}/v1/projects/demo-portail-habitat/databases/(default)/documents/capturesEmulateur?pageSize=300${page ? `&pageToken=${page}` : ''}`,
      { headers: { Authorization: 'Bearer owner' } },
    );
    const d = (await r.json()) as {
      nextPageToken?: string;
      documents?: {
        fields: { secrets?: { mapValue: { fields?: Record<string, { stringValue: string }> } } };
      }[];
    };
    for (const doc of d.documents ?? [])
      liens.push(doc.fields.secrets?.mapValue.fields?.lien?.stringValue ?? '');
    page = d.nextPageToken ?? '';
  } while (page);
  return liens.filter((l) => l.includes(motif));
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

/** Compte pro jetable (sans entreprise) pour les réglages qui changent la connexion. */
export async function nouveauComptePro(prefixe: string): Promise<string> {
  const { auth, db, Timestamp } = await admin();
  const email = `${prefixe}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`;
  const { uid } = await auth.createUser({
    email,
    emailVerified: true,
    password: MOT_DE_PASSE,
    displayName: 'Jeanne Jetable',
  });
  await db.doc(chemins.user(uid)).set({
    schemaVersion: 1,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    roles: ['artisan'],
    email,
    emailVerifie: true,
    entreprises: [],
    fournisseurs: ['password'],
    origine: 'onboarding_pro',
    statut: 'actif',
  });
  return email;
}

/** Événement Stripe signé avec le secret de test du serveur e2e, envoyé au webhook. */
export async function webhookStripe(
  request: APIRequestContext,
  evenement: { id: string; type: string; created?: number; data: { object: unknown } },
) {
  const corps = JSON.stringify({ created: Math.floor(Date.now() / 1000), ...evenement });
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: corps,
    secret: 'whsec_e2e_local',
  });
  const r = await request.post('/api/stripe/webhook', {
    data: corps,
    headers: { 'content-type': 'application/json', 'stripe-signature': signature },
  });
  return { status: r.status(), corps: (await r.json()) as { resultat?: string } };
}

/** Active ou coupe un flag global (`config/flags`) ; renvoie la remise en l'état. */
export async function flagGlobal(nom: string, valeur: boolean): Promise<() => Promise<void>> {
  const { db } = await admin();
  const ref = db.doc(chemins.configFlags());
  const avant = (await ref.get()).get(nom) as boolean | undefined;
  await ref.set({ [nom]: valeur }, { merge: true });
  return async () => {
    await ref.set({ [nom]: avant ?? false }, { merge: true });
  };
}

/** Solde de crédits de l'entreprise (donnée de test : en production seuls achats et débits l'écrivent). */
export async function soldeCredits(artisanId: string, solde?: number): Promise<number> {
  const { db, Timestamp } = await admin();
  const ref = db.doc(chemins.portefeuille(artisanId));
  if (solde !== undefined)
    await ref.set(
      {
        schemaVersion: 1,
        soldeCredits: solde,
        creditsInclusMois: 0,
        creditsInclusRestants: 0,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
  return (await ref.get()).get('soldeCredits') as number;
}

/** Appel d'offres ouvert depuis 2 h auquel l'entreprise est invitée (comme le ferait le matching). */
export async function appelOffresInvite(
  artisanId: string,
  p: { nbDeblocages?: number } = {},
): Promise<{ id: string; titre: string }> {
  const { db, Timestamp } = await admin();
  const id = `e2e-ao-${randomUUID().slice(0, 8)}`;
  const titre = `Peinture du séjour ${id.slice(-4)} à Floirac`;
  const ouvertLe = Timestamp.fromMillis(Date.now() - 2 * 3_600_000);
  await db.doc(chemins.appelOffres(id)).set({
    schemaVersion: 1,
    createdAt: ouvertLe,
    demandeId: `dem-${id}`,
    titre,
    resume: 'Séjour de 30 m², murs et plafond.',
    metier: 'peintre',
    ville: 'Floirac',
    codePostal: '33270',
    geo: { latitude: 44.8366, longitude: -0.5285 },
    budgetMinCentimes: 150_000,
    budgetMaxCentimes: 250_000,
    urgence: 'normale',
    exigences: [],
    tarification: {
      mode: 'manuel',
      prixBaseCentimes: 1900,
      prixPremiumCentimes: 1300,
      prixCredits: 2,
    },
    nbDeblocagesMax: 3,
    nbDeblocages: p.nbDeblocages ?? 0,
    acces: 'premium_prioritaire',
    fenetrePremiumMin: 60,
    ouvertLe,
    ouvertJusquau: Timestamp.fromMillis(Date.now() + 7 * 86_400_000),
    statut: 'ouvert',
    publiePar: 'algo',
    artisansInvites: [artisanId],
  });
  return { id, titre };
}

/** Prend la dernière place d'un appel d'offres (un concurrent plus rapide, PRO-06). */
export async function completerAppelOffres(id: string): Promise<void> {
  const { db } = await admin();
  await db.doc(chemins.appelOffres(id)).update({ nbDeblocages: 3, statut: 'complet' });
}
