import Anthropic from '@anthropic-ai/sdk';
import { coutCentimes, type UsageIa } from '@ph/core/ia';
import {
  besoinTexte,
  contexteRedaction,
  controlerTexteSecteur,
  demandeRecherche,
  faitsDuTexteConnus,
  faitsVerifies,
  lireFaitsRecherche,
  nombresDonnees,
  RAYON_SECTEUR_KM,
  SCHEMA_JSON_TEXTE_SECTEUR,
  SIMILARITE_MAX,
  similarite,
  SYSTEME_RECHERCHE_SECTEUR,
  SYSTEME_REDACTION_SECTEUR,
  texteBrut,
  type DonneesTexte,
  type FaitSource,
} from '@ph/core/pages-secteur';
import { pageSecteur, texteSecteur } from '@ph/core/schemas';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { depot } from '../depot';
import type { ClientIa } from '../ia/client';
import { lireReferentielMetiers } from '../matching/lecture';

/**
 * Texte local d'une page de secteur (SEO, décision du 24/11/2026) : recherche web de faits
 * sourcés, rédaction structurée, contrôles (`controlerTexteSecteur`, sources réellement trouvées,
 * ressemblance avec les pages du même métier), puis publication automatique. Budget mensuel
 * plafonné ; sans clé API, rien n'est tenté et la page garde son texte construit sur nos données.
 */
export const MODELE_TEXTE_SECTEUR = 'claude-sonnet-5-5';
/** Plafond mensuel de la rédaction des pages de secteur (COUTS.md), en centimes d'euro. */
export const BUDGET_SECTEUR_CENTIMES = 2_000;
/** Recherche web : 10 $ les 1 000 recherches, soit environ 1 centime d'euro chacune. */
const CENTIMES_PAR_RECHERCHE = 1;
const VERROU_MS = 10 * 60_000;

export interface ResultatRecherche {
  faits: FaitSource[];
  urls: string[];
  usage: UsageIa;
  recherches: number;
}
export type RechercheWeb = (d: DonneesTexte) => Promise<ResultatRecherche>;

/** Recherche web réelle : Sonnet 5.5 + outil serveur `web_search` (5 recherches au plus). */
export function rechercheAnthropic(apiKey: string): RechercheWeb {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 180_000 });
  return async (d) => {
    const messages: Anthropic.Beta.BetaMessageParam[] = [
      { role: 'user', content: demandeRecherche(d) },
    ];
    const usage: UsageIa = { entree: 0, sortie: 0, cacheEcrit: 0, cacheLu: 0 };
    const urls: string[] = [];
    let recherches = 0;
    let texte = '';
    // `pause_turn` : la recherche continue dans un nouvel appel (3 au plus).
    for (let tour = 0; tour < 3; tour++) {
      const r = await client.beta.messages.create({
        model: MODELE_TEXTE_SECTEUR,
        max_tokens: 4_000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: SYSTEME_RECHERCHE_SECTEUR,
        tools: [
          {
            type: 'web_search_20260209',
            name: 'web_search',
            max_uses: 5,
            user_location: { type: 'approximate', country: 'FR' },
          },
        ],
        messages,
      });
      usage.entree += r.usage.input_tokens;
      usage.sortie += r.usage.output_tokens;
      usage.cacheEcrit += r.usage.cache_creation_input_tokens ?? 0;
      usage.cacheLu += r.usage.cache_read_input_tokens ?? 0;
      recherches += r.usage.server_tool_use?.web_search_requests ?? 0;
      for (const b of r.content) {
        if (b.type === 'web_search_tool_result' && Array.isArray(b.content))
          for (const x of b.content) if (x.type === 'web_search_result') urls.push(x.url);
        if (b.type === 'text') texte += b.text;
      }
      if (r.stop_reason !== 'pause_turn') break;
      messages.push({ role: 'assistant', content: r.content });
    }
    return { faits: faitsVerifies(lireFaitsRecherche(texte), urls), urls, usage, recherches };
  };
}

export interface CtxTexte {
  db: Firestore;
  horloge: () => number;
  client: ClientIa;
  recherche: RechercheWeb;
}

const pages = (db: Firestore) => depot(db, collections.pagesSecteur, pageSecteur);
const mois = (t: number) => new Date(t).toISOString().slice(0, 7);
const budgetRef = (db: Firestore, t: number) =>
  db.collection(collections.iaQuotas).doc(`pagesSecteur_${mois(t)}`);

async function donnees(c: CtxTexte, id: string): Promise<DonneesTexte | null> {
  const p = await pages(c.db).lire(id);
  if (!p) return null;
  const ref = await lireReferentielMetiers(c.db, c.horloge());
  const metier = ref.metiers.find((m) => m.id === p.metier);
  const [prestations, voisines] = await Promise.all([
    metier?.famille
      ? c.db
          .collection(chemins.prestationsItems())
          .where('famille', '==', metier.famille)
          .limit(8)
          .get()
      : null,
    pages(c.db)
      .reference.where('metier', '==', p.metier)
      .where('indexable', '==', true)
      .where('commune.departement', '==', p.commune.departement)
      .limit(12)
      .get(),
  ]);
  return {
    metier: metier?.nom ?? p.metier,
    prestations: prestations?.docs.map((d) => d.get('nom') as string) ?? [],
    ville: p.commune.nom,
    codePostal: p.commune.codePostal,
    departement: p.commune.departement,
    population: p.commune.population,
    nbArtisans: p.nbArtisans,
    rayonKm: RAYON_SECTEUR_KM,
    voisines: voisines.docs
      .map((d) => d.data().commune.nom)
      .filter((n) => n !== p.commune.nom)
      .slice(0, 8),
  };
}

/** Textes déjà publiés pour le même métier (contrôle de ressemblance). */
async function textesVoisins(db: Firestore, metier: string, id: string) {
  const s = await pages(db)
    .reference.where('metier', '==', metier)
    .where('texteEtat', '==', 'pret')
    .limit(20)
    .get();
  return s.docs.filter((d) => d.id !== id).map((d) => texteBrut(d.data().texte!));
}

export type IssueTexte = 'pret' | 'echec' | 'ignoree' | 'budget';

/** Rédige (ou refuse) le texte d'une page ; écrit le résultat et la dépense du mois. */
export async function redigerTextePage(c: CtxTexte, id: string): Promise<IssueTexte> {
  const maintenant = new Date(c.horloge());
  // Verrou : deux déclencheurs rapprochés ne lancent pas deux rédactions (coût).
  const page = await c.db.runTransaction(async (tx) => {
    const ref = pages(c.db).ref(id);
    const p = (await tx.get(ref)).data();
    if (!p || !besoinTexte(p, maintenant)) return null;
    if (p.texteVerrou && maintenant.getTime() - p.texteVerrou.getTime() < VERROU_MS) return null;
    tx.update(ref, { texteVerrou: maintenant });
    return p;
  });
  if (!page) return 'ignoree';
  const depense = ((await budgetRef(c.db, c.horloge()).get()).get('coutCentimes') as number) ?? 0;
  if (depense >= BUDGET_SECTEUR_CENTIMES) {
    await pages(c.db).reference.doc(id).update({ texteVerrou: FieldValue.delete() });
    return 'budget';
  }
  const d = await donnees(c, id);
  if (!d) return 'ignoree';

  let cout = 0;
  const echouer = async (raison: string): Promise<IssueTexte> => {
    await pages(c.db)
      .reference.doc(id)
      .update({
        texteEtat: 'echec',
        texteEssais: page.texteEssais + 1,
        texteErreur: raison.slice(0, 300),
        majLe: maintenant,
      });
    return 'echec';
  };
  try {
    const r = await c.recherche(d);
    cout += coutCentimes(MODELE_TEXTE_SECTEUR, r.usage) + r.recherches * CENTIMES_PAR_RECHERCHE;
    const reponse = await c.client({
      modele: MODELE_TEXTE_SECTEUR,
      systeme: SYSTEME_REDACTION_SECTEUR,
      contexte: contexteRedaction(d, r.faits),
      demande: `Rédige la page « ${d.metier} à ${d.ville} ».`,
      schema: SCHEMA_JSON_TEXTE_SECTEUR,
      maxTokens: 6_000,
    });
    cout += coutCentimes(MODELE_TEXTE_SECTEUR, reponse.usage);
    if (reponse.refus) return await echouer('le modèle a décliné la demande');
    const lu = texteSecteur.safeParse(JSON.parse(reponse.texte));
    if (!lu.success) return await echouer(`forme invalide : ${lu.error.issues[0]?.message ?? ''}`);
    const problemes = controlerTexteSecteur(lu.data, {
      ville: d.ville,
      metier: d.metier,
      nombresConnus: nombresDonnees(d),
    });
    if (!faitsDuTexteConnus(lu.data, r.faits)) problemes.push('fait cité sans source trouvée');
    const brut = texteBrut(lu.data);
    const proche = Math.max(
      0,
      ...(await textesVoisins(c.db, page.metier, id)).map((v) => similarite(brut, v)),
    );
    if (proche > SIMILARITE_MAX)
      problemes.push(`trop proche d’une autre page (${proche.toFixed(2)})`);
    if (problemes.length) return await echouer(problemes.join(' ; '));
    await pages(c.db).reference.doc(id).update({
      texte: lu.data,
      texteEtat: 'pret',
      texteModele: MODELE_TEXTE_SECTEUR,
      texteGenereLe: maintenant,
      texteEssais: 0,
      texteErreur: FieldValue.delete(),
      texteVerrou: FieldValue.delete(),
      majLe: maintenant,
    });
    return 'pret';
  } catch (e) {
    return await echouer(e instanceof Error ? e.message : 'erreur inconnue');
  } finally {
    if (cout)
      await budgetRef(c.db, c.horloge()).set(
        { coutCentimes: FieldValue.increment(cout), appels: FieldValue.increment(1) },
        { merge: true },
      );
  }
}

/** Pages indexables encore sans texte, ou à réessayer (passage de nuit, 20 au plus). */
export async function pagesSansTexte(db: Firestore, limite = 20): Promise<string[]> {
  const s = await pages(db)
    .reference.where('indexable', '==', true)
    .where('texteEtat', 'in', ['absent', 'echec'])
    .limit(limite)
    .get();
  return s.docs.map((d) => d.id);
}
