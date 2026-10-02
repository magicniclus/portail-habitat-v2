import { createHash } from 'node:crypto';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

/** Notifications push de l'application pro (MOBILE §9, MOB-06) via Firebase Cloud Messaging. */

export interface MessagePush {
  titre: string;
  corps: string;
  /** Page ouverte au clic (chemin du site). */
  lien: string;
}

export type Pousser = (uid: string, m: MessagePush) => Promise<void>;

/** Sous-ensemble de `Messaging` (Admin SDK) : les tests le remplacent. */
export interface EnvoyeurPush {
  sendEachForMulticast(m: {
    tokens: string[];
    data?: Record<string, string>;
  }): Promise<{ responses: { success: boolean; error?: { code: string } }[] }>;
}

const JETONS_PERIMES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/** Identifiant du document : empreinte du jeton (le jeton n'apparaît jamais dans un chemin). */
const idAppareil = (jeton: string) => createHash('sha256').update(jeton).digest('hex').slice(0, 40);

export async function enregistrerAppareilPush(
  db: Firestore,
  uid: string,
  jeton: string,
  appareil: string,
  maintenant: number,
): Promise<void> {
  await db
    .collection(chemins.appareilsPush(uid))
    .doc(idAppareil(jeton))
    .set({ schemaVersion: 1, jeton, appareil, majLe: Timestamp.fromMillis(maintenant) });
}

export async function retirerAppareilPush(db: Firestore, uid: string, jeton: string) {
  await db.collection(chemins.appareilsPush(uid)).doc(idAppareil(jeton)).delete();
}

/**
 * Envoi à tous les appareils de la personne (message « data » : le service worker l'affiche) ;
 * les jetons refusés par FCM sont oubliés.
 */
export function pousserFcm(db: Firestore, envoyeur: EnvoyeurPush): Pousser {
  return async (uid, m) => {
    const appareils = await db.collection(chemins.appareilsPush(uid)).limit(20).get();
    if (appareils.empty) return;
    const docs = appareils.docs;
    const r = await envoyeur.sendEachForMulticast({
      tokens: docs.map((d) => d.get('jeton') as string),
      data: { titre: m.titre, corps: m.corps, lien: m.lien },
    });
    await Promise.all(
      r.responses.map((x, i) =>
        !x.success && x.error && JETONS_PERIMES.has(x.error.code) ? docs[i]!.ref.delete() : null,
      ),
    );
  };
}
