import { LIMITE_DEMANDES } from '@ph/core/demandes';
import { CODES_ERREUR } from '@ph/core/erreurs';
import { entreeDemande } from '@ph/core/schemas';
import { creerDemande } from '@ph/firebase/demandes';
import { headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { action } from '@/server/action';
import { memeOrigine } from '@/server/origine';
import { servicesDemandes } from '@/server/demandes';

export const dynamic = 'force-dynamic';

const TAILLE_MAX = 16 * 1024;

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
  if (!memeOrigine(requete)) return new Response(null, { status: 403 });
  const texte = await requete.text();
  if (texte.length > TAILLE_MAX) return new Response(null, { status: 413 });
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return new Response(null, { status: 400 });
  }
  const r = await envoyer(brut);
  return Response.json(r, { status: r.ok ? 201 : CODES_ERREUR[r.code].http });
}
