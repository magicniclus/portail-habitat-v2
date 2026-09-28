import {
  COLLECTION_INTENTIONS,
  documentTypesense,
  JEU_MOTS_VIDES,
  schemaCollection,
  synonymesTypesense,
  type IntentionIndexee,
} from '@ph/core/recherche';

type Fetch = typeof fetch;

/**
 * Client d'administration Typesense (RECHERCHE §4, D4) : `TYPESENSE_HOTE` et `TYPESENSE_CLE_ADMIN`
 * (Secret Manager). Sans configuration, rien n'est envoyé : le site garde le moteur local.
 */
export function clientTypesense(env: NodeJS.ProcessEnv = process.env, appel: Fetch = fetch) {
  const hote = env.TYPESENSE_HOTE?.replace(/\/$/, '');
  const cle = env.TYPESENSE_CLE_ADMIN;
  if (!hote || !cle) return null;

  const requete = async (methode: string, chemin: string, corps?: unknown) => {
    const r = await appel(`${hote}${chemin}`, {
      method: methode,
      headers: { 'X-TYPESENSE-API-KEY': cle, 'Content-Type': 'application/json' },
      ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
    });
    if (!r.ok && r.status !== 404) throw new Error(`Typesense ${methode} ${chemin} : ${r.status}`);
    return r;
  };

  const collection = `/collections/${COLLECTION_INTENTIONS}`;

  return {
    /** Crée la collection si elle n'existe pas encore (premier déploiement). */
    async assurerCollection() {
      const r = await requete('GET', collection);
      if (r.status === 404) await requete('POST', '/collections', schemaCollection());
    },
    /** Intention ajoutée ou modifiée → indexée ; supprimée ou masquée → retirée de l'index. */
    async intention(id: string, donnees: IntentionIndexee | undefined) {
      const doc = donnees ? documentTypesense(id, donnees) : null;
      if (doc) await requete('POST', `${collection}/documents?action=upsert`, doc);
      else await requete('DELETE', `${collection}/documents/${encodeURIComponent(id)}`);
    },
    /** Synonymes et mots vides, depuis `referentiel/recherche/synonymes/global`. */
    async synonymes(s: {
      developpements: Record<string, string>;
      equivalences: string[][];
      motsVides: string[];
    }) {
      for (const syn of synonymesTypesense(s)) {
        const { id, ...corps } = syn;
        await requete('PUT', `${collection}/synonyms/${encodeURIComponent(id)}`, corps);
      }
      await requete('PUT', `/stopwords/${JEU_MOTS_VIDES}`, {
        stopwords: s.motsVides,
        locale: 'fr',
      });
    },
  };
}
