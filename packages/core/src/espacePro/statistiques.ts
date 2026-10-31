/** Statistiques de la fiche (maquette Statistiques, `statsJour`) : calcul pur, dates « AAAA-MM-JJ ». */

export interface JourStats {
  jour: string;
  vuesFiche: number;
  clicsTelephone: number;
  clicsDevis: number;
}

export const PERIODES_STATS = ['7j', '30j', '12m'] as const;
export type PeriodeStats = (typeof PERIODES_STATS)[number];
export const LIBELLES_PERIODE: Record<PeriodeStats, string> = {
  '7j': '7 jours',
  '30j': '30 jours',
  '12m': '12 mois',
};

const JOUR_MS = 86_400_000;
const versMs = (j: string) => Date.parse(`${j}T00:00:00Z`);
const versJour = (ms: number) => new Date(ms).toISOString().slice(0, 10);
/** Premier jour inclus de la période qui finit `fin` (inclus). */
const debutPeriode = (p: PeriodeStats, fin: string) => {
  if (p === '12m') {
    const d = new Date(versMs(fin));
    d.setUTCFullYear(d.getUTCFullYear() - 1);
    return versJour(d.getTime() + JOUR_MS);
  }
  return versJour(versMs(fin) - ((p === '7j' ? 7 : 30) - 1) * JOUR_MS);
};

const somme = (jours: readonly JourStats[], debut: string, fin: string) =>
  jours
    .filter((j) => j.jour >= debut && j.jour <= fin)
    .reduce(
      (t, j) => ({
        vues: t.vues + j.vuesFiche,
        appels: t.appels + j.clicsTelephone,
        devis: t.devis + j.clicsDevis,
      }),
      { vues: 0, appels: 0, devis: 0 },
    );

const taux = (actions: number, vues: number) => (vues ? actions / vues : 0);

export function statistiquesPro(
  jours: readonly JourStats[],
  periode: PeriodeStats,
  aujourdhui: string,
) {
  const t = somme(jours, debutPeriode(periode, aujourdhui), aujourdhui);
  const semaines = Array.from({ length: 8 }, (_, i) => {
    const fin = versJour(versMs(aujourdhui) - (7 - i) * 7 * JOUR_MS);
    const debut = versJour(versMs(fin) - 6 * JOUR_MS);
    return { debut, fin, vues: somme(jours, debut, fin).vues };
  });
  const vus = jours.filter((j) => j.vuesFiche > 0 && j.jour <= aujourdhui).map((j) => j.jour);
  return {
    resume: { ...t, tauxEngagement: taux(t.appels + t.devis, t.vues) },
    conversions: [
      { cle: 'appels', libelle: 'Vues → appels', actions: t.appels, vues: t.vues },
      { cle: 'devis', libelle: 'Vues → demandes de devis', actions: t.devis, vues: t.vues },
      { cle: 'total', libelle: 'Engagement total', actions: t.appels + t.devis, vues: t.vues },
    ].map((c) => ({ ...c, taux: taux(c.actions, c.vues) })),
    semaines,
    derniereVue: vus.length ? vus.sort().at(-1)! : null,
  };
}
