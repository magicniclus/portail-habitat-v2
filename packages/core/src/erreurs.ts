/**
 * Codes d'erreur centralisés. L'interface affiche `message` sans le réécrire ;
 * `http` sert aux Route Handlers, `callable` aux Functions (codes HttpsError).
 */
export const CODES_ERREUR = {
  ENTREE_INVALIDE: {
    message: 'Certaines informations sont incorrectes. Vérifiez le formulaire.',
    http: 400,
    callable: 'invalid-argument',
  },
  NON_AUTHENTIFIE: { message: 'Connectez-vous pour continuer.', http: 401, callable: 'unauthenticated' },
  APP_CHECK_INVALIDE: {
    message: 'Votre navigateur n’a pas pu être vérifié. Rechargez la page.',
    http: 401,
    callable: 'unauthenticated',
  },
  PERMISSION_REFUSEE: {
    message: 'Vous n’avez pas les droits nécessaires pour cette action.',
    http: 403,
    callable: 'permission-denied',
  },
  INTROUVABLE: { message: 'L’élément demandé est introuvable.', http: 404, callable: 'not-found' },
  CONFLIT: {
    message: 'Cette action a déjà été effectuée ou les données ont changé. Rechargez la page.',
    http: 409,
    callable: 'aborted',
  },
  PRECONDITION: {
    message: 'Cette action n’est pas possible pour le moment.',
    http: 412,
    callable: 'failed-precondition',
  },
  TROP_DE_REQUETES: {
    message: 'Trop de tentatives. Réessayez dans quelques minutes.',
    http: 429,
    callable: 'resource-exhausted',
  },
  INDISPONIBLE: {
    message: 'Service momentanément indisponible. Réessayez dans un instant.',
    http: 503,
    callable: 'unavailable',
  },
  INTERNE: {
    message: 'Une erreur inattendue est survenue. Nous avons été prévenus.',
    http: 500,
    callable: 'internal',
  },
} as const satisfies Record<string, { message: string; http: number; callable: string }>;

export type CodeErreur = keyof typeof CODES_ERREUR;

export function messageErreur(code: CodeErreur): string {
  return CODES_ERREUR[code].message;
}

/** Erreur prévue par le métier : levée dans un traitement, renvoyée telle quelle au client. */
export class ErreurMetier extends Error {
  override readonly name = 'ErreurMetier';
  constructor(
    readonly code: CodeErreur,
    message: string = messageErreur(code),
  ) {
    super(message);
  }
}

export function estErreurMetier(e: unknown): e is ErreurMetier {
  return e instanceof ErreurMetier;
}
