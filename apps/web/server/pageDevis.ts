import 'server-only';
import type { ParametresFacturation, TauxTva } from '@ph/core/devis';
import { peut } from '@ph/core/equipe';
import { formatTel } from '@ph/core/format';
import { appAdmin, urlPubliqueFichier } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
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

/** En-tête de la feuille A4 : identité de l'entreprise (paramètres, sinon « Ma fiche ») et logo. */
export interface EntrepriseFeuille {
  nom: string;
  adresse: string;
  siret: string;
  naf?: string;
  tvaIntra?: string;
  tel?: string;
  email?: string;
  logoUrl?: string;
}

export async function entrepriseFeuille(
  artisanId: string,
  p: ParametresEditeur & { logoChemin?: string },
): Promise<EntrepriseFeuille> {
  const a = (await dbDevis().doc(chemins.artisan(artisanId)).get()).data() ?? {};
  const logoUrl = p.logoChemin
    ? urlPubliqueFichier(p.logoChemin)
    : (a.logoUrl as string | undefined);
  const tel = a.telephonePublic as string | undefined;
  return {
    nom: p.raisonSociale || (a.nomCommercial as string | undefined) || '',
    adresse: p.adresseSiege,
    siret: p.siret,
    ...(a.codeNaf ? { naf: a.codeNaf as string } : {}),
    ...(p.tvaIntra ? { tvaIntra: p.tvaIntra } : {}),
    ...(tel ? { tel: formatTel(tel) } : {}),
    ...(a.emailContact ? { email: a.emailContact as string } : {}),
    ...(logoUrl ? { logoUrl } : {}),
  };
}
