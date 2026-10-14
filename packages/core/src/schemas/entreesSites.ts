import { z } from '../zod';

/**
 * Envoi du formulaire d'un site artisan (SITE_INTERNET §5) : valeurs brutes, validées ensuite
 * champ par champ selon le formulaire publié (`validerEnvoi`) ; jeton Turnstile ; page d'origine.
 */
export const entreeFormulaireSite = z.object({
  valeurs: z
    .record(z.string().max(40), z.string().max(4000))
    .refine((v) => Object.keys(v).length <= 30),
  jeton: z.string().max(4096),
  page: z.string().max(300),
});
export type EntreeFormulaireSite = z.infer<typeof entreeFormulaireSite>;
