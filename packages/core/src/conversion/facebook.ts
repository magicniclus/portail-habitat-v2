import { formatFourchette } from '../format/euros';

/** Lien du groupe « Trouver chantier » : inscriptions suivies séparément (CONVERSION §3 ter). */
export const LIEN_FACEBOOK =
  'https://www.portailhabitat.fr/pro?utm_source=facebook&utm_medium=groupe&utm_campaign=trouver-chantier';

const MIN = 5;
const MAX = 8;

/**
 * Publication quotidienne du groupe Facebook : 5 à 8 demandes du jour anonymisées (travaux,
 * commune, budget, délai), plus gros budgets d'abord. Rien d'autre n'est lu sur la demande.
 */
export function textePublicationFacebook(
  demandes: readonly {
    travaux: string;
    ville: string;
    minCentimes: number;
    maxCentimes: number;
    delai: string;
  }[],
  o: { zone: string; date: number },
): string | null {
  if (demandes.length < MIN) return null;
  const jour = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(o.date);
  const lignes = [...demandes]
    .sort((a, b) => b.maxCentimes - a.maxCentimes)
    .slice(0, MAX)
    .map(
      (d) =>
        `• ${d.travaux} · ${d.ville} · ${formatFourchette(d.minCentimes, d.maxCentimes)} · ${d.delai}`,
    );
  return [
    `🔨 Demandes de travaux du jour – ${o.zone} (${jour.replace(',', '')})`,
    '',
    ...lignes,
    '',
    '👉 Inscription gratuite, votre 1re demande offerte en passant en Visibilité :',
    LIEN_FACEBOOK,
    '',
    'Artisans vérifiés (SIREN + décennale), demandes jusqu’à 100 km de chez vous.',
  ].join('\n');
}
