/**
 * Précharge les schémas de validation (Zod) dès que le visiteur entre dans un formulaire : ils
 * restent hors du premier chargement de la page, et l'envoi n'attend pas leur téléchargement.
 */
export const prechargerValidation = () => void import('@ph/core/schemas');
