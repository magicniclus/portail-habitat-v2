import { contact, type entreeContact } from '@ph/core/schemas';
import { referenceContact } from '@ph/core/support';
import type { z } from '@ph/core/zod';
import type { Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { depot } from '../depot';

export interface ServicesContacts {
  db: Firestore;
  horloge: () => number;
  alea?: () => number;
}

/**
 * Enregistre un message du formulaire Aide et contact (`contacts/{reference}`), en transaction :
 * la référence donnée à l'usager est l'identifiant du document (nouvelle tentative en cas de collision).
 */
export async function creerContact(
  s: ServicesContacts,
  e: z.output<typeof entreeContact>,
  auteur: { role: 'particulier' | 'artisan' | 'autre' },
): Promise<{ reference: string }> {
  const contacts = depot(s.db, collections.contacts, contact);
  const alea = s.alea ?? Math.random;
  for (let essai = 0; essai < 5; essai++) {
    const reference = referenceContact(alea);
    const cree = await s.db.runTransaction(async (t) => {
      const ref = contacts.ref(reference);
      if ((await t.get(ref)).exists) return false;
      t.create(ref, {
        schemaVersion: 1,
        createdAt: new Date(s.horloge()),
        nom: e.nom,
        email: e.email,
        role: auteur.role,
        sujet: e.sujet,
        ...(e.referenceDossier ? { referenceDossier: e.referenceDossier } : {}),
        message: e.message,
        pieces: [],
        statut: 'ouvert',
        historique: [],
      });
      return true;
    });
    if (cree) return { reference };
  }
  throw new Error('Référence de contact introuvable après 5 essais.');
}
