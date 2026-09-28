import type { DemandeCreee } from '@ph/core/demandes';
import { messageErreur } from '@ph/core/erreurs';
import type { Resultat } from '@ph/core/resultat';
import type { EntreeDemande } from '@ph/core/schemas';

/** Envoi de la demande : la requête ne contient aucun montant (SIM-08) ; l'estimation vient de la réponse. */
export async function envoyerDemande(
  entree: Omit<EntreeDemande, 'delaiSouhaite'> & { delaiSouhaite?: EntreeDemande['delaiSouhaite'] },
): Promise<Resultat<DemandeCreee>> {
  try {
    const r = await fetch('/api/demandes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(entree),
    });
    const corps = (await r.json().catch(() => null)) as Resultat<DemandeCreee> | null;
    return corps ?? { ok: false, code: 'INDISPONIBLE', message: messageErreur('INDISPONIBLE') };
  } catch {
    return { ok: false, code: 'INDISPONIBLE', message: messageErreur('INDISPONIBLE') };
  }
}
