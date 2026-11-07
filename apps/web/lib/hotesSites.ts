/** Domaine des sous-domaines gratuits des sites artisans (DOMAINES §2). */
const DOMAINE_SITES = process.env.DOMAINE_SITES ?? 'portailtravaux.fr';

/**
 * Hôte d'un site artisan, ou `null` pour la plateforme elle-même (domaine principal, `www`,
 * poste local, aperçus Vercel). Tout autre hôte arrivé jusqu'ici a été relié par nous (sous-domaine
 * ou domaine connecté) ; inconnu, il donnera une 404.
 */
export function hoteSite(
  host: string | null,
  plateforme: string,
  base = DOMAINE_SITES,
): string | null {
  const h = (host ?? '').toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  if (!h || h === plateforme || h === base || h === `www.${base}`) return null;
  if (h === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.endsWith('.vercel.app'))
    return null;
  return /^[a-z0-9.-]+$/.test(h) ? h : null;
}
