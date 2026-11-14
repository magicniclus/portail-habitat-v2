import { CATEGORIES_OBLIGATOIRES, definition, type Categorie, type NomModele } from './catalogue';

export type Canal = 'email' | 'sms' | 'inapp';

/** `users/{uid}.preferences.notifs` (surchargé par entreprise dans `membres/{uid}.notifs`). */
export type Preferences = Partial<
  Record<
    Exclude<Categorie, 'securite' | 'transactionnel' | 'interne'>,
    Partial<Record<Canal, boolean>>
  >
>;

export type DecisionCanal = 'envoyer' | 'bloque_preferences' | 'bloque_suppression' | 'non_prevu';

export interface ContexteDecision {
  preferences?: Preferences;
  /** Adresse dans `suppressions/` (rebond définitif ou plainte). */
  emailSupprime?: boolean;
  /** Un email de sécurité est déjà passé une fois malgré la liste de blocage. */
  securiteDejaForcee?: boolean;
  /** SMS demandé par le destinataire pour ce type d'événement (ex. nouvelle demande). */
  telephone?: boolean;
}

/** Valeurs par défaut quand la personne n'a rien réglé (EMAILS §2). */
const PAR_DEFAUT: Record<string, Record<Canal, boolean>> = {
  activite: { email: true, sms: false, inapp: true },
  relance: { email: true, sms: false, inapp: true },
  offres_pro: { email: true, sms: false, inapp: true },
  marketing: { email: false, sms: false, inapp: false },
};

/**
 * Canaux à utiliser pour un envoi : sécurité et transactionnel impossibles à couper, liste de blocage
 * respectée (un email de sécurité passe une seule fois), SMS seulement pour les modèles prévus.
 */
export function deciderCanaux(
  nom: NomModele,
  c: ContexteDecision = {},
): Record<Canal, DecisionCanal> {
  const d = definition(nom);
  const obligatoire = CATEGORIES_OBLIGATOIRES.includes(d.categorie);
  const pref = (canal: Canal) =>
    obligatoire ||
    (c.preferences?.[d.categorie as keyof Preferences]?.[canal] ?? PAR_DEFAUT[d.categorie]![canal]);

  let email: DecisionCanal = pref('email') ? 'envoyer' : 'bloque_preferences';
  if (email === 'envoyer' && c.emailSupprime)
    email = d.categorie === 'securite' && !c.securiteDejaForcee ? 'envoyer' : 'bloque_suppression';

  let sms: DecisionCanal = 'non_prevu';
  if (d.sms && c.telephone)
    sms =
      d.categorie === 'securite' || d.categorie === 'transactionnel'
        ? 'envoyer'
        : pref('sms')
          ? 'envoyer'
          : 'bloque_preferences';
  // Nouvelle demande : SMS seulement si l'artisan l'a activé (préférence activite.sms).
  if (nom === 'nouvelle-demande' && sms === 'envoyer' && !c.preferences?.activite?.sms)
    sms = 'bloque_preferences';

  const inapp: DecisionCanal = d.inapp
    ? pref('inapp')
      ? 'envoyer'
      : 'bloque_preferences'
    : 'non_prevu';
  return { email, sms, inapp };
}

/** Clé d'idempotence (EMAILS §1) : `modele:refObjet:destinataire[:variante]`. */
export function cleIdempotence(
  nom: NomModele,
  refObjet: string,
  destinataire: string,
  variante?: string,
) {
  return [nom, refObjet, destinataire, ...(variante ? [variante] : [])].join(':');
}

const PARIS = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
});

function heureParis(d: Date): { h: number; m: number; jour: string } {
  const p = Object.fromEntries(PARIS.formatToParts(d).map((x) => [x.type, x.value]));
  return { h: Number(p.hour), m: Number(p.minute), jour: String(p.weekday) };
}

/** Prochain instant à `heure` h, heure de Paris, strictement après `d` si `d` a dépassé cette heure. */
function prochaineHeure(d: Date, heure: number): Date {
  const { h, m } = heureParis(d);
  let minutes = (heure - h) * 60 - m;
  if (minutes <= 0) minutes += 24 * 60;
  return new Date(Math.floor(d.getTime() / 60_000) * 60_000 + minutes * 60_000);
}

/** Heures calmes : aucun SMS entre 21 h et 8 h (heure de Paris), sauf les codes (§2). */
export function instantSms(nom: NomModele, d: Date): Date {
  if (definition(nom).categorie === 'securite') return d;
  const { h } = heureParis(d);
  return h >= 21 || h < 8 ? prochaineHeure(d, 8) : d;
}

export interface HistoriqueEnvois {
  /** Envois non transactionnels déjà faits ou prévus aujourd'hui (heure de Paris). */
  nonTransactionnelsAujourdhui: number;
  /** Envois `offres_pro` sur les 7 derniers jours. */
  offresPro7j: number;
}

/**
 * Limites de pression (EMAILS §6) : 1 email non transactionnel par jour, `offres_pro` 2 par semaine et
 * jamais le week-end. Renvoie l'instant d'envoi (éventuellement reporté) ou `null` s'il faut l'abandonner.
 */
export function planifierEnvoi(nom: NomModele, voulu: Date, h: HistoriqueEnvois): Date | null {
  const { categorie } = definition(nom);
  if (CATEGORIES_OBLIGATOIRES.includes(categorie)) return voulu;
  if (categorie === 'offres_pro') {
    if (h.offresPro7j >= 2) return null;
    let d = voulu;
    while (['sam.', 'dim.'].includes(heureParis(d).jour)) d = prochaineHeure(d, 9);
    if (d !== voulu) return d;
  }
  return h.nonTransactionnelsAujourdhui >= 1 ? prochaineHeure(voulu, 9) : voulu;
}
