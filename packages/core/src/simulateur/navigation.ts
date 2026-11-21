import { normaliser } from '../recherche/texte';
import type { Champ } from './champs';

/** Jalons du simulateur (maquette Simulateur de Devis). L'étape 6 est l'écran de résultat. */
export const JALONS_SIMULATEUR = ['Prestation', 'Projet', 'Options', 'Chantier', 'Coordonnées'];

const aDesOptions = (champs: readonly Champ[]) => champs.some((c) => c.e === 3);

export function etapeSuivante(etape: number, champs: readonly Champ[]): number {
  const n = Math.min(5, etape + 1);
  return n === 3 && !aDesOptions(champs) ? 4 : n;
}

export function etapePrecedente(etape: number, champs: readonly Champ[]): number {
  const n = Math.max(1, etape - 1);
  return n === 3 && !aDesOptions(champs) ? 2 : n;
}

/** `?etape=` (SIM-02) : 2 à 5 avec une prestation, 1 sinon. */
export function etapeDepuisUrl(brut: string | null, champs: readonly Champ[] | null): number {
  if (!champs) return 1;
  const n = Number(brut);
  const etape = Number.isInteger(n) ? Math.min(5, Math.max(2, n)) : 2;
  return etape === 3 && !aDesOptions(champs) ? 2 : etape;
}

interface PrestationListee {
  id: string;
  nom: string;
  pitch?: string;
  famille: string;
}

/**
 * Étape 1 : résultats du moteur de recherche (intentions → prestation) d'abord, puis correspondance
 * du texte dans le nom et l'accroche (sans accents), filtrés par famille (portage de renderVals()).
 */
export function filtrerPrestations<P extends PrestationListee>(
  liste: readonly P[],
  recherche: string,
  idsMoteur: readonly string[],
  famille: string,
): P[] {
  const q = normaliser(recherche);
  let base: readonly P[] = liste;
  if (q.length >= 2) {
    const ids = [...idsMoteur];
    for (const p of liste)
      if (normaliser(`${p.nom} ${p.pitch ?? ''}`).includes(q) && !ids.includes(p.id))
        ids.push(p.id);
    base = ids.map((id) => liste.find((p) => p.id === id)).filter((p): p is P => Boolean(p));
  }
  return base.filter((p) => famille === 'toutes' || p.famille === famille);
}
