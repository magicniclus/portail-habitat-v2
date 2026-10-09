import { z } from '../zod';

/** Page /preferences (EMAILS §2) : jeton signé reçu par email, catégories désactivables seulement. */
export const entreePreferences = z.object({
  jeton: z.string().min(20).max(2000),
  activiteEmail: z.boolean(),
  activiteInapp: z.boolean(),
  relanceEmail: z.boolean(),
  offresProEmail: z.boolean(),
  marketingEmail: z.boolean(),
});

/** Webhook Resend (EMAILS §7) : seuls les champs utiles sont lus. */
export const evenementResend = z.object({
  type: z.string(),
  data: z.object({
    email_id: z.string().min(1),
    bounce: z.object({ type: z.string() }).optional(),
  }),
});

/** Resend Inbound : réponse reçue sur l'adresse du signataire (CONVERSION §9). Le texte n'est pas lu. */
export const evenementResendRecu = z.object({
  type: z.literal('email.received'),
  data: z.object({ from: z.string().min(3).max(400) }),
});
