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
  /** Domaine actif dont le DNS ne pointe plus vers nous (DOM-06 : `casse` après 3 jours). */
  incorrectDepuis: horodatage.optional(),
  /** Rappel « 24 h sans DNS » déjà envoyé (une seule fois). */
  rappelAttenteLe: horodatage.optional(),
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

/**
 * `sites/{id}/statsJour/{AAAA-MM-JJ}` et `sites/{id}/statsMois/{AAAA-MM}` : compteurs anonymes
 * (aucun cookie, aucune IP, aucun identifiant de visiteur), écrits par le serveur seulement.
 */
export const statsSite = z.object({
  schemaVersion,
  vues: z.number().int().nonnegative().default(0),
  demandes: z.number().int().nonnegative().default(0),
  pages: z.record(z.string().max(40), z.number().int().nonnegative()).default({}),
});

/** `sites/{id}/ia/{AAAA-MM|essai}` : crédits IA consommés (réservés avant l'appel, rendus si échec). */
export const compteurIaSite = z.object({
  schemaVersion,
  creation: z.number().int().nonnegative().optional(),
  /** Aperçu gratuit de l'accueil (une fois, D48 ⏳). */
  apercu: z.number().int().nonnegative().optional(),
  composants: z.number().int().nonnegative().optional(),
  textes: z.number().int().nonnegative().optional(),
  /** Articles du blog rédigés entièrement par l'IA (D66). */
  blogArticles: z.number().int().nonnegative().optional(),
});

/** `sites/{id}/iaSessions/{id}` : proposition de l'IA (jamais appliquée ni publiée par le serveur). */
export const sessionIaSite = z.object({
  schemaVersion,
  uid: id,
  mode: z.string().max(20),
  portee: z.string().max(20),
  demande: z.string().max(2000),
  resume: z.string().max(2000),
  question: z.string().max(500),
  operations: z.array(z.unknown()).max(400),
  avertissements: z.array(z.string()).max(50),
  modele: z.string(),
  versionPrompt: z.string(),
  coutCentimes: z.number().int().nonnegative(),
  createdAt: horodatage,
});

/** `sites/{id}/iaCreation/courante` : création assistée (réponses gardées pour la reprise). */
export const creationIaSite = z.object({
  schemaVersion,
  statut: z.enum(['en_cours', 'apercu', 'attente_paiement', 'terminee']),
  reponses: z.record(z.string(), z.unknown()),
  fiche: z.record(z.string(), z.unknown()),
  plan: z.array(
    z.object({
      cle: z.string(),
      nom: z.string(),
      remplace: z.string().optional(),
      consigne: z.string(),
    }),
  ),
  faites: z.array(z.string()),
  apercu: z.array(z.unknown()).optional(),
  avantIa: id.optional(),
  coutCentimes: z.number().int().nonnegative().optional(),
  versionPrompt: z.string().optional(),
  updatedAt: horodatage,
});

/** `sites/{id}/modeles/{id}` : site complet enregistré (Mes modèles, « Avant IA – date »). */
export const modeleSite = z.object({
  schemaVersion,
  nom: z.string().max(120),
  type: z.enum(['avant_ia', 'artisan']),
  pages: z.record(z.string(), pageSite),
  navigation: navigation.nullable(),
  theme: theme.nullable(),
  createdAt: horodatage,
});
