import { PAGES_SUIVIES, type PageSuivie } from '@ph/core/comportement';
import type { PeriodeComportement } from '@ph/firebase/admin-serveur';

/** Filtres de l'écran lus dans l'URL (page, appareil, période, onglet), avec repli sûr. */
type AppareilVue = 'ordinateur' | 'tablette' | 'mobile';
export interface FiltresComportement {
  page: PageSuivie;
  appareil: AppareilVue;
  periode: PeriodeComportement;
  onglet: 'cartes' | 'replays';
}

const parmi = <T extends string>(v: unknown, liste: readonly T[], defaut: T): T =>
  liste.includes(v as T) ? (v as T) : defaut;

export function lireFiltres(p: Record<string, string | string[] | undefined>): FiltresComportement {
  return {
    page: parmi(p.page, Object.keys(PAGES_SUIVIES) as PageSuivie[], 'acquisition-artisans'),
    appareil: parmi(p.appareil, ['ordinateur', 'tablette', 'mobile'] as const, 'ordinateur'),
    periode: parmi(p.periode, ['7j', '30j', '90j'] as const, '30j'),
    onglet: parmi(p.onglet, ['cartes', 'replays'] as const, 'cartes'),
  };
}

export const lienFiltres = (f: FiltresComportement, changement: Partial<FiltresComportement>) =>
  `/admin/comportement?${new URLSearchParams({ ...f, ...changement })}`;
