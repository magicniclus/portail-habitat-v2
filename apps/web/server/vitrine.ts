import 'server-only';
import { PRIX_AFFICHES, type PrixAffiches } from '@ph/core/facturation';
import {
  artisanPublic,
  avis as schemaAvis,
  configApp,
  statsPublic,
  texteCommune,
} from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { chemins, collections } from '@ph/firebase/chemins';
import { depot } from '@ph/firebase/serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { cache } from 'react';
import type { AvisVitrine, StatsVitrine } from '@/features/accueil/vitrine';
import type { ArtisanAvis } from '@/features/avis/types';
import { lire } from './lecture';

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

/** Fiches en ligne pour `/avis`, filtrées dans le navigateur (l'annuaire du lot 9 prendra le relais). */
export const lireArtisansAvis = cache(
  async (): Promise<ArtisanAvis[]> =>
    (await lire('artisans (avis)', async () => {
      const r = await depot(db(), collections.artisansPublic, artisanPublic)
        .reference.where('enLigne', '==', true)
        .limit(2000)
        .get();
      return r.docs.map((d) => {
        const a = d.data();
        return {
          id: d.id,
          nom: a.nomCommercial,
          ville: a.ville,
          metier: a.metierPrincipal,
          note: a.noteMoyenne,
          nbAvis: a.nbAvis,
        };
      });
    })) ?? [],
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

/** Textes d'une page commune modifiés dans l'admin (ADMIN §2.9) ; absents : ceux du dépôt. */
export const lireTexteCommunePublic = cache((slug: string) =>
  lire(`communes/${slug}`, async () => {
    // La date de mise à jour (Timestamp Firestore) n'est pas affichée : on ne la valide pas ici.
    const r = texteCommune
      .omit({ updatedAt: true })
      .safeParse((await db().doc(chemins.communeTexte(slug)).get()).data());
    return r.success ? r.data : null;
  }),
);
