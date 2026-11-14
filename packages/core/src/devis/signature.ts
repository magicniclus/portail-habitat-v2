/**
 * Signature en ligne d'un devis par le client (DATABASE §8 bis : `signature: { nom, ip, le,
 * hashPdf }`) : signature électronique simple, « Bon pour accord » sur le PDF envoyé.
 */
export function signatureDevis(
  d: { statut: string; signatureElectronique: boolean; validiteLe?: Date },
  maintenant: number,
): { possible: true } | { possible: false; raison: string } {
  if (d.statut === 'accepte') return { possible: false, raison: 'Ce devis a déjà été accepté.' };
  if (
    d.statut === 'expire' ||
    (d.statut === 'envoye' && d.validiteLe && d.validiteLe.getTime() < maintenant)
  )
    return {
      possible: false,
      raison: 'Ce devis n’est plus valable : demandez-en un nouveau à l’artisan.',
    };
  if (d.statut !== 'envoye')
    return { possible: false, raison: 'Ce devis ne peut plus être accepté en ligne.' };
  if (!d.signatureElectronique)
    return {
      possible: false,
      raison: 'Ce devis se signe sur papier : renvoyez-le daté et signé avec « Bon pour accord ».',
    };
  return { possible: true };
}
