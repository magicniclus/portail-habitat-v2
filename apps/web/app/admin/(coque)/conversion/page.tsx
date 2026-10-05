import { LIBELLES_ETAPE_CYCLE } from '@ph/core/conversion';
import { formatNombre } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { lireApercuConversion, lireReglagesCycle } from '@ph/firebase/admin-serveur';
import { Banner, Card, CardBody, CardHeader, CardTitle } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CLASSES_PAGE, EnteteConversion } from '@/features/adminConversion/EnteteConversion';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Conversion' };

const pct = (n: number, sur: number) => (sur ? `${formatNombre((n / sur) * 100, 1)} %` : '—');

/** Vue d'ensemble : étapes du cycle, envois, conversions, groupe témoin (ADMIN §2.8b). */
export default async function ConversionAdmin() {
  await pageAdmin('/admin/conversion', 'conversion');
  const db = getFirestore(appAdmin());
  const [a, reglages] = await Promise.all([
    lireApercuConversion(db, maintenantServeur()),
    lireReglagesCycle(db),
  ]);
  const indicateurs = [
    ['Emails planifiés (30 j)', a.envois],
    ['Non envoyés (30 j)', a.bloques + a.annules],
    ['Conversions (30 j)', a.conversions],
    ['Codes personnels créés', a.codes],
  ] as const;
  return (
    <main className={CLASSES_PAGE}>
      <EnteteConversion actif="/admin/conversion" />
      {!reglages.actif ? (
        <Banner tone="attention" titre="Interrupteur général coupé">
          Aucun email offres_pro ne part. Les traces continuent.
        </Banner>
      ) : null}
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4">
        {indicateurs.map(([l, v]) => (
          <li key={l} className="rounded-lg border border-trait p-4">
            <p className="m-0 text-sm text-neutre-700">{l}</p>
            <p className="m-0 text-2xl font-bold">{formatNombre(v)}</p>
          </li>
        ))}
      </ul>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Entreprises par étape</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
              {Object.entries(a.parEtape).map(([e, n]) => (
                <div key={e} className="contents">
                  <dt>{LIBELLES_ETAPE_CYCLE[e] ?? e}</dt>
                  <dd className="m-0 text-right font-semibold">{formatNombre(n)}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Meilleurs emails</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="m-0 mb-2 text-sm text-neutre-700">
              Conversions attribuées au dernier email dans les 7 jours.
            </p>
            {a.meilleursModeles.length ? (
              <ol className="m-0 grid gap-1 pl-5 text-sm">
                {a.meilleursModeles.map((m) => (
                  <li key={m.modele}>
                    {m.modele} · {m.conversions} conversion{m.conversions > 1 ? 's' : ''}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="m-0 text-sm">Aucune conversion sur la période.</p>
            )}
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Groupe témoin ({formatNombre(reglages.tailleTemoin * 100)} %)</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="m-0 text-sm">
            Part d’abonnés payants : <strong>{pct(a.temoin.autresPayants, a.temoin.autres)}</strong>{' '}
            avec les emails, contre <strong>{pct(a.temoin.payants, a.temoin.effectif)}</strong> sans
            ({formatNombre(a.temoin.effectif)} entreprises témoins).{' '}
            <Link href="/admin/conversion/journal" className="text-accent-700">
              Voir le journal
            </Link>
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
