import { artisanPublic, avis, realisation } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import type { Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { depot } from '../depot';

export interface AvisFiche {
  id: string;
  nomAffiche: string;
  note: number;
  texte: string;
  typeTravaux: string;
  publieLe: number;
  reponse?: { texte: string; le: number };
}

export interface RealisationFiche {
  id: string;
  titre: string;
  description: string;
  ville: string;
  photos: { url: string; largeur: number; hauteur: number }[];
}

export interface FichePublique {
  id: string;
  fiche: z.output<typeof artisanPublic>;
  avis: AvisFiche[];
  realisations: RealisationFiche[];
}

/**
 * Fiche publique `/artisans/[slug]` : `null` si elle n'existe pas ou n'est pas en ligne (FIC-02).
 * Derniers avis publiés et réalisations publiées (autorisation du propriétaire) seulement.
 */
export async function lireFichePublique(
  db: Firestore,
  slug: string,
): Promise<FichePublique | null> {
  const r = await depot(db, collections.artisansPublic, artisanPublic)
    .reference.where('slug', '==', slug)
    .limit(1)
    .get();
  const doc = r.docs[0];
  if (!doc || !doc.data().enLigne) return null;
  const [lesAvis, lesRealisations] = await Promise.all([
    depot(db, collections.avis, avis)
      .reference.where('artisanId', '==', doc.id)
      .where('statut', '==', 'publie')
      .orderBy('publieLe', 'desc')
      .limit(6)
      .get(),
    depot(db, chemins.realisations(doc.id), realisation)
      .reference.where('publie', '==', true)
      .limit(12)
      .get(),
  ]);
  return {
    id: doc.id,
    fiche: doc.data(),
    avis: lesAvis.docs.map((d) => {
      const a = d.data();
      return {
        id: d.id,
        nomAffiche: a.nomAffiche,
        note: a.note,
        texte: a.texte,
        typeTravaux: a.typeTravaux,
        publieLe: a.publieLe?.getTime() ?? a.createdAt.getTime(),
        ...(a.reponse ? { reponse: { texte: a.reponse.texte, le: a.reponse.le.getTime() } } : {}),
      };
    }),
    realisations: lesRealisations.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.ordre - b.ordre)
      .map((x) => ({
        id: x.id,
        titre: x.titre,
        description: x.description,
        ville: x.ville,
        photos: x.photos.map((p) => ({ url: p.url, largeur: p.largeur, hauteur: p.hauteur })),
      })),
  };
}

/** Slugs des fiches en ligne (sitemap), triés. */
export async function slugsEnLigne(db: Firestore): Promise<string[]> {
  const r = await db
    .collection(collections.artisansPublic)
    .where('enLigne', '==', true)
    .select('slug')
    .get();
  return r.docs.map((d) => d.get('slug') as string).sort();
}
