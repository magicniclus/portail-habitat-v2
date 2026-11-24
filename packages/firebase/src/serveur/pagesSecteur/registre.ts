import { lireFiltresAnnuaire } from '@ph/core/annuaire';
import { plagesGeohash } from '@ph/core/geo';
import {
  communesDeLArtisan,
  majCompte,
  nouvellePage,
  pagesAAssurer,
  RAYON_SECTEUR_KM,
} from '@ph/core/pages-secteur';
import {
  artisanPublic,
  pageSecteur,
  type CommuneSecteur,
  type PageSecteur,
} from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import type { Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { fichesAutour, trierResultats } from '../annuaire';
import { convertisseur, depot } from '../depot';
import type { SourceCommunes } from './communes';

type FichePublique = z.output<typeof artisanPublic>;
type Point = { latitude: number; longitude: number };

export interface CtxSecteur {
  db: Firestore;
  horloge: () => number;
  communes: SourceCommunes;
}

const pages = (db: Firestore) => depot(db, collections.pagesSecteur, pageSecteur);
/** Rayon de recherche des communes voisines : au-delà, la page ne parlerait plus du secteur. */
const RAYON_COMMUNES_MAX = 30;

/**
 * Artisans en ligne d'un métier dans le secteur d'une commune : exactement ceux que la page
 * affiche (même lecture et mêmes filtres que l'annuaire, rayon de 20 km).
 */
export async function compterSecteur(
  db: Firestore,
  metier: string,
  centre: Point,
  cache?: Map<string, Awaited<ReturnType<typeof fichesAutour>>>,
): Promise<number> {
  const cle = `${centre.latitude},${centre.longitude}`;
  let fiches = cache?.get(cle);
  if (!fiches) {
    fiches = await fichesAutour(db, centre, RAYON_SECTEUR_KM);
    cache?.set(cle, fiches);
  }
  const r = trierResultats(
    fiches,
    lireFiltresAnnuaire({ metier, rayon: String(RAYON_SECTEUR_KM) }),
  );
  return r.premium.length + r.standards.length;
}

/** Ce qui compte pour les pages : en ligne, métiers, position, rayon. Le reste ne change rien. */
function empreinte(f: FichePublique | undefined): string {
  if (!f?.enLigne) return 'hors-ligne';
  return JSON.stringify([[...f.metiers].sort(), f.geo.latitude, f.geo.longitude, f.rayonKm]);
}

/** Pages déjà enregistrées autour d'un point (requêtes par plages de geohash). */
async function pagesAutour(db: Firestore, p: Point, metiers: Set<string>) {
  const lots = await Promise.all(
    plagesGeohash(p, RAYON_SECTEUR_KM).map(([debut, fin]) =>
      pages(db).reference.orderBy('geohash').startAt(debut).endBefore(fin).get(),
    ),
  );
  const r = new Map<string, PageSecteur>();
  for (const d of lots.flatMap((l) => l.docs))
    if (metiers.has(d.data().metier)) r.set(d.id, d.data());
  return r;
}

/**
 * Une fiche publique a changé (déclencheur sur `artisansPublic`) : crée les pages manquantes de
 * ses métiers (sa commune + grandes voisines de sa zone) et recompte les pages voisines, avant et
 * après le changement. N'écrit que ce qui change (COUTS, règle 5).
 */
export async function suivreArtisan(
  ctx: CtxSecteur,
  avant: FichePublique | undefined,
  apres: FichePublique | undefined,
): Promise<{ creees: string[]; maj: string[] }> {
  const vide = { creees: [], maj: [] };
  if (empreinte(avant) === empreinte(apres)) return vide;
  const maintenant = new Date(ctx.horloge());
  const metiers = new Set([...(avant?.metiers ?? []), ...(apres?.metiers ?? [])]);

  const aCreer = new Map<string, { metier: string; commune: CommuneSecteur }>();
  if (apres?.enLigne) {
    const [siege, voisines] = await Promise.all([
      ctx.communes.duPoint(apres.geo),
      ctx.communes.autour(apres.geo, Math.min(apres.rayonKm, RAYON_COMMUNES_MAX)),
    ]);
    for (const p of pagesAAssurer(
      apres.metiers,
      communesDeLArtisan(siege, voisines, apres.rayonKm),
    ))
      aCreer.set(p.id, p);
  }

  const existantes = new Map<string, PageSecteur>();
  for (const f of [avant, apres])
    if (f) for (const [id, p] of await pagesAutour(ctx.db, f.geo, metiers)) existantes.set(id, p);
  // Pages à créer qui existent déjà, hors du rayon de 20 km de l'artisan (grandes voisines).
  const inconnues = [...aCreer.keys()].filter((id) => !existantes.has(id));
  const lues = await Promise.all(inconnues.map((id) => pages(ctx.db).lire(id)));
  inconnues.forEach((id, i) => {
    const p = lues[i];
    if (p) existantes.set(id, p);
  });

  const cache = new Map<string, Awaited<ReturnType<typeof fichesAutour>>>();
  const creees: string[] = [];
  const maj: string[] = [];
  for (const [id, p] of aCreer) {
    if (existantes.has(id)) continue;
    const nb = await compterSecteur(ctx.db, p.metier, p.commune.centre, cache);
    await pages(ctx.db).ecrire(id, nouvellePage(p.metier, p.commune, nb, maintenant));
    creees.push(id);
  }
  for (const [id, p] of existantes) {
    const nb = await compterSecteur(ctx.db, p.metier, p.commune.centre, cache);
    const champs = majCompte(p, nb, maintenant);
    if (!champs) continue;
    await pages(ctx.db).reference.doc(id).update(champs);
    maj.push(id);
  }
  return { creees, maj };
}

/**
 * Recomptage de nuit (filet de sécurité : déclencheur manqué, artisan suspendu par l'admin) :
 * par lots dans l'ordre des identifiants, reprise après `apres`. Rend le dernier identifiant lu.
 */
export async function recompterPages(
  ctx: Pick<CtxSecteur, 'db' | 'horloge'>,
  o: { apres?: string; limite?: number } = {},
): Promise<{ lues: number; maj: number; dernier: string | null }> {
  let q = pages(ctx.db)
    .reference.orderBy('__name__')
    .limit(o.limite ?? 300);
  if (o.apres) q = q.startAfter(o.apres);
  const snap = await q.get();
  const maintenant = new Date(ctx.horloge());
  const cache = new Map<string, Awaited<ReturnType<typeof fichesAutour>>>();
  let maj = 0;
  for (const d of snap.docs) {
    const p = d.data();
    const champs = majCompte(
      p,
      await compterSecteur(ctx.db, p.metier, p.commune.centre, cache),
      maintenant,
    );
    if (!champs) continue;
    await d.ref.update(champs);
    maj++;
  }
  return { lues: snap.size, maj, dernier: snap.docs.at(-1)?.id ?? null };
}

/** Admin : bloquer (jamais indexée, aucun texte IA) ou débloquer une page. */
export async function bloquerPage(
  ctx: Pick<CtxSecteur, 'db' | 'horloge'>,
  id: string,
  bloquee: boolean,
): Promise<boolean> {
  const p = await pages(ctx.db).lire(id);
  if (!p) return false;
  await pages(ctx.db)
    .reference.doc(id)
    .update({
      bloquee,
      indexable: bloquee ? false : p.nbArtisans >= 1,
      majLe: new Date(ctx.horloge()),
    });
  return true;
}

/** Page du registre (page publique, admin). */
export const lirePageSecteur = (db: Firestore, id: string) => pages(db).lire(id);

/** Pages indexables (sitemap, liens entre pages). */
export async function pagesIndexables(db: Firestore, limite = 5_000) {
  const snap = await pages(db).reference.where('indexable', '==', true).limit(limite).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Pages indexées du même métier dans le département (liens « près de ») ; jamais de lien vers une page non indexée. */
export async function voisinesIndexables(
  db: Firestore,
  metier: string,
  departement: string,
  limite = 24,
) {
  const s = await pages(db)
    .reference.where('metier', '==', metier)
    .where('indexable', '==', true)
    .where('commune.departement', '==', departement)
    .limit(limite)
    .get();
  return s.docs.map((d) => ({
    id: d.id,
    commune: d.data().commune,
    nbArtisans: d.data().nbArtisans,
  }));
}

/** Métiers qui ont une page indexée dans une commune (liens « autres artisans à … »). */
export async function metiersIndexablesDeCommune(db: Firestore, slug: string, limite = 30) {
  const s = await pages(db)
    .reference.where('commune.slug', '==', slug)
    .where('indexable', '==', true)
    .limit(limite)
    .get();
  return s.docs.map((d) => d.data().metier);
}

/** Communes où un métier a une page indexée (page du métier), les plus peuplées d'abord. */
export async function communesIndexablesDuMetier(db: Firestore, metier: string, limite = 200) {
  const s = await pages(db)
    .reference.where('metier', '==', metier)
    .where('indexable', '==', true)
    .limit(limite)
    .get();
  return s.docs
    .map((d) => d.data().commune)
    .sort((a, b) => b.population - a.population || a.nom.localeCompare(b.nom, 'fr'));
}

/**
 * Rattrapage (mise en service, puis au besoin) : passe chaque fiche publique en ligne comme si
 * elle venait d'être publiée. Par lots dans l'ordre des identifiants, reprise après `apres`.
 */
export async function rattraperPagesSecteur(
  ctx: CtxSecteur,
  o: { apres?: string; limite?: number } = {},
): Promise<{ lues: number; creees: number; dernier: string | null }> {
  let q = ctx.db
    .collection(collections.artisansPublic)
    .withConverter(convertisseur(artisanPublic))
    .orderBy('__name__')
    .limit(o.limite ?? 100);
  if (o.apres) q = q.startAfter(o.apres);
  const snap = await q.get();
  let creees = 0;
  for (const d of snap.docs)
    creees += (await suivreArtisan(ctx, undefined, d.data())).creees.length;
  return { lues: snap.size, creees, dernier: snap.docs.at(-1)?.id ?? null };
}
