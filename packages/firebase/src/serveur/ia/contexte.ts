import {
  formatDureeVisite,
  formatPart,
  PAGES_COMPORTEMENT,
  type PageSuivie,
} from '@ph/core/comportement';
import { jourIso } from '@ph/core/format';
import type { PerimetreIa } from '@ph/core/ia';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';

/**
 * Contexte de l'assistant (IA_ADMIN §3) : chaque nuit, un JSON compact par périmètre, déjà
 * résumé, **sans aucune donnée personnelle** (agrégats et contenu public uniquement).
 * Les valeurs sont écrites telles que le modèle doit les citer (« 5 % », « 1 min 05 »).
 */
const J = 86_400_000;
const TOKENS_MAX = 6000;
const estimerTokens = (json: string) => Math.ceil(json.length / 4);
const part = (n: number, sur: number) => (sur ? formatPart(n / sur) : 'n.d.');

type Agregat = {
  sessions: number;
  conversions: number;
  dureeMediane: number;
  profondeurMediane: number;
  sections: Record<
    string,
    { vues: number; lues: number; tempsTotalMs: number; sorties: number; conversionsSiLue: number }
  >;
  elements: Record<string, { clics: number; morts: number; rages: number; hesitations: number }>;
};

async function resumePage(db: Firestore, page: PageSuivie) {
  const lire = async (appareil: string) =>
    (
      await db.collection(collections.comportementAgregats).doc(`${page}_30j_${appareil}`).get()
    ).data() as Agregat | undefined;
  const [tous, mobile, ordinateur, alertes] = await Promise.all([
    lire('tous'),
    lire('mobile'),
    lire('ordinateur'),
    db
      .collection(collections.comportementAlertes)
      .where('page', '==', page)
      .where('statut', '==', 'ouverte')
      .get(),
  ]);
  if (!tous?.sessions)
    return { page, nom: PAGES_COMPORTEMENT[page].nom, donnees: 'aucune session sur 30 jours' };
  const n = tous.sessions;
  const sorties = Object.values(tous.sections).reduce((t, s) => t + s.sorties, 0);
  return {
    page,
    nom: PAGES_COMPORTEMENT[page].nom,
    periode: '30 j',
    sessions: n,
    conversion: part(tous.conversions, n),
    conversionMobile: mobile?.sessions ? part(mobile.conversions, mobile.sessions) : 'n.d.',
    conversionOrdinateur: ordinateur?.sessions
      ? part(ordinateur.conversions, ordinateur.sessions)
      : 'n.d.',
    tempsMedian: formatDureeVisite(tous.dureeMediane),
    profondeurMediane: `${tous.profondeurMediane} %`,
    sections: Object.entries(tous.sections)
      .sort(([, a], [, b]) => b.vues - a.vues)
      .slice(0, 12)
      .map(([id, s]) => ({
        section: id,
        atteinte: part(s.vues, n),
        partDesSorties: part(s.sorties, sorties),
        conversionSiLue: part(s.conversionsSiLue, s.lues),
      })),
    elements: Object.entries(tous.elements)
      .sort(([, a], [, b]) => b.clics + b.morts - (a.clics + a.morts))
      .slice(0, 15)
      .map(([id, e]) => ({
        element: id,
        clics: part(e.clics, n),
        ...(e.morts ? { clicsMorts: part(e.morts, n) } : {}),
        ...(e.rages ? { rages: part(e.rages, n) } : {}),
        ...(e.hesitations ? { hesitations: part(e.hesitations, n) } : {}),
      })),
    alertes: alertes.docs.map((d) => ({
      type: d.get('type') as string,
      element: (d.get('element') as string | undefined) ?? 'page',
      valeur: formatPart(d.get('valeur') as number),
    })),
  };
}

async function contexteEmails(db: Firestore, maintenant: number) {
  const r = await db
    .collection(collections.cycleStats)
    .where('jour', '>=', jourIso(maintenant - 30 * J))
    .get();
  const somme = (champ: string) => {
    const t: Record<string, number> = {};
    for (const d of r.docs)
      for (const [k, v] of Object.entries((d.get(champ) as Record<string, number>) ?? {}))
        t[k] = (t[k] ?? 0) + v;
    return t;
  };
  const [envois, ouvertures, clics, conversions] = [
    'envois',
    'ouvertures',
    'clics',
    'conversions',
  ].map(somme) as [
    Record<string, number>,
    Record<string, number>,
    Record<string, number>,
    Record<string, number>,
  ];
  return {
    periode: '30 j',
    modeles: Object.entries(envois)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30)
      .map(([modele, n]) => ({
        modele,
        envois: n,
        ouverture: part(ouvertures[modele] ?? 0, n),
        clic: part(clics[modele] ?? 0, n),
        conversions: conversions[modele] ?? 0,
      })),
    entonnoir: (r.docs.at(-1)?.get('entonnoir') as Record<string, number> | undefined) ?? {},
  };
}

async function contexteOffres(db: Firestore, maintenant: number) {
  const [abonnements, retentions] = await Promise.all([
    db
      .collection(collections.abonnements)
      .where('statut', 'in', ['active', 'trialing', 'past_due'])
      .get(),
    db
      .collection(collections.cycleTraces)
      .where('type', '==', 'retention')
      .where('createdAt', '>=', Timestamp.fromMillis(maintenant - 90 * J))
      .get(),
  ]);
  const actifs: Record<string, number> = {};
  for (const d of abonnements.docs) {
    const cle = `${d.get('produit') as string}_${d.get('periode') as string}`;
    actifs[cle] = (actifs[cle] ?? 0) + 1;
  }
  const raisons: Record<string, number> = {};
  for (const d of retentions.docs) {
    const raison = (d.get('details.raison') as string | undefined) ?? 'inconnue';
    raisons[raison] = (raisons[raison] ?? 0) + 1;
  }
  const annuels = Object.entries(actifs)
    .filter(([k]) => k.endsWith('_annuel'))
    .reduce((t, [, v]) => t + v, 0);
  const total = Object.values(actifs).reduce((t, v) => t + v, 0);
  return {
    abonnementsActifs: actifs,
    partAnnuel: part(annuels, total),
    resiliationsDemandees90j: raisons,
  };
}

async function contexteFiches(db: Firestore) {
  const r = await db
    .collection(collections.artisans)
    .where('enLigne', '==', true)
    .select('plan', 'completude', 'nbAvis', 'noteMoyenne')
    .get();
  const parPlan: Record<string, { fiches: number; completudeMoyenne: number; avecAvis: number }> =
    {};
  for (const d of r.docs) {
    const p = (parPlan[d.get('plan') as string] ??= {
      fiches: 0,
      completudeMoyenne: 0,
      avecAvis: 0,
    });
    p.fiches++;
    p.completudeMoyenne += (d.get('completude') as number | undefined) ?? 0;
    if (((d.get('nbAvis') as number | undefined) ?? 0) > 0) p.avecAvis++;
  }
  return Object.fromEntries(
    Object.entries(parPlan).map(([plan, p]) => [
      plan,
      {
        fiches: p.fiches,
        completudeMoyenne: `${Math.round(p.completudeMoyenne / p.fiches)} %`,
        avecAvis: part(p.avecAvis, p.fiches),
      },
    ]),
  );
}

/** Calcule et écrit `iaContexte/{perimetre}` (nuit, après l'agrégation du comportement). */
export async function calculerContextesIa(db: Firestore, maintenant: number) {
  const pagesLandings: PageSuivie[] = ['acquisition-artisans', 'accueil', 'diagnostic', 'annuaire'];
  const contenus: Record<PerimetreIa, unknown> = {
    landings: await Promise.all(pagesLandings.map((p) => resumePage(db, p))),
    parcours: [await resumePage(db, 'simulateur')],
    emails: await contexteEmails(db, maintenant),
    offres: await contexteOffres(db, maintenant),
    fiches: await contexteFiches(db),
  };
  const lot = db.batch();
  for (const [perimetre, contenu] of Object.entries(contenus)) {
    let json = JSON.stringify(contenu);
    // Garde-fou de taille : au-delà de 6 000 jetons, le contexte est tronqué et le dit.
    if (estimerTokens(json) > TOKENS_MAX) json = `${json.slice(0, TOKENS_MAX * 4)}… (tronqué)`;
    lot.set(db.collection(collections.iaContexte).doc(perimetre), {
      schemaVersion: 1,
      json,
      tokensEstimes: Math.min(TOKENS_MAX, estimerTokens(json)),
      updatedAt: Timestamp.fromMillis(maintenant),
    });
  }
  await lot.commit();
}

/** Contexte des périmètres choisis, seulement ceux-là (IA-06). */
export async function lireContextesIa(db: Firestore, perimetres: readonly PerimetreIa[]) {
  const docs = await Promise.all(
    perimetres.map((p) => db.collection(collections.iaContexte).doc(p).get()),
  );
  return {
    texte: docs
      .map(
        (d, i) =>
          `### ${perimetres[i]}\n${(d.get('json') as string | undefined) ?? 'aucune donnée'}`,
      )
      .join('\n\n'),
    sources: docs.map(
      (d, i) =>
        `${perimetres[i]}@${d.exists ? jourIso((d.get('updatedAt') as Timestamp).toMillis()) : 'absent'}`,
    ),
  };
}
