import {
  analyserEntreprise,
  depuisRechercheEntreprises,
  reponseRechercheEntreprises,
  type AnalyseEntreprise,
  type EntrepriseTrouvee,
  type Inscription,
} from '@ph/core/entreprises';
import { ErreurMetier } from '@ph/core/erreurs';
import { estSirenValide, normaliserSiren } from '@ph/core/format';
import { Timestamp } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { JOUR_MS, type ServicesComptes } from './services';

const URL_RECHERCHE_ENTREPRISES = 'https://recherche-entreprises.api.gouv.fr/search';

export interface EntrepriseProposee {
  entreprise: EntrepriseTrouvee;
  analyse: AnalyseEntreprise;
  /** Entreprise déjà présente : pour demander l'accès ou la revendiquer. */
  artisanId?: string;
}

async function inscription(
  s: ServicesComptes,
  siren: string,
): Promise<{ inscription: Inscription; artisanId?: string }> {
  const index = await s.db.collection(collections.sirenIndex).doc(siren).get();
  const artisanId = index.get('artisanId') as string | undefined;
  if (!artisanId) return { inscription: 'libre' };
  const revendiquee = (await s.db.doc(chemins.artisan(artisanId)).get()).get('revendiquee');
  return { inscription: revendiquee ? 'revendiquee' : 'non_revendiquee', artisanId };
}

/**
 * `rechercherEntreprise` (COMPTES §3.1) : API Recherche d'entreprises, résultat mis en cache 24 h
 * (`cacheSirene/{siren}`), puis contrôles (fermée, hors bâtiment, récente, déjà inscrite).
 */
export async function rechercherEntreprise(
  s: ServicesComptes & { fetch?: typeof fetch },
  q: string,
): Promise<EntrepriseProposee[]> {
  const maintenant = s.horloge();
  const siren = normaliserSiren(q);
  let trouvees: EntrepriseTrouvee[] | null = null;

  if (estSirenValide(siren)) {
    const cache = (await s.db.collection(collections.cacheSirene).doc(siren).get()).data();
    if (cache && (cache.expireLe as Timestamp).toMillis() > maintenant)
      trouvees = [cache.donnees as EntrepriseTrouvee];
  }
  if (!trouvees) {
    const url = `${URL_RECHERCHE_ENTREPRISES}?q=${encodeURIComponent(q)}&per_page=5`;
    const reponse = await (s.fetch ?? fetch)(url, {
      headers: { accept: 'application/json' },
    }).catch(() => null);
    if (!reponse?.ok) throw new ErreurMetier('INDISPONIBLE');
    const corps = reponseRechercheEntreprises.safeParse(await reponse.json().catch(() => null));
    if (!corps.success) throw new ErreurMetier('INDISPONIBLE');
    trouvees = corps.data.results.map(depuisRechercheEntreprises).filter((e) => e !== null);
    const lot = s.db.batch();
    for (const e of trouvees)
      lot.set(s.db.collection(collections.cacheSirene).doc(e.siren), {
        schemaVersion: 1,
        donnees: e,
        createdAt: Timestamp.fromMillis(maintenant),
        expireLe: Timestamp.fromMillis(maintenant + JOUR_MS),
      });
    if (trouvees.length) await lot.commit();
  }

  return Promise.all(
    trouvees.map(async (entreprise) => {
      const i = await inscription(s, entreprise.siren);
      return {
        entreprise,
        analyse: analyserEntreprise(entreprise, i.inscription, maintenant),
        ...(i.artisanId ? { artisanId: i.artisanId } : {}),
      };
    }),
  );
}
