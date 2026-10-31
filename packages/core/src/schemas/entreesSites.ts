import { reponsesCreation } from '../sites/ia/creation';
import { MODES_IA_SITE } from '../sites/ia/reglages';
import { navigation, pageSite, section, theme } from '../sites/schemas';
import { entreeSuivi } from '../sites/suivi';
import { z } from '../zod';
import { nomFichier } from './entreesPro';
import { champFormulaire } from './sites';

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

/** Sous-domaine saisi (règles détaillées par `erreurSousDomaine`, côté client et serveur). */
const sousDomaine = z.string().trim().toLowerCase().max(40);
const idPage = z.string().regex(/^[a-z0-9_-]{1,40}$/);

/** Actions de l'éditeur et du tableau de bord du site (SITE_INTERNET §3-4). */
export const entreeCreerSite = z.object({ sousDomaine });
export const entreeSousDomaine = z.object({ sousDomaine });
export const entreePageSite = z.object({ pageId: idPage, page: pageSite });
export const entreeSupprimerPage = z.object({ pageId: idPage });
export const entreeReglagePage = z.object({
  pageId: idPage,
  menu: z.boolean().optional(),
  statut: z.enum(['brouillon', 'publiee']).optional(),
});
export const entreeNavigationSite = z.object({ navigation });
export const entreeThemeSite = z.object({ theme });
/** Balise Google et pixel Meta (onglet « Suivi et publicité »). */
export const entreeSuiviSite = z.object({ suivi: entreeSuivi });
export const entreeChampsSite = z.object({ champs: z.array(champFormulaire).min(1).max(30) });
export const entreeVersionSite = z.object({ version: z.number().int().positive() });
export const entreePublierSite = z.object({});

/**
 * Image (ou PDF à télécharger, `usage: 'fichier'`) importée dans la médiathèque du site, déposée
 * dans Storage puis vérifiée ici.
 */
export const entreeMediaSite = z.strictObject({
  nomFichier,
  usage: z.enum(['image', 'fichier']).optional(),
  /** Nom affiché d'un fichier (« Nos tarifs 2026 »). */
  nom: z.string().trim().min(1).max(120).optional(),
});

/** « Mes sections » (SITE_INTERNET §4.7) : enregistrer une section, la supprimer, ou les lire. */
export const entreeSectionEnregistree = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('lire') }),
  z.strictObject({
    action: z.literal('enregistrer'),
    nom: z.string().trim().min(1).max(60),
    section,
  }),
  z.strictObject({ action: z.literal('supprimer'), id: z.string().min(1).max(60) }),
]);
/** Domaine existant saisi par l'artisan (normalisé ensuite par `normaliserDomaine`). */
export const entreeDomaineSite = z.object({ domaine: z.string().trim().min(3).max(253) });
/** Adresse à placer sur la carte d'un site (élément Carte). */
export const entreeGeocoderSite = z.object({ adresse: z.string().trim().min(3).max(300) });
/** Recherche d'un domaine à acheter (DOMAINES §3) : vide → suggestions depuis le nom commercial. */
export const entreeRechercheDomaine = z.object({ requete: z.string().trim().max(63).optional() });

/** Demande à l'IA du site (IA_SITE §5) ; mode et portée choisis dans le panneau IA. */
export const entreeIaSite = z.object({
  /** Absent : le routeur choisit (IA_SITE §1). */
  mode: z.enum(MODES_IA_SITE).optional(),
  portee: z.enum(['selection', 'page', 'site']),
  pageId: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  cibles: z.array(z.string().max(60)).max(20),
  demande: z.string().trim().min(3).max(1000),
  reponse: z.string().trim().max(500).optional(),
});

/** Création assistée : réponses au questionnaire, puis une page à la fois. */
export const entreeCreationIa = z.object({ reponses: reponsesCreation });
export const entreePageCreationIa = z.object({ cle: z.string().regex(/^[a-z0-9-]{1,60}$/) });
