// Variables de `.env.local` pour les scripts lancés hors de Next.js (qui ne les charge pas seuls) :
// racine du dépôt puis apps/web ; une variable déjà définie dans le terminal n'est jamais écrasée.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const racine = resolve(__dirname, '..');
// Une variable vide (`CLE=` recopiée de `.env.example`) ne masque pas celle de l'autre fichier.
for (const [k, v] of Object.entries(process.env)) if (v === '') delete process.env[k];
for (const f of [resolve(racine, '.env.local'), resolve(racine, 'apps/web/.env.local')])
  if (existsSync(f)) {
    process.loadEnvFile(f);
    for (const [k, v] of Object.entries(process.env)) if (v === '') delete process.env[k];
  }
