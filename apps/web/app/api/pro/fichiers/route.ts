import { CODES_ERREUR } from '@ph/core/erreurs';
import { entreeDepotFichier } from '@ph/core/schemas';
import { bucketFichiers } from '@ph/firebase/admin';
import { deposerFichierServeur } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { servicesDemandesPro } from '@/server/demandesPro';
import { memeOrigine } from '@/server/origine';

export const dynamic = 'force-dynamic';

const TAILLE_MAX = 10 * 1024 * 1024 + 64 * 1024;

const deposer = action(
  {
    schema: entreeDepotFichier,
    nom: 'deposerFichierServeur',
    rateLimit: { cle: 'medias', max: 60, fenetre: '1h' },
  },
  async (e, ctx) =>
    deposerFichierServeur({ ...servicesDemandesPro(), bucket: bucketFichiers() }, ctx.uid!, e),
);

/**
 * Secours de l'envoi direct vers Storage (refus des règles alors que le membre a le droit) :
 * formulaire `chemin` + `fichier`, vérifié comme dans `storage.rules` puis déposé par le serveur.
 */
export async function POST(requete: Request): Promise<Response> {
  if (!memeOrigine(requete)) return new Response(null, { status: 403 });
  if (Number(requete.headers.get('content-length') ?? 0) > TAILLE_MAX)
    return new Response(null, { status: 413 });
  let donnees: FormData;
  try {
    donnees = await requete.formData();
  } catch {
    return new Response(null, { status: 400 });
  }
  const fichier = donnees.get('fichier');
  if (!(fichier instanceof Blob)) return new Response(null, { status: 400 });
  const r = await deposer({
    chemin: donnees.get('chemin'),
    type: fichier.type,
    contenu: new Uint8Array(await fichier.arrayBuffer()),
  });
  return Response.json(r, { status: r.ok ? 200 : CODES_ERREUR[r.code].http });
}
