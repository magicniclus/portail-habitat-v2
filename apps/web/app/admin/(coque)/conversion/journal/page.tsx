import { appAdmin } from '@ph/firebase/admin';
import {
  FILTRES_JOURNAL_CYCLE,
  lireJournalCycle,
  type FiltreJournalCycle,
} from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { CLASSES_PAGE, EnteteConversion } from '@/features/adminConversion/EnteteConversion';
import { JournalEnDirect } from '@/features/adminConversion/JournalEnDirect';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { TableTraces } from '@/features/adminConversion/TableTraces';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Journal de conversion' };

const NOMS: Record<FiltreJournalCycle, string> = {
  tous: 'Tous',
  envois: 'Envois',
  non_envois: 'Non-envois',
  signaux: 'Signaux',
  conversions: 'Conversions',
  admin: 'Admin',
};

/** Journal : chaque décision du moteur, y compris les non-envois et leur raison. */
export default async function JournalConversion({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string }>;
}) {
  await pageAdmin('/admin/conversion/journal', 'conversion');
  const demande = (await searchParams).filtre;
  const filtre = (
    demande && demande in FILTRES_JOURNAL_CYCLE ? demande : 'tous'
  ) as FiltreJournalCycle;
  const traces = await lireJournalCycle(getFirestore(appAdmin()), { filtre });
  return (
    <main className={CLASSES_PAGE}>
      <ConfigFirebase />
      <EnteteConversion actif="/admin/conversion/journal" />
      <nav aria-label="Filtres du journal" className="flex flex-wrap gap-2">
        {(Object.keys(NOMS) as FiltreJournalCycle[]).map((f) => (
          <Link
            key={f}
            href={`/admin/conversion/journal?filtre=${f}` as Route}
            aria-current={f === filtre ? 'true' : undefined}
            className="flex min-h-11 items-center rounded-pill border border-trait px-4 text-sm no-underline aria-[current=true]:border-accent-600 aria-[current=true]:font-bold"
          >
            {NOMS[f]}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-neutre-700">
          Les 100 dernières décisions. Traces conservées 6 mois.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <JournalEnDirect />
          <a
            href={`/admin/conversion/journal/export?filtre=${filtre}`}
            className="flex min-h-11 items-center text-sm font-semibold text-accent-700"
            download
          >
            Exporter en CSV
          </a>
        </div>
      </div>
      <TableTraces traces={traces} />
    </main>
  );
}
