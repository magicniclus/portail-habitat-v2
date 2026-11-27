/**
 * Événements analytics (`window.dataLayer`, LANDINGS §5). Rien ne part tant qu'aucun gestionnaire de
 * balises n'est chargé ; celui-ci respectera le consentement (bandeau cookies).
 */
export function pousserEvenement(e: Record<string, string | number>): void {
  try {
    const w = window as Window & { dataLayer?: Record<string, unknown>[] };
    (w.dataLayer ??= []).push(e);
  } catch {
    // Jamais bloquant pour la page.
  }
}
