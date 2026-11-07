import { evenementResendRecu } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { traiterReponseEmail } from '@ph/firebase/cycle';
import { getFirestore } from 'firebase-admin/firestore';
import { signatureSvixValide } from '@/server/svix';

export const dynamic = 'force-dynamic';

/**
 * Resend Inbound (adresse du signataire, CONVERSION §9) : une réponse à un email de conversion crée
 * une tâche et met la séquence en pause. Signature Svix obligatoire ; le texte n'est pas stocké.
 */
export async function POST(requete: Request) {
  const corps = await requete.text();
  const valide = signatureSvixValide(
    process.env.RESEND_INBOUND_SECRET ?? '',
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
  const e = evenementResendRecu.safeParse(brut);
  if (!e.success) return new Response(null, { status: 204 });
  await traiterReponseEmail({ db: getFirestore(appAdmin()), horloge: Date.now }, e.data.data.from);
  return new Response(null, { status: 204 });
}
