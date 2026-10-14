/** Enregistrement DNS attendu chez le registrar de l'artisan (DOMAINES §4, cas C). */
export interface EnregistrementAttendu {
  type: 'A' | 'CNAME' | 'TXT';
  nom: string;
  valeur: string;
}

export type EtatEnregistrement = 'en_attente' | 'ok' | 'incorrect';

const normaliser = (type: EnregistrementAttendu['type'], v: string) => {
  const x = v.trim().replace(/^"|"$/g, '');
  return type === 'TXT' ? x : x.toLowerCase().replace(/\.$/, '');
};

/**
 * DOM-04 : chaque ligne est jugée seule. A : la valeur attendue et aucune autre adresse ; CNAME et
 * TXT : valeur exacte (le TXT de vérification vit sur un sous-nom, sans conflit avec un SPF).
 */
export function etatEnregistrement(
  attendu: EnregistrementAttendu,
  trouves: readonly string[],
): { etat: EtatEnregistrement; trouve?: string } {
  if (!trouves.length) return { etat: 'en_attente' };
  const cible = normaliser(attendu.type, attendu.valeur);
  const vus = trouves.map((t) => normaliser(attendu.type, t));
  if (attendu.type === 'TXT')
    return vus.includes(cible) ? { etat: 'ok' } : { etat: 'incorrect', trouve: vus.join(', ') };
  if (attendu.type === 'A')
    return vus.length === 1 && vus[0] === cible
      ? { etat: 'ok' }
      : { etat: 'incorrect', trouve: vus.join(', ') };
  return vus[0] === cible ? { etat: 'ok' } : { etat: 'incorrect', trouve: vus[0] };
}

/** Étape suivante de la vérification (DOMAINES §4) : toutes les 2 min 1 h, puis 30 min jusqu'à 72 h. */
export function prochaineVerification(depuisMs: number): number | null {
  const MIN = 60_000;
  if (depuisMs < 60 * MIN) return 2 * MIN;
  if (depuisMs < 72 * 60 * MIN) return 30 * MIN;
  return null;
}

/** Domaine saisi par l'artisan → nom nu en minuscules, sans protocole ni `www.` ; `null` s'il est invalide. */
export function normaliserDomaine(saisie: string): string | null {
  const d = saisie
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
    .replace(/\.$/, '');
  return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(d) &&
    !d.endsWith('portailhabitat.fr')
    ? d
    : null;
}
