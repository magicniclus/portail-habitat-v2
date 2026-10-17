import { evenement, type entreeEvenementRecherche } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import type { Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { depot } from '../depot';

const TREIZE_MOIS_MS = 395 * 86_400_000;

/**
 * Journal de la recherche (RECHERCHE §5) : `evenements/{id}` de type `recherche`, sans donnée
 * personnelle (requête déjà nettoyée, identifiant d'onglet aléatoire), supprimé après 13 mois (TTL).
 */
export async function journaliserRecherche(
  s: { db: Firestore; horloge: () => number },
  e: z.output<typeof entreeEvenementRecherche>,
): Promise<void> {
  const maintenant = s.horloge();
  await depot(s.db, collections.evenements, evenement)
    .reference.doc()
    .set({
      schemaVersion: 1,
      type: 'recherche',
      sessionId: e.session,
      meta: {
        nature: e.nature,
        q: e.q,
        ...(e.intention ? { intention: e.intention } : {}),
        ...(e.rang ? { rang: e.rang } : {}),
      },
      createdAt: new Date(maintenant),
      expireLe: new Date(maintenant + TREIZE_MOIS_MS),
    });
}
