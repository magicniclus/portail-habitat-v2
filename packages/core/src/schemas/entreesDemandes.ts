import { normaliserTel } from '../format/telephone';
import { z } from '../zod';
import { codePostal, email, id } from './commun';

const slug = z.string().regex(/^[a-z0-9_-]{1,60}$/, 'Identifiant invalide');

const telephoneSaisi = z
  .string()
  .max(30)
  .transform((t, ctx) => {
    const e164 = normaliserTel(t);
    if (!e164) {
      ctx.addIssue({ code: 'custom', message: 'Numéro de téléphone invalide' });
      return z.NEVER;
    }
    return e164;
  });

const reponse = z.union([z.number(), z.string().max(60), z.array(z.string().max(60)).max(30)]);

/**
 * Envoi du simulateur (`creerDemande`, COMPTES §2 et §6.1). **Aucun montant** : objet strict, toute
 * clé inattendue (estimation, prix…) est refusée (SIM-08). Les réponses sont revérifiées côté serveur
 * contre les champs publiés de la prestation.
 */
export const entreeDemande = z.strictObject({
  cleIdempotence: z.string().min(8).max(64),
  source: z.enum(['simulateur', 'hero', 'fiche_artisan', 'annuaire']),
  prestationId: slug,
  intention: slug.optional(),
  artisanCibleId: id.optional(),
  reponses: z.record(z.string().max(40), reponse).refine((r) => Object.keys(r).length <= 30, {
    message: 'Trop de réponses',
  }),
  codePostal,
  acces: z.enum(['facile', 'etage', 'difficile']),
  delaiSouhaite: z.enum(['asap', '1mois', '3mois', 'renseignement']).default('asap'),
  contact: z.strictObject({
    prenom: z.string().trim().min(1).max(80),
    nom: z.string().trim().min(1).max(80),
    email,
    telephone: telephoneSaisi,
  }),
  precisions: z.string().trim().max(2000).optional(),
  miseEnRelation: z.boolean(),
  /** Lien de reprise demandé (REPRISE_PARCOURS §4) : sans effet sur la demande elle-même. */
  brouillonId: id.optional(),
  accepteConfidentialite: z.literal(true, 'Acceptez la politique de confidentialité'),
  /** Piège à robots : doit rester vide. */
  site: z.string().max(0).optional(),
});

export type EntreeDemande = z.output<typeof entreeDemande>;
