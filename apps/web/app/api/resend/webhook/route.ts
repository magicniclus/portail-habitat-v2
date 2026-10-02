import { evenementResend } from '@ph/core/schemas';
import { appliquerEvenement, empreinteEmail } from '@ph/firebase/notifications';
import { servicesNotifications } from '@/server/notifications';
import { signatureSvixValide, statutResend } from '@/server/svix';

export const dynamic = 'force-dynamic';

/** Webhook Resend → statut des envois, liste de blocage (EMAILS §7). Signature Svix obligatoire. */
export async function POST(requete: Request) {
  const corps = await requete.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET ?? '';
  const valide = signatureSvixValide(
    secret,
    {
      id: requete.headers.get('svix-id'),
      horodatage: requete.headers.get('svix-timestamp'),
      signature: requete.headers.get('svix-signature'),
    },
    corps,
  );
  if (!valide) return new Response(null, { status: 401 });
  let brut: unknown;
  try {
    brut = JSON.parse(corps);
  } catch {
    return new Response(null, { status: 400 });
  }
  const e = evenementResend.safeParse(brut);
  if (!e.success) return new Response(null, { status: 400 });
  const statut = statutResend(e.data.type, e.data.data.bounce?.type);
  if (statut)
    await appliquerEvenement(servicesNotifications(), e.data.data.email_id, statut, empreinteEmail);
  return new Response(null, { status: 204 });
}
