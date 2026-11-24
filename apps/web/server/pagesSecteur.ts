import 'server-only';
import { idPageSecteur } from '@ph/core/pages-secteur';
import type { PageSecteur } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import {
  communesIndexablesDuMetier,
  lirePageSecteur,
  metiersIndexablesDeCommune,
  pagesIndexables,
  voisinesIndexables,
} from '@ph/firebase/pages-secteur';
import { getFirestore } from 'firebase-admin/firestore';
import { cache } from 'react';
import { lire } from './lecture';

/**
 * Registre des pages de secteur (SEO local) lu par les pages publiques : page au registre,
 * `'absente'` si elle n'y est pas, `null` si la lecture a échoué (Firestore absent ou lent).
 */
const db = () => getFirestore(appAdmin());

export const pageRegistre = cache(
  async (metier: string, slug: string): Promise<PageSecteur | 'absente' | null> =>
    lire(
      'pageSecteur',
      async () => (await lirePageSecteur(db(), idPageSecteur(metier, slug))) ?? 'absente',
    ),
);

/** Liens du bas de page : communes du même métier et métiers de la commune, tous indexés. */
export const liensSecteur = cache(async (metier: string, slug: string, departement: string) => {
  const [voisines, metiers] = await Promise.all([
    departement
      ? lire('voisinesSecteur', () => voisinesIndexables(db(), metier, departement))
      : null,
    lire('metiersCommune', () => metiersIndexablesDeCommune(db(), slug)),
  ]);
  return {
    voisines: (voisines ?? []).filter((v) => v.commune.slug !== slug),
    metiers: (metiers ?? []).filter((m) => m !== metier),
  };
});

/** Pages indexées pour le sitemap (vide si le registre est illisible). */
export const pagesSecteurSitemap = async () =>
  (await lire('sitemapSecteur', () => pagesIndexables(db()))) ?? [];

/** Communes où le métier a une page indexée (page du métier) ; `null` si le registre est illisible. */
export const communesDuMetier = cache(async (metier: string) =>
  lire('communesMetier', () => communesIndexablesDuMetier(db(), metier)),
);
