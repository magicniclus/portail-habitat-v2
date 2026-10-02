// Cohérence des référentiels (COMPTES.md « Catalogue estimable ») : aucun import, pour pouvoir être
// exécuté directement par node (scripts/verifier-referentiel.ts) comme par Vitest.

export interface DonneesReferentiel {
  familles: readonly { id: string }[];
  /** Les 9 prestations détaillées et les 103 du catalogue, avec leur famille. */
  prestations: readonly { id: string; famille: string }[];
  metiers: Readonly<Record<string, { id: string; famille: string; prestation?: string }>>;
  intentions: readonly { id: string; metier: string; prestation: string }[];
}

/** Liste des incohérences, vide si le référentiel est valide. */
export function verifierReferentiel(d: DonneesReferentiel): string[] {
  const erreurs: string[] = [];
  const familles = new Set(d.familles.map((f) => f.id));
  const prestations = new Set<string>();

  for (const p of d.prestations) {
    if (prestations.has(p.id)) erreurs.push(`Prestation en double : ${p.id}`);
    prestations.add(p.id);
    if (!familles.has(p.famille))
      erreurs.push(`Prestation ${p.id} : famille inconnue « ${p.famille} »`);
  }
  for (const f of familles)
    if (!d.prestations.some((p) => p.famille === f))
      erreurs.push(`Famille ${f} : aucune prestation estimable`);

  for (const [cle, m] of Object.entries(d.metiers)) {
    if (m.id !== cle) erreurs.push(`Métier ${cle} : identifiant incohérent « ${m.id} »`);
    if (!familles.has(m.famille)) erreurs.push(`Métier ${cle} : famille inconnue « ${m.famille} »`);
    if (!m.prestation) erreurs.push(`Métier ${cle} : aucune prestation par défaut`);
    else if (!prestations.has(m.prestation))
      erreurs.push(`Métier ${cle} : prestation par défaut inconnue « ${m.prestation} »`);
  }

  const intentions = new Set<string>();
  for (const i of d.intentions) {
    if (intentions.has(i.id)) erreurs.push(`Intention en double : ${i.id}`);
    intentions.add(i.id);
    if (!prestations.has(i.prestation))
      erreurs.push(`Intention ${i.id} : prestation inconnue « ${i.prestation} »`);
    if (!d.metiers[i.metier]) erreurs.push(`Intention ${i.id} : métier inconnu « ${i.metier} »`);
  }
  return erreurs;
}

type Json = Record<string, unknown>;

/** Assemble les fichiers de docs/data au format attendu par `verifierReferentiel`. */
export function depuisFichiers(
  catalogue: Json,
  detaillees: Json,
  recherche: Json,
): DonneesReferentiel {
  const c = catalogue as {
    familles: { id: string }[];
    familleDesPrestationsDetaillees: Record<string, string>;
    prestations: { id: string; famille: string }[];
  };
  const p = detaillees as { prestations: { id: string }[] };
  return {
    familles: c.familles,
    prestations: [
      ...p.prestations.map((x) => ({
        id: x.id,
        famille: c.familleDesPrestationsDetaillees[x.id] ?? '',
      })),
      ...c.prestations,
    ],
    metiers: recherche.metiers as DonneesReferentiel['metiers'],
    intentions: recherche.intentions as DonneesReferentiel['intentions'],
  };
}
