import { LIMITE_DEMANDES } from '@ph/core/demandes';
import { entreeDemande } from '@ph/core/schemas';
import { creerDemande } from '@ph/firebase/demandes';
import { headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { action } from '@/server/action';
import { servicesDemandes } from '@/server/demandes';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const envoyer = action(
  {
    schema: entreeDemande,
    nom: 'creerDemande',
    authentification: 'facultative',
    rateLimit: LIMITE_DEMANDES,
    idempotence: true,
  },
  async (e, ctx) => {
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim();
    return creerDemande(servicesDemandes(), e, {
      uid: ctx.uid,
      ...(ip ? { ipHash: createHash('sha256').update(ip).digest('hex').slice(0, 32) } : {}),
      userAgent: h.get('user-agent') ?? undefined,
    });
  },
);

/**
 * Envoi du simulateur (COMPTES §2, SIM-07 à SIM-10). Route Handler plutôt que Server Action : le
 * navigateur y joint l'en-tête App Check. La réponse porte l'estimation calculée côté serveur.
 */
export async function POST(requete: Request) {
  const r = await routeJson(requete, envoyer);
  // 201 : demande créée.
  return r.status === 200 ? new Response(r.body, { status: 201, headers: r.headers }) : r;
}
