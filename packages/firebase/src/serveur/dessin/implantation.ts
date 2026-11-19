import { randomBytes } from 'node:crypto';
import { versLambert93, type ParcelleCadastre, type PointL93 } from '@ph/core/dessin';
import { ErreurMetier } from '@ph/core/erreurs';
import { z } from '@ph/core/zod';
import { fichiers } from '../../chemins';
import { lirePlan, type ContexteDessin, type ServicesDessin } from './plans';

/**
 * Implantation (DES-35, D87) : services publics gratuits et sans clé de l'IGN, appelés par le
 * serveur seulement (la politique de sécurité du site ne change pas). Adresse → Géoplateforme ;
 * parcelle → API Carto cadastre ; photo aérienne + limites cadastrales → WMS Géoplateforme,
 * enregistrée une fois dans le dossier du plan (comme un plan importé).
 */
const URL_ADRESSE = 'https://data.geopf.fr/geocodage/search';
const URL_PARCELLE = 'https://apicarto.ign.fr/api/cadastre/parcelle';
const URL_WMS = 'https://data.geopf.fr/wms-r/wms';
const DELAI = 6_000;
/** Photo carrée : 1 280 px, parcelle + 25 m de marge, 80 m de côté au moins. */
const PIXELS = 1_280;
const MARGE = 25_000;
const COTE_MIN = 80_000;

export interface Adresse {
  libelle: string;
  lon: number;
  lat: number;
}

const point = z.tuple([z.number(), z.number()]);
const reponseAdresses = z.object({
  features: z.array(
    z.object({
      geometry: z.object({ coordinates: point }),
      properties: z.object({ label: z.string() }),
    }),
  ),
});
const reponseParcelles = z.object({
  features: z.array(
    z.object({
      geometry: z.discriminatedUnion('type', [
        z.object({ type: z.literal('Polygon'), coordinates: z.array(z.array(point)) }),
        z.object({
          type: z.literal('MultiPolygon'),
          coordinates: z.array(z.array(z.array(point))),
        }),
      ]),
      properties: z.object({ idu: z.string(), code_insee: z.string().optional() }),
    }),
  ),
});

async function lireJson(f: typeof fetch, url: string): Promise<unknown> {
  const r = await f(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(DELAI),
  }).catch(() => null);
  if (!r?.ok) throw new ErreurMetier('INDISPONIBLE');
  return r.json().catch(() => null);
}

/** Adresses proposées (5 au plus) pour un texte saisi. */
export async function chercherAdresses(texte: string, f: typeof fetch = fetch): Promise<Adresse[]> {
  const url = `${URL_ADRESSE}?index=address&limit=5&q=${encodeURIComponent(texte)}`;
  const corps = reponseAdresses.safeParse(await lireJson(f, url));
  if (!corps.success) throw new ErreurMetier('INDISPONIBLE');
  return corps.data.features.map((x) => ({
    libelle: x.properties.label,
    lon: x.geometry.coordinates[0],
    lat: x.geometry.coordinates[1],
  }));
}

/** Image JPEG de la photo aérienne (avec les limites cadastrales si le service les donne). */
async function photoAerienne(f: typeof fetch, emprise: string): Promise<Buffer | null> {
  for (const couches of [
    ['ORTHOIMAGERY.ORTHOPHOTOS', 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS'],
    ['ORTHOIMAGERY.ORTHOPHOTOS'],
  ]) {
    const url =
      `${URL_WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&CRS=EPSG:2154&FORMAT=image/jpeg` +
      `&LAYERS=${couches.join(',')}&STYLES=${couches.map(() => '').join(',')}` +
      `&WIDTH=${PIXELS}&HEIGHT=${PIXELS}&BBOX=${emprise}`;
    const r = await f(url, { signal: AbortSignal.timeout(DELAI * 2) }).catch(() => null);
    if (!r?.ok || !(r.headers.get('content-type') ?? '').startsWith('image/jpeg')) continue;
    const donnees = Buffer.from(await r.arrayBuffer());
    if (donnees[0] === 0xff && donnees[1] === 0xd8) return donnees;
  }
  return null;
}

/**
 * Parcelle sous un point (longitude, latitude) : contour en Lambert-93 et photo aérienne
 * enregistrée dans le dossier du plan (l'ancienne est remplacée). Sans photo si le service
 * d'images ne répond pas : la parcelle suffit.
 */
export async function chargerParcelle(
  s: ServicesDessin,
  ctx: ContexteDessin,
  e: { planId: string; lon: number; lat: number },
  f: typeof fetch = fetch,
): Promise<ParcelleCadastre> {
  await lirePlan(s, ctx, e.planId);
  const geom = JSON.stringify({ type: 'Point', coordinates: [e.lon, e.lat] });
  const corps = reponseParcelles.safeParse(
    await lireJson(f, `${URL_PARCELLE}?geom=${encodeURIComponent(geom)}`),
  );
  if (!corps.success) throw new ErreurMetier('INDISPONIBLE');
  const parcelle = corps.data.features[0];
  if (!parcelle)
    throw new ErreurMetier('INTROUVABLE', 'Aucune parcelle cadastrale à cette adresse.');
  const g = parcelle.geometry;
  const anneau = g.type === 'Polygon' ? g.coordinates[0] : g.coordinates[0]?.[0];
  const sommets = (anneau ?? []).map(([lon, lat]) => versLambert93(lon, lat));
  const ferme = sommets.length > 1 && sommets[0]!.x === sommets.at(-1)!.x;
  const contour: PointL93[] =
    ferme && sommets[0]!.y === sommets.at(-1)!.y ? sommets.slice(0, -1) : sommets;
  if (contour.length < 3 || contour.length > 500)
    throw new ErreurMetier('PRECONDITION', 'Contour de parcelle illisible.');

  const xs = contour.map((p) => p.x);
  const ys = contour.map((p) => p.y);
  const cote = Math.max(
    COTE_MIN,
    Math.max(...xs) - Math.min(...xs) + 2 * MARGE,
    Math.max(...ys) - Math.min(...ys) + 2 * MARGE,
  );
  const [cx, cy] = [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
  ];
  const emprise = {
    x0: Math.round(cx - cote / 2),
    y0: Math.round(cy - cote / 2),
    x1: Math.round(cx + cote / 2),
    y1: Math.round(cy + cote / 2),
  };
  const enMetres = [emprise.x0, emprise.y0, emprise.x1, emprise.y1].map((v) => v / 1000).join(',');
  const image = await photoAerienne(f, enMetres);
  const resultat: ParcelleCadastre = {
    reference: parcelle.properties.idu,
    codeInsee: parcelle.properties.code_insee ?? parcelle.properties.idu.slice(0, 5),
    contour,
  };
  if (!image) return resultat;
  const dossier = fichiers.dossierPlan(ctx.proprietaire, e.planId);
  const [anciennes] = await s.bucket.getFiles({ prefix: `${dossier}ortho-` });
  await Promise.all(anciennes.map((x) => x.delete({ ignoreNotFound: true })));
  const storagePath = `${dossier}ortho-${randomBytes(6).toString('hex')}.jpg`;
  await s.bucket.file(storagePath).save(image, { contentType: 'image/jpeg', resumable: false });
  return { ...resultat, orthophoto: { storagePath, emprise } };
}
