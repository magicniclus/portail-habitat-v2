/** Sous-domaines refusés (DOMAINES §2) : techniques et noms de métiers seuls. */
const RESERVES = new Set([
  'www',
  'admin',
  'api',
  'pro',
  'mail',
  'app',
  'static',
  'sites',
  'blog',
  'aide',
  'support',
  'dev',
  'staging',
  'test',
  'cdn',
  'assets',
  'img',
  'media',
  'ftp',
  'smtp',
  'imap',
  'pop',
  'ns1',
  'ns2',
  'portail',
  'portailtravaux',
  'habitat',
  'compte',
  'connexion',
  'diag',
  'plombier',
  'electricien',
  'couvreur',
  'macon',
  'menuisier',
  'peintre',
  'carreleur',
  'chauffagiste',
  'serrurier',
  'plaquiste',
  'charpentier',
  'paysagiste',
  'artisan',
  'artisans',
]);

/** DOM-01 : `null` si le sous-domaine est acceptable (l'unicité est vérifiée par le serveur). */
export function erreurSousDomaine(slug: string): string | null {
  if (slug.length < 3 || slug.length > 40) return 'Entre 3 et 40 caractères.';
  if (!/^[a-z0-9-]+$/.test(slug)) return 'Lettres minuscules, chiffres et tirets seulement.';
  if (slug.startsWith('-') || slug.endsWith('-')) return 'Pas de tiret au début ni à la fin.';
  if (slug.includes('--')) return 'Pas deux tirets à la suite.';
  if (RESERVES.has(slug)) return 'Ce nom est réservé, choisissez-en un autre.';
  return null;
}

/** Proposition à partir du nom commercial : « Bertrand Rénovation » → `bertrand-renovation`. */
export function sousDomaineDe(nom: string): string {
  const s = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return s.length >= 3 ? s : `${s}-artisan`.replace(/^-/, '');
}
