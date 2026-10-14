import { TYPES_CHAMP } from '../sites/formulaire';
import { navigation, pageSite, theme } from '../sites/schemas';
import { z } from '../zod';
import { horodatage, id, schemaVersion } from './commun';

/** Champ du formulaire de contact (constructeur Site Pro). */
export const champFormulaire = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_]{1,40}$/),
  type: z.enum(TYPES_CHAMP),
  libelle: z.string().trim().min(1).max(80),
  requis: z.boolean(),
  options: z.array(z.string().max(80)).max(20).optional(),
});

/** `sites/{siteId}` (siteId = artisanId), écrit par le serveur seulement (DATABASE §15 bis). */
export const siteArtisan = z.object({
  schemaVersion,
  artisanId: id,
  offre: z.enum(['gratuit', 'site_pro']),
  sousDomaine: z.string().regex(/^[a-z0-9-]{3,40}$/),
  theme,
  versionPubliee: z.number().int().nonnegative(),
  derniereVersion: z.number().int().nonnegative().optional(),
  /** Site Pro : champs du formulaire (gratuit : 4 champs figés). */
  formulaire: z
    .object({
      champs: z.array(champFormulaire).max(30),
    })
    .optional(),
  publieLe: horodatage.optional(),
  brouillonModifieLe: horodatage,
  createdAt: horodatage,
  updatedAt: horodatage,
});

/** `sites/{id}/pages/{pageId}` : brouillon de la page (900 Ko maximum). */
export const pageSiteDoc = pageSite.extend({ schemaVersion, updatedAt: horodatage });

/** `sites/{id}/reglages/navigation` : composant global, enregistré à part (SITE-11). */
export const navigationSiteDoc = navigation.extend({ schemaVersion, enregistreeLe: horodatage });

/** `sites/{id}/versions/{n}` : instantané publié, ajout seul, 20 derniers gardés. */
export const versionSite = z.object({
  schemaVersion,
  n: z.number().int().positive(),
  theme,
  navigation,
  pages: z.record(z.string(), pageSite),
  publiePar: id,
  publieLe: horodatage,
  liensVerifies: z.literal(true),
});

/** `sitesSlugs/{slug}` et `sitesDomaines/{hote}` : index d'unicité → site. */
export const indexSite = z.object({ schemaVersion, siteId: id, createdAt: horodatage });
