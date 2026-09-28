import { normaliserTel } from '../format/telephone';
import { brouillonParcours, PARCOURS } from '../parcours/brouillon';
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
  /** Brouillon serveur du lien de reprise, supprimé avec l'envoi (REPRISE_PARCOURS §4). */
  brouillonId: id.optional(),
  accepteConfidentialite: z.literal(true, 'Acceptez la politique de confidentialité'),
  /** Piège à robots : doit rester vide. */
  site: z.string().max(0).optional(),
});

export type EntreeDemande = z.output<typeof entreeDemande>;

/** « M'envoyer un lien pour reprendre plus tard » : brouillon sans coordonnées + adresse d'envoi. */
export const entreeLienReprise = z.strictObject({ brouillon: brouillonParcours, email });

/** Brouillon d'une personne connectée (REPRISE_PARCOURS §5, niveau 2) : lu, enregistré ou effacé. */
export const entreeBrouillonCompte = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('lire'), parcours: z.enum(PARCOURS) }),
  z.strictObject({ action: z.literal('sauver'), brouillon: brouillonParcours }),
  z.strictObject({ action: z.literal('effacer'), parcours: z.enum(PARCOURS) }),
]);

/** Ouverture d'un lien de reprise (`/simulateur?reprise=…`). */
export const entreeReprise = z.strictObject({ jeton: z.string().min(20).max(128) });

/**
 * Envoi du parcours diagnostic (`creerDossierDiag`, DIA-06) : objet strict, aucun montant ; le
 * dossier et le budget sont recalculés par le serveur avec les prix privés.
 */
export const entreeDossierDiag = z.strictObject({
  cleIdempotence: z.string().min(8).max(64),
  bien: z.strictObject({
    adresse: z.string().trim().min(3).max(200),
    communeSlug: slug,
    codePostal,
    type: z.enum(['appartement', 'maison', 'immeuble']),
    periode: z.enum(['av1949', '1949-1976', '1977-1996', '1997-2010', 'ap2011']),
    surface: z.number().int().min(10).max(2000),
    motif: z.enum(['vente', 'location', 'travaux']),
    gaz: z.enum(['oui', 'non']),
    elec: z.enum(['ancienne', 'recente']),
    assainissement: z.enum(['collectif', 'individuel', 'inconnu']),
    classe: z.enum(['inconnu', 'AB', 'CD', 'E', 'FG']),
  }),
  existants: z
    .array(z.strictObject({ diagId: slug, annee: z.number().int().min(1990).max(2100) }))
    .max(20),
  contact: z.strictObject({
    nom: z.string().trim().min(2).max(120),
    email,
    telephone: telephoneSaisi,
  }),
  visiteSouhaitee: z.enum(['semaine', '15jours', 'mois', 'renseignement']),
  accepteContact: z.literal(true, 'Acceptez d’être contacté et la politique de confidentialité'),
  /** Piège à robots : doit rester vide. */
  site: z.string().max(0).optional(),
});

export type EntreeDossierDiag = z.output<typeof entreeDossierDiag>;
