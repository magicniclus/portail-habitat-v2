import { ONGLETS_FINANCES } from '@ph/core/admin';
import { appAdmin } from '@ph/firebase/admin';
import { lireFinancesAdmin } from '@ph/firebase/admin-serveur';
import { Button, Field, Input } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { IndicateursFinances } from '@/features/adminFinances/IndicateursFinances';
import { OngletFinances } from '@/features/adminFinances/OngletsFinances';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Finances' };

type Params = Promise<Record<string, string | undefined>>;

/** Maquette « Admin Finances » (ADMIN §2.8) : indicateurs, factures, promos, export comptable. */
export default async function FinancesAdminPage({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const s = await pageAdmin('/admin/finances', 'finances');
  const maintenant = maintenantServeur();
  const f = await lireFinancesAdmin(getFirestore(appAdmin()), maintenant);
  const onglet = p.onglet && p.onglet in ONGLETS_FINANCES ? p.onglet : 'factures';
  const moisPrecedent = new Date(maintenant - 28 * 86_400_000).toISOString().slice(0, 7);
  const peutExporter = s.permissions.includes('finances.exporter');
  return (
    <main className="grid content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Finances</h1>
        <form
          action="/admin/finances/export"
          method="get"
          className="flex flex-wrap items-end gap-2"
        >
          <Field label="Mois à exporter">
            <Input type="month" name="mois" defaultValue={moisPrecedent} required />
          </Field>
          <Button
            type="submit"
            variant="secondaire"
            disabled={!peutExporter}
            title={peutExporter ? undefined : 'Permission requise : finances.exporter'}
          >
            Exporter en CSV
          </Button>
        </form>
      </div>
      <IndicateursFinances f={f} />
      <nav aria-label="Onglets" className="flex flex-wrap gap-1 border-b border-trait">
        {Object.entries(ONGLETS_FINANCES).map(([id, nom]) => (
          <Link
            key={id}
            href={`/admin/finances?onglet=${id}` as Route}
            aria-current={id === onglet ? 'page' : undefined}
            className="flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm text-neutre-700 no-underline aria-[current=page]:border-accent-600 aria-[current=page]:font-bold aria-[current=page]:text-texte"
          >
            {nom}
          </Link>
        ))}
      </nav>
      <section className="rounded-[12px] border border-trait bg-blanc px-4 pb-1">
        <OngletFinances f={f} onglet={onglet} />
      </section>
    </main>
  );
}
