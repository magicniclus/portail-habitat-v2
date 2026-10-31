import { z } from '../zod';

/**
 * Suivi publicitaire du site (balise Google : Analytics 4, Google Ads ou Tag Manager ; pixel
 * Meta) : seulement des identifiants vérifiés, jamais de code collé. Les scripts ne se chargent
 * qu'après l'accord du visiteur (bandeau de consentement, CNIL) ; sans identifiant, le site reste
 * sans cookie (SITE-07).
 */
const RE_GOOGLE = /^(?:(?:G|GT|AW)-[A-Z0-9]{4,20}|GTM-[A-Z0-9]{4,12})$/;
const RE_ADS = /^AW-\d{6,14}\/[\w-]{4,40}$/;
const RE_META = /^\d{10,20}$/;

const champ = (re: RegExp, message: string, majuscules = false) =>
  z
    .string()
    .trim()
    .max(80)
    .transform((v) => (majuscules ? v.toUpperCase() : v))
    .refine((v) => v === '' || re.test(v), message);

export const entreeSuivi = z.object({
  google: champ(RE_GOOGLE, 'Identifiant Google : G-…, AW-…, GT-… ou GTM-…', true),
  /** Conversion Google Ads envoyée à chaque demande : « AW-123456789/AbCdEf ». */
  conversionAds: champ(RE_ADS, 'Conversion Google Ads : AW-123456789/libellé'),
  meta: champ(RE_META, 'Identifiant du pixel Meta : 10 à 20 chiffres'),
  evenements: z.object({
    /** Formulaire envoyé : generate_lead (Google), Lead (Meta), conversion Ads. */
    demande: z.boolean(),
    /** Clic sur un numéro de téléphone : contact (Google), Contact (Meta). */
    appel: z.boolean(),
  }),
});
export type SuiviSite = z.output<typeof entreeSuivi>;

export const SUIVI_VIDE: SuiviSite = {
  google: '',
  conversionAds: '',
  meta: '',
  evenements: { demande: true, appel: true },
};

export const suiviActif = (s: SuiviSite | undefined): s is SuiviSite =>
  Boolean(s && (s.google || s.meta));

/** Ce que lit le script du site (en JSON dans la page) ; `null` si aucun suivi. */
export function configSuivi(s: SuiviSite | undefined) {
  if (!suiviActif(s)) return null;
  return {
    ...(s.google.startsWith('GTM-') ? { gtm: s.google } : s.google ? { gtag: s.google } : {}),
    ...(s.conversionAds ? { ads: s.conversionAds } : {}),
    ...(s.meta ? { meta: s.meta } : {}),
    demande: s.evenements.demande,
    appel: s.evenements.appel,
  };
}
