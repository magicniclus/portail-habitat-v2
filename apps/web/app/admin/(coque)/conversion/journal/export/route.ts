import { appAdmin } from '@ph/firebase/admin';
import {
  auditerAdmin,
  FILTRES_JOURNAL_CYCLE,
  lireJournalCycle,
  type FiltreJournalCycle,
} from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { lireSessionAdmin, mfaAdminDesactivee } from '@/server/sessionAdmin';

export const dynamic = 'force-dynamic';

const champCsv = (v: string) => (/[;"\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

/** Export CSV du journal de conversion filtré (`conversion.lire`, double authentification), journalisé. */
export async function GET(requete: Request) {
  const r = await lireSessionAdmin();
  if (
    r.etat !== 'ok' ||
    (!r.session.secondFacteur && !mfaAdminDesactivee()) ||
    !r.session.permissions.includes('conversion.lire')
  )
    return new Response('Accès refusé', { status: 403 });
  const demande = new URL(requete.url).searchParams.get('filtre') ?? '';
  const filtre = (demande in FILTRES_JOURNAL_CYCLE ? demande : 'tous') as FiltreJournalCycle;
  const db = getFirestore(appAdmin());
  const traces = await lireJournalCycle(db, { filtre, limite: 1000 });
  await auditerAdmin(
    db,
    {
      acteurUid: r.session.uid,
      action: 'adminExportJournalConversion',
      cible: 'cycleTraces',
      apres: { lignes: traces.length, filtre },
    },
    Date.now(),
  );
  const csv = [
    'date;entreprise;type;modele;raison;fonction;details',
    ...traces.map((t) =>
      [
        new Date(t.le).toISOString(),
        t.entreprise,
        t.type,
        t.modele ?? '',
        t.raison ?? '',
        t.fonction ?? '',
        JSON.stringify(t.details),
      ]
        .map(champCsv)
        .join(';'),
    ),
    '',
  ].join('\r\n');
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="journal-conversion.csv"',
      'cache-control': 'private, no-store',
    },
  });
}
