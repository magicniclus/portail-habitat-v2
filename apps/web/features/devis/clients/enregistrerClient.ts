import { posterJson } from '@/lib/posterJson';
import type { EtatDevis } from '../etat';

/**
 * « Enregistrer ce client dans ma base » coché : la fiche est créée avant le document, qui garde
 * son lien. Renvoie l'identifiant (ou celui déjà lié), sinon le message d'erreur.
 */
export async function enregistrerClientSiDemande(
  e: EtatDevis,
): Promise<{ clientId?: string } | { erreur: string }> {
  if (e.clientId || !e.enregistrerClient || !e.client.nom.trim())
    return e.clientId ? { clientId: e.clientId } : {};
  const c = e.client;
  const fiche = Object.fromEntries(
    Object.entries({
      nom: c.nom,
      typeClient: e.typeClient,
      adresse: c.adresse,
      email: c.email,
      tel: c.tel,
      complement: c.complement,
      codePostal: c.codePostal,
      ville: c.ville,
      pays: c.pays,
      ...(e.typeClient === 'pro'
        ? { sirenClient: e.sirenClient, tvaIntraClient: e.tvaIntraClient }
        : {}),
    }).filter(([, v]) => typeof v === 'string' && v.trim() !== ''),
  );
  const r = await posterJson<{ id: string }>('/api/pro/clients', { action: 'creer', ...fiche });
  return r.ok ? { clientId: r.data.id } : { erreur: r.message };
}
