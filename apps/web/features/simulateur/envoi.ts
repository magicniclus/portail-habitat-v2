import type { DemandeCreee } from '@ph/core/demandes';
import type { BrouillonParcours } from '@ph/core/parcours';
import type { EntreeDemande } from '@ph/core/schemas';
import { signalerConversion } from '@ph/tracker';
import { posterJson } from '@/lib/posterJson';

/**
 * Envoi de la demande : la requête ne contient aucun montant (SIM-08) ; l'estimation vient de la
 * réponse. Une demande créée est l'objectif de la page (mesure du comportement).
 */
export async function envoyerDemande(
  entree: Omit<EntreeDemande, 'delaiSouhaite'> & { delaiSouhaite?: EntreeDemande['delaiSouhaite'] },
) {
  const r = await posterJson<DemandeCreee>('/api/demandes', entree);
  if (r.ok) signalerConversion('demande');
  return r;
}

/** « M'envoyer un lien pour reprendre plus tard » : brouillon sans coordonnées + email. */
export const demanderLienReprise = (brouillon: BrouillonParcours, email: string) =>
  posterJson<{ brouillonId: string }>('/api/parcours/lien', { brouillon, email });

/** Ouverture d'un lien de reprise reçu par email (usage unique). */
export const ouvrirLienReprise = (jeton: string) =>
  posterJson<BrouillonParcours>('/api/parcours/reprise', { jeton });
