/**
 * Référentiels (ADMIN §2.9) : les paramètres de prix d'une prestation sont des objets imbriqués ;
 * l'écran en édite les nombres un par un (chemins à point), sans jamais changer leur forme.
 */
export interface Feuille {
  chemin: string;
  valeur: number;
}

export function feuillesNumeriques(o: unknown, prefixe = ''): Feuille[] {
  if (typeof o === 'number') return [{ chemin: prefixe, valeur: o }];
  if (o === null || typeof o !== 'object') return [];
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
    feuillesNumeriques(v, prefixe ? `${prefixe}.${k}` : k),
  );
}

/** Copie avec les nombres modifiés ; refuse un chemin inconnu, non numérique ou négatif. */
export function appliquerFeuilles<T>(o: T, modifs: Readonly<Record<string, number>>): T {
  const copie = structuredClone(o) as Record<string, unknown>;
  for (const [chemin, valeur] of Object.entries(modifs)) {
    const parties = chemin.split('.');
    const dernier = parties.pop()!;
    const parent = parties.reduce<unknown>(
      (x, k) => (x && typeof x === 'object' ? (x as Record<string, unknown>)[k] : undefined),
      copie,
    ) as Record<string, unknown> | undefined;
    if (!parent || typeof parent[dernier] !== 'number')
      throw new Error(`Paramètre inconnu ou non numérique : ${chemin}`);
    if (!Number.isFinite(valeur) || valeur < 0)
      throw new Error(`Le paramètre ${chemin} doit être un nombre positif.`);
    parent[dernier] = valeur;
  }
  return copie as T;
}

/** Version « AAAA-MM-JJ.n » : compteur remis à 1 chaque jour. */
export function versionSuivante(actuelle: string, jour: string): string {
  const [date, n] = actuelle.split('.');
  return date === jour ? `${jour}.${Number(n) + 1}` : `${jour}.1`;
}
