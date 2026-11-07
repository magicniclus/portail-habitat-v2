import { spawn, type ChildProcess } from 'node:child_process';
import { executer } from '../outils';

/**
 * Copie isolée de Portail Travaux pour les captures (STUDIO.md §4) : émulateurs Firebase + jeu de
 * test + site compilé, dans le conteneur du robot. Rien n'est écrit dans le vrai projet : le faux
 * artisan n'apparaît jamais dans l'annuaire réel. Démarrée à la première capture, gardée ensuite.
 */

export const DEPOT = process.env.STUDIO_DEPOT ?? '/app';
const PORT_DEMO = 3300;
export const BASE_DEMO = `http://localhost:${PORT_DEMO}`;

/** Variables de la copie : émulateurs seulement, aucun identifiant du vrai projet. */
export function envDemo(): NodeJS.ProcessEnv {
  const garde = Object.fromEntries(
    Object.entries(process.env).filter(
      ([k]) =>
        !/^(NEXT_PUBLIC_FIREBASE_|FIREBASE_ADMIN_|GOOGLE_APPLICATION_CREDENTIALS|ANTHROPIC|STRIPE|RESEND|BREVO|STUDIO_RENDU_CLE)/.test(
          k,
        ),
    ),
  );
  return {
    ...garde,
    GCLOUD_PROJECT: 'demo-portail-travaux',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
    FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
    STORAGE_EMULATOR_HOST: 'http://127.0.0.1:9199',
    APP_CHECK_MODE: 'desactive',
    DOMAINE_SITES: 'localhost',
    SEED_MOT_DE_PASSE:
      process.env.STUDIO_MOT_DE_PASSE_DEMO ?? process.env.SEED_MOT_DE_PASSE ?? 'Demo-Studio-2026',
    NODE_ENV: 'production',
  };
}

async function attendre(url: string, delaiMs: number) {
  const fin = Date.now() + delaiMs;
  while (Date.now() < fin) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (r.status < 500) return;
    } catch {
      /* pas encore prêt */
    }
    await new Promise((ok) => setTimeout(ok, 1_000));
  }
  throw new Error(`copie de démonstration : ${url} ne répond pas`);
}

let demarrage: Promise<void> | null = null;
const processus: ChildProcess[] = [];

export function environnementDemo(): Promise<void> {
  // Copie déjà lancée à côté (développement, essais) : rien à démarrer.
  if (process.env.STUDIO_DEMO_EXTERNE === '1') return Promise.resolve();
  demarrage ??= (async () => {
    const env = envDemo();
    processus.push(
      spawn(
        'npx',
        [
          'firebase',
          'emulators:start',
          '--only',
          'firestore,auth,storage',
          '--project',
          'demo-portail-travaux',
        ],
        {
          cwd: DEPOT,
          env,
          stdio: 'ignore',
        },
      ),
    );
    await attendre('http://127.0.0.1:8080', 120_000);
    await attendre('http://127.0.0.1:9099', 60_000);
    await executer('pnpm', ['--dir', DEPOT, 'seed'], { env });
    processus.push(
      spawn('pnpm', ['--dir', `${DEPOT}/apps/web`, 'start', '--port', String(PORT_DEMO)], {
        env,
        stdio: 'ignore',
      }),
    );
    await attendre(`${BASE_DEMO}/api/health`, 120_000);
  })().catch((e: unknown) => {
    demarrage = null;
    throw e;
  });
  return demarrage;
}
