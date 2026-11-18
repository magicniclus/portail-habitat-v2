/** Base IndexedDB des brouillons de plans (DES-03 essai, DES-39 hors ligne). */
export const BASE_BROUILLONS_PLANS = 'portail-dessin';

/**
 * À la déconnexion : les brouillons de plans gardés sur l'appareil sont effacés (appareil
 * partagé). Toute erreur est silencieuse.
 */
export function oublierDonneesLocales(): Promise<void> {
  return new Promise((ok) => {
    try {
      const r = indexedDB.deleteDatabase(BASE_BROUILLONS_PLANS);
      r.onsuccess = r.onerror = r.onblocked = () => ok();
    } catch {
      ok();
    }
  });
}
