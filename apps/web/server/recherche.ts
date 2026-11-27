import {
  COLLECTION_INTENTIONS,
  creerMoteur,
  parametresRecherche,
  type DonneesRecherche,
  type ResultatRecherche,
} from '@ph/core/recherche';
import donnees from '../../../docs/data/recherche-intentions.json';

const moteur = creerMoteur(donnees as unknown as DonneesRecherche);
const DELAI_TYPESENSE_MS = 800;

/** Typesense Cloud (D4) si `TYPESENSE_HOTE` et `TYPESENSE_CLE_RECHERCHE` sont définis, sinon moteur local. */
function configurationTypesense(env = process.env) {
  const hote = env.TYPESENSE_HOTE;
  const cle = env.TYPESENSE_CLE_RECHERCHE;
  return hote && cle ? { hote: hote.replace(/\/$/, ''), cle } : null;
}

async function ordreTypesense(q: string, max: number): Promise<string[] | null> {
  const conf = configurationTypesense();
  if (!conf) return null;
  try {
    const r = await fetch(
      `${conf.hote}/collections/${COLLECTION_INTENTIONS}/documents/search?${new URLSearchParams(parametresRecherche(q, max))}`,
      {
        headers: { 'X-TYPESENSE-API-KEY': conf.cle },
        signal: AbortSignal.timeout(DELAI_TYPESENSE_MS),
      },
    );
    if (!r.ok) return null;
    const corps = (await r.json()) as { hits?: { document: { id: string } }[] };
    return (corps.hits ?? []).map((h) => h.document.id);
  } catch {
    return null;
  }
}

/**
 * Recherche de projet côté serveur (annuaire, autres clients) : ordre donné par Typesense quand il est
 * configuré et répond, sinon par `@ph/core/recherche` (même résultat à 95 %) ; surlignage, correction,
 * urgence, métiers et projets associés viennent toujours du moteur local.
 */
export async function rechercherProjets(
  q: string,
  max: number,
): Promise<ResultatRecherche & { source: 'typesense' | 'local' }> {
  const local = moteur.rechercher(q, { max });
  const ordre = await ordreTypesense(q, max);
  if (!ordre) return { ...local, source: 'local' };
  const parId = new Map(moteur.rechercher(q, { max: 50 }).resultats.map((r) => [r.id, r]));
  const resultats = ordre.flatMap((id) => {
    const r = parId.get(id);
    return r ? [r] : [];
  });
  return {
    ...local,
    resultats: resultats.length ? resultats : local.resultats,
    source: 'typesense',
  };
}

export const projetsPopulaires = () => moteur.populaires().slice(0, 6);
