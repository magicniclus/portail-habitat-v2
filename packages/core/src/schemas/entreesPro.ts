import { z } from '../zod';
import { id } from './commun';

/** « Mes demandes » (PRO-02) : ouvrir, accepter ou refuser une demande reçue. */
export const entreeReponseDemande = z.strictObject({
  demandeId: id,
  action: z.enum(['voir', 'accepter', 'refuser']),
  motif: z.string().trim().max(300).optional(),
});

/** « Je m'en occupe » (PRO-03). */
export const entreePrendreDemande = z.strictObject({ demandeId: id });
