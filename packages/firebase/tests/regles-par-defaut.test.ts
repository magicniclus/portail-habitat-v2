import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getBytes } from 'firebase/storage';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { PROJET_EMULATEUR } from '../src/admin';

const racine = (fichier: string) =>
  readFileSync(fileURLToPath(new URL(`../../../${fichier}`, import.meta.url)), 'utf8');

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJET_EMULATEUR,
    firestore: { rules: racine('firestore.rules') },
    storage: { rules: racine('storage.rules') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

// Lot 1a : tout est refusé. Chaque règle ajoutée au lot 2 aura son cas autorisé ET refusé.
describe('règles par défaut', () => {
  it('Firestore refuse la lecture et l’écriture, anonyme ou connecté', async () => {
    for (const ctx of [env.unauthenticatedContext(), env.authenticatedContext('u1')]) {
      const db = ctx.firestore();
      await assertFails(getDoc(doc(db, 'artisans/a1')));
      await assertFails(setDoc(doc(db, 'artisans/a1'), { nom: 'x' }));
    }
  });

  it('Storage refuse la lecture et l’écriture, anonyme ou connecté', async () => {
    for (const ctx of [env.unauthenticatedContext(), env.authenticatedContext('u1')]) {
      const fichier = ref(ctx.storage(), 'documents/a1/kbis.pdf');
      await assertFails(uploadString(fichier, 'x'));
      await assertFails(getBytes(fichier));
    }
  });
});
