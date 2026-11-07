import { ErreurMetier } from '@ph/core/erreurs';
import { entreeClientCarnet } from '@ph/core/schemas';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import { gererClient, lireClients } from '../src/serveur/devis';

// Base clients des devis et factures (choix du propriétaire, 27/10/2026).
let db: Firestore;
const T = Date.UTC(2026, 9, 27, 9);
const s = () => ({ db, horloge: () => T });
const proprio = { artisanId: 'a1', uid: 'p1' };
const collab = { artisanId: 'a1', uid: 'c1' };
const compta = { artisanId: 'a1', uid: 'x1' };
const fiche = (extra: Record<string, unknown> = {}) =>
  entreeClientCarnet.parse({
    action: 'creer',
    nom: 'Élodie Durand',
    typeClient: 'particulier',
    adresse: '3 rue des Lilas',
    codePostal: '33700',
    ville: 'Mérignac',
    email: 'elodie@test.local',
    ...extra,
  });

async function erreur(p: Promise<unknown>): Promise<ErreurMetier> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErreurMetier) return e;
    throw e;
  }
  throw new Error('Aucune erreur levée');
}

beforeAll(() => {
  db = getFirestore(appAdmin());
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  const m = (role: string) => ({ role, statut: 'actif' });
  await Promise.all([
    db.doc(chemins.membre('a1', 'p1')).set(m('proprietaire')),
    db.doc(chemins.membre('a1', 'c1')).set(m('collaborateur')),
    db.doc(chemins.membre('a1', 'x1')).set(m('comptable')),
  ]);
});

describe('base clients', () => {
  it('créée par un collaborateur, lue triée par nom (sans accents), modifiée', async () => {
    const { id } = await gererClient(s(), collab, fiche());
    await gererClient(s(), proprio, fiche({ nom: 'Albert Roux' }));
    const liste = await lireClients(db, 'a1');
    expect(liste.map((c) => c.nom)).toEqual(['Albert Roux', 'Élodie Durand']);
    expect(liste[1]).toMatchObject({ id, ville: 'Mérignac', typeClient: 'particulier' });
    await gererClient(
      s(),
      proprio,
      entreeClientCarnet.parse({ ...fiche(), action: 'modifier', id, ville: 'Pessac' }),
    );
    expect((await db.doc(chemins.clientCarnet('a1', id)).get()).get('ville')).toBe('Pessac');
  });

  it('le comptable ne modifie pas la base', async () => {
    expect((await erreur(gererClient(s(), compta, fiche()))).code).toBe('PERMISSION_REFUSEE');
  });

  it('suppression ; refusée si une facture émise utilise la fiche', async () => {
    const { id } = await gererClient(s(), proprio, fiche());
    const { id: autre } = await gererClient(s(), proprio, fiche({ nom: 'Autre' }));
    await db.doc(chemins.factureClient('a1', 'f1')).set({ clientId: autre, statut: 'emise' });
    await gererClient(s(), proprio, { action: 'supprimer', id });
    expect((await db.doc(chemins.clientCarnet('a1', id)).get()).exists).toBe(false);
    expect((await erreur(gererClient(s(), proprio, { action: 'supprimer', id: autre }))).code).toBe(
      'PRECONDITION',
    );
  });

  it('modifier une fiche inconnue : introuvable', async () => {
    const e = entreeClientCarnet.parse({ ...fiche(), action: 'modifier', id: 'inconnu' });
    expect((await erreur(gererClient(s(), proprio, e))).code).toBe('INTROUVABLE');
  });
});
