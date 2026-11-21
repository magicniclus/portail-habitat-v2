import { Readable } from 'node:stream';
import { bucketFichiers } from '@ph/firebase/admin';
import { lireSessionAdmin } from '@/server/sessionAdmin';

export const dynamic = 'force-dynamic';

/** Fichiers du Studio seulement (prises, médias importés, captures et vidéos du robot). */
const CHEMIN = /^(studio|studioRendus)\/[A-Za-z0-9_\-./]{1,300}$/;

/**
 * Lecture d'un fichier du Studio par le serveur (Admin SDK) pour l'éditeur et l'aperçu : la
 * session admin et la permission Studio sont vérifiées ici, sans dépendre des règles Storage
 * du projet ni du CORS du bucket. Lecture par morceaux (`Range`) pour avancer dans une vidéo.
 */
export async function GET(requete: Request) {
  const chemin = new URL(requete.url).searchParams.get('c') ?? '';
  if (!CHEMIN.test(chemin) || chemin.includes('..')) return new Response(null, { status: 400 });
  const s = await lireSessionAdmin();
  if (s.etat !== 'ok' || !s.session.permissions.includes('studio.utiliser'))
    return new Response(null, { status: 403 });
  const fichier = bucketFichiers().file(chemin);
  const [existe] = await fichier.exists();
  if (!existe) return new Response(null, { status: 404 });
  const [meta] = await fichier.getMetadata();
  const taille = Number(meta.size ?? 0);
  const type = meta.contentType ?? 'application/octet-stream';
  const entetes = {
    'content-type': type,
    'accept-ranges': 'bytes',
    'cache-control': 'private, max-age=3600',
  };
  const plage = /^bytes=(\d*)-(\d*)$/.exec(requete.headers.get('range') ?? '');
  if (plage && taille > 0) {
    const debut = plage[1] ? Number(plage[1]) : Math.max(0, taille - Number(plage[2]));
    const fin = plage[1] && plage[2] ? Math.min(Number(plage[2]), taille - 1) : taille - 1;
    if (debut > fin || debut >= taille)
      return new Response(null, { status: 416, headers: { 'content-range': `bytes */${taille}` } });
    const flux = fichier.createReadStream({ start: debut, end: fin });
    return new Response(Readable.toWeb(flux) as ReadableStream, {
      status: 206,
      headers: {
        ...entetes,
        'content-range': `bytes ${debut}-${fin}/${taille}`,
        'content-length': String(fin - debut + 1),
      },
    });
  }
  return new Response(Readable.toWeb(fichier.createReadStream()) as ReadableStream, {
    headers: { ...entetes, 'content-length': String(taille) },
  });
}
