import { LIBELLES_MOTIF_REJET_IMPORT, LIBELLES_STATUT_IMPORT } from '@ph/core/admin';
import { formatEuros, formatRelatif } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { journalImportsAdmin, listerSourcesAdmin } from '@ph/firebase/admin-serveur';
import { Badge } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { BasculeSource } from '@/features/adminDemandes/BasculeSource';
import { NavDemandes } from '@/features/adminDemandes/NavDemandes';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Sources partenaires' };

type Params = Promise<Record<string, string | undefined>>;

/** Sources de demandes partenaires et journal des imports, sans donnée personnelle (IMP-02). */
export default async function SourcesAdmin({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const s = await pageAdmin('/admin/demandes/sources', 'demandes');
  const db = getFirestore(appAdmin());
  const maintenant = maintenantServeur();
  const [sources, journal] = await Promise.all([
    listerSourcesAdmin(db, maintenant),
    p.id ? journalImportsAdmin(db, p.id) : null,
  ]);
  return (
    <main className="grid content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <div>
        <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Sources partenaires</h1>
        <p className="m-0 text-sm text-neutre-800">
          Demandes reçues des sites partenaires ; création et clés par script.
        </p>
      </div>
      <NavDemandes actif="/admin/demandes/sources" />
      <ul aria-label="Sources" className="m-0 grid list-none gap-3 p-0">
        {sources.length ? null : <li className="text-sm text-neutre-700">Aucune source.</li>}
        {sources.map((x) => (
          <li
            key={x.id}
            className="grid gap-3 rounded-[12px] border border-trait bg-blanc p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="grid gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/demandes/sources?id=${x.id}` as Route}>
                  <strong>{x.nom}</strong>
                </Link>
                <Badge tone={x.actif ? 'succes' : 'danger'}>{x.actif ? 'Active' : 'Coupée'}</Badge>
              </span>
              <span className="text-sm text-neutre-800">
                7 jours : {x.semaine.creee} créées · {x.semaine.doublon} doublons ·{' '}
                {x.semaine.rejetee} rejetées · quota {x.quotaJour} / jour ·{' '}
                {formatEuros(x.coutUnitaireCentimes, { suffixe: 'HT' })} la demande ·{' '}
                {x.departementsCouverts.length
                  ? x.departementsCouverts.join(', ')
                  : 'toute la France'}
              </span>
            </div>
            {s.role !== 'lecture' ? (
              <BasculeSource
                id={x.id}
                nom={x.nom}
                actif={x.actif}
                peut={s.permissions.includes('matching.config')}
              />
            ) : null}
          </li>
        ))}
      </ul>
      {journal ? (
        <section aria-label="Journal des imports" className="grid gap-2">
          <h2 className="m-0 text-lg">Journal des imports</h2>
          <ul className="m-0 grid list-none gap-1 p-0 text-sm">
            {journal.map((i) => (
              <li key={i.id} className="border-t border-trait py-2">
                {formatRelatif(i.recueLe, maintenant)} · {i.idExterne} ·{' '}
                <strong>{LIBELLES_STATUT_IMPORT[i.statut]}</strong>
                {i.motifRejet
                  ? ` : ${LIBELLES_MOTIF_REJET_IMPORT[i.motifRejet] ?? i.motifRejet}`
                  : ''}
                {i.details ? ` (${i.details})` : ''}
                {i.demandeId ? (
                  <>
                    {' · '}
                    <Link href={`/admin/demandes?id=${i.demandeId}` as Route}>voir la demande</Link>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
