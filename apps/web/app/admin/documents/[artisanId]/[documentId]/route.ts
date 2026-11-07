import { appAdmin, bucketFichiers } from '@ph/firebase/admin';
import { auditerAdmin } from '@ph/firebase/admin-serveur';
import { chemins } from '@ph/firebase/chemins';
import { getFirestore } from 'firebase-admin/firestore';
import { lireSessionAdmin, mfaAdminDesactivee } from '@/server/sessionAdmin';

export const dynamic = 'force-dynamic';

/**
 * Aperçu d'un document d'artisan (ADMIN §2.3) : réservé à l'équipe qui lit les artisans, double
 * authentification comprise ; chaque consultation est journalisée. Jamais mis en cache.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ artisanId: string; documentId: string }> },
) {
  const { artisanId, documentId } = await params;
  const r = await lireSessionAdmin();
  if (
    r.etat !== 'ok' ||
    (!r.session.secondFacteur && !mfaAdminDesactivee()) ||
    !r.session.permissions.includes('artisans.lire') ||
    !r.session.pii
  )
    return new Response('Accès refusé', { status: 403 });
  const db = getFirestore(appAdmin());
  const ref = db.doc(`${chemins.documents(artisanId)}/${documentId}`);
  const d = await ref.get();
  if (!d.exists) return new Response('Introuvable', { status: 404 });
  const [contenu] = await bucketFichiers()
    .file(d.get('storagePath') as string)
    .download();
  await auditerAdmin(
    db,
    { acteurUid: r.session.uid, action: 'document.consulter', cible: ref.path },
    Date.now(),
  );
  return new Response(new Uint8Array(contenu), {
    headers: {
      'content-type': d.get('mime') as string,
      'cache-control': 'private, no-store',
      'content-disposition': 'inline',
      'x-content-type-options': 'nosniff',
    },
  });
}
