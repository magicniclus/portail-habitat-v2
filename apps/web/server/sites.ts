import 'server-only';
import { peut } from '@ph/core/equipe';
import { formatTel } from '@ph/core/format';
import { droitsDe } from '@ph/core/paiements';
import {
  controlesSeo,
  joursPrecedents,
  moisPrecedents,
  resumeStatsSite,
  sousDomaineDe,
  type ChampFormulaire,
  type FicheCreation,
  type FicheSite,
  type PageSite,
  type SuiviSite,
  entreeSuivi,
  SUIVI_VIDE,
} from '@ph/core/sites';
import { appAdmin } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import {
  hebergeurDepuisEnv,
  lireMediasSite,
  lirePhotosPubliees,
  lireSiteEdition,
  lireStatsSite,
  periodesParis,
  resolveurDoh,
  type ServicesDomaines,
  type ServicesSites,
  type SiteEdition,
} from '@ph/firebase/sites';
import { palettesSites } from '@ph/ui/tokens';
import { getFirestore } from 'firebase-admin/firestore';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';
import { servicesComptes } from './espace';
import intentions from '../../../docs/data/recherche-intentions.json';
import { nomMetier } from './metiers';
import { sessionPro } from './sessionPro';

const db = () => getFirestore(appAdmin());

/** Domaine des sous-domaines gratuits (`{slug}.portailtravaux.fr`, DOMAINES §2). */
export const DOMAINE_BASE = process.env.DOMAINE_SITES ?? 'portailtravaux.fr';

export function servicesSites(): ServicesSites {
  return { db: db(), horloge: Date.now, domaineBase: DOMAINE_BASE };
}

/** Domaines personnels : hébergeur (Vercel) et DNS public, jamais appelés par le navigateur. */
export function servicesDomaines(): ServicesDomaines {
  return {
    ...servicesSites(),
    hebergeur: hebergeurDepuisEnv(),
    dns: resolveurDoh(),
    notifier: servicesComptes().notifier,
  };
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
  suivi: SuiviSite;
}

/** Tableau de bord du site (onglets Pages, Domaine, Formulaire). */
export async function tableauSite(artisanId: string): Promise<TableauSite> {
  const [site, fiche, doc] = await Promise.all([
    lireSiteEdition(db(), artisanId),
    db().doc(chemins.artisan(artisanId)).get(),
    db().doc(chemins.site(artisanId)).get(),
  ]);
  const champs = doc.get('formulaire.champs') as ChampFormulaire[] | undefined;
  const suivi = entreeSuivi.safeParse(doc.get('suivi'));
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
    suivi: suivi.success ? suivi.data : SUIVI_VIDE,
    ...(ville ? { ville } : {}),
    modifieDepuisPublication:
      !site.versionPubliee || (site.brouillonModifieLe ?? 0) > (site.publieLe ?? 0),
  };
}

/**
 * Médiathèque de l'éditeur : photos des réalisations publiées (`lib:{id}/{i}`) et images importées
 * (`up:{id}`) → URL ; à part, les fichiers PDF à télécharger (`up:{id}` → nom et URL).
 */
export async function mediathequeDuSite(artisanId: string): Promise<{
  medias: Record<string, string>;
  fichiers: Record<string, { nom: string; url: string }>;
}> {
  const [r, importes] = await Promise.all([
    lirePhotosPubliees(db(), artisanId),
    lireMediasSite(db(), artisanId),
  ]);
  return {
    medias: Object.fromEntries([
      ...r.flatMap((x) => x.urls.map((u, i) => [`lib:${x.id}/${i}`, u])),
      ...importes.filter((m) => m.usage === 'image').map((m) => [m.cle, m.url]),
    ]),
    fichiers: Object.fromEntries(
      importes.filter((m) => m.usage === 'fichier').map((m) => [m.cle, { nom: m.nom, url: m.url }]),
    ),
  };
}

/** Images de l'aperçu (sans les fichiers à télécharger). */
export const mediasDuSite = async (artisanId: string) =>
  (await mediathequeDuSite(artisanId)).medias;

/**
 * Onglet Statistiques : 30 derniers jours pour tous ; 12 mois en plus avec Site Pro (12 lectures
 * de compteurs mensuels plutôt que 365 journaliers, COUTS.md).
 */
export async function statsDuSite(artisanId: string, sitePro: boolean) {
  const { jour, mois } = periodesParis(Date.now());
  const jours = joursPrecedents(jour, 30);
  const listeMois = sitePro ? moisPrecedents(mois, 12) : [];
  const [lusJours, lusMois] = await Promise.all([
    lireStatsSite(db(), artisanId, 'jour', jours),
    lireStatsSite(db(), artisanId, 'mois', listeMois),
  ]);
  return {
    jours: resumeStatsSite(lusJours, jours),
    ...(sitePro ? { mois: resumeStatsSite(lusMois, listeMois) } : {}),
  };
}
export type StatsDuSite = Awaited<ReturnType<typeof statsDuSite>>;

/** Onglet Pages : visites de chaque page ce mois-ci (un seul compteur lu, COUTS.md). */
export async function visitesDuMois(artisanId: string): Promise<Record<string, number>> {
  const [c] = await lireStatsSite(db(), artisanId, 'mois', [periodesParis(Date.now()).mois]);
  return c?.pages ?? {};
}

const INTENTIONS = (
  intentions as {
    intentions: { id: string; libelle: string; metier: string; popularite: number }[];
  }
).intentions;

/** Ce que la création assistée reprend de la fiche (jamais redemandé, SITE-IA-07). */
export async function ficheCreation(artisanId: string): Promise<FicheCreation> {
  const [artisan, publique, realisations] = await Promise.all([
    db().doc(chemins.artisan(artisanId)).get(),
    db().doc(chemins.artisanPublic(artisanId)).get(),
    lirePhotosPubliees(db(), artisanId, 30),
  ]);
  const a = artisan.data() ?? {};
  const metiers = (a.metiers as string[] | undefined) ?? [];
  const choisies = ((a.intentions as string[] | undefined) ?? [])
    .map((id) => INTENTIONS.find((i) => i.id === id)?.libelle)
    .filter((x): x is string => Boolean(x));
  const prestations = choisies.length
    ? choisies
    : INTENTIONS.filter((i) => metiers.includes(i.metier))
        .sort((x, y) => y.popularite - x.popularite)
        .map((i) => i.libelle)
        .slice(0, 8);
  return {
    metierPrincipal: (a.metierPrincipal as string | undefined) ?? '',
    metierNom: nomMetier((a.metierPrincipal as string | undefined) ?? ''),
    ville:
      (publique.get('ville') as string | undefined) ??
      (a.adresseSiege?.ville as string | undefined) ??
      '',
    prestations,
    nbPhotos: realisations.reduce((n, r) => n + r.urls.length, 0),
    nbAvis: (publique.get('nbAvis') as number | undefined) ?? 0,
    labels: (a.labels as string[] | undefined) ?? [],
    rayonKm: (a.zoneIntervention?.rayonKm as number | undefined) ?? 0,
    communesProches: (a.zoneIntervention?.communes as string[] | undefined) ?? [],
    ...(a.pitch ? { pitch: a.pitch as string } : {}),
  };
}
