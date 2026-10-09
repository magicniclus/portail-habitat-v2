/**
 * Compte particulier inactif (DATABASE §14) : supprimé après 3 ans sans activité, toujours après
 * un avertissement (`compte-inactif`) envoyé 30 jours avant. Un retour annule l'avertissement.
 */
const J = 86_400_000;
const CONSERVATION = 1095 * J;
const PREAVIS = 30 * J;

export function decisionInactivite(
  derniereActivite: number,
  maintenant: number,
  avertiLe?: number,
): 'avertir' | 'supprimer' | null {
  const inactif = maintenant - derniereActivite;
  if (inactif < CONSERVATION - PREAVIS) return null;
  const avertiValable = avertiLe !== undefined && avertiLe > derniereActivite;
  if (!avertiValable) return 'avertir';
  return maintenant - avertiLe >= PREAVIS ? 'supprimer' : null;
}
