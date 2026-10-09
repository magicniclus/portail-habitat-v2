const J = 86_400_000;

/** Conversion attribuée au dernier email planifié dans les 7 jours qui la précèdent (CONVERSION §8). */
export function attribuerConversion(
  emails: readonly { modele: string; le: number }[],
  le: number,
): string | null {
  const candidats = emails.filter((e) => e.le <= le && le - e.le <= 7 * J);
  return candidats.length ? candidats.reduce((a, b) => (b.le > a.le ? b : a)).modele : null;
}

const compter = (liste: readonly string[]) =>
  liste.reduce<Record<string, number>>((n, m) => ({ ...n, [m]: (n[m] ?? 0) + 1 }), {});

/** Agrégat quotidien `cycleStats/{jour}` : la vue d'ensemble additionne ces documents. */
export function agregerJourCycle(e: {
  parEtape: Record<string, number>;
  envois: readonly string[];
  ouvertures: readonly string[];
  clics: readonly string[];
  conversions: readonly { modele: string | null; montantHtCentimes: number; temoin: boolean }[];
  temoinEffectif: number;
}) {
  const revenu: Record<string, number> = {};
  for (const c of e.conversions)
    if (c.modele) revenu[c.modele] = (revenu[c.modele] ?? 0) + c.montantHtCentimes;
  return {
    entonnoir: e.parEtape,
    envois: compter(e.envois),
    ouvertures: compter(e.ouvertures),
    clics: compter(e.clics),
    conversions: compter(e.conversions.map((c) => c.modele ?? 'sans_email')),
    revenuAttribueCentimes: revenu,
    temoin: {
      effectif: e.temoinEffectif,
      conversions: e.conversions.filter((c) => c.temoin).length,
    },
  };
}
