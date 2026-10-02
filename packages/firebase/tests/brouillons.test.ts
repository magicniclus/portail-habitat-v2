import { brouillonParcours } from '@ph/core/parcours';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { collections } from '../src/chemins';
import type { Notification } from '../src/serveur/comptes';
import {
  brouillonCompte,
  demanderLienReprise,
  reprendreParLien,
  type ServicesBrouillons,
} from '../src/serveur/parcours';

let db: Firestore;
let envois: Notification[];
let t: number;
let s: ServicesBrouillons;
const JOUR = 86_400_000;

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  envois = [];
  t = Date.UTC(2026, 8, 28, 10);
  let n = 0;
  s = {
    db,
    horloge: () => t,
    notifier: async (e) => void envois.push(e),
    urlSite: 'https://portail-habitat.test',
    jeton: () => `jeton-de-test-${++n}-abcdefghijklmnopqrstuvwxyz`,
  };
});

const brouillon = {
  v: 1 as const,
  id: 'brouillon0001',
  parcours: 'simulateur' as const,
  versionReferentiel: '2026-09',
  prestationId: 'peinture',
  etape: 3,
  reponses: { surface: 50 },
  chantier: { codePostal: '33000', acces: 'facile' as const },
  creeLe: Date.UTC(2026, 8, 27),
  majLe: Date.UTC(2026, 8, 28),
};

describe('lien de reprise par email (REPRISE_PARCOURS §5)', () => {
  it('SIM-06g : brouillon serveur sans coordonnées, email avec lien secret, empreinte seule stockée', async () => {
    const { brouillonId } = await demanderLienReprise(s, {
      brouillon,
      email: 'Camille@Test.local',
      resume: 'Peinture · 50 m²',
    });
    const d = (await db.collection(collections.brouillons).doc(brouillonId).get()).data()!;
    expect(d).toMatchObject({ parcours: 'simulateur', donnees: brouillon });
    expect(d.jetonHash).toMatch(/^[0-9a-f]{64}$/);
    expect(d.expireLe.toMillis() - t).toBe(30 * JOUR);
    expect(JSON.stringify(d)).not.toMatch(/camille|jeton-de-test/i);

    expect(envois).toHaveLength(1);
    expect(envois[0]).toMatchObject({
      modele: 'reprise-simulateur',
      destinataire: { email: 'camille@test.local' },
      donnees: { resume: 'Peinture · 50 m²', etape: 3 },
    });
    expect(envois[0]!.secrets!.lien).toBe(
      'https://portail-habitat.test/simulateur?reprise=jeton-de-test-1-abcdefghijklmnopqrstuvwxyz',
    );
  });

  it('SIM-06g : le lien reprend une fois, puis « expiré »', async () => {
    await demanderLienReprise(s, { brouillon, email: 'a@test.local', resume: 'Peinture' });
    const jeton = 'jeton-de-test-1-abcdefghijklmnopqrstuvwxyz';
    expect(await reprendreParLien(s, jeton)).toEqual(brouillon);
    expect(await reprendreParLien(s, jeton)).toBeNull();
    expect(await reprendreParLien(s, 'jeton-inconnu-abcdefghijklmnopqrstuvwxyz')).toBeNull();
  });

  it('lien de plus de 30 jours : expiré', async () => {
    await demanderLienReprise(s, { brouillon, email: 'a@test.local', resume: 'Peinture' });
    t += 31 * JOUR;
    expect(await reprendreParLien(s, 'jeton-de-test-1-abcdefghijklmnopqrstuvwxyz')).toBeNull();
  });

  it('brouillon avec une donnée de contact : refusé (schéma strict)', async () => {
    await expect(
      demanderLienReprise(s, {
        brouillon: { ...brouillon, email: 'x@test.local' } as never,
        email: 'a@test.local',
        resume: 'Peinture',
      }),
    ).rejects.toMatchObject({ code: 'ENTREE_INVALIDE' });
    expect(envois).toHaveLength(0);
  });

  it('au plus 3 liens par adresse et par jour, sans le dire', async () => {
    for (let i = 0; i < 5; i++)
      await demanderLienReprise(s, { brouillon, email: 'a@test.local', resume: 'Peinture' });
    expect(envois).toHaveLength(3);
  });
});

describe('brouillon d’une personne connectée (REPRISE_PARCOURS §5, niveau 2)', () => {
  const T0 = Date.UTC(2026, 8, 28, 10);
  const b = (etape: number, majLe: number) =>
    brouillonParcours.parse({
      v: 1,
      id: 'brouillon000001',
      parcours: 'simulateur',
      versionReferentiel: 'v1',
      prestationId: 'sdb',
      etape,
      reponses: {},
      creeLe: T0 - 60_000,
      majLe,
    });

  it('enregistré puis relu sur un autre appareil ; effacé à la demande', async () => {
    const s = { db, horloge: () => T0 };
    expect(await brouillonCompte(s, 'u1', { action: 'lire', parcours: 'simulateur' })).toBeNull();
    await brouillonCompte(s, 'u1', { action: 'sauver', brouillon: b(3, T0) });
    const doc = await db.doc('brouillons/u1_simulateur').get();
    expect(doc.get('uid')).toBe('u1');
    expect(
      await brouillonCompte(s, 'u1', { action: 'lire', parcours: 'simulateur' }),
    ).toMatchObject({
      etape: 3,
    });
    expect(await brouillonCompte(s, 'u2', { action: 'lire', parcours: 'simulateur' })).toBeNull();
    await brouillonCompte(s, 'u1', { action: 'effacer', parcours: 'simulateur' });
    expect(await brouillonCompte(s, 'u1', { action: 'lire', parcours: 'simulateur' })).toBeNull();
  });

  it('expiré après 30 jours', async () => {
    await brouillonCompte({ db, horloge: () => T0 }, 'u1', {
      action: 'sauver',
      brouillon: b(2, T0),
    });
    const plusTard = { db, horloge: () => T0 + 31 * JOUR };
    expect(
      await brouillonCompte(plusTard, 'u1', { action: 'lire', parcours: 'simulateur' }),
    ).toBeNull();
  });
});
