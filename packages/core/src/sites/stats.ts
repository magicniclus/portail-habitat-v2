/** Compteurs d'une période (jour `AAAA-MM-JJ` ou mois `AAAA-MM`), anonymes et sans cookie. */
export interface CompteursSite {
  cle: string;
  vues: number;
  demandes: number;
  /** pageId → vues. */
  pages: Record<string, number>;
}

const JOUR_MS = 86_400_000;

/** `n` jours se terminant par `fin` (inclus), du plus ancien au plus récent. */
export function joursPrecedents(fin: string, n: number): string[] {
  const t = Date.parse(`${fin}T12:00:00Z`);
  return Array.from({ length: n }, (_, i) =>
    new Date(t - (n - 1 - i) * JOUR_MS).toISOString().slice(0, 10),
  );
}

/** `n` mois se terminant par `fin` (`AAAA-MM`, inclus). */
export function moisPrecedents(fin: string, n: number): string[] {
  const [a, m] = fin.split('-').map(Number) as [number, number];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

/** Onglet Statistiques : série complète (zéros compris), totaux, taux de demande, pages vues. */
export function resumeStatsSite(lus: CompteursSite[], periodes: string[]) {
  const parCle = new Map(lus.map((c) => [c.cle, c]));
  const serie = periodes.map((cle) => ({ cle, vues: parCle.get(cle)?.vues ?? 0 }));
  const dans = periodes.map((p) => parCle.get(p)).filter((c): c is CompteursSite => Boolean(c));
  const vues = dans.reduce((s, c) => s + c.vues, 0);
  const demandes = dans.reduce((s, c) => s + c.demandes, 0);
  const pages = new Map<string, number>();
  for (const c of dans)
    for (const [id, n] of Object.entries(c.pages)) pages.set(id, (pages.get(id) ?? 0) + n);
  return {
    serie,
    totaux: { vues, demandes, taux: vues ? demandes / vues : 0 },
    pages: [...pages.entries()]
      .map(([pageId, n]) => ({ pageId, vues: n }))
      .sort((a, b) => b.vues - a.vues)
      .slice(0, 10),
  };
}
