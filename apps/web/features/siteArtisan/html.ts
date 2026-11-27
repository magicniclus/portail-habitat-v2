/** Échappement HTML : tout texte de l'artisan passe par ici avant d'entrer dans la page. */
export const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Image en CSS (`url("…")`) : l'adresse est gardée telle quelle (les liens Firebase Storage sont
 * déjà encodés : `encodeURI` les casserait), seuls les caractères qui fermeraient la valeur sont
 * encodés.
 */
export const urlCss = (u: string) => `url("${u.replace(/["\\\n\r]/g, encodeURIComponent)}")`;
