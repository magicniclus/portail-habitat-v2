/**
 * Formulaire de filtres → chaîne de requête de l'annuaire (valeurs multiples jointes par des
 * virgules, valeurs par défaut omises : même format que `ecrireFiltresAnnuaire`, sans Zod ici).
 */
const DEFAUTS: Record<string, string> = {
  rayon: '20',
  note: '0',
  dispo: 'tous',
  budget: 'tous',
  tri: 'pertinence',
};
const ORDRE = ['q', 'ville', 'metier', 'rayon', 'note', 'labels', 'dispo', 'budget', 'tri'];

export function requeteFiltres(donnees: FormData): string {
  const p = new URLSearchParams();
  for (const cle of ORDRE) {
    const valeur = donnees
      .getAll(cle)
      .map((v) => String(v).trim())
      .filter(Boolean)
      .join(',');
    if (valeur && valeur !== DEFAUTS[cle]) p.set(cle, valeur);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}
