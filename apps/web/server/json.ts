import 'server-only';
import { CODES_ERREUR } from '@ph/core/erreurs';
import type { Resultat } from '@ph/core/resultat';
import { memeOrigine } from './origine';

/**
 * Route JSON protégée (même origine, taille bornée) autour d'une action de l'enveloppe : le
 * navigateur peut y joindre l'en-tête App Check, ce qu'une Server Action ne permet pas.
 */
export async function routeJson<R>(
  requete: Request,
  executer: (brut: unknown) => Promise<Resultat<R>>,
  tailleMax = 16 * 1024,
): Promise<Response> {
  if (!memeOrigine(requete)) return new Response(null, { status: 403 });
  const texte = await requete.text();
  if (texte.length > tailleMax) return new Response(null, { status: 413 });
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return new Response(null, { status: 400 });
  }
  const r = await executer(brut);
  return Response.json(r, { status: r.ok ? 200 : CODES_ERREUR[r.code].http });
}
