import 'server-only';
import { peut } from '@ph/core/equipe';
import { formatTel } from '@ph/core/format';
import { droitsDe } from '@ph/core/paiements';
import {
  controlesSeo,
  sousDomaineDe,
  type ChampFormulaire,
  type FicheSite,
  type PageSite,
} from '@ph/core/sites';
import { appAdmin } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import {
  lirePhotosPubliees,
  lireSiteEdition,
  type ServicesSites,
  type SiteEdition,
} from '@ph/firebase/sites';
import { palettesSites } from '@ph/ui/tokens';
import { getFirestore } from 'firebase-admin/firestore';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';
import { nomMetier } from './metiers';
import { sessionPro } from './sessionPro';

const db = () => getFirestore(appAdmin());

/** Domaine des sous-domaines gratuits (`{slug}.portailhabitat.fr`, DOMAINES §2). */
export const DOMAINE_BASE = process.env.DOMAINE_SITES ?? 'portailhabitat.fr';

export function servicesSites(): ServicesSites {
  return { db: db(), horloge: Date.now, domaineBase: DOMAINE_BASE };
}

/** Palette de départ : la première des palettes proposées (tokens de `@ph/ui`). */
export function paletteDepart() {
  const { nom: _n, ...p } = palettesSites[0]!;
  return p;
}

/** Page Mon site : membre de l'entreprise active avec `site.gerer` (propriétaire, gérant). */
export async function accesSite(suite: Route) {
  const s = await sessionPro(suite);
  const active = s.espace.active;
  if (!active || !peut(active.membre, 'site.gerer')) redirect(routes.proTableauDeBord);
  return { artisanId: active.artisanId, sitePro: droitsDe(active.artisan.formule).sitePro };
}

/** Données de la fiche reprises dans le site de départ ; ce qui manque reste vide (pas d'invention). */
export async function ficheDuSite(artisanId: string): Promise<FicheSite> {
  const [artisan, publique, param, realisations] = await Promise.all([
    db().doc(chemins.artisan(artisanId)).get(),
    db().doc(chemins.artisanPublic(artisanId)).get(),
    db().doc(chemins.parametresFacturation(artisanId)).get(),
    lirePhotosPubliees(db(), artisanId, 12),
  ]);
  const a = (k: string) => artisan.get(k) as string | undefined;
  const pub = (k: string) => publique.get(k) as string | number | undefined;
  const tel = a('telephonePublic');
  const siege = artisan.get('adresseSiege') as
    { ligne1: string; codePostal: string; ville: string } | undefined;
  const decennale = param.get('assuranceDecennale') as
    { assureur: string; contrat: string } | undefined;
  return {
    nomCommercial: a('nomCommercial') ?? '',
    metier: nomMetier(a('metierPrincipal') ?? ''),
    ville: (pub('ville') as string | undefined) ?? siege?.ville ?? '',
    ...(tel ? { telephone: formatTel(tel) } : {}),
    ...(pub('pitch') ? { pitch: pub('pitch') as string } : {}),
    ...(pub('description') ? { description: pub('description') as string } : {}),
    ...(Number(pub('nbAvis')) > 0
      ? { noteMoyenne: Number(pub('noteMoyenne')), nbAvis: Number(pub('nbAvis')) }
      : {}),
    ...(param.get('raisonSociale') ? { raisonSociale: param.get('raisonSociale') as string } : {}),
    ...(param.get('siret') ? { siret: param.get('siret') as string } : {}),
    ...(siege ? { adresse: `${siege.ligne1}, ${siege.codePostal} ${siege.ville}` } : {}),
    ...(decennale ? { decennale: `${decennale.assureur}, contrat ${decennale.contrat}` } : {}),
    photos: realisations.flatMap((r) => r.urls.slice(0, 3).map((_, i) => `lib:${r.id}/${i}`)),
  };
}

export interface LignePage {
  id: string;
  nom: string;
  slug: string;
  statut: PageSite['statut'];
  menu: boolean;
  score: number;
}

export interface TableauSite {
  site: SiteEdition;
  pages: LignePage[];
  /** Adresse publique (sous-domaine) et proposition de sous-domaine avant création. */
  url?: string;
  proposition: string;
  modifieDepuisPublication: boolean;
  /** Champs du formulaire enregistrés (Site Pro). */
  champs?: ChampFormulaire[];
  /** Ville du siège, pour les contrôles SEO. */
  ville?: string;
}

/** Tableau de bord du site (onglets Pages, Domaine, Formulaire). */
export async function tableauSite(artisanId: string): Promise<TableauSite> {
  const [site, fiche, doc] = await Promise.all([
    lireSiteEdition(db(), artisanId),
    db().doc(chemins.artisan(artisanId)).get(),
    db().doc(chemins.site(artisanId)).get(),
  ]);
  const champs = doc.get('formulaire.champs') as ChampFormulaire[] | undefined;
  const ville = (fiche.get('adresseSiege.ville') as string | undefined) ?? undefined;
  const pages = Object.entries(site.pages)
    .sort(([, a], [, b]) => a.ordre - b.ordre)
    .map(([id, p]) => ({
      id,
      nom: p.nom,
      slug: p.slug,
      statut: p.statut,
      menu: p.menu,
      score: controlesSeo(p, p.type === 'mentions' ? undefined : ville).score,
    }));
  return {
    site,
    pages,
    ...(site.sousDomaine ? { url: `https://${site.sousDomaine}.${DOMAINE_BASE}` } : {}),
    proposition: sousDomaineDe((fiche.get('nomCommercial') as string | undefined) ?? ''),
    ...(champs ? { champs } : {}),
    ...(ville ? { ville } : {}),
    modifieDepuisPublication:
      !site.versionPubliee || (site.brouillonModifieLe ?? 0) > (site.publieLe ?? 0),
  };
}

/** Médiathèque de l'aperçu : photos des réalisations publiées (`lib:{id}/{i}` → URL). */
export async function mediasDuSite(artisanId: string): Promise<Record<string, string>> {
  const r = await lirePhotosPubliees(db(), artisanId);
  return Object.fromEntries(r.flatMap((x) => x.urls.map((u, i) => [`lib:${x.id}/${i}`, u])));
}
