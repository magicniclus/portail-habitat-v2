import type { z } from '@ph/core/zod';
import {
  GeoPoint,
  type DocumentData,
  type Firestore,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { depuisFirestore, versFirestore } from '../conversion';

/** Convertisseur Admin SDK : Zod valide à la lecture ET à l'écriture (ARCHITECTURE §6). */
export function convertisseur<S extends z.ZodType>(
  schema: S,
): FirestoreDataConverter<z.output<S>, DocumentData> {
  return {
    toFirestore: (donnees) =>
      versFirestore(schema.parse(donnees), (lat, lng) => new GeoPoint(lat, lng)) as DocumentData,
    fromFirestore: (instantane: QueryDocumentSnapshot) =>
      schema.parse(depuisFirestore(instantane.data())),
  };
}

/** Accès typé et validé à une collection (côté serveur). */
export function depot<S extends z.ZodType>(db: Firestore, chemin: string, schema: S) {
  const collection = db.collection(chemin).withConverter(convertisseur(schema));
  return {
    reference: collection,
    ref: (id: string) => collection.doc(id),
    async lire(id: string): Promise<z.output<S> | undefined> {
      return (await collection.doc(id).get()).data();
    },
    async ecrire(id: string, donnees: z.input<S>): Promise<void> {
      await collection.doc(id).set(donnees as z.output<S>);
    },
  };
}
