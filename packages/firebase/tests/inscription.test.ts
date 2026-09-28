import { entreeInscriptionEtape1 } from '@ph/core/schemas';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import {
  enregistrerEtape1,
  enregistrerZone,
  lireBrouillonInscription,
  reprendreInscription,
  type Notification,
} from '../src/serveur/comptes';

const T = Date.UTC(2026, 8, 28, 10);
let db: Firestore;
let auth: Auth;
let envois: Notification[];
let horloge = T;
const s = () => ({
  db,
  auth,
  horloge: () => horloge,
  notifier: async (n: Notification) => void envois.push(n),
  urlSite: 'https://portail-habitat.test',
  jeton: () => 'jeton-de-reprise-0123456789abcdef',
});

beforeAll(() => {
  db = getFirestore(appAdmin());
  auth = getAuth(appAdmin());
});
beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  envois = [];
  horloge = T;
});

const etape1 = entreeInscriptionEtape1.parse({
  nom: 'Julien Bertrand',
  telephone: '06 12 34 56 78',
  email: 'julien@test.local',
  codePostal: '33700',
  metierPrincipal: 'couvreur',
  metiers: ['couvreur', 'zingueur'],
  intentions: ['velux'],
  cgv: true,
});

describe('inscription en plusieurs étapes (COMPTES §3.2)', () => {
  it('ONB-04 : étape 1 → brouillon + lien par email ; le lien reprend à l’étape 2', async () => {
    const { brouillonId } = await enregistrerEtape1(s(), etape1);
    expect(envois).toHaveLength(1);
    expect(envois[0]).toMatchObject({
      modele: 'reprise-onboarding',
      destinataire: { email: 'julien@test.local' },
    });
    expect(envois[0]!.secrets!.lien).toBe(
      'https://portail-habitat.test/pro/inscription?reprise=jeton-de-reprise-0123456789abcdef',
    );
    const brut = JSON.stringify(
      (await db.collection('brouillonsOnboarding').doc(brouillonId).get()).data(),
    );
    expect(brut).not.toContain('jeton-de-reprise');
    expect(await reprendreInscription(s(), 'jeton-de-reprise-0123456789abcdef')).toBe(brouillonId);
    expect(await lireBrouillonInscription(s(), brouillonId)).toMatchObject({
      etape: 2,
      metiers: ['couvreur', 'zingueur'],
      identite: { email: 'julien@test.local' },
    });
  });

  it('étape 2 : zone enregistrée, étape 3 ensuite ; même email → pas de second envoi', async () => {
    const { brouillonId } = await enregistrerEtape1(s(), etape1);
    await enregistrerZone(s(), brouillonId, {
      ville: 'Mérignac',
      centre: { latitude: 44.84, longitude: -0.64 },
      rayonKm: 30,
    });
    await enregistrerEtape1(s(), etape1, brouillonId);
    expect(envois).toHaveLength(1);
    expect(await lireBrouillonInscription(s(), brouillonId)).toMatchObject({
      etape: 2,
      zone: { rayonKm: 30 },
    });
  });

  it('après 30 jours : brouillon et lien expirés', async () => {
    const { brouillonId } = await enregistrerEtape1(s(), etape1);
    horloge = T + 31 * 86_400_000;
    expect(await lireBrouillonInscription(s(), brouillonId)).toBeNull();
    expect(await reprendreInscription(s(), 'jeton-de-reprise-0123456789abcdef')).toBeNull();
  });
});
