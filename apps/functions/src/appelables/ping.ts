import { z } from '@ph/core/zod';
import { callable } from '../callable';

export const schemaPing = z.object({ message: z.string().max(100).optional() });

export async function traiterPing(entree: z.output<typeof schemaPing>) {
  return {
    pong: true as const,
    echo: entree.message ?? null,
    horodatage: new Date().toISOString(),
  };
}

/** Vérifie la chaîne complète site → Function → @ph/core. */
export const ping = callable({ schema: schemaPing, authentification: 'facultative' }, traiterPing);
