import 'server-only';
import type { ParametresFacturation, TauxTva } from '@ph/core/devis';
import { peut } from '@ph/core/equipe';
import { appAdmin } from '@ph/firebase/admin';
import { lireParametresFacturation } from '@ph/firebase/devis';
import { getFirestore } from 'firebase-admin/firestore';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';
import { sessionPro } from './sessionPro';

export const dbDevis = () => getFirestore(appAdmin());

/** Page Devis & factures : membre de l'entreprise active avec `devis.gerer` ou `factures.emettre`. */
export async function accesDevis(suite: Route) {
  const s = await sessionPro(suite);
  const active = s.espace.active;
  const gerer = Boolean(active && peut(active.membre, 'devis.gerer'));
  const facturer = Boolean(active && peut(active.membre, 'factures.emettre'));
  if (!active || (!gerer && !facturer)) redirect(routes.proTableauDeBord);
  return { artisanId: active.artisanId, gerer, facturer };
}

export interface ParametresEditeur extends ParametresFacturation {
  acompteDefautPct: number;
  validiteDevisJours: number;
  tvaDefaut: TauxTva;
}

/** Paramètres enregistrés, complétés par les valeurs par défaut tant qu'ils ne sont pas saisis. */
export async function parametresEditeur(
  artisanId: string,
): Promise<{ p: ParametresEditeur; saisis: boolean }> {
  const brut = await lireParametresFacturation(dbDevis(), artisanId);
  return {
    saisis: Boolean(brut),
    p: {
      raisonSociale: '',
      adresseSiege: '',
      siret: '',
      franchiseTva: false,
      tvaSurDebits: false,
      delaiPaiementJours: 30,
      acompteDefautPct: 30,
      validiteDevisJours: 30,
      tvaDefaut: 10,
      ...(brut as Partial<ParametresEditeur> | null),
    },
  };
}
