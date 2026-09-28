import { IDS_SUJETS } from '../support/sujets';
import { z } from '../zod';
import { email } from './commun';

/** Formulaire Aide et contact (`/aide`). `site` : piège à robots, doit rester vide. */
export const entreeContact = z.object({
  sujet: z.enum(IDS_SUJETS),
  nom: z.string().trim().min(2).max(120),
  email,
  referenceDossier: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10).max(5000),
  site: z.string().max(0).optional(),
});
