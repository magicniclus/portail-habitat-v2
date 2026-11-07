import { messageErreur, type CodeErreur } from './erreurs';

/** Forme unique de toute réponse d'action serveur ou de Function appelable. */
export type Resultat<T> =
  | { ok: true; data: T }
  | { ok: false; code: CodeErreur; message: string; champs?: Record<string, string[]> };

export function succes<T>(data: T): Resultat<T> {
  return { ok: true, data };
}

export function echec(
  code: CodeErreur,
  options: { message?: string; champs?: Record<string, string[]> } = {},
): Resultat<never> {
  const r: Resultat<never> = { ok: false, code, message: options.message ?? messageErreur(code) };
  return options.champs ? { ...r, champs: options.champs } : r;
}
