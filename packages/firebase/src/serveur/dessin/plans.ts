import { randomBytes } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { apercuPlan, migrerScene, nouvelleScene, type Scene } from '@ph/core/dessin';
import { peut, type Membre } from '@ph/core/equipe';
import { ErreurMetier } from '@ph/core/erreurs';
import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import type { bucketFichiers } from '../../admin';
import { chemins, fichiers, type ProprietairePlan } from '../../chemins';

/**
 * Plans Dessin (DESSIN.md §4) : métadonnées dans Firestore, scène compressée dans Storage.
 * Toutes les écritures passent ici ; les règles n'autorisent que la lecture des métadonnées.
 */
export interface ServicesDessin {
  db: Firestore;
  bucket: ReturnType<typeof bucketFichiers>;
  horloge: () => number;
}

export interface ContexteDessin {
  proprietaire: ProprietairePlan;
  /** Utilisateur connecté qui agit. */
  uid: string;
}

/** Garde-fous techniques (D84) : Dessin est gratuit. */
export const QUOTA_PLANS_PARTICULIER = 5;
export const TAILLE_MAX_SCENE = 5 * 1024 * 1024;
/** Une version automatique au plus toutes les 10 minutes d'édition (DES-40). */
const INTERVALLE_VERSION_AUTO = 10 * 60 * 1000;
/** Historique : 50 versions au-delà de 30 jours (les plus récentes sont toujours gardées). */
const VERSIONS_GARDEES = 50;
const JOUR = 24 * 60 * 60 * 1000;
const JOURS_HISTORIQUE = 30;
export const JOURS_CORBEILLE = 30;

export interface PlanLu {
  planId: string;
  titre: string;
  versionCourante: number;
  majLe: Date;
  supprimeLe: Date | null;
  taille: number;
  /** Chemin SVG des murs du rez-de-chaussée (DES-02), vide sans mur. */
  apercu: string;
}

/** Particulier : lui-même. Entreprise : membre actif avec `dessin.gerer`, relu en base. */
export async function exigerAcces(s: ServicesDessin, ctx: ContexteDessin, t?: Transaction) {
  const p = ctx.proprietaire;
  if (p.type === 'particulier') {
    if (p.id !== ctx.uid) throw new ErreurMetier('PERMISSION_REFUSEE');
    return;
  }
  const ref = s.db.doc(chemins.membre(p.id, ctx.uid));
  const m = t ? await t.get(ref) : await ref.get();
  if (!peut(m.data() as Membre | undefined, 'dessin.gerer'))
    throw new ErreurMetier('PERMISSION_REFUSEE');
}

function compresser(scene: unknown): { scene: Scene; donnees: Buffer } {
  const r = migrerScene(scene);
  if (!r.ok) throw new ErreurMetier(r.code, r.message);
  const donnees = gzipSync(JSON.stringify(r.data));
  if (donnees.length > TAILLE_MAX_SCENE)
    throw new ErreurMetier('ENTREE_INVALIDE', 'Plan trop lourd (5 Mo au plus).');
  return { scene: r.data, donnees };
}

const suffixe = () => randomBytes(6).toString('hex');
const fichierScene = (p: ProprietairePlan, planId: string, revision: number) =>
  `${fichiers.dossierPlan(p, planId)}r${revision}-${suffixe()}.json.gz`;

async function ecrire(s: ServicesDessin, chemin: string, donnees: Buffer) {
  await s.bucket.file(chemin).save(donnees, {
    contentType: 'application/json',
    metadata: { contentEncoding: 'gzip' },
    resumable: false,
  });
}

async function effacer(s: ServicesDessin, chemin: string | undefined) {
  if (chemin) await s.bucket.file(chemin).delete({ ignoreNotFound: true });
}

async function compterPlansActifs(s: ServicesDessin, p: ProprietairePlan, t?: Transaction) {
  const q = s.db.collection(chemins.plans(p)).where('supprimeLe', '==', null);
  const r = t ? await t.get(q) : await q.get();
  return r.size;
}

async function verifierQuota(s: ServicesDessin, ctx: ContexteDessin, t: Transaction) {
  if (ctx.proprietaire.type !== 'particulier') return;
  if ((await compterPlansActifs(s, ctx.proprietaire, t)) >= QUOTA_PLANS_PARTICULIER)
    throw new ErreurMetier(
      'PRECONDITION',
      `Vous avez déjà ${QUOTA_PLANS_PARTICULIER} plans : supprimez-en un pour en créer un autre.`,
    );
}

/** Nouveau plan (DES-01) : scène fournie (forme, modèle, essai) ou scène vide. */
export async function creerPlan(
  s: ServicesDessin,
  ctx: ContexteDessin,
  e: { titre: string; scene?: unknown },
): Promise<{ planId: string }> {
  await exigerAcces(s, ctx);
  const ref = s.db.collection(chemins.plans(ctx.proprietaire)).doc();
  const { donnees, scene } = compresser(
    e.scene ?? nouvelleScene((prefixe) => `${prefixe}_${suffixe()}`),
  );
  const chemin = fichierScene(ctx.proprietaire, ref.id, 1);
  await ecrire(s, chemin, donnees);
  try {
    await s.db.runTransaction(async (t) => {
      await verifierQuota(s, ctx, t);
      const maintenant = Timestamp.fromMillis(s.horloge());
      t.create(ref, {
        schemaVersion: 1,
        titre: e.titre.trim(),
        versionCourante: 1,
        storagePath: chemin,
        derniereVersionLe: null,
        courantDansHistorique: false,
        taille: donnees.length,
        apercu: apercuPlan(scene),
        creeLe: maintenant,
        majLe: maintenant,
        supprimeLe: null,
        ...(ctx.proprietaire.type === 'entreprise' ? { auteurUid: ctx.uid } : {}),
      });
    });
  } catch (erreur) {
    await effacer(s, chemin);
    throw erreur;
  }
  return { planId: ref.id };
}

export async function lireMeta(
  s: ServicesDessin,
  ctx: ContexteDessin,
  planId: string,
  t?: Transaction,
) {
  const ref = s.db.doc(chemins.plan(ctx.proprietaire, planId));
  const doc = t ? await t.get(ref) : await ref.get();
  if (!doc.exists) throw new ErreurMetier('INTROUVABLE');
  return doc;
}

/** Scène courante du plan, migrée vers la version actuelle du format. */
export async function lirePlan(
  s: ServicesDessin,
  ctx: ContexteDessin,
  planId: string,
): Promise<{ titre: string; versionCourante: number; scene: Scene }> {
  await exigerAcces(s, ctx);
  const doc = await lireMeta(s, ctx, planId);
  return {
    titre: doc.get('titre') as string,
    versionCourante: doc.get('versionCourante') as number,
    scene: await lireScene(s, doc.get('storagePath') as string),
  };
}

export async function lireScene(s: ServicesDessin, chemin: string): Promise<Scene> {
  const [brut] = await s.bucket.file(chemin).download();
  // Selon l'émulateur ou le SDK, le contenu peut arriver déjà décompressé.
  const texte = brut[0] === 0x1f && brut[1] === 0x8b ? gunzipSync(brut) : brut;
  const r = migrerScene(JSON.parse(texte.toString('utf8')));
  if (!r.ok) throw new ErreurMetier(r.code, r.message);
  return r.data;
}

/**
 * Enregistrement (DES-39, DES-40) : refusé avec CONFLIT si un autre onglet ou un autre membre
 * a enregistré depuis la lecture. Garde une version toutes les 10 minutes, ou si elle est nommée.
 */
export async function enregistrerPlan(
  s: ServicesDessin,
  ctx: ContexteDessin,
  e: { planId: string; versionAttendue: number; scene: unknown; nomVersion?: string },
): Promise<{ versionCourante: number }> {
  await exigerAcces(s, ctx);
  const { donnees, scene } = compresser(e.scene);
  const chemin = fichierScene(ctx.proprietaire, e.planId, e.versionAttendue + 1);
  await ecrire(s, chemin, donnees);
  // Fichier précédent à effacer après coup, sauf s'il est gardé dans l'historique.
  let aEffacer: string | undefined;
  let garder = false;
  try {
    await s.db.runTransaction(async (t) => {
      const doc = await lireMeta(s, ctx, e.planId, t);
      if (doc.get('supprimeLe'))
        throw new ErreurMetier('PRECONDITION', 'Ce plan est à la corbeille.');
      const courante = doc.get('versionCourante') as number;
      if (courante !== e.versionAttendue)
        throw new ErreurMetier(
          'CONFLIT',
          'Ce plan a été modifié ailleurs (autre onglet ou autre membre). Rechargez-le.',
        );
      const maintenant = s.horloge();
      const derniere = (doc.get('derniereVersionLe') as Timestamp | null)?.toMillis() ?? 0;
      garder = e.nomVersion !== undefined || maintenant - derniere >= INTERVALLE_VERSION_AUTO;
      aEffacer =
        doc.get('courantDansHistorique') === true ? undefined : (doc.get('storagePath') as string);
      const numero = courante + 1;
      t.update(doc.ref, {
        versionCourante: numero,
        storagePath: chemin,
        courantDansHistorique: garder,
        taille: donnees.length,
        apercu: apercuPlan(scene),
        majLe: Timestamp.fromMillis(maintenant),
        ...(garder ? { derniereVersionLe: Timestamp.fromMillis(maintenant) } : {}),
      });
      // La version gardée pointe sur le même fichier : aucune copie.
      if (garder)
        t.create(s.db.doc(chemins.versionPlan(ctx.proprietaire, e.planId, numero)), {
          numero,
          storagePath: chemin,
          auteurUid: ctx.uid,
          type: e.nomVersion ? 'manuelle' : 'auto',
          ...(e.nomVersion ? { nom: e.nomVersion } : {}),
          taille: donnees.length,
          creeLe: Timestamp.fromMillis(maintenant),
        });
    });
  } catch (erreur) {
    await effacer(s, chemin);
    throw erreur;
  }
  await effacer(s, aEffacer);
  if (garder) await elaguerVersions(s, ctx.proprietaire, e.planId);
  return { versionCourante: e.versionAttendue + 1 };
}

/** Versions de plus de 30 jours au-delà des 50 plus récentes : supprimées. */
async function elaguerVersions(s: ServicesDessin, p: ProprietairePlan, planId: string) {
  const versions = await s.db
    .collection(chemins.versionsPlan(p, planId))
    .orderBy('numero', 'desc')
    .offset(VERSIONS_GARDEES)
    .get();
  const limite = s.horloge() - JOURS_HISTORIQUE * JOUR;
  for (const v of versions.docs) {
    if ((v.get('creeLe') as Timestamp).toMillis() > limite) continue;
    await effacer(s, v.get('storagePath') as string);
    await v.ref.delete();
  }
}

export async function listerVersions(s: ServicesDessin, ctx: ContexteDessin, planId: string) {
  await exigerAcces(s, ctx);
  const r = await s.db
    .collection(chemins.versionsPlan(ctx.proprietaire, planId))
    .orderBy('numero', 'desc')
    .limit(100)
    .get();
  return r.docs.map((d) => ({
    numero: d.get('numero') as number,
    type: d.get('type') as 'auto' | 'manuelle' | 'restauration',
    nom: (d.get('nom') as string | undefined) ?? null,
    creeLe: (d.get('creeLe') as Timestamp).toDate(),
  }));
}

/** Aperçu d'une version (DES-40) : sa scène, sans rien changer au plan. */
export async function lireVersion(
  s: ServicesDessin,
  ctx: ContexteDessin,
  e: { planId: string; numero: number },
): Promise<{ scene: Scene }> {
  await exigerAcces(s, ctx);
  await lireMeta(s, ctx, e.planId);
  const v = await s.db.doc(chemins.versionPlan(ctx.proprietaire, e.planId, e.numero)).get();
  if (!v.exists) throw new ErreurMetier('INTROUVABLE');
  return { scene: await lireScene(s, v.get('storagePath') as string) };
}

/** Restaurer une version (DES-40) : la scène redevient courante, rien n'est écrasé. */
export async function restaurerVersion(
  s: ServicesDessin,
  ctx: ContexteDessin,
  e: { planId: string; numero: number; versionAttendue: number },
): Promise<{ versionCourante: number }> {
  await exigerAcces(s, ctx);
  const v = await s.db.doc(chemins.versionPlan(ctx.proprietaire, e.planId, e.numero)).get();
  if (!v.exists) throw new ErreurMetier('INTROUVABLE');
  const scene = await lireScene(s, v.get('storagePath') as string);
  return enregistrerPlan(s, ctx, {
    planId: e.planId,
    versionAttendue: e.versionAttendue,
    scene,
    nomVersion: `Restauration de la version ${e.numero}`,
  });
}

export async function listerPlans(s: ServicesDessin, ctx: ContexteDessin): Promise<PlanLu[]> {
  await exigerAcces(s, ctx);
  const r = await s.db
    .collection(chemins.plans(ctx.proprietaire))
    .orderBy('majLe', 'desc')
    .limit(200)
    .get();
  return r.docs.map((d) => ({
    planId: d.id,
    titre: d.get('titre') as string,
    versionCourante: d.get('versionCourante') as number,
    majLe: (d.get('majLe') as Timestamp).toDate(),
    supprimeLe: (d.get('supprimeLe') as Timestamp | null)?.toDate() ?? null,
    taille: d.get('taille') as number,
    apercu: (d.get('apercu') as string | undefined) ?? '',
  }));
}

export async function renommerPlan(
  s: ServicesDessin,
  ctx: ContexteDessin,
  e: { planId: string; titre: string },
): Promise<void> {
  await exigerAcces(s, ctx);
  const doc = await lireMeta(s, ctx, e.planId);
  await doc.ref.update({ titre: e.titre.trim(), majLe: Timestamp.fromMillis(s.horloge()) });
}

export async function dupliquerPlan(
  s: ServicesDessin,
  ctx: ContexteDessin,
  planId: string,
): Promise<{ planId: string }> {
  const original = await lirePlan(s, ctx, planId);
  return creerPlan(s, ctx, {
    titre: `Copie de ${original.titre}`.slice(0, 120),
    scene: original.scene,
  });
}

/** Corbeille (DES-02) : 30 jours avant suppression définitive par la purge de nuit. */
export async function mettreALaCorbeille(s: ServicesDessin, ctx: ContexteDessin, planId: string) {
  await exigerAcces(s, ctx);
  const doc = await lireMeta(s, ctx, planId);
  await doc.ref.update({ supprimeLe: Timestamp.fromMillis(s.horloge()) });
}

export async function restaurerDeLaCorbeille(
  s: ServicesDessin,
  ctx: ContexteDessin,
  planId: string,
): Promise<void> {
  await exigerAcces(s, ctx);
  await s.db.runTransaction(async (t) => {
    const doc = await lireMeta(s, ctx, planId, t);
    if (!doc.get('supprimeLe')) return;
    await verifierQuota(s, ctx, t);
    t.update(doc.ref, { supprimeLe: null });
  });
}
