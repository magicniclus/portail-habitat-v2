/** Mon compte (maquette Mon Compte, EMAILS §1–2) : préférences, second facteur, appareil. */

export const CANAUX_NOTIF = ['email', 'sms', 'inapp'] as const;
export type CanalNotif = (typeof CANAUX_NOTIF)[number];
export const LIBELLES_CANAL: Record<CanalNotif, string> = {
  email: 'Email',
  sms: 'SMS',
  inapp: 'Dans l’app',
};

export type Canaux = Record<CanalNotif, boolean>;
export type CategorieNotif = 'activite' | 'relance' | 'offres_pro' | 'marketing';
export type PreferencesNotifs = Record<CategorieNotif, Canaux>;
export interface NotifsEntreprise {
  demandes: boolean;
  avis: boolean;
  factures: boolean;
}

/**
 * Lignes personnelles du tableau : le SMS ne sert qu'à l'activité (EMAILS §1, « nouvelle demande ») ;
 * offres et actualités ne partent que par email.
 */
export const LIGNES_NOTIFS: readonly {
  cle: CategorieNotif;
  libelle: string;
  description: string;
  canaux: readonly CanalNotif[];
}[] = [
  {
    cle: 'activite',
    libelle: 'Activité',
    description: 'Messages des clients, appels d’offres de la zone, rapport hebdomadaire',
    canaux: ['email', 'sms', 'inapp'],
  },
  {
    cle: 'relance',
    libelle: 'Rappels',
    description: 'Fiche incomplète, penser à demander un avis',
    canaux: ['email', 'inapp'],
  },
  {
    cle: 'offres_pro',
    libelle: 'Offres Portail Habitat Pro',
    description: 'Conseils et offres pour développer votre activité',
    canaux: ['email'],
  },
  {
    cle: 'marketing',
    libelle: 'Actualités',
    description: 'Nouveautés de Portail Habitat Pro',
    canaux: ['email'],
  },
];

/** Lignes propres à l'entreprise active (`membres/{uid}.notifs`, COMPTES §1). */
export const LIGNES_NOTIFS_ENTREPRISE: readonly {
  cle: keyof NotifsEntreprise;
  libelle: string;
  description: string;
}[] = [
  {
    cle: 'demandes',
    libelle: 'Nouvelles demandes',
    description: 'Dès qu’une demande vous est proposée',
  },
  { cle: 'avis', libelle: 'Nouveaux avis', description: 'Pour y répondre rapidement' },
  {
    cle: 'factures',
    libelle: 'Factures et reçus',
    description: 'Une copie de chaque facture de l’entreprise',
  },
];

const tous = (v: boolean): Canaux => ({ email: v, sms: v, inapp: v });

/** Préférences d'un pro sans réglage : offres pro activées, actualités désactivées (EMAILS §2). */
export const PREFERENCES_PRO_DEFAUT: PreferencesNotifs = normaliserNotifs({
  activite: tous(true),
  relance: tous(true),
  offres_pro: tous(true),
  marketing: tous(false),
});

/** Coupe les canaux qu'une catégorie n'utilise pas. */
export function normaliserNotifs(p: PreferencesNotifs): PreferencesNotifs {
  return Object.fromEntries(
    LIGNES_NOTIFS.map((l) => [
      l.cle,
      Object.fromEntries(CANAUX_NOTIF.map((c) => [c, l.canaux.includes(c) && p[l.cle][c]])),
    ]),
  ) as unknown as PreferencesNotifs;
}

/** Entrées du journal des consentements quand les actualités ou les offres pro changent. */
export function consentementsNotifs(
  avant: PreferencesNotifs,
  apres: PreferencesNotifs,
): { type: 'marketing_email' | 'opposition_offres_pro'; valeur: boolean }[] {
  const r: { type: 'marketing_email' | 'opposition_offres_pro'; valeur: boolean }[] = [];
  if (avant.marketing.email !== apres.marketing.email)
    r.push({ type: 'marketing_email', valeur: apres.marketing.email });
  if (avant.offres_pro.email !== apres.offres_pro.email)
    r.push({ type: 'opposition_offres_pro', valeur: !apres.offres_pro.email });
  return r;
}

export interface FacteurResume {
  type: 'totp' | 'sms';
  /** Déjà masqué par le serveur (« 06 12 •• •• 48 », `masquerTel`). */
  telephoneMasque?: string;
}

/** Ligne « Double authentification » : méthodes enregistrées, numéro masqué. */
export function resumeDeuxFacteurs(facteurs: readonly FacteurResume[]): string {
  const totp = facteurs.some((f) => f.type === 'totp');
  const sms = facteurs.find((f) => f.type === 'sms');
  const numero = sms?.telephoneMasque ? ` au ${sms.telephoneMasque}` : '';
  if (totp && sms) return `Application d’authentification (TOTP) · SMS de secours${numero}`;
  if (totp) return 'Application d’authentification (TOTP)';
  if (sms) return `Code par SMS${numero}`;
  return 'Un code en plus du mot de passe à chaque nouvelle connexion';
}

const NAVIGATEURS: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/Firefox\/|FxiOS/, 'Firefox'],
  [/SamsungBrowser/, 'Samsung Internet'],
  [/Chrome\/|CriOS/, 'Chrome'],
  [/Safari\//, 'Safari'],
];
const SYSTEMES: [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'Mac'],
  [/Linux/, 'Linux'],
];

/** « Chrome sur Mac » à partir de l'en-tête User-Agent (rien n'est enregistré). */
export function decrireAppareil(ua: string): string {
  const nav = NAVIGATEURS.find(([r]) => r.test(ua))?.[1];
  const sys = SYSTEMES.find(([r]) => r.test(ua))?.[1];
  if (!nav && !sys) return 'Navigateur inconnu';
  return [nav ?? 'Navigateur', sys].filter(Boolean).join(' sur ');
}
