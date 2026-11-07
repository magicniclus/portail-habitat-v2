/** Invitation à installer l'application pro (MOBILE §9) : à partir de la 2e visite, jamais si refusée. */
export type ModeInstallation = 'bouton' | 'guide-ios' | null;

export function modeInstallation(p: {
  visites: number;
  autonome: boolean;
  refusee: boolean;
  invitePossible: boolean;
  userAgent: string;
}): ModeInstallation {
  if (p.autonome || p.refusee || p.visites < 2) return null;
  if (p.invitePossible) return 'bouton';
  const ios = /iPhone|iPad|iPod/.test(p.userAgent);
  const safari = /Safari\//.test(p.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(p.userAgent);
  return ios && safari ? 'guide-ios' : null;
}
