import { posterJson } from '@/lib/posterJson';

/** Statuts d'un devis qui peut devenir une facture (envoyé : accepté d'abord, en un clic). */
export const peutDevenirFacture = (statut: string, factureId?: string) =>
  !factureId && ['envoye', 'accepte'].includes(statut);

/**
 * « Transformer en facture » : un devis envoyé est d'abord marqué accepté (le client a dit oui),
 * puis la facture est émise côté serveur (numéro sans trou, mentions vérifiées, PDF figé).
 */
export async function transformerEnFacture(
  devisId: string,
  statut: string,
): Promise<{ ok: true; factureId: string } | { ok: false; message: string }> {
  // Devis envoyé : accepté d'abord. Un refus ici (déjà accepté entre-temps, page pas encore
  // rafraîchie) n'arrête rien : l'émission de la facture revérifie le statut côté serveur.
  if (statut === 'envoye')
    await posterJson('/api/pro/devis/statut', { devisId, statut: 'accepte' });
  const r = await posterJson<{ factureId: string }>('/api/pro/devis/facturer', {
    devisId,
    type: 'facture',
    cleIdempotence: `facture-${devisId}-${Date.now()}`,
  });
  return r.ok ? { ok: true, factureId: r.data.factureId } : { ok: false, message: r.message };
}
