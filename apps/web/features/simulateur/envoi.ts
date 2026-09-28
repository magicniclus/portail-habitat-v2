import type { DemandeCreee } from '@ph/core/demandes';
import { messageErreur } from '@ph/core/erreurs';
import type { BrouillonParcours } from '@ph/core/parcours';
import type { Resultat } from '@ph/core/resultat';
import type { EntreeDemande } from '@ph/core/schemas';

async function posterJson<R>(url: string, corps: unknown): Promise<Resultat<R>> {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corps),
    });
    const res = (await r.json().catch(() => null)) as Resultat<R> | null;
    return res ?? { ok: false, code: 'INDISPONIBLE', message: messageErreur('INDISPONIBLE') };
  } catch {
    return { ok: false, code: 'INDISPONIBLE', message: messageErreur('INDISPONIBLE') };
  }
}

/** Envoi de la demande : la requête ne contient aucun montant (SIM-08) ; l'estimation vient de la réponse. */
export const envoyerDemande = (
  entree: Omit<EntreeDemande, 'delaiSouhaite'> & { delaiSouhaite?: EntreeDemande['delaiSouhaite'] },
) => posterJson<DemandeCreee>('/api/demandes', entree);

/** « M'envoyer un lien pour reprendre plus tard » : brouillon sans coordonnées + email. */
export const demanderLienReprise = (brouillon: BrouillonParcours, email: string) =>
  posterJson<{ brouillonId: string }>('/api/parcours/lien', { brouillon, email });

/** Ouverture d'un lien de reprise reçu par email (usage unique). */
export const ouvrirLienReprise = (jeton: string) =>
  posterJson<BrouillonParcours>('/api/parcours/reprise', { jeton });
