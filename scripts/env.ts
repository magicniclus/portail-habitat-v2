// Variables de `.env.local` pour les scripts lancés hors de Next.js (qui ne les charge pas seuls) :
// racine du dépôt puis apps/web ; une variable déjà définie dans le terminal n'est jamais écrasée.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const racine = resolve(__dirname, '..');
for (const f of [resolve(racine, '.env.local'), resolve(racine, 'apps/web/.env.local')])
  if (existsSync(f)) process.loadEnvFile(f);
