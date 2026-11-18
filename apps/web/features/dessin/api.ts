import type { Scene } from '@ph/core/dessin';
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
