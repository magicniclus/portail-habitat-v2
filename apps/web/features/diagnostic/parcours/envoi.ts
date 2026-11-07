import type { DossierCree } from '@ph/firebase/demandes';
import { posterJson } from '@/lib/posterJson';

/** Envoi du parcours : aucun montant dans la requête ; le budget vient de la réponse (DIA-06). */
export const envoyerDossier = (corps: unknown) =>
  posterJson<DossierCree>('/api/diagnostics', corps);
