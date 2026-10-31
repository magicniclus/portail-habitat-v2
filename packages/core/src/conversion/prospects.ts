const J = 86_400_000;

const jourParis = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(ms);

/**
 * Emails de la séquence S1 encore possibles pour un prospect (CONVERSION §3) : demande de la zone
 * de J+1 à J+30 (une par semaine au plus), « dernière » à J+12, résumé le 1er du mois pendant
 * 6 mois, témoignage chiffré à J+5 (une fois, jusqu'à J+30).
 */
export function emailsProspect(e: {
  creeLe: number;
  maintenant: number;
  envois: { derniere?: number; demandeZone?: number; resume?: number; temoignage?: number };
}): string[] {
  const age = e.maintenant - e.creeLe;
  const r: string[] = [];
  if (
    age >= J &&
    age <= 30 * J &&
    (e.envois.demandeZone === undefined || e.maintenant - e.envois.demandeZone >= 7 * J)
  )
    r.push('prospect-demande-zone');
  if (age >= 5 * J && age <= 30 * J && e.envois.temoignage === undefined)
    r.push('prospect-temoignage');
  if (age >= 12 * J && e.envois.derniere === undefined) r.push('prospect-derniere');
  const jour = jourParis(e.maintenant);
  if (
    jour.endsWith('-01') &&
    age >= 20 * J &&
    age <= 183 * J &&
    (e.envois.resume === undefined || jourParis(e.envois.resume).slice(0, 7) !== jour.slice(0, 7))
  )
    r.push('resume-zone-mensuel');
  return r;
}

/** Artisans mesurés au minimum : en dessous, pas de moyenne (et pas d'email). */
const MIN_MESURES = 3;

/**
 * Délai moyen, en jours, entre l'inscription et la première demande reçue, sur les artisans
 * inscrits depuis moins de 6 mois qui en ont reçu une (`prospect-temoignage`). `null` sans
 * assez de mesures : on n'invente jamais de chiffre.
 */
export function delaiPremiereDemande(
  inscrits: readonly { inscritLe: number; premiereLe?: number }[],
  maintenant: number,
): number | null {
  const delais = inscrits
    .filter(
      (i) =>
        maintenant - i.inscritLe <= 183 * J &&
        i.premiereLe !== undefined &&
        i.premiereLe >= i.inscritLe,
    )
    .map((i) => (i.premiereLe! - i.inscritLe) / J);
  if (delais.length < MIN_MESURES) return null;
  return Math.max(1, Math.round(delais.reduce((a, b) => a + b, 0) / delais.length));
}
