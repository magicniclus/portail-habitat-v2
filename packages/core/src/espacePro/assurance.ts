/**
 * Fin de l'attestation décennale (EMAILS `assurance-expire`, INTEGRATIONS §3) : rappels à J-30,
 * J-7 et J0 ; à l'échéance, la fiche n'est plus visible jusqu'au dépôt d'une nouvelle attestation.
 */
const J = 86_400_000;
export type PalierAssurance = 'j30' | 'j7' | 'j0';

export function echeanceDecennale(
  expireLe: number,
  maintenant: number,
  envoyes: Partial<Record<PalierAssurance, boolean>>,
): { palier: PalierAssurance; suspendre: boolean } | null {
  const reste = expireLe - maintenant;
  const palier: PalierAssurance | null =
    reste <= 0 ? 'j0' : reste <= 7 * J ? 'j7' : reste <= 30 * J ? 'j30' : null;
  if (!palier || envoyes[palier]) return null;
  return { palier, suspendre: palier === 'j0' };
}

export function messageEcheance(palier: PalierAssurance, date: string): string {
  return palier === 'j0'
    ? `Votre attestation décennale a expiré le ${date} : votre fiche n’est plus visible et vous ne recevez plus de demandes. Envoyez la nouvelle attestation pour la remettre en ligne.`
    : `Votre attestation décennale expire le ${date}. Envoyez la nouvelle dès que possible : sans elle, votre fiche ne sera plus visible.`;
}
