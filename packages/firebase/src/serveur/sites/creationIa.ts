import { ErreurMetier } from '@ph/core/erreurs';
import { coutCentimes } from '@ph/core/ia';
import { droitsDe, type DroitsFormule, type Formule } from '@ph/core/paiements';
import {
  appliquerOperations,
  lireSortieIa,
  MAX_OPERATIONS,
  messageCreationPage,
  MODELE_MODE,
  planCreation,
  PROMPT_SYSTEME_IA_SITE,
  QUOTAS_MOIS_SITE_PRO,
  resumeArbre,
  SCHEMA_JSON_IA_SITE,
  textesDuSite,
  VERSION_PROMPT_IA_SITE,
  type FicheCreation,
  type OperationIa,
  type PagePlanifiee,
  type ReponsesCreation,
} from '@ph/core/sites';
import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { exigerSite, type ContexteSite } from './edition';
import { garderFaitsOperation, type ServicesIaSite } from './ia';
import { lireSiteEdition } from './lecture';

/** État de la création assistée : `sites/{id}/iaCreation/courante`. */
type StatutCreation = 'en_cours' | 'apercu' | 'attente_paiement' | 'terminee';

const moisParis = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(ms).slice(0, 7);
const jourFr = (ms: number) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'long' }).format(ms);

function iaComplete(d: Partial<DroitsFormule> | undefined): { complet: boolean; mult: number } {
  const f = droitsDe((d?.formule as Formule | undefined) ?? 'gratuit');
  return {
    complet: (d?.iaSite ?? f.iaSite) === 'complet',
    mult: d?.iaMultiplicateur ?? f.iaMultiplicateur,
  };
}

/** Crédit « création » du mois (Site Pro) ; ou l'unique aperçu gratuit de l'accueil (D48 ⏳). */
async function reserver(
  s: ServicesIaSite,
  ctx: ContexteSite,
  complet: boolean,
  mult: number,
): Promise<() => Promise<unknown>> {
  const ref = s.db.doc(
    chemins.compteurIaSite(ctx.artisanId, complet ? moisParis(s.horloge()) : 'essai'),
  );
  const champ = complet ? 'creation' : 'apercu';
  const max = complet ? QUOTAS_MOIS_SITE_PRO.creation * mult : 1;
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    const n = ((await t.get(ref)).get(champ) as number | undefined) ?? 0;
    if (n >= max)
      throw new ErreurMetier(
        'TROP_DE_REQUETES',
        complet
          ? `Vous avez utilisé vos ${max} créations de site de ce mois-ci.`
          : 'L’aperçu gratuit a déjà été utilisé. Avec Site Pro, l’IA crée toutes les pages.',
      );
    t.set(ref, { schemaVersion: 1, [champ]: FieldValue.increment(1) }, { merge: true });
  });
  return () => ref.set({ [champ]: FieldValue.increment(-1) }, { merge: true });
}

/** Sauvegarde « Avant IA – date » du brouillon dans Mes modèles (SITE-IA-09). */
async function sauvegarderAvantIa(s: ServicesIaSite, artisanId: string): Promise<string> {
  const site = await lireSiteEdition(s.db, artisanId);
  const ref = s.db.collection(chemins.modelesSite(artisanId)).doc();
  await ref.set({
    schemaVersion: 1,
    nom: `Avant IA – ${jourFr(s.horloge())}`,
    type: 'avant_ia',
    pages: site.pages,
    navigation: site.navigation ?? null,
    theme: site.theme ?? null,
    createdAt: Timestamp.fromMillis(s.horloge()),
  });
  return ref.id;
}

/**
 * Début de la création assistée (IA_SITE §3.1, §4) : réponses gardées pour la reprise après
 * paiement (SITE-IA-02). Site Pro : un crédit « création », sauvegarde « Avant IA », toutes les
 * pages. Sans Site Pro : l'aperçu de l'accueil seulement, une fois, jamais appliqué au site.
 */
export async function demarrerCreationIa(
  s: ServicesIaSite,
  ctx: ContexteSite,
  e: { reponses: ReponsesCreation; fiche: FicheCreation },
): Promise<{ statut: StatutCreation; plan: PagePlanifiee[] }> {
  if (!s.client)
    throw new ErreurMetier('INDISPONIBLE', 'L’assistant du site n’est pas encore disponible.');
  const artisan = await s.db.doc(chemins.artisan(ctx.artisanId)).get();
  const { complet, mult } = iaComplete(artisan.get('droits'));
  await reserver(s, ctx, complet, mult);
  const plan = planCreation(e.reponses, e.fiche);
  const statut: StatutCreation = complet ? 'en_cours' : 'apercu';
  const avantIa = complet ? await sauvegarderAvantIa(s, ctx.artisanId) : undefined;
  await s.db.doc(chemins.creationIaSite(ctx.artisanId)).set({
    schemaVersion: 1,
    statut,
    reponses: e.reponses,
    fiche: e.fiche,
    plan: complet ? plan : plan.slice(0, 1),
    faites: [],
    ...(avantIa ? { avantIa } : {}),
    updatedAt: Timestamp.fromMillis(s.horloge()),
  });
  return { statut, plan: complet ? plan : plan.slice(0, 1) };
}

/**
 * Une page de la création (accueil d'abord) : une opération `remplacerContenuPage` ou
 * `creerPage`, validée et passée au garde-fou des faits. En aperçu gratuit, la proposition est
 * gardée pour la reprise et n'est jamais appliquée au site (SITE-IA-01).
 */
export async function genererPageCreation(
  s: ServicesIaSite,
  ctx: ContexteSite,
  cle: string,
): Promise<{ operations: OperationIa[]; avertissements: string[]; apercu: boolean }> {
  if (!s.client)
    throw new ErreurMetier('INDISPONIBLE', 'L’assistant du site n’est pas encore disponible.');
  const refCreation = s.db.doc(chemins.creationIaSite(ctx.artisanId));
  const c = (await refCreation.get()).data() as DocumentData | undefined;
  if (!c || !['en_cours', 'apercu'].includes(c.statut as string))
    throw new ErreurMetier('PRECONDITION', 'Aucune création en cours.');
  await s.db.runTransaction((t) => exigerSite(s, t, ctx));
  const page = (c.plan as PagePlanifiee[]).find((p) => p.cle === cle);
  if (!page) throw new ErreurMetier('INTROUVABLE');
  const site = await lireSiteEdition(s.db, ctx.artisanId);
  if (!site.navigation || !site.theme) throw new ErreurMetier('INTROUVABLE');
  const brouillon = { pages: site.pages, navigation: site.navigation, theme: site.theme };
  const reponses = JSON.stringify(c.reponses);
  const fiche = JSON.stringify(c.fiche);
  const sources = `${fiche}\n${reponses}\n${textesDuSite(site.pages)}`;
  const modele = MODELE_MODE.page;
  let demande = messageCreationPage({
    nom: page.nom,
    consigne: page.consigne,
    ...(page.remplace ? { remplace: page.remplace } : {}),
    reponses,
    exclus: ((c.reponses as ReponsesCreation).exclus ?? []) as string[],
  });
  let cout = 0;
  for (let essai = 0; essai < 2; essai++) {
    const r = await s.client({
      modele,
      systeme: PROMPT_SYSTEME_IA_SITE,
      contexte: `Fiche vérifiée de l'artisan :\n${fiche}\n\nRésumé du site :\n${resumeArbre(brouillon)}`,
      demande,
      schema: SCHEMA_JSON_IA_SITE,
      maxTokens: 16_000,
    });
    cout += coutCentimes(modele, r.usage);
    if (r.refus) break;
    const lu = lireSortieIa(r.texte, MAX_OPERATIONS.creation);
    const attendu = page.remplace ? 'remplacerContenuPage' : 'creerPage';
    const erreur = !lu.ok
      ? lu.erreur
      : lu.sortie.operations.length !== 1 || lu.sortie.operations[0]!.op !== attendu
        ? `Une seule opération « ${attendu} » est attendue.`
        : (() => {
            const a = appliquerOperations(brouillon, lu.sortie.operations, () => 'verif');
            return a.ok ? null : a.erreurs.slice(0, 5).join(' ; ');
          })();
    if (lu.ok && !erreur) {
      const avertissements: string[] = [];
      const operations = lu.sortie.operations.map((o) =>
        garderFaitsOperation(o, sources, avertissements),
      );
      const apercu = c.statut === 'apercu';
      const faites = [...new Set([...(c.faites as string[]), cle])];
      const finie = !apercu && faites.length === (c.plan as PagePlanifiee[]).length;
      await refCreation.update({
        faites,
        statut: apercu ? 'attente_paiement' : finie ? 'terminee' : 'en_cours',
        ...(apercu ? { apercu: operations } : {}),
        coutCentimes: FieldValue.increment(cout),
        versionPrompt: VERSION_PROMPT_IA_SITE,
        updatedAt: Timestamp.fromMillis(s.horloge()),
      });
      return { operations, avertissements: [...new Set(avertissements)], apercu };
    }
    demande = `${demande}\n\nTa réponse précédente a été refusée : ${erreur}. Corrige-la.`;
  }
  throw new ErreurMetier(
    'INDISPONIBLE',
    `La page « ${page.nom} » n’a pas pu être créée. Réessayez.`,
  );
}

/**
 * Reprise après paiement (SITE-IA-02) : mêmes réponses, aucune question reposée ; l'accueil de
 * l'aperçu est repris tel quel et les autres pages sont générées ensuite.
 */
export async function reprendreCreationIa(
  s: ServicesIaSite,
  ctx: ContexteSite,
): Promise<{ plan: PagePlanifiee[]; accueil: OperationIa[] }> {
  const refCreation = s.db.doc(chemins.creationIaSite(ctx.artisanId));
  const c = (await refCreation.get()).data() as DocumentData | undefined;
  if (c?.statut !== 'attente_paiement')
    throw new ErreurMetier('PRECONDITION', 'Aucune création à reprendre.');
  const artisan = await s.db.doc(chemins.artisan(ctx.artisanId)).get();
  const { complet, mult } = iaComplete(artisan.get('droits'));
  if (!complet)
    throw new ErreurMetier('PERMISSION_REFUSEE', 'La création complète est incluse dans Site Pro.');
  await reserver(s, ctx, true, mult);
  const avantIa = await sauvegarderAvantIa(s, ctx.artisanId);
  const plan = planCreation(c.reponses as ReponsesCreation, c.fiche as FicheCreation);
  await refCreation.update({
    statut: 'en_cours',
    plan,
    faites: ['accueil'],
    avantIa,
    updatedAt: Timestamp.fromMillis(s.horloge()),
  });
  return { plan, accueil: (c.apercu as OperationIa[] | undefined) ?? [] };
}

/** État pour l'éditeur : création à reprendre après paiement, ou en cours. */
export async function lireCreationIa(
  db: ServicesIaSite['db'],
  artisanId: string,
): Promise<{
  statut: StatutCreation;
  plan: PagePlanifiee[];
  faites: string[];
  apercu?: OperationIa[];
} | null> {
  const c = (await db.doc(chemins.creationIaSite(artisanId)).get()).data();
  if (!c) return null;
  return {
    statut: c.statut as StatutCreation,
    plan: c.plan as PagePlanifiee[],
    faites: c.faites as string[],
    ...(c.apercu ? { apercu: c.apercu as OperationIa[] } : {}),
  };
}
