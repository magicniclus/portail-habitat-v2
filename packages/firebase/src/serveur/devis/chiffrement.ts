import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Chiffrement des données bancaires de l'artisan (IBAN, DATABASE §8 bis) : AES-256-GCM, clé de
 * 32 octets hors base (secret). Format `v1.iv.tag.données` en base64url.
 */
export function chiffrer(texte: string, cle: Buffer): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', cle, iv);
  const donnees = Buffer.concat([c.update(texte, 'utf8'), c.final()]);
  return ['v1', iv, c.getAuthTag(), donnees]
    .map((x) => (typeof x === 'string' ? x : x.toString('base64url')))
    .join('.');
}

/** `null` si la valeur a été altérée ou chiffrée avec une autre clé. */
export function dechiffrer(valeur: string, cle: Buffer): string | null {
  const [v, iv, tag, donnees] = valeur.split('.');
  if (v !== 'v1' || !iv || !tag || !donnees) return null;
  try {
    const d = createDecipheriv('aes-256-gcm', cle, Buffer.from(iv, 'base64url'));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(donnees, 'base64url')), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}
