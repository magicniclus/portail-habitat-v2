import { appAdmin } from '@ph/firebase/admin';
import {
  auditerAdmin,
  FILTRES_AUDIT,
  lireJournalAdmin,
  type FiltreAudit,
} from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { lireSessionAdmin, mfaAdminDesactivee } from '@/server/sessionAdmin';

export const dynamic = 'force-dynamic';

const champCsv = (v: string) => (/[;"\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

/** Export du journal d'audit filtré (`audit.lire`, double authentification) ; l'export est journalisé. */
export async function GET(requete: Request) {
  const r = await lireSessionAdmin();
  if (
    r.etat !== 'ok' ||
    (!r.session.secondFacteur && !mfaAdminDesactivee()) ||
    !r.session.permissions.includes('audit.lire')
  )
    return new Response('Accès refusé', { status: 403 });
  const url = new URL(requete.url);
  const champ = url.searchParams.get('champ') ?? '';
  const valeur = url.searchParams.get('valeur') ?? '';
  const filtre =
    (FILTRES_AUDIT as readonly string[]).includes(champ) && valeur
      ? { champ: champ as FiltreAudit, valeur }
      : undefined;
  const db = getFirestore(appAdmin());
  const journal = await lireJournalAdmin(db, filtre);
  await auditerAdmin(
    db,
    {
      acteurUid: r.session.uid,
      action: 'adminExportAudit',
      cible: 'auditLog',
      apres: { lignes: journal.length, ...(filtre ?? {}) },
    },
    Date.now(),
  );
  const csv = [
    'date;acteur;action;cible;motif;detail',
    ...journal.map((x) =>
      [new Date(x.le).toISOString(), x.acteur, x.action, x.cible, x.motif, x.detail]
        .map(champCsv)
        .join(';'),
    ),
    '',
  ].join('\r\n');
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="journal-audit.csv"',
      'cache-control': 'private, no-store',
    },
  });
}
