/**
 * À placer dans `<head>` : masque le bandeau avant le premier affichage quand un choix est enregistré
 * (sinon le bandeau apparaîtrait après l'hydratation et deviendrait l'élément LCP). La validité exacte
 * (6 mois) est vérifiée ensuite par le composant.
 */
export const SCRIPT_BANDEAU_COOKIES =
  "try{if(/(^|; )ph_consentement=/.test(document.cookie))document.documentElement.setAttribute('data-cookies-choisis','')}catch(e){}";
