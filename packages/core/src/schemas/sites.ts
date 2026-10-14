import { STATUTS_DOMAINE, type StatutDomaine } from '../sites/domaines';
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

/** Domaine personnel du site (DOMAINES §5), écrit par le serveur seulement. */
export const domaineSite = z.object({
  nom: z.string().max(253),
  mode: z.enum(['achat', 'connexion']),
  statut: z.enum(Object.keys(STATUTS_DOMAINE) as [StatutDomaine, ...StatutDomaine[]]),
  principal: z.enum(['www', 'apex']),
  token: z.string().length(24),
  enregistrements: z
    .array(
      z.object({
        type: z.enum(['A', 'CNAME', 'TXT']),
        nom: z.string().max(253),
        valeur: z.string().max(500),
        etat: z.enum(['en_attente', 'ok', 'incorrect']),
        trouve: z.string().max(500).optional(),
        verifieLe: horodatage.optional(),
      }),
    )
    .max(10),
  /** Prochaine vérification planifiée ; absente quand il n'y a plus rien à vérifier. */
  prochaineVerifLe: horodatage.optional(),
  derniereVerifLe: horodatage.optional(),
  creeLe: horodatage,
  activeLe: horodatage.optional(),
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
  domaine: domaineSite.optional(),
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
