import type { ParcelleCadastre, Scene } from '@ph/core/dessin';
import type { Resultat } from '@ph/core/resultat';
import { posterJson } from '@/lib/posterJson';

/** Appels de l'éditeur vers `/api/dessin/*` (session vérifiée côté serveur à chaque appel). */
export type EspaceDessin = 'particulier' | 'entreprise';

export interface PlanListe {
  planId: string;
  titre: string;
  versionCourante: number;
  majLe: string;
  supprimeLe: string | null;
  taille: number;
}

const appel = <R>(operation: string, espace: EspaceDessin, corps: object = {}) =>
  posterJson<R>(`/api/dessin/${operation}`, { espace, ...corps });

export const listerPlans = (espace: EspaceDessin) => appel<PlanListe[]>('lister', espace);

export const lirePlan = (espace: EspaceDessin, planId: string) =>
  appel<{ titre: string; versionCourante: number; scene: Scene }>('lire', espace, { planId });

export const creerPlan = (espace: EspaceDessin, titre: string, scene?: Scene) =>
  appel<{ planId: string }>('creer', espace, scene ? { titre, scene } : { titre });

export const enregistrerPlan = (
  espace: EspaceDessin,
  e: { planId: string; versionAttendue: number; scene: Scene; nomVersion?: string },
) => appel<{ versionCourante: number }>('enregistrer', espace, e);

export const renommerPlan = (espace: EspaceDessin, planId: string, titre: string) =>
  appel<void>('renommer', espace, { planId, titre });

export const actionPlan = (
  espace: EspaceDessin,
  operation: 'dupliquer' | 'corbeille' | 'restaurer',
  planId: string,
): Promise<Resultat<unknown>> => appel(operation, espace, { planId });

export const enregistrerFond = (
  espace: EspaceDessin,
  e: { planId: string; type: 'image/jpeg'; base64: string },
) => appel<{ storagePath: string }>('fond', espace, e);

export const lireFond = (espace: EspaceDessin, planId: string, storagePath: string) =>
  appel<{ url: string }>('lire-fond', espace, { planId, storagePath });

/** Implantation (DES-35) : adresses proposées, puis parcelle et photo aérienne IGN. */
export const chercherAdresses = (espace: EspaceDessin, texte: string) =>
  appel<{ adresses: { libelle: string; lon: number; lat: number }[] }>('adresses', espace, {
    texte,
  });

export const chargerParcelle = (espace: EspaceDessin, planId: string, lon: number, lat: number) =>
  appel<ParcelleCadastre>('parcelle', espace, { planId, lon, lat });

/** PDF à l'échelle (DES-41), produit par le serveur depuis le plan enregistré. */
export const exporterPdf = (
  espace: EspaceDessin,
  e: {
    planId: string;
    niveauId: string;
    echelle: 50 | 100;
    format: 'A4' | 'A3';
    exclus: string[];
    scene: Scene;
  },
) => appel<{ base64: string }>('pdf', espace, e);

/** Galerie « Mes photos » du plan (DES-37). */
export const enregistrerPhoto = (espace: EspaceDessin, planId: string, base64: string) =>
  appel<{ storagePath: string }>('photo', espace, { planId, base64 });

export const listerPhotos = (espace: EspaceDessin, planId: string) =>
  appel<{ photos: { storagePath: string; creeLe: number }[] }>('photos', espace, { planId });

export const supprimerPhoto = (espace: EspaceDessin, planId: string, storagePath: string) =>
  appel<{ ok: true }>('supprimer-photo', espace, { planId, storagePath });
