import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { contexte, creerEnvironnement } from './environnement';
import { PROFILS, type Profil } from './profils';

/** Règles des plans Dessin (DESSIN.md §4) : un cas par règle et par profil. */
let env: RulesTestEnvironment;

const PLAN = { titre: 'Maison', versionCourante: 1, supprimeLe: null };

beforeAll(async () => {
  env = await creerEnvironnement();
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await Promise.all([
      setDoc(doc(db, 'users/part1/plans/pl1'), PLAN),
      setDoc(doc(db, 'users/part1/plans/pl1/historique/1'), { numero: 1 }),
      setDoc(doc(db, 'artisans/a1/plans/pl2'), PLAN),
      setDoc(doc(db, 'artisans/a1/plans/pl2/historique/1'), { numero: 1 }),
      setDoc(doc(db, 'partagesPlans/jeton1'), { planId: 'pl1', revoque: false }),
    ]);
  });
});

afterAll(async () => {
  await env.cleanup();
});

const EQUIPE_A1: Profil[] = [
  'proprietaire',
  'gerant',
  'collaborateur',
  'suspendu',
  'impersonation',
];

const LECTURES: { nom: string; chemin: string; autorises: Profil[] }[] = [
  {
    nom: 'lire un plan de particulier',
    chemin: 'users/part1/plans/pl1',
    autorises: ['particulier'],
  },
  {
    nom: 'lire l’historique d’un plan de particulier',
    chemin: 'users/part1/plans/pl1/historique/1',
    autorises: ['particulier'],
  },
  // Comme les devis : claims de l'équipe opérationnelle (le suspendu garde ses claims jusqu'à 1 h).
  { nom: 'lire un plan d’entreprise', chemin: 'artisans/a1/plans/pl2', autorises: EQUIPE_A1 },
  {
    nom: 'lire l’historique d’un plan d’entreprise',
    chemin: 'artisans/a1/plans/pl2/historique/1',
    autorises: EQUIPE_A1,
  },
  {
    nom: 'lire un lien de partage (serveur uniquement)',
    chemin: 'partagesPlans/jeton1',
    autorises: [],
  },
];

const ECRITURES = [
  'users/part1/plans/pl1',
  'users/part1/plans/pl1/historique/1',
  'artisans/a1/plans/pl2',
  'artisans/a1/plans/pl2/historique/1',
  'partagesPlans/jeton1',
];

describe('règles Dessin : lectures', () => {
  for (const cas of LECTURES)
    describe(cas.nom, () => {
      for (const profil of PROFILS)
        it(profil, async () => {
          const lecture = getDoc(doc(contexte(env, profil).firestore(), cas.chemin));
          await (cas.autorises.includes(profil) ? assertSucceeds(lecture) : assertFails(lecture));
        });
    });
});

describe('règles Dessin : aucune écriture directe, pour personne', () => {
  for (const chemin of ECRITURES)
    describe(chemin, () => {
      for (const profil of PROFILS)
        it(profil, async () => {
          const db = contexte(env, profil).firestore();
          await assertFails(setDoc(doc(db, `${chemin}-nouveau`), { titre: 'x' }));
          await assertFails(updateDoc(doc(db, chemin), { titre: 'x' }));
          await assertFails(deleteDoc(doc(db, chemin)));
        });
    });
});
