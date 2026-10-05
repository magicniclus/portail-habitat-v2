const J = 86_400_000;

const jourParis = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(ms);

/**
 * Emails de la séquence S1 encore possibles pour un prospect (CONVERSION §3) : demande de la zone
 * de J+1 à J+30 (une par semaine au plus), « dernière » à J+12, résumé le 1er du mois pendant
 * 6 mois. `prospect-temoignage` attend un vrai délai de première demande par métier.
 */
export function emailsProspect(e: {
  creeLe: number;
  maintenant: number;
  envois: { derniere?: number; demandeZone?: number; resume?: number };
}): string[] {
  const age = e.maintenant - e.creeLe;
  const r: string[] = [];
  if (
    age >= J &&
    age <= 30 * J &&
    (e.envois.demandeZone === undefined || e.maintenant - e.envois.demandeZone >= 7 * J)
  )
    r.push('prospect-demande-zone');
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
