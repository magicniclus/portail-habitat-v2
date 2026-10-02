import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Jetons signés des liens d'email (préférences, désabonnement en un clic) : HMAC-SHA256 avec
 * NOTIF_SIGNING_SECRET. Aucune adresse email en clair dans l'URL (règle n° 8) : seulement un uid
 * ou une empreinte d'email, la catégorie et l'expiration.
 */
export interface ContenuJeton {
  /** `u:<uid>` ou `e:<empreinte de l'email>`. */
  sujet: string;
  categorie?: string;
  expireLe: number;
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');

export function signerJeton(c: ContenuJeton, secret: string): string {
  if (secret.length < 32)
    throw new Error('NOTIF_SIGNING_SECRET trop court (32 caractères minimum).');
  const corps = b64(JSON.stringify(c));
  return `${corps}.${b64(createHmac('sha256', secret).update(corps).digest())}`;
}

export function verifierJeton(
  jeton: string,
  secret: string,
  maintenant: number,
): ContenuJeton | null {
  const [corps, signature] = jeton.split('.');
  if (!corps || !signature) return null;
  const attendue = createHmac('sha256', secret).update(corps).digest();
  const recue = Buffer.from(signature, 'base64url');
  if (recue.length !== attendue.length || !timingSafeEqual(recue, attendue)) return null;
  try {
    const c = JSON.parse(Buffer.from(corps, 'base64url').toString('utf8')) as ContenuJeton;
    if (typeof c.sujet !== 'string' || typeof c.expireLe !== 'number' || c.expireLe <= maintenant)
      return null;
    return c;
  } catch {
    return null;
  }
}
