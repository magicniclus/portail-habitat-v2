import 'server-only';
import { PRIX_AFFICHES, type PrixAffiches } from '@ph/core/facturation';
import { artisanPublic, avis as schemaAvis, configApp, statsPublic } from '@ph/core/schemas';
import { appAdmin, estEmulateur } from '@ph/firebase/admin';
import { chemins, collections } from '@ph/firebase/chemins';
import { depot } from '@ph/firebase/serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { cache } from 'react';
import type { AvisVitrine, StatsVitrine } from '@/features/accueil/vitrine';

/** Délai maximal d'une lecture de vitrine : la page s'affiche sans les chiffres plutôt que d'attendre. */
const DELAI_MS = 2500;

/**
 * Firestore n'est lu que s'il est joignable (émulateur, identifiants de service ou Google Cloud) :
 * au build CI, les pages sont générées sans données puis régénérées toutes les heures (ISR).
 */
function firestoreConfigure(env = process.env): boolean {
  return (
    estEmulateur(env) ||
    Boolean(env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY) ||
    Boolean(env.K_SERVICE || env.FIREBASE_CONFIG)
  );
}

async function lire<T>(quoi: string, lecture: () => Promise<T>): Promise<T | null> {
  if (!firestoreConfigure()) return null;
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      lecture(),
      new Promise<never>((_, rejeter) => {
        minuterie = setTimeout(() => rejeter(new Error('délai dépassé')), DELAI_MS);
      }),
    ]);
  } catch (e) {
    console.warn(`vitrine : lecture « ${quoi} » impossible`, (e as Error).message);
    return null;
  } finally {
    clearTimeout(minuterie);
  }
}

const db = () => getFirestore(appAdmin());

/** `stats/public` (ACC-01). */
export const lireStatsPublic = cache((): Promise<StatsVitrine | null> =>
  lire('stats/public', async () => {
    const brut = (await db().doc(chemins.statsPublic()).get()).data();
    const r = statsPublic.safeParse(brut);
    return r.success ? r.data : null;
  }),
);

/** D49 (1) : fiches en ligne, Premium d'abord puis classement (index existant). */
export const lireArtisansVedette = cache(() =>
  lire('artisans', async () => {
    const r = await depot(db(), collections.artisansPublic, artisanPublic)
      .reference.where('enLigne', '==', true)
      .orderBy('premium', 'desc')
      .orderBy('scoreClassement', 'desc')
      .limit(3)
      .get();
    return r.docs.map((d) => ({ id: d.id, ...d.data() }));
  }),
);

/** Derniers avis publiés, avec la ville de l'artisan (témoignages et inspirations, D49). */
export const lireAvisRecents = cache((): Promise<AvisVitrine[] | null> =>
  lire('avis', async () => {
    const r = await depot(db(), collections.avis, schemaAvis)
      .reference.where('statut', '==', 'publie')
      .orderBy('publieLe', 'desc')
      .limit(40)
      .get();
    const fiches = depot(db(), collections.artisansPublic, artisanPublic);
    const ids = [...new Set(r.docs.map((d) => d.data().artisanId))];
    const villes = new Map(
      ids.length
        ? (await db().getAll(...ids.map((id) => fiches.ref(id)))).map((f) => [
            f.id,
            f.data()?.ville,
          ])
        : [],
    );
    return r.docs.map((d) => {
      const a = d.data();
      return {
        id: d.id,
        nomAffiche: a.nomAffiche,
        note: a.note,
        texte: a.texte,
        typeTravaux: a.typeTravaux,
        photos: a.photos.map((p) => ({ url: p.url })),
        ville: villes.get(a.artisanId),
      };
    });
  }),
);

/** Prix affichés (`config/app.prix`), sinon ceux des décisions D24 et D25. Stripe fait foi au paiement. */
export const lirePrixAffiches = cache(
  async (): Promise<PrixAffiches> =>
    (await lire('config/app', async () => {
      const brut = (await db().doc(chemins.configApp()).get()).get('prix');
      const r = configApp.shape.prix.safeParse(brut);
      return r.success ? r.data : null;
    })) ?? PRIX_AFFICHES,
);
