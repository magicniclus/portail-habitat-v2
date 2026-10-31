import { createHmac, timingSafeEqual } from 'node:crypto';

/** Écart toléré entre l'horodatage du webhook et l'heure du serveur (rejeu). */
const TOLERANCE_S = 300;

/**
 * Signature des webhooks Resend (format Svix) : HMAC-SHA256 de `id.horodatage.corps` avec le secret
 * `whsec_…` décodé en base64 ; l'en-tête peut contenir plusieurs signatures `v1,…`.
 */
export function signatureSvixValide(
  secret: string,
  entetes: { id: string | null; horodatage: string | null; signature: string | null },
  corps: string,
  maintenantS = Math.floor(Date.now() / 1000),
): boolean {
  const { id, horodatage, signature } = entetes;
  if (!id || !horodatage || !signature || !secret.startsWith('whsec_')) return false;
  const t = Number(horodatage);
  if (!Number.isFinite(t) || Math.abs(maintenantS - t) > TOLERANCE_S) return false;
  const attendue = createHmac('sha256', Buffer.from(secret.slice(6), 'base64'))
    .update(`${id}.${horodatage}.${corps}`)
    .digest();
  return signature.split(' ').some((s) => {
    const [version, valeur] = s.split(',');
    if (version !== 'v1' || !valeur) return false;
    const recue = Buffer.from(valeur, 'base64');
    return recue.length === attendue.length && timingSafeEqual(recue, attendue);
  });
}

/** Événements Resend → statut de l'envoi ; seul un rebond définitif bloque l'adresse. */
export function statutResend(
  type: string,
  rebond?: string,
): 'delivre' | 'ouvert' | 'clic' | 'rebond' | 'plainte' | null {
  switch (type) {
    case 'email.delivered':
      return 'delivre';
    case 'email.opened':
      return 'ouvert';
    case 'email.clicked':
      return 'clic';
    case 'email.bounced':
      return rebond === 'Transient' ? null : 'rebond';
    case 'email.complained':
      return 'plainte';
    default:
      return null;
  }
}
