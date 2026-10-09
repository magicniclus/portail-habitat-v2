import { exportComptable } from '@ph/core/admin';
import { appAdmin } from '@ph/firebase/admin';
import { piecesDuMois } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { lireSessionAdmin, mfaAdminDesactivee } from '@/server/sessionAdmin';

export const dynamic = 'force-dynamic';

const BOM = String.fromCharCode(0xfeff);

/** Export comptable d'un mois (ADMIN §2.8) : `finances.exporter`, double authentification, journalisé. */
export async function GET(requete: Request) {
  const mois = new URL(requete.url).searchParams.get('mois') ?? '';
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(mois))
    return new Response('Mois invalide', { status: 400 });
  const r = await lireSessionAdmin();
  if (
    r.etat !== 'ok' ||
    (!r.session.secondFacteur && !mfaAdminDesactivee()) ||
    !r.session.permissions.includes('finances.exporter')
  )
    return new Response('Accès refusé', { status: 403 });
  const pieces = await piecesDuMois(getFirestore(appAdmin()), {
    mois,
    acteurUid: r.session.uid,
    maintenant: Date.now(),
  });
  // BOM : accents corrects à l'ouverture dans un tableur.
  return new Response(BOM + exportComptable(pieces), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="portail-habitat-${mois}.csv"`,
      'cache-control': 'private, no-store',
    },
  });
}
