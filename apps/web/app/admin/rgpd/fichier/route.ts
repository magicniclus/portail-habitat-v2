import { appAdmin, bucketFichiers } from '@ph/firebase/admin';
import { auditerAdmin } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { lireSessionAdmin, mfaAdminDesactivee } from '@/server/sessionAdmin';

export const dynamic = 'force-dynamic';

const AUTORISE = /^rgpd\/[A-Za-z0-9]{10,40}\/(export|preuve)\.json$/;

/** Export ou preuve d'une demande RGPD (`rgpd.traiter`, double authentification) ; journalisé. */
export async function GET(requete: Request) {
  const chemin = new URL(requete.url).searchParams.get('chemin') ?? '';
  if (!AUTORISE.test(chemin)) return new Response('Fichier invalide', { status: 400 });
  const r = await lireSessionAdmin();
  if (
    r.etat !== 'ok' ||
    (!r.session.secondFacteur && !mfaAdminDesactivee()) ||
    !r.session.permissions.includes('rgpd.traiter')
  )
    return new Response('Accès refusé', { status: 403 });
  const f = bucketFichiers().file(chemin);
  if (!(await f.exists())[0]) return new Response('Introuvable', { status: 404 });
  const [contenu] = await f.download();
  await auditerAdmin(
    getFirestore(appAdmin()),
    { acteurUid: r.session.uid, action: 'rgpd.consulter', cible: chemin },
    Date.now(),
  );
  return new Response(new Uint8Array(contenu), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${chemin.split('/').slice(1).join('-')}"`,
      'cache-control': 'private, no-store',
    },
  });
}
