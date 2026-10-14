import { navigation, pageSite, theme } from '../sites/schemas';
import { z } from '../zod';
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
export const entreeNavigationSite = z.object({ navigation });
export const entreeThemeSite = z.object({ theme });
export const entreeChampsSite = z.object({ champs: z.array(champFormulaire).min(1).max(30) });
export const entreeVersionSite = z.object({ version: z.number().int().positive() });
export const entreePublierSite = z.object({});
