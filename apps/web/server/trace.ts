import 'server-only';
import { headers } from 'next/headers';
import { createHash } from 'node:crypto';

export interface TraceRequete {
  /** Empreinte de l'IP (jamais l'IP en clair, CLAUDE.md règle 8). */
  ipHash?: string;
  userAgent?: string;
}

const empreinte = (ip: string) => createHash('sha256').update(ip).digest('hex').slice(0, 32);

/** Trace de la requête pour les consentements et la modération ; `ipInconnue` si l'IP manque. */
export async function traceRequete(ipInconnue?: string): Promise<TraceRequete> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ipInconnue;
  return {
    ...(ip ? { ipHash: empreinte(ip) } : {}),
    userAgent: h.get('user-agent') ?? undefined,
  };
}
