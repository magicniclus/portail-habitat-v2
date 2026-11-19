import type { Scene } from '@ph/core/dessin';
import { BASE_BROUILLONS_PLANS } from '@/lib/donneesLocales';

/**
 * Brouillons hors ligne (DES-39) : la dernière scène non enregistrée de chaque plan, dans
 * IndexedDB (sans dépendance). Toute erreur est silencieuse : le brouillon est un secours.
 */
export interface Brouillon {
  scene: Scene;
  /** Révision du serveur sur laquelle le brouillon s'appuie. */
  revision: number;
  le: number;
}

const TABLE = 'brouillons';

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const r = indexedDB.open(BASE_BROUILLONS_PLANS, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(TABLE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

async function operation<T>(
  mode: IDBTransactionMode,
  faire: (t: IDBObjectStore) => IDBRequest,
): Promise<T | undefined> {
  try {
    const db = await ouvrir();
    return await new Promise<T>((ok, ko) => {
      const r = faire(db.transaction(TABLE, mode).objectStore(TABLE));
      r.onsuccess = () => ok(r.result as T);
      r.onerror = () => ko(r.error);
    });
  } catch {
    return undefined;
  }
}

export const lireBrouillon = (planId: string) =>
  operation<Brouillon>('readonly', (t) => t.get(planId));
export const ecrireBrouillon = (planId: string, b: Brouillon) =>
  operation<void>('readwrite', (t) => t.put(b, planId));
export const effacerBrouillon = (planId: string) =>
  operation<void>('readwrite', (t) => t.delete(planId));
