import { delaiApresEchecs } from '@ph/core/connexion';

/** Échecs de connexion sur cet appareil (CON-03) ; Firebase applique aussi sa propre limite. */
const CLE = 'ph_echecs_connexion';

interface Etat {
  n: number;
  /** Instant (ms) avant lequel une nouvelle tentative est refusée. */
  jusqua: number;
}

function lire(): Etat {
  try {
    const e = JSON.parse(localStorage.getItem(CLE) ?? '') as Etat;
    return typeof e.n === 'number' && typeof e.jusqua === 'number' ? e : { n: 0, jusqua: 0 };
  } catch {
    return { n: 0, jusqua: 0 };
  }
}

function ecrire(e: Etat) {
  try {
    localStorage.setItem(CLE, JSON.stringify(e));
  } catch {
    // stockage indisponible : seule la limite de Firebase s'applique
  }
}

/** Instant de fin du blocage (0 : aucun). */
export const blocageJusqua = () => lire().jusqua;

export function echec(maintenant = Date.now()): number {
  const n = lire().n + 1;
  const jusqua = maintenant + delaiApresEchecs(n);
  ecrire({ n, jusqua });
  return jusqua;
}

export function reussite() {
  try {
    localStorage.removeItem(CLE);
  } catch {
    // rien à faire
  }
}
