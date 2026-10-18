import { PROJET_EMULATEUR } from '../admin';

export interface CibleSeed {
  projet: string;
  emulateur: boolean;
  motDePasse: string;
}

/**
 * Le seed refuse de tourner ailleurs que sur l'émulateur (projet `demo-…`) ou un projet
 * `…-staging` / `…-local` (COMPTES §6.4), et jamais avec NODE_ENV=production.
 */
export function verifierCibleSeed(env: NodeJS.ProcessEnv): CibleSeed {
  if (env.NODE_ENV === 'production') throw new Error('Seed interdit avec NODE_ENV=production.');
  const emulateur = Boolean(env.FIRESTORE_EMULATOR_HOST);
  const projet =
    env.GCLOUD_PROJECT ?? env.FIREBASE_PROJECT_ID ?? (emulateur ? PROJET_EMULATEUR : '');
  // Émulateur : projet demo-… ou …-local ; vrai projet : préproduction …-staging seulement.
  const autorise = emulateur ? /^demo-|-local$/.test(projet) : /-staging$/.test(projet);
  if (!autorise)
    throw new Error(
      `Seed refusé pour le projet « ${projet || 'inconnu'} » : émulateur (demo-… ou -local) ou préproduction -staging uniquement.`,
    );
  const motDePasse = env.SEED_MOT_DE_PASSE ?? '';
  if (motDePasse.length < 12)
    throw new Error(
      'SEED_MOT_DE_PASSE (12 caractères minimum) est requis pour les comptes de test.',
    );
  return { projet, emulateur, motDePasse };
}
