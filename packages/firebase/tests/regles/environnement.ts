import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { PROJET_EMULATEUR } from '../../src/admin';
import { IDENTITES, type Profil } from './profils';

const racine = (fichier: string) =>
  readFileSync(fileURLToPath(new URL(`../../../../${fichier}`, import.meta.url)), 'utf8');

export function creerEnvironnement(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJET_EMULATEUR,
    firestore: { rules: racine('firestore.rules') },
    storage: { rules: racine('storage.rules') },
  });
}

export function contexte(env: RulesTestEnvironment, profil: Profil): RulesTestContext {
  if (profil === 'anonyme') return env.unauthenticatedContext();
  const { uid, claims } = IDENTITES[profil];
  return env.authenticatedContext(uid, claims);
}
