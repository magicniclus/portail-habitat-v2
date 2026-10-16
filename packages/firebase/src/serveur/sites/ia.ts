import { ErreurMetier } from '@ph/core/erreurs';
import { coutCentimes } from '@ph/core/ia';
import { droitsDe, type DroitsFormule, type Formule } from '@ph/core/paiements';
import {
  appliquerOperations,
  creditIaSite,
  garderFaits,
  lireRoutage,
  lireSortieIa,
  MAX_OPERATIONS,
  modererDemandeIa,
  messageIaSite,
  MODELE_MODE,
  PROMPT_ROUTEUR_IA_SITE,
  PROMPT_SYSTEME_IA_SITE,
  QUOTAS_MOIS_SITE_PRO,
  ESSAIS_TEXTES_A_VIE,
  resumeArbre,
  SCHEMA_JSON_IA_SITE,
  SCHEMA_JSON_ROUTEUR,
  textesDuSite,
  VERSION_PROMPT_IA_SITE,
  type BrouillonIa,
  type ModeIaSite,
  type OperationIa,
} from '@ph/core/sites';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import type { ClientIa } from '../ia/client';
import { exigerSite, type ContexteSite, type ServicesSites } from './edition';
import { lireSiteEdition } from './lecture';

export interface ServicesIaSite extends ServicesSites {
  /** `null` sans clé Anthropic : refus propre, aucun crédit consommé. */
  client: ClientIa | null;
}

export interface DemandeIaSite {
  /** Absent : le routeur choisit le mode et la portée (IA_SITE §1). */
  mode?: ModeIaSite;
  portee: 'selection' | 'page' | 'site';
  pageId: string;
  cibles: string[];
  demande: string;
  /** Réponse à la question posée par l'IA lors de la demande précédente. */
  reponse?: string;
}

export interface PropositionIaSite {
  sessionId: string;
  resume: string;
  question: string;
  operations: OperationIa[];
  /** Faits remplacés par « [à compléter] » (signalés en orange dans l'éditeur). */
  avertissements: string[];
  /** Mode retenu (choisi par l'artisan ou par le routeur). */
  mode: ModeIaSite;
  /** Demandes restantes dans la catégorie (mois Site Pro, ou essais à vie). */
  restant: number;
}

const moisParis = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(ms).slice(0, 7);

/** Droits écrits par le webhook Stripe ; repli sur ceux de la formule (jamais lus du client). */
function droitsLus(
  d: Partial<DroitsFormule> | undefined,
): Pick<DroitsFormule, 'iaSite' | 'iaMultiplicateur'> {
  const f = droitsDe((d?.formule as Formule | undefined) ?? 'gratuit');
  return {
    iaSite: d?.iaSite ?? f.iaSite,
    iaMultiplicateur: d?.iaMultiplicateur ?? f.iaMultiplicateur,
  };
}

/** Textes à surveiller dans une opération (garde-fou des faits) : jamais les réglages numériques. */
export function garderFaitsOperation(
  o: OperationIa,
  sources: string,
  avert: string[],
): OperationIa {
  const g = (t: string) => {
    const r = garderFaits(t, sources);
    avert.push(...r.remplaces);
    return r.texte;
  };
  const champs = ['texte', 'legende', 'label', 'valeur', 'nom', 'bouton'];
  const nettoyer = (p: Record<string, unknown> | undefined) =>
    p &&
    Object.fromEntries(
      Object.entries(p).map(([k, v]) => [
        k,
        champs.includes(k) && typeof v === 'string'
          ? g(v)
          : k === 'items' && Array.isArray(v)
            ? v.map((x) => (typeof x === 'string' ? g(x) : x))
            : v,
      ]),
    );
  const section = (s: {
    p?: Record<string, unknown>;
    rows: { cols: { els: { p?: Record<string, unknown> }[] }[] }[];
  }) => ({
    ...s,
    rows: s.rows.map((r) => ({
      ...r,
      cols: r.cols.map((c) => ({ ...c, els: c.els.map((e) => ({ ...e, p: nettoyer(e.p) })) })),
    })),
  });
  switch (o.op) {
    case 'texte':
      return { ...o, valeur: g(o.valeur) };
    case 'insererSection':
    case 'remplacerSection':
      return { ...o, section: section(o.section) } as OperationIa;
    case 'creerPage':
      return { ...o, page: { ...o.page, sections: o.page.sections.map(section) } } as OperationIa;
    case 'remplacerContenuPage':
      return { ...o, sections: o.sections.map(section) } as OperationIa;
    default:
      return o;
  }
}

/** Fiche vérifiée et réponses de l'artisan : seules sources autorisées pour les faits. */
async function sourcesFiche(s: ServicesSites, artisanId: string): Promise<string> {
  const [pub, param] = await Promise.all([
    s.db.doc(chemins.artisanPublic(artisanId)).get(),
    s.db.doc(chemins.parametresFacturation(artisanId)).get(),
  ]);
  const p = pub.data() ?? {};
  const f = param.data() ?? {};
  return JSON.stringify({
    nomCommercial: p.nomCommercial,
    ville: p.ville,
    pitch: p.pitch,
    description: p.description,
    labels: p.labels,
    noteMoyenne: p.nbAvis ? p.noteMoyenne : undefined,
    nbAvis: p.nbAvis || undefined,
    anneesActivite: p.anneesActivite,
    telephone: p.telephone,
    raisonSociale: f.raisonSociale,
    siret: f.siret,
    assuranceDecennale: f.assuranceDecennale ? 'décennale' : undefined,
  });
}

/**
 * Demande à l'IA du site (IA_SITE §5) : droits revérifiés (SITE-IA-03), crédit réservé avant
 * l'appel et rendu si l'IA échoue (SITE-IA-08), sortie hors schéma ou cible inexistante refusée
 * après une seule relance (SITE-IA-04), faits non sourcés remplacés (SITE-IA-05). La proposition
 * est seulement enregistrée : ni les pages ni les versions ne sont touchées (SITE-IA-10).
 */
export async function demanderIaSite(
  s: ServicesIaSite,
  ctx: ContexteSite,
  e: DemandeIaSite,
): Promise<PropositionIaSite> {
  // Filtre avant tout appel et tout crédit (IA_SITE §5).
  const moderation = modererDemandeIa(`${e.demande}\n${e.reponse ?? ''}`);
  if (!moderation.ok) throw new ErreurMetier('ENTREE_INVALIDE', moderation.message);
  if (!s.client)
    throw new ErreurMetier('INDISPONIBLE', 'L’assistant du site n’est pas encore disponible.');
  const client = s.client;
  const maintenant = s.horloge();
  const artisan = await s.db.doc(chemins.artisan(ctx.artisanId)).get();
  const droits = droitsLus(artisan.get('droits'));
  // Sans Site Pro, seuls les textes sont ouverts : pas d'appel au routeur.
  const route = e.mode
    ? { mode: e.mode, portee: e.portee }
    : droits.iaSite !== 'complet'
      ? { mode: 'textes' as const, portee: e.portee }
      : await routerDemande(client, e);
  e = { ...e, ...route };
  const mode = route.mode;
  const credit = creditIaSite(droits, mode);
  if (!credit)
    throw new ErreurMetier(
      'PERMISSION_REFUSEE',
      'Cette fonction de l’IA est incluse dans Site Pro.',
    );
  const ref = s.db.doc(
    chemins.compteurIaSite(
      ctx.artisanId,
      credit.type === 'essai' ? 'essai' : moisParis(maintenant),
    ),
  );
  const champ = credit.type === 'essai' ? 'textes' : credit.categorie;
  const utilises = await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    const n = ((await t.get(ref)).get(champ) as number | undefined) ?? 0;
    if (n >= credit.max)
      throw new ErreurMetier(
        'TROP_DE_REQUETES',
        credit.type === 'essai'
          ? 'Vos essais gratuits de l’IA sont utilisés. Avec Site Pro, l’IA est disponible tous les mois.'
          : `Vous avez utilisé vos ${credit.max} demandes de ce mois-ci. L’édition manuelle reste disponible.`,
      );
    t.set(ref, { schemaVersion: 1, [champ]: FieldValue.increment(1) }, { merge: true });
    return n + 1;
  });
  const rendre = () => ref.set({ [champ]: FieldValue.increment(-1) }, { merge: true });

  try {
    const site = await lireSiteEdition(s.db, ctx.artisanId);
    if (!site.existe || !site.navigation || !site.theme) throw new ErreurMetier('INTROUVABLE');
    const brouillon: BrouillonIa = {
      pages: site.pages,
      navigation: site.navigation,
      theme: site.theme,
    };
    const fiche = await sourcesFiche(s, ctx.artisanId);
    const sources = `${fiche}\n${textesDuSite(site.pages)}\n${e.demande}\n${e.reponse ?? ''}`;
    const modele = MODELE_MODE[mode];
    let demande = messageIaSite({ ...e, mode });
    let cout = 0;
    for (let essai = 0; essai < 2; essai++) {
      const r = await client({
        modele,
        systeme: PROMPT_SYSTEME_IA_SITE,
        contexte: `Fiche vérifiée de l'artisan :\n${fiche}\n\nRésumé du site :\n${resumeArbre(brouillon)}`,
        demande,
        schema: SCHEMA_JSON_IA_SITE,
        maxTokens: mode === 'page' ? 16_000 : 8_000,
      });
      cout += coutCentimes(modele, r.usage);
      if (r.refus) break;
      const lu = lireSortieIa(r.texte, MAX_OPERATIONS.autre);
      const erreur = lu.ok
        ? (() => {
            const a = appliquerOperations(brouillon, lu.sortie.operations, () => 'verif');
            return a.ok ? null : a.erreurs.slice(0, 5).join(' ; ');
          })()
        : lu.erreur;
      if (lu.ok && !erreur) {
        const avertissements: string[] = [];
        const operations = lu.sortie.operations.map((o) =>
          garderFaitsOperation(o, sources, avertissements),
        );
        const session = s.db.collection(chemins.sessionsIaSite(ctx.artisanId)).doc();
        await session.set({
          schemaVersion: 1,
          uid: ctx.uid,
          mode,
          portee: e.portee,
          demande: e.demande.slice(0, 2000),
          resume: lu.sortie.resume,
          question: lu.sortie.question,
          operations,
          avertissements,
          modele,
          versionPrompt: VERSION_PROMPT_IA_SITE,
          coutCentimes: cout,
          createdAt: Timestamp.fromMillis(maintenant),
        });
        // Une question sans proposition ne consomme pas de crédit.
        if (!operations.length) await rendre();
        return {
          sessionId: session.id,
          resume: lu.sortie.resume,
          question: lu.sortie.question,
          operations,
          avertissements,
          mode,
          restant: credit.max - utilises + (operations.length ? 0 : 1),
        };
      }
      demande = `${messageIaSite({ ...e, mode })}\n\nTa réponse précédente a été refusée : ${erreur}. Corrige-la en respectant le format et les identifiants du résumé.`;
    }
    throw new ErreurMetier(
      'INDISPONIBLE',
      'L’IA n’a pas pu proposer de modification. Reformulez ou réessayez.',
    );
  } catch (err) {
    await rendre();
    throw err;
  }
}

/** Routeur (Haiku, sortie courte) : coût sans crédit, ≈ 0,0002 € (COUTS.md). */
async function routerDemande(client: ClientIa, e: DemandeIaSite) {
  const r = await client({
    modele: 'claude-haiku-5-5',
    systeme: PROMPT_ROUTEUR_IA_SITE,
    contexte: `Élément sélectionné : ${e.cibles.length ? 'oui' : 'non'}.`,
    demande: e.demande,
    schema: SCHEMA_JSON_ROUTEUR,
    maxTokens: 200,
  });
  return lireRoutage(r.refus ? '' : r.texte, { selection: e.cibles.length > 0 });
}

/** Demandes restantes affichées dans le panneau (IA_SITE §4) ; remises à zéro le 1er du mois. */
export async function lireRestantsIaSite(
  s: Pick<ServicesSites, 'db' | 'horloge'>,
  artisanId: string,
): Promise<{ type: 'mois' | 'essai'; textes: number; composants: number }> {
  const artisan = await s.db.doc(chemins.artisan(artisanId)).get();
  const d = droitsLus(artisan.get('droits'));
  const complet = d.iaSite === 'complet';
  const c = await s.db
    .doc(chemins.compteurIaSite(artisanId, complet ? moisParis(s.horloge()) : 'essai'))
    .get();
  const n = (k: string) => (c.get(k) as number | undefined) ?? 0;
  if (!complet)
    return { type: 'essai', textes: Math.max(0, ESSAIS_TEXTES_A_VIE - n('textes')), composants: 0 };
  const m = d.iaMultiplicateur;
  return {
    type: 'mois',
    textes: Math.max(0, QUOTAS_MOIS_SITE_PRO.textes * m - n('textes')),
    composants: Math.max(0, QUOTAS_MOIS_SITE_PRO.composants * m - n('composants')),
  };
}
