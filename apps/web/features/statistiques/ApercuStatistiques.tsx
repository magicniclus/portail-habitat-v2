import type { statistiquesPro } from '@ph/core/espace-pro';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { Histogramme } from './Histogramme';

type Stats = ReturnType<typeof statistiquesPro>;

/** Graphiques des 30 derniers jours (vues, appels, demandes), en tête du tableau de bord. */
export function ApercuStatistiques({ s }: { s: Stats }) {
  return (
    <section aria-labelledby="titre-apercu-stats" className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titre-apercu-stats" className="m-0 text-xl">
          Votre fiche ces 30 derniers jours
        </h2>
        <Link
          href={routes.proStatistiques}
          className="inline-flex min-h-11 items-center text-sm font-semibold"
        >
          Toutes les statistiques →
        </Link>
      </div>
      <GraphiquesFiche s={s} />
    </section>
  );
}

/** Vues, appels et demandes de devis : trois histogrammes d'une seule série chacun. */
export function GraphiquesFiche({ s }: { s: Stats }) {
  return (
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
          points={s.evolution.points.map((p) => ({ debut: p.debut, fin: p.fin, valeur: p[cle] }))}
        />
      ))}
    </div>
  );
}
