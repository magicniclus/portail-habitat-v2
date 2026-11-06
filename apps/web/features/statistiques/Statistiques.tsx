import {
  LIBELLES_PERIODE,
  PERIODES_STATS,
  type PeriodeStats,
  type statistiquesPro,
} from '@ph/core/espace-pro';
import { formatDate, formatNombre } from '@ph/core/format';
import { bouton, cn } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { Histogramme } from './Histogramme';

type Stats = ReturnType<typeof statistiquesPro>;
const pourcent = (t: number) => `${formatNombre(t * 100, 1)} %`;
/** « 1 contact pour 12 vues » : plus parlant qu'un pourcentage qui peut dépasser 100 %. */
const pourVues = (contacts: number, vues: number) =>
  contacts
    ? `1 contact (appel ou demande) pour ${formatNombre(Math.max(1, Math.round(vues / contacts)))} vues`
    : `${formatNombre(vues)} vues, pas encore de contact`;

/** Statistiques de la fiche : période dans l'URL, résumé, puis vues, appels et demandes en graphiques. */
export function Statistiques({ s, periode }: { s: Stats; periode: PeriodeStats }) {
  const tuiles = [
    { cle: 'vues', libelle: 'Vues de la fiche', valeur: formatNombre(s.resume.vues) },
    { cle: 'appels', libelle: 'Appels', valeur: formatNombre(s.resume.appels) },
    { cle: 'devis', libelle: 'Demandes de devis', valeur: formatNombre(s.resume.devis) },
    { cle: 'taux', libelle: "Taux d'engagement", valeur: pourcent(s.resume.tauxEngagement) },
  ];
  return (
    <div className="grid gap-6">
      <nav aria-label="Période" className="flex flex-wrap gap-2">
        {PERIODES_STATS.map((p) => (
          <Link
            key={p}
            href={`${routes.proStatistiques}?periode=${p}` as Route}
            aria-current={p === periode ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center rounded-pill border px-4 text-sm font-semibold no-underline',
              p === periode
                ? 'border-accent bg-accent-action text-blanc'
                : 'border-trait bg-blanc text-neutre-800',
            )}
          >
            {LIBELLES_PERIODE[p]}
          </Link>
        ))}
      </nav>
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4">
        {tuiles.map((t) => (
          <li key={t.cle} className="grid gap-1.5 rounded-[14px] border border-trait p-4">
            <span className="text-sm font-semibold text-neutre-800">{t.libelle}</span>
            <span className="text-[30px] leading-none font-bold">{t.valeur}</span>
            <span className="text-[13px] text-neutre-800">{LIBELLES_PERIODE[periode]}</span>
          </li>
        ))}
      </ul>
      <section aria-labelledby="titre-evolution" className="grid gap-3">
        <div>
          <h2 id="titre-evolution" className="m-0 text-xl">
            Évolution sur {LIBELLES_PERIODE[periode]}
          </h2>
          <p className="m-0 mt-1 text-sm text-neutre-800">
            {s.resume.vues
              ? `${pourVues(s.resume.appels + s.resume.devis, s.resume.vues)}`
              : 'Aucune visite sur la période pour l’instant.'}
            {s.derniereVue ? ` · dernière visite le ${formatDate(s.derniereVue, 'long')}` : ''}
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {(
            [
              ['vues', 'Vues de la fiche', 'vues'],
              ['appels', 'Appels', 'appels'],
              ['devis', 'Demandes de devis', 'demandes'],
            ] as const
          ).map(([cle, titre, unite]) => (
            <Histogramme
              key={cle}
              titre={titre}
              unite={unite}
              pas={s.evolution.pas}
              points={s.evolution.points.map((p) => ({
                debut: p.debut,
                fin: p.fin,
                valeur: p[cle],
              }))}
            />
          ))}
        </div>
      </section>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-accent-100 p-5">
        <div>
          <h2 className="m-0 text-lg">Vos vues progressent, pas vos appels ?</h2>
          <p className="m-0 mt-1 text-sm text-neutre-800">
            Des photos de chantier et une présentation complète inspirent confiance.
          </p>
        </div>
        <Link href={routes.proFiche} className={bouton()}>
          Compléter ma fiche
        </Link>
      </section>
    </div>
  );
}
