/**
 * Annuler / rétablir de Dessin (DES-38). Instantanés immuables (la scène partage sa structure,
 * le coût mémoire reste faible). Un geste continu (glisser) porte une `cle` : tant que la clé
 * ne change pas, il ne crée qu'une seule étape.
 */
const MAX_ETATS_DESSIN = 300;

export interface HistoriqueDessin<T> {
  passe: T[];
  present: T;
  futur: T[];
  /** Clé du geste en cours, `null` hors geste. */
  geste: string | null;
}

export const creerHistorique = <T>(present: T): HistoriqueDessin<T> => ({
  passe: [],
  present,
  futur: [],
  geste: null,
});

export function enregistrer<T>(
  h: HistoriqueDessin<T>,
  suivant: T,
  geste: string | null = null,
  max = MAX_ETATS_DESSIN,
): HistoriqueDessin<T> {
  if (geste !== null && geste === h.geste) return { ...h, present: suivant, futur: [] };
  return { passe: [...h.passe, h.present].slice(-max), present: suivant, futur: [], geste };
}

/** Fin du glisser : le prochain changement ouvrira une nouvelle étape. */
export const terminerGeste = <T>(h: HistoriqueDessin<T>): HistoriqueDessin<T> =>
  h.geste === null ? h : { ...h, geste: null };

export const peutAnnuler = (h: HistoriqueDessin<unknown>) => h.passe.length > 0;
export const peutRetablir = (h: HistoriqueDessin<unknown>) => h.futur.length > 0;

export function annuler<T>(h: HistoriqueDessin<T>): HistoriqueDessin<T> {
  const precedent = h.passe.at(-1);
  if (precedent === undefined) return h;
  return {
    passe: h.passe.slice(0, -1),
    present: precedent,
    futur: [h.present, ...h.futur],
    geste: null,
  };
}

export function retablir<T>(h: HistoriqueDessin<T>): HistoriqueDessin<T> {
  const [suivant, ...reste] = h.futur;
  if (suivant === undefined) return h;
  return { passe: [...h.passe, h.present], present: suivant, futur: reste, geste: null };
}
