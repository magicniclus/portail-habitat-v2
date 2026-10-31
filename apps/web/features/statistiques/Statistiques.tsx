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
import { VuesParSemaine } from './VuesParSemaine';

type Stats = ReturnType<typeof statistiquesPro>;
const pourcent = (t: number) => `${formatNombre(t * 100, 1)} %`;

/** Maquette Statistiques : période dans l'URL, résumé, conversions, vues par semaine. */
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
      <section
        aria-labelledby="titre-conversion"
        className="grid gap-4 rounded-2xl border border-trait p-5"
      >
        <h2 id="titre-conversion" className="m-0 text-xl">
          Performance de conversion
        </h2>
        {s.conversions.map((c) => (
          <div key={c.cle} className="grid gap-1.5">
            <p className="m-0 flex justify-between gap-3 text-[15px] font-semibold">
              <span>{c.libelle}</span>
              <span>{pourcent(c.taux)}</span>
            </p>
            <span
              aria-hidden="true"
              className="block h-2 overflow-hidden rounded-pill bg-neutre-200"
            >
              <span
                className="block h-full min-w-2 rounded-pill bg-accent"
                style={{ width: `${Math.min(100, c.taux * 100)}%` }}
              />
            </span>
            <span className="text-[13px] text-neutre-800">
              {formatNombre(c.actions)} sur {formatNombre(c.vues)} vues
            </span>
          </div>
        ))}
      </section>
      <section
        aria-labelledby="titre-semaines"
        className="grid gap-4 rounded-2xl border border-trait p-5"
      >
        <div>
          <h2 id="titre-semaines" className="m-0 text-xl">
            Vues par semaine
          </h2>
          <p className="m-0 mt-1 text-sm text-neutre-800">
            Consultations de votre fiche sur les 8 dernières semaines
            {s.derniereVue ? ` · dernière vue le ${formatDate(s.derniereVue, 'long')}` : ''}
          </p>
        </div>
        <VuesParSemaine semaines={s.semaines} />
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
