import { LIBELLES_ETAPE_CYCLE } from '@ph/core/conversion';
import { formatDate, formatNombre } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { lireFicheCycle, listerSequencesAdmin } from '@ph/firebase/admin-serveur';
import { Banner, Card, CardBody, CardHeader, CardTitle } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActionsFiche } from '@/features/adminConversion/ActionsFiche';
import { CLASSES_PAGE, EnteteConversion } from '@/features/adminConversion/EnteteConversion';
import { TableTraces } from '@/features/adminConversion/TableTraces';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Fiche cycle' };

const SIGNAUX: Record<string, string> = {
  vues7j: 'Vues 7 j',
  vues30j: 'Vues 30 j',
  position: 'Position secteur',
  total: 'Fiches du secteur',
  misesEnAvant: 'Fiches mises en avant',
  creditsAchetes30j: 'Crédits achetés 30 j',
};

/** Fiche cycle : étape, score, signaux, historique ; pause, exclusion, étape forcée. */
export default async function FicheCycleAdmin({
  params,
}: {
  params: Promise<{ artisanId: string }>;
}) {
  const { artisanId } = await params;
  const s = await pageAdmin(`/admin/conversion/fiche/${artisanId}`, 'conversion');
  const db = getFirestore(appAdmin());
  const [f, sequences] = await Promise.all([
    lireFicheCycle(db, artisanId),
    listerSequencesAdmin(db, maintenantServeur()),
  ]);
  if (!f) notFound();
  const lignes = [
    [
      'Étape',
      f.etape
        ? `${LIBELLES_ETAPE_CYCLE[f.etape] ?? f.etape}${f.depuis ? ` depuis le ${formatDate(f.depuis)}` : ''}`
        : 'pas encore calculée',
    ],
    [
      'Séquence',
      f.sequence
        ? `${f.sequence.id} · étape ${f.sequence.etape + 1}${f.sequence.prochainEnvoi ? ` · prochain envoi ${formatDate(f.sequence.prochainEnvoi, 'dateHeure')}` : ' · terminée'}`
        : 'aucune',
    ],
    ['Offre cible', f.offreCible ? `${f.offreCible} (score ${f.score ?? '—'})` : '—'],
    ['Groupe témoin', f.groupeTemoin ? 'Oui' : 'Non'],
    ['Emails non ouverts d’affilée', `${f.emailsNonOuverts}${f.enVeille ? ' · en veille' : ''}`],
    ['Dernière remise', f.derniereRemise ? formatDate(f.derniereRemise) : 'aucune'],
  ];
  return (
    <main className={CLASSES_PAGE}>
      <EnteteConversion actif="/admin/conversion/fiche" />
      <div>
        <h2 className="m-0 text-xl">{f.entreprise}</h2>
        <p className="m-0 text-sm text-neutre-700">
          {[f.metier, f.ville, f.plan].filter(Boolean).join(' · ')}
        </p>
      </div>
      {f.pause ? (
        <Banner tone="attention" titre="Séquence en pause">
          Depuis le {formatDate(f.pause.depuis, 'dateHeure')} : {f.pause.motif}
        </Banner>
      ) : null}
      {f.exclu ? <Banner tone="danger">Exclue des emails commerciaux.</Banner> : null}
      <ActionsFiche
        artisanId={artisanId}
        enPause={Boolean(f.pause)}
        exclu={f.exclu}
        sequences={sequences.map(({ id, nom }) => ({ id, nom }))}
        peutPiloter={s.permissions.includes('conversion.piloter')}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cycle</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="m-0 grid gap-2 text-sm">
              {lignes.map(([l, v]) => (
                <div key={l}>
                  <dt className="text-neutre-700">{l}</dt>
                  <dd className="m-0 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Signaux (calcul de 5 h)</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
              {Object.entries(SIGNAUX)
                .filter(([k]) => f.signaux[k] !== undefined)
                .map(([k, l]) => (
                  <div key={k} className="contents">
                    <dt>{l}</dt>
                    <dd className="m-0 text-right font-semibold">{formatNombre(f.signaux[k]!)}</dd>
                  </div>
                ))}
            </dl>
          </CardBody>
        </Card>
      </div>
      <section aria-label="Historique" className="grid gap-2">
        <h2 className="m-0 text-lg">Historique</h2>
        <TableTraces traces={f.historique} lienFiche={false} />
      </section>
    </main>
  );
}
