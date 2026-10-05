import { formatDate, formatEuros } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import {
  lireAnalyseIa,
  lireBudgetIa,
  lireConfigIa,
  lireQuotaJourIa,
  listerAnalysesIa,
} from '@ph/firebase/ia';
import { Banner } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { FormulaireAnalyse } from '@/features/adminIa/FormulaireAnalyse';
import { ResultatAnalyse } from '@/features/adminIa/ResultatAnalyse';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Assistant IA' };
/** Une analyse peut durer jusqu'à deux minutes (appel au modèle, une nouvelle tentative). */
export const maxDuration = 300;

type Params = Promise<Record<string, string | string[] | undefined>>;
const texte = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

/** Back-office › Assistant IA (IA_ADMIN.md, maquette « Admin IA »). */
export default async function AssistantIa({ searchParams }: { searchParams: Params }) {
  const session = await pageAdmin('/admin/ia', 'ia');
  const p = await searchParams;
  const db = getFirestore(appAdmin());
  const maintenant = maintenantServeur();
  const [historique, budget, config, quota] = await Promise.all([
    listerAnalysesIa(db),
    lireBudgetIa(db, maintenant),
    lireConfigIa(db),
    lireQuotaJourIa(db, session.uid, maintenant),
  ]);
  const choisie = texte(p.analyse) || historique.find((a) => a.statut === 'ok')?.id;
  const resultat = choisie ? await lireAnalyseIa(db, choisie) : null;
  const peut = (x: string) => session.permissions.includes(x);
  const cle = Boolean(process.env.ANTHROPIC_API_KEY);
  const epuise = budget.depenseCentimes >= budget.budgetCentimes;
  const euros = (c: number) => formatEuros(c, { decimales: 'toujours' });
  return (
    <main className="grid min-w-0 gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-[clamp(26px,3vw,30px)]">Assistant IA</h1>
          <p className="m-0 mt-1 max-w-[70ch] text-neutre-800">
            Un seul objectif : <strong>augmenter le taux de conversion</strong>. L’assistant analyse
            tout ou partie des données du site et vous dit quoi changer, avec les preuves et le gain
            attendu. Rien n’est appliqué sans votre validation.
          </p>
        </div>
        <p className="m-0 text-sm text-neutre-700">
          {quota} / {config.quotaJour} analyses aujourd’hui · budget du mois{' '}
          {euros(budget.depenseCentimes)} / {euros(budget.budgetCentimes)}
        </p>
      </header>
      {!cle || !config.actif ? (
        <Banner tone="info" titre="L’assistant n’est pas encore actif">
          La clé de l’API Claude n’est pas encore configurée (ou l’assistant est coupé dans les
          réglages). Les écrans restent consultables.
        </Banner>
      ) : epuise ? (
        <Banner tone="attention" titre="Budget du mois atteint">
          L’assistant reprendra le mois prochain, ou relevez le budget dans les réglages.
        </Banner>
      ) : budget.depenseCentimes >= budget.budgetCentimes * 0.8 ? (
        <Banner tone="attention">Plus de 80 % du budget mensuel est déjà utilisé.</Banner>
      ) : null}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <div className="grid min-w-0 gap-4">
          {peut('ia.utiliser') ? (
            <FormulaireAnalyse
              questionInitiale={texte(p.question)}
              actif={cle && config.actif && !epuise}
            />
          ) : null}
          {resultat ? (
            <ResultatAnalyse {...resultat} peutAgir={peut('ia.utiliser')} />
          ) : (
            <p className="m-0 text-neutre-700">Aucune analyse pour le moment.</p>
          )}
        </div>
        <aside className="grid gap-4">
          <section
            aria-labelledby="historique-ia"
            className="grid gap-1 rounded-card border border-trait bg-blanc p-4"
          >
            <h2 id="historique-ia" className="m-0 mb-1 text-base">
              Historique
            </h2>
            {historique.map((a) => (
              <Link
                key={a.id}
                href={`/admin/ia?analyse=${a.id}` as Route}
                aria-current={a.id === choisie ? 'page' : undefined}
                className="flex min-h-11 flex-col justify-center rounded-md px-2 py-1.5 text-texte no-underline hover:bg-neutre-100 aria-[current=page]:bg-neutre-100"
              >
                <span className="font-semibold">
                  {a.mode === 'audit' ? 'Audit complet' : 'Points d’amélioration'}
                  {a.statut === 'erreur' ? ' · échec' : ''}
                </span>
                <span className="text-xs text-neutre-700">
                  {formatDate(a.createdAt, 'court')} · {a.question ?? a.perimetres.join(', ')}
                </span>
              </Link>
            ))}
          </section>
          {peut('ia.configurer') ? (
            <section
              aria-labelledby="reglages-ia"
              className="grid gap-1 rounded-card border border-trait bg-blanc p-4 text-sm"
            >
              <h2 id="reglages-ia" className="m-0 mb-1 text-base">
                Réglages
              </h2>
              <p className="m-0">Modèle par défaut : {config.modeleDefaut}</p>
              <p className="m-0">Analyse approfondie : {config.modeleApprofondi}</p>
              <p className="m-0">Cache des réponses : 24 h</p>
              <p className="m-0">Consignes apprises : {config.consignes.length}</p>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
